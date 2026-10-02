<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../store/auth'
import { useNotify } from '../composables/useNotify'
import type { LayoutDetail, SpotSummary } from '../types/layout'
import LayoutPreview from '../components/layout/LayoutPreview.vue'
import LayoutFormModal from '../components/layout/LayoutFormModal.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()
const auth = useAuthStore()
const notify = useNotify()

const layout = ref<LayoutDetail | null>(null)
const spots = ref<SpotSummary[]>([])
const loading = ref(false)
const error = ref('')
const formOpen = ref(false)

const isAdmin = computed(() => !!auth.user?.isAdmin)
const id = computed(() => Number(route.params.id))

function formatPeriod(start: string, end: string): string {
  if (start === end) return formatDate(start)
  return `${formatDate(start)} 〜 ${formatDate(end)}`
}

function formatDate(d: string): string {
  const [y, m, dd] = d.split('-')
  return `${y}/${Number(m)}/${Number(dd)}`
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [row, spotList] = await Promise.all([
      api.get<LayoutDetail>(`/layouts/${id.value}`),
      api.get<SpotSummary[]>('/spots'),
    ])
    layout.value = row
    spots.value = spotList
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
}

async function onDelete() {
  if (!layout.value) return
  if (!confirm('このレイアウトを削除しますか？')) return
  try {
    await api.delete(`/layouts/${layout.value.id}`)
    notify.success('削除しました')
    router.push('/layouts')
  } catch (e: unknown) {
    notify.error(e instanceof Error ? e.message : '削除に失敗しました')
  }
}

async function onDeleteFile(fileId: number) {
  if (!layout.value) return
  if (!confirm('このファイルを削除しますか？')) return
  try {
    await api.delete(`/layouts/${layout.value.id}/files/${fileId}`)
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
    <div>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        @click="router.push('/layouts')"
      >
        <span class="material-icons text-base">arrow_back</span>一覧に戻る
      </button>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <template v-else-if="layout">
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-1 min-w-0 flex-1">
          <h2 class="text-xl font-semibold text-indigo-950 break-words">{{ layout.title }}</h2>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="text-sm text-gray-600 whitespace-nowrap">{{ formatPeriod(layout.startDate, layout.endDate) }}</span>
            <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[11px] font-medium whitespace-nowrap">
              <span class="material-icons text-[0.9rem] leading-none">place</span>{{ layout.spotName }}
            </span>
          </div>
          <p v-if="layout.comment" class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{{ layout.comment }}</p>
        </div>
        <div v-if="isAdmin" class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-50"
            @click="formOpen = true"
          ><span class="material-icons text-base">edit</span>編集</button>
          <button
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50"
            @click="onDelete"
          ><span class="material-icons text-base">delete</span>削除</button>
        </div>
      </div>

      <div class="flex flex-col gap-6">
        <div v-for="f in layout.files" :key="f.id" class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-gray-500 truncate">{{ f.fileName }}</span>
            <button
              v-if="isAdmin && layout.files.length > 1"
              type="button"
              class="shrink-0 text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-0.5"
              @click="onDeleteFile(f.id)"
            ><span class="material-icons text-sm">delete</span>削除</button>
          </div>
          <LayoutPreview
            :layout-id="layout.id"
            :file-id="f.id"
            :mime-type="f.mimeType"
            :file-name="f.fileName"
          />
        </div>
      </div>

      <LayoutFormModal
        v-if="formOpen"
        :layout-id="layout.id"
        :spots="spots"
        @close="formOpen = false"
        @saved="onSaved"
      />
    </template>
  </div>
</template>
