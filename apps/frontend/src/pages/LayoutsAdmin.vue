<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useNotify } from '../composables/useNotify'
import type { LayoutListItem, SpotSummary } from '../types/layout'
import LayoutFormModal from '../components/layout/LayoutFormModal.vue'

const api = useApi()
const notify = useNotify()
const router = useRouter()

const items = ref<LayoutListItem[]>([])
const spots = ref<SpotSummary[]>([])
const loading = ref(false)
const error = ref('')
const filterSpotId = ref<number | ''>('')
const formOpen = ref(false)
const editingId = ref<number | null>(null)

const filtered = computed(() => {
  if (filterSpotId.value === '') return items.value
  return items.value.filter(it => it.spotId === filterSpotId.value)
})

function formatPeriod(start: string, end: string): string {
  if (start === end) return formatDate(start)
  return `${formatDate(start)} 〜 ${formatDate(end)}`
}

function formatDate(d: string): string {
  const [, m, dd] = d.split('-')
  return `${Number(m)}/${Number(dd)}`
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [list, spotList] = await Promise.all([
      api.get<LayoutListItem[]>('/layouts'),
      api.get<SpotSummary[]>('/spots'),
    ])
    items.value = list
    spots.value = spotList
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
  if (!confirm('このレイアウトを削除しますか？')) return
  try {
    await api.delete(`/layouts/${id}`)
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
        <h2 class="mt-0 text-xl font-semibold text-indigo-950">レイアウト管理</h2>
        <p class="text-gray-500 text-sm mt-1">掲示するレイアウト（写真・PDF）を登録します</p>
      </div>
      <button
        type="button"
        class="shrink-0 inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
        @click="openNew"
      >
        <span class="material-icons text-base">add</span>新規追加
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <select
        v-model="filterSpotId"
        class="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
      >
        <option value="">すべてのスポット</option>
        <option v-for="s in spots" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="filtered.length === 0" class="text-sm text-gray-400">レイアウトはありません</div>

    <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
      <li
        v-for="it in filtered"
        :key="it.id"
        class="flex items-start gap-3 py-3 px-1 -mx-1"
      >
        <div
          class="flex flex-col gap-0.5 min-w-0 flex-1 cursor-pointer"
          @click="router.push(`/layouts/${it.id}`)"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatPeriod(it.startDate, it.endDate) }}</span>
            <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-medium whitespace-nowrap">
              <span class="material-icons text-[0.8rem] leading-none">place</span>{{ it.spotName }}
            </span>
            <span v-if="it.fileCount > 0" class="inline-flex items-center gap-0.5 text-xs text-gray-500">
              <span class="material-icons text-sm">attachment</span>{{ it.fileCount }}
            </span>
          </div>
          <span class="text-sm font-medium text-gray-900 truncate">{{ it.title }}</span>
          <span v-if="it.comment" class="text-xs text-gray-500 truncate">{{ it.comment }}</span>
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

    <LayoutFormModal
      v-if="formOpen"
      :layout-id="editingId"
      :spots="spots"
      @close="formOpen = false"
      @saved="onSaved"
    />
  </div>
</template>
