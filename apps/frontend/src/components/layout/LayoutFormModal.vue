<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../../composables/useApi'
import { useNotify } from '../../composables/useNotify'
import type { LayoutDetail, SpotSummary } from '../../types/layout'

const props = defineProps<{
  layoutId: number | null
  spots: SpotSummary[]
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const api = useApi()
const notify = useNotify()

const spotId = ref<number | ''>('')
const title = ref('')
const comment = ref('')
const startDate = ref('')
const endDate = ref('')
const newFiles = ref<File[]>([])
const existing = ref<LayoutDetail | null>(null)
const submitting = ref(false)
const error = ref('')

const MAX_FILES = 3
const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const isEdit = computed(() => props.layoutId != null)
const existingCount = computed(() => existing.value?.files.length ?? 0)
const totalCount = computed(() => existingCount.value + newFiles.value.length)
const remaining = computed(() => Math.max(0, MAX_FILES - existingCount.value))

async function load() {
  if (!props.layoutId) return
  try {
    const row = await api.get<LayoutDetail>(`/layouts/${props.layoutId}`)
    existing.value = row
    spotId.value = row.spotId
    title.value = row.title
    comment.value = row.comment ?? ''
    startDate.value = row.startDate
    endDate.value = row.endDate
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '読み込みに失敗しました'
  }
}

function onFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])
  const errs: string[] = []
  const accepted: File[] = []
  for (const f of picked) {
    if (!ALLOWED_MIME.includes(f.type)) {
      errs.push(`形式が不正: ${f.name}`)
      continue
    }
    if (f.size > MAX_SIZE) {
      errs.push(`サイズ超過: ${f.name}`)
      continue
    }
    accepted.push(f)
  }
  const space = isEdit.value ? remaining.value - newFiles.value.length : MAX_FILES - newFiles.value.length
  if (accepted.length > space) {
    errs.push(`これ以上追加できません（最大${MAX_FILES}まで）`)
    accepted.splice(space)
  }
  newFiles.value.push(...accepted)
  if (errs.length > 0) notify.error(errs.join(' / '))
  input.value = ''
}

function removeNewFile(idx: number) {
  newFiles.value.splice(idx, 1)
}

async function removeExistingFile(fileId: number) {
  if (!existing.value) return
  if (existing.value.files.length <= 1) {
    notify.error('最低1つのファイルが必要です')
    return
  }
  if (!confirm('このファイルを削除しますか？')) return
  try {
    await api.delete(`/layouts/${existing.value.id}/files/${fileId}`)
    await load()
    notify.success('削除しました')
  } catch (e: unknown) {
    notify.error(e instanceof Error ? e.message : '削除に失敗しました')
  }
}

async function submit() {
  error.value = ''
  if (spotId.value === '' || !title.value.trim() || !startDate.value || !endDate.value) {
    error.value = '必須項目を入力してください'
    return
  }
  if (startDate.value > endDate.value) {
    error.value = '開始日は終了日以前にしてください'
    return
  }
  if (!isEdit.value && newFiles.value.length === 0) {
    error.value = 'ファイルを1つ以上添付してください'
    return
  }
  if (totalCount.value > MAX_FILES) {
    error.value = `ファイルは最大${MAX_FILES}つまでです`
    return
  }

  const form = new FormData()
  form.set('spotId', String(spotId.value))
  form.set('title', title.value.trim())
  form.set('comment', comment.value.trim())
  form.set('startDate', startDate.value)
  form.set('endDate', endDate.value)
  for (const f of newFiles.value) form.append('files', f)

  submitting.value = true
  try {
    if (isEdit.value && props.layoutId != null) {
      await api.putForm(`/layouts/${props.layoutId}`, form)
      notify.success('更新しました')
    } else {
      await api.postForm('/layouts', form)
      notify.success('追加しました')
    }
    emit('saved')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '保存に失敗しました'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="emit('close')">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-base font-semibold text-gray-900">
          {{ isEdit ? 'レイアウトを編集' : '新規レイアウト' }}
        </h3>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
          <span class="material-icons">close</span>
        </button>
      </div>

      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600">スポット</label>
          <select
            v-model="spotId"
            required
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="" disabled>スポットを選択</option>
            <option v-for="s in spots" :key="s.id" :value="s.id">
              {{ s.visibility === 'private' ? '🔒 ' : '' }}{{ s.name }}
            </option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600">タイトル</label>
          <input
            v-model="title"
            type="text"
            required
            maxlength="200"
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600">コメント（任意）</label>
          <textarea
            v-model="comment"
            rows="3"
            maxlength="1000"
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-y"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-600">表示開始</label>
            <input
              v-model="startDate"
              type="date"
              required
              class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-600">表示終了</label>
            <input
              v-model="endDate"
              type="date"
              required
              class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>

        <!-- 既存ファイル（編集時） -->
        <div v-if="isEdit && existing" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600">現在のファイル</label>
          <ul v-if="existing.files.length > 0" class="flex flex-col gap-1">
            <li
              v-for="f in existing.files"
              :key="f.id"
              class="flex items-center justify-between gap-2 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm"
            >
              <span class="truncate flex items-center gap-1">
                <span class="material-icons text-base text-gray-400">
                  {{ f.mimeType === 'application/pdf' ? 'picture_as_pdf' : 'image' }}
                </span>
                {{ f.fileName }}
              </span>
              <button
                v-if="existing.files.length > 1"
                type="button"
                class="shrink-0 text-xs text-red-500 hover:text-red-700"
                @click="removeExistingFile(f.id)"
              >削除</button>
            </li>
          </ul>
        </div>

        <!-- 追加ファイル -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600">
            {{ isEdit ? 'ファイルを追加' : 'ファイル' }}
            <span class="text-xs text-gray-400">（最大 {{ MAX_FILES }} 枚、10MB まで、JPG/PNG/WEBP/PDF）</span>
          </label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            @change="onFilesSelected"
            class="text-sm"
          />
          <ul v-if="newFiles.length > 0" class="flex flex-col gap-1 mt-1">
            <li
              v-for="(f, idx) in newFiles"
              :key="idx"
              class="flex items-center justify-between gap-2 px-2 py-1.5 bg-indigo-50 border border-indigo-100 rounded text-sm"
            >
              <span class="truncate flex items-center gap-1">
                <span class="material-icons text-base text-indigo-400">
                  {{ f.type === 'application/pdf' ? 'picture_as_pdf' : 'image' }}
                </span>
                {{ f.name }}
              </span>
              <button
                type="button"
                class="shrink-0 text-xs text-red-500 hover:text-red-700"
                @click="removeNewFile(idx)"
              >削除</button>
            </li>
          </ul>
          <p class="text-xs text-gray-400">合計 {{ totalCount }} / {{ MAX_FILES }}</p>
        </div>

        <div v-if="error" class="text-sm text-red-500">{{ error }}</div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors"
          >キャンセル</button>
          <button
            type="submit"
            :disabled="submitting"
            class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >{{ isEdit ? '保存' : '追加' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
