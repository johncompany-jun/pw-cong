<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { LayoutDetail } from '../types/layout'
import LayoutPreview from '../components/layout/LayoutPreview.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()

const layout = ref<LayoutDetail | null>(null)
const loading = ref(false)
const error = ref('')

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
    layout.value = await api.get<LayoutDetail>(`/layouts/${id.value}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
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
      <div class="flex flex-col gap-1 min-w-0">
        <h2 class="text-xl font-semibold text-indigo-950 break-words">{{ layout.title }}</h2>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="text-sm text-gray-600 whitespace-nowrap">{{ formatPeriod(layout.startDate, layout.endDate) }}</span>
          <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[11px] font-medium whitespace-nowrap">
            <span class="material-icons text-[0.9rem] leading-none">place</span>{{ layout.spotName }}
          </span>
        </div>
        <p v-if="layout.comment" class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{{ layout.comment }}</p>
      </div>

      <div class="flex flex-col gap-6">
        <div v-for="f in layout.files" :key="f.id" class="flex flex-col gap-2">
          <span class="text-xs text-gray-500 truncate">{{ f.fileName }}</span>
          <LayoutPreview
            :layout-id="layout.id"
            :file-id="f.id"
            :mime-type="f.mimeType"
            :file-name="f.fileName"
          />
        </div>
      </div>
    </template>
  </div>
</template>
