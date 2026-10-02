<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { LayoutListItem, SpotSummary } from '../types/layout'

const api = useApi()
const router = useRouter()

const items = ref<LayoutListItem[]>([])
const spots = ref<SpotSummary[]>([])
const loading = ref(false)
const error = ref('')
const filterSpotId = ref<number | ''>('')
const onlyActive = ref(false)

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const filtered = computed(() => {
  return items.value.filter(it => {
    if (filterSpotId.value !== '' && it.spotId !== filterSpotId.value) return false
    if (onlyActive.value) {
      if (todayStr.value < it.startDate || todayStr.value > it.endDate) return false
    }
    return true
  })
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

onMounted(fetchData)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="mt-0 text-xl font-semibold text-indigo-950">レイアウト</h2>
      <p class="text-gray-500 text-sm mt-1">スポットごとのレイアウトを閲覧できます</p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <select
        v-model="filterSpotId"
        class="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
      >
        <option value="">すべてのスポット</option>
        <option v-for="s in spots" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <label class="inline-flex items-center gap-1.5 text-sm text-gray-600">
        <input type="checkbox" v-model="onlyActive" class="accent-indigo-600" />
        今日有効なもののみ
      </label>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="filtered.length === 0" class="text-sm text-gray-400">レイアウトはありません</div>

    <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
      <li
        v-for="it in filtered"
        :key="it.id"
        class="flex items-start gap-3 py-3 px-1 -mx-1 cursor-pointer hover:bg-gray-50 rounded transition-colors"
        @click="router.push(`/layouts/${it.id}`)"
      >
        <div class="flex flex-col gap-0.5 min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatPeriod(it.startDate, it.endDate) }}</span>
            <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-medium whitespace-nowrap">
              <span class="material-icons text-[0.8rem] leading-none">place</span>{{ it.spotName }}
            </span>
          </div>
          <span class="text-sm font-medium text-gray-900 truncate">{{ it.title }}</span>
          <span v-if="it.comment" class="text-xs text-gray-500 truncate">{{ it.comment }}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0 pt-1">
          <span v-if="it.fileCount > 0" class="inline-flex items-center gap-0.5 text-xs text-gray-500">
            <span class="material-icons text-sm">attachment</span>{{ it.fileCount }}
          </span>
          <span class="material-icons text-base text-gray-300">chevron_right</span>
        </div>
      </li>
    </ul>
  </div>
</template>
