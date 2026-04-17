<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../store/auth'
import { useNavStore } from '../store/nav'
import { formatDateFull, parseSlots, isDeadlinePassed } from '../utils'
import ScheduleStatusBadge from './schedule/ScheduleStatusBadge.vue'
import type { ScheduleStatusType } from '../constants/scheduleStatus'

type ScheduleItem = {
  id: number
  date: string
  status: ScheduleStatusType
  spot: { id: number; name: string; startTime: string; endTime: string }
}

type MyScheduleItem = ScheduleItem & { selectedSlots: string }

const api = useApi()
const auth = useAuthStore()
const nav = useNavStore()

const openSchedules = ref<ScheduleItem[]>([])
const mySchedules = ref<MyScheduleItem[]>([])

const activeOpenSchedules = computed(() =>
  openSchedules.value.filter(s => !isDeadlinePassed(s.date))
)
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  loading.value = true
  try {
    const [openData, mine] = await Promise.all([
      api.get<{ data: ScheduleItem[] }>('/schedules?status=open&limit=20&page=1'),
      api.get<MyScheduleItem[]>('/applications/my-schedules'),
    ])
    openSchedules.value = openData.data
    mySchedules.value = mine
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <h2 class="mt-0 text-xl font-semibold text-indigo-950">ダッシュボード</h2>
      <p class="text-gray-500 text-sm mt-1">ようこそ、{{ auth.user?.name }} さん</p>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <template v-else>
      <div>
        <h3 class="text-base font-semibold text-gray-700 mb-3">受付中のスケジュール</h3>
        <div v-if="activeOpenSchedules.length === 0" class="text-sm text-gray-400">
          受付中のスケジュールはありません
        </div>
        <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
          <li
            v-for="s in activeOpenSchedules"
            :key="s.id"
            class="flex items-center gap-2 py-3 cursor-pointer hover:bg-gray-50 rounded transition-colors -mx-1 px-1"
            @click="nav.navigate('/apply')"
          >
            <div class="flex flex-col gap-0.5 min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatDateFull(s.date) }}</span>
                <span class="text-sm text-gray-400 whitespace-nowrap">{{ s.spot.startTime }} 〜 {{ s.spot.endTime }}</span>
              </div>
              <span class="text-sm font-medium text-gray-900 truncate">{{ s.spot.name }}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <ScheduleStatusBadge :status="s.status" />
              <span class="material-icons text-base text-gray-300">chevron_right</span>
            </div>
          </li>
        </ul>
      </div>

      <div>
        <h3 class="text-base font-semibold text-gray-700 mb-3">参加予定</h3>
        <div v-if="mySchedules.length === 0" class="text-sm text-gray-400">
          申込済みのスケジュールはありません
        </div>
        <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
          <li
            v-for="s in mySchedules"
            :key="s.id"
            class="flex items-start gap-4 py-3 cursor-pointer hover:bg-gray-50 rounded transition-colors -mx-1 px-1"
            @click="s.status === 'confirmed' ? nav.openRotationView(s.id) : nav.navigate('/apply')"
          >
            <div class="flex flex-col gap-0.5 min-w-0 flex-1">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatDateFull(s.date) }}</span>
                <span class="text-sm text-gray-400 whitespace-nowrap">{{ s.spot.startTime }} 〜 {{ s.spot.endTime }}</span>
                <span class="text-sm font-medium text-gray-900 truncate">{{ s.spot.name }}</span>
              </div>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="slot in parseSlots(s.selectedSlots)"
                  :key="slot"
                  class="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100"
                >{{ slot }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <ScheduleStatusBadge :status="s.status" />
              <span class="material-icons text-base text-gray-300">chevron_right</span>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
