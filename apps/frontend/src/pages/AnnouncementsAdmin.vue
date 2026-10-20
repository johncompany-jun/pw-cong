<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useNotify } from '../composables/useNotify'
import type { Announcement } from '../types/announcement'
import AnnouncementFormModal from '../components/announcement/AnnouncementFormModal.vue'

const api = useApi()
const notify = useNotify()

const items = ref<Announcement[]>([])
const loading = ref(false)
const error = ref('')
const formOpen = ref(false)
const editingId = ref<number | null>(null)

function formatDateTime(s: string): string {
  // "YYYY-MM-DD HH:MM:SS" → "YYYY/M/D HH:MM"
  const [date, time] = s.split(' ')
  if (!date) return s
  const [y, m, d] = date.split('-')
  const hhmm = time ? time.slice(0, 5) : ''
  return `${y}/${Number(m)}/${Number(d)}${hhmm ? ' ' + hhmm : ''}`
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    items.value = await api.get<Announcement[]>('/announcements')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
}

function openNew() {
  editingId.value = null
  formOpen.value = true
}

function openEdit(id: number) {
  editingId.value = id
  formOpen.value = true
}

async function onDelete(id: number) {
  if (!confirm('このお知らせを削除しますか？')) return
  try {
    await api.delete(`/announcements/${id}`)
    notify.success('削除しました')
    fetchData()
  } catch (e: unknown) {
    notify.error(e instanceof Error ? e.message : '削除に失敗しました')
  }
}

function onSaved() {
  formOpen.value = false
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="mt-0 text-xl font-semibold text-indigo-950">お知らせ管理</h2>
        <p class="text-gray-500 text-sm mt-1">ダッシュボードに表示されるお知らせを登録します</p>
      </div>
      <button
        type="button"
        class="shrink-0 inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
        @click="openNew"
      >
        <span class="material-icons text-base">add</span>新規追加
      </button>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="items.length === 0" class="text-sm text-gray-400">お知らせはありません</div>

    <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
      <li
        v-for="it in items"
        :key="it.id"
        class="flex items-start gap-3 py-3 px-1 -mx-1"
      >
        <div class="flex flex-col gap-0.5 min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span class="text-xs text-gray-500 whitespace-nowrap">{{ formatDateTime(it.updatedAt) }}</span>
            <span v-if="it.createdByName" class="text-xs text-gray-400">{{ it.createdByName }}</span>
          </div>
          <span class="text-sm font-medium text-gray-900 truncate">{{ it.title }}</span>
          <span class="text-xs text-gray-500 line-clamp-2 whitespace-pre-wrap">{{ it.body }}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0 pt-1">
          <button
            type="button"
            class="inline-flex items-center gap-0.5 px-2 py-1 text-xs border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-50"
            @click="openEdit(it.id)"
          ><span class="material-icons text-sm">edit</span>編集</button>
          <button
            type="button"
            class="inline-flex items-center gap-0.5 px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
            @click="onDelete(it.id)"
          ><span class="material-icons text-sm">delete</span>削除</button>
        </div>
      </li>
    </ul>

    <AnnouncementFormModal
      v-if="formOpen"
      :announcement-id="editingId"
      @close="formOpen = false"
      @saved="onSaved"
    />
  </div>
</template>
