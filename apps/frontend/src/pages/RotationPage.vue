<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useNavStore } from '../store/nav'
import { formatDateFull, isDeadlinePassed } from '../utils'
import ScheduleStatusBadge from '../components/schedule/ScheduleStatusBadge.vue'

type ScheduleItem = {
  id: number
  date: string
  status: string
  slotGranularity: number
  spot: { id: number; name: string; startTime: string; endTime: string }
  applicantCount: number
}

const api = useApi()
const nav = useNavStore()

const schedules = ref<ScheduleItem[]>([])
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  loading.value = true
  try {
    const [open, confirmed] = await Promise.all([
      api.get<{ data: ScheduleItem[] }>('/schedules?status=open&limit=50&page=1'),
      api.get<{ data: ScheduleItem[] }>('/schedules?status=confirmed&limit=50&page=1'),
    ])
    schedules.value = [...open.data, ...confirmed.data]
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <h2 class="mt-0 text-xl font-semibold text-indigo-950">ローテーション管理</h2>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="schedules.length === 0" class="text-sm text-gray-400">
      確定済みのスケジュールはありません
    </div>

    <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
      <li
        v-for="s in schedules"
        :key="s.id"
        class="flex items-center gap-2 py-3 hover:bg-gray-50 px-1 cursor-pointer transition-colors"
        @click="nav.openRotationEditor(s.id)"
      >
        <div class="flex flex-col gap-0.5 min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatDateFull(s.date) }}</span>
            <span class="text-sm text-gray-400 whitespace-nowrap">{{ s.spot.startTime }} 〜 {{ s.spot.endTime }}</span>
          </div>
          <span class="text-sm font-medium text-gray-900 truncate">{{ s.spot.name }}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span
            v-if="s.status === 'open' && isDeadlinePassed(s.date)"
            class="inline-block px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-500 border-gray-300"
          >受付締切</span>
          <ScheduleStatusBadge v-else :status="s.status" />
          <span class="material-icons text-gray-400 text-base">chevron_right</span>
        </div>
      </li>
    </ul>
  </div>
</template>
