<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useApi } from '../../composables/useApi'
import { useNotify } from '../../composables/useNotify'
import type { LayoutDetail, SpotSummary } from '../../types/layout'
import LayoutPreview from './LayoutPreview.vue'

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
const newFilePreviews = ref<string[]>([])
const existing = ref<LayoutDetail | null>(null)
const submitting = ref(false)
const error = ref('')
const dragOver = ref(false)
const fileInputEl = ref<HTMLInputElement | null>(null)

const MAX_FILES = 3
const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const isEdit = computed(() => props.layoutId != null)
const existingCount = computed(() => existing.value?.files.length ?? 0)
const totalCount = computed(() => existingCount.value + newFiles.value.length)
const remaining = computed(() => Math.max(0, MAX_FILES - totalCount.value))
const canAddMore = computed(() => remaining.value > 0)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

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

function addFiles(picked: File[]) {
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
  const space = remaining.value
  if (accepted.length > space) {
    errs.push(`これ以上追加できません（最大${MAX_FILES}まで）`)
    accepted.splice(space)
  }
  for (const f of accepted) {
    newFiles.value.push(f)
    newFilePreviews.value.push(f.type.startsWith('image/') ? URL.createObjectURL(f) : '')
  }
  if (errs.length > 0) notify.error(errs.join(' / '))
}

function onFilesSelected(e: Event) {
  const input = e.target as HTMLInputElement
  addFiles(Array.from(input.files ?? []))
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  if (!canAddMore.value) return
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (files.length > 0) addFiles(files)
}

function onDragOver(e: DragEvent) {
  if (!canAddMore.value) return
  e.dataTransfer!.dropEffect = 'copy'
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function openPicker() {
  if (!canAddMore.value) return
  fileInputEl.value?.click()
}

function removeNewFile(idx: number) {
  const url = newFilePreviews.value[idx]
  if (url) URL.revokeObjectURL(url)
  newFiles.value.splice(idx, 1)
  newFilePreviews.value.splice(idx, 1)
}

function revokeAllPreviews() {
  for (const url of newFilePreviews.value) {
    if (url) URL.revokeObjectURL(url)
  }
  newFilePreviews.value = []
}

onBeforeUnmount(revokeAllPreviews)
watch(() => props.layoutId, () => {
  revokeAllPreviews()
  newFiles.value = []
})

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
          <ul v-if="existing.files.length > 0" class="grid grid-cols-3 gap-2">
            <li
              v-for="f in existing.files"
              :key="f.id"
              class="relative border border-gray-200 bg-white rounded-lg overflow-hidden"
            >
              <div class="aspect-square">
                <LayoutPreview
                  :layout-id="existing.id"
                  :file-id="f.id"
                  :mime-type="f.mimeType"
                  :file-name="f.fileName"
                  thumb
                />
              </div>
              <button
                v-if="existing.files.length > 1"
                type="button"
                @click="removeExistingFile(f.id)"
                class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                aria-label="削除"
              >
                <span class="material-icons text-base">close</span>
              </button>
              <div class="px-1.5 py-1 bg-white border-t border-gray-100">
                <p class="text-[11px] text-gray-700 truncate" :title="f.fileName">{{ f.fileName }}</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- 追加ファイル -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-600">
              {{ isEdit ? 'ファイルを追加' : 'ファイル' }}
            </label>
            <span
              class="text-xs font-medium"
              :class="totalCount >= MAX_FILES ? 'text-indigo-600' : 'text-gray-400'"
            >{{ totalCount }} / {{ MAX_FILES }}</span>
          </div>

          <input
            ref="fileInputEl"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            @change="onFilesSelected"
            class="hidden"
          />

          <button
            type="button"
            @click="openPicker"
            @dragover.prevent="onDragOver"
            @dragenter.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
            :disabled="!canAddMore"
            class="group flex flex-col items-center justify-center gap-1.5 w-full py-6 px-4 rounded-lg border-2 border-dashed transition-colors"
            :class="[
              dragOver
                ? 'border-indigo-500 bg-indigo-50'
                : canAddMore
                  ? 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer'
                  : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
            ]"
          >
            <span
              class="material-icons text-3xl transition-colors"
              :class="dragOver ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500'"
            >cloud_upload</span>
            <span class="text-sm font-medium text-gray-700">
              <template v-if="canAddMore">
                クリックまたはドラッグ&ドロップ
              </template>
              <template v-else>
                最大 {{ MAX_FILES }} ファイルまで追加済み
              </template>
            </span>
            <span class="text-xs text-gray-400">
              JPG / PNG / WEBP / PDF ・ 最大 10MB ・ あと {{ remaining }} ファイル
            </span>
          </button>

          <ul v-if="newFiles.length > 0" class="grid grid-cols-3 gap-2 mt-1">
            <li
              v-for="(f, idx) in newFiles"
              :key="idx"
              class="relative group border border-indigo-200 bg-white rounded-lg overflow-hidden"
            >
              <div class="aspect-square bg-gray-50 flex items-center justify-center">
                <img
                  v-if="newFilePreviews[idx]"
                  :src="newFilePreviews[idx]"
                  :alt="f.name"
                  class="w-full h-full object-cover"
                />
                <span
                  v-else
                  class="material-icons text-5xl text-red-400"
                >picture_as_pdf</span>
              </div>
              <button
                type="button"
                @click="removeNewFile(idx)"
                class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                aria-label="削除"
              >
                <span class="material-icons text-base">close</span>
              </button>
              <div class="px-1.5 py-1 bg-white border-t border-indigo-100">
                <p class="text-[11px] text-gray-700 truncate" :title="f.name">{{ f.name }}</p>
                <p class="text-[10px] text-gray-400">{{ formatSize(f.size) }}</p>
              </div>
            </li>
          </ul>
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
