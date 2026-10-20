<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../../composables/useApi'
import { useNotify } from '../../composables/useNotify'
import type { Announcement } from '../../types/announcement'

const props = defineProps<{ announcementId: number | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const api = useApi()
const notify = useNotify()

const title = ref('')
const body = ref('')
const submitting = ref(false)
const error = ref('')

const isEdit = computed(() => props.announcementId != null)

async function load() {
  if (!props.announcementId) return
  try {
    const list = await api.get<Announcement[]>('/announcements')
    const row = list.find(a => a.id === props.announcementId)
    if (!row) throw new Error('お知らせが見つかりません')
    title.value = row.title
    body.value = row.body
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '読み込みに失敗しました'
  }
}

async function onSubmit() {
  const t = title.value.trim()
  const b = body.value.trim()
  if (!t) { error.value = 'タイトルは必須です'; return }
  if (!b) { error.value = '本文は必須です'; return }
  submitting.value = true
  error.value = ''
  try {
    if (isEdit.value) {
      await api.put(`/announcements/${props.announcementId}`, { title: t, body: b })
      notify.success('更新しました。全員に未読として再表示されます')
    } else {
      await api.post('/announcements', { title: t, body: b })
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
  <div
    class="fixed inset-0 bg-black/40 z-200 flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h3 class="text-base font-semibold text-indigo-950">{{ isEdit ? 'お知らせを編集' : '新規お知らせ' }}</h3>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600"
          @click="emit('close')"
        ><span class="material-icons">close</span></button>
      </div>

      <form class="flex flex-col gap-4 p-5" @submit.prevent="onSubmit">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">タイトル <span class="text-red-500">*</span></label>
          <input
            v-model="title"
            type="text"
            maxlength="200"
            class="border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="例: 来月のPWについて"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-600">本文 <span class="text-red-500">*</span></label>
          <textarea
            v-model="body"
            rows="8"
            maxlength="5000"
            class="border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            placeholder="お知らせの本文を入力してください"
          />
          <p class="text-[11px] text-gray-400">改行はそのまま表示されます（{{ body.length }} / 5000）</p>
        </div>

        <p v-if="isEdit" class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          <span class="material-icons text-sm align-middle">campaign</span>
          更新すると、既に「確認した」ユーザーにも未読として再表示されます
        </p>

        <p v-if="error" class="text-xs text-red-600">{{ error }}</p>

        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            class="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            @click="emit('close')"
          >キャンセル</button>
          <button
            type="submit"
            :disabled="submitting"
            class="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >{{ isEdit ? '更新' : '追加' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
