<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../store/auth'
import { useNavStore } from '../store/nav'
import { formatDateFull, parseSlots, isDeadlinePassed } from '../utils'
import type { ScheduleStatusType } from '../constants/scheduleStatus'

type ScheduleItem = {
  id: number
  date: string
  status: ScheduleStatusType
  spot: { id: number; name: string; startTime: string; endTime: string }
}

type MyScheduleItem = ScheduleItem & {
  selectedSlots: string | null
  isMc: boolean
  hasRotation: boolean
}

const api = useApi()
const auth = useAuthStore()
const nav = useNavStore()

const openSchedules = ref<ScheduleItem[]>([])
const mySchedules = ref<MyScheduleItem[]>([])
const loading = ref(false)
const error = ref('')

const myScheduleIds = computed(() => new Set(mySchedules.value.map(s => s.id)))

// 受付中のPW: 締切前 かつ まだ申し込んでいない
const unappliedOpen = computed(() =>
  openSchedules.value.filter(s => !isDeadlinePassed(s.date) && !myScheduleIds.value.has(s.id))
)

// わたしの申込んだPW: 申し込み済み or MC担当 かつ ローテーション未作成
const myApplied = computed(() => mySchedules.value.filter(s => !s.hasRotation))

// 参加予定のPW: ローテーション作成済み
const myConfirmed = computed(() => mySchedules.value.filter(s => s.hasRotation))

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
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="mt-0 text-xl font-semibold text-indigo-950">お知らせ</h2>
      <p class="text-gray-500 text-sm mt-1">ようこそ、{{ auth.user?.name }} さん</p>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <template v-else>
      <!-- 受付中のPW -->
      <div>
        <h3 class="text-base font-semibold text-gray-700 mb-3">受付中のPW</h3>
        <div v-if="unappliedOpen.length === 0" class="text-sm text-gray-400">
          受付中のPWはありません
        </div>
        <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
          <li
            v-for="s in unappliedOpen"
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
            <span class="material-icons text-base text-gray-300 shrink-0">chevron_right</span>
          </li>
        </ul>
      </div>

      <!-- わたしの申込んだPW -->
      <div>
        <h3 class="text-base font-semibold text-gray-700 mb-3">わたしの申込んだPW</h3>
        <div v-if="myApplied.length === 0" class="text-sm text-gray-400">
          申込済みのPWはありません
        </div>
        <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
          <li
            v-for="s in myApplied"
            :key="s.id"
            class="flex items-start gap-4 py-3 cursor-pointer hover:bg-gray-50 rounded transition-colors -mx-1 px-1"
            @click="nav.navigate('/apply')"
          >
            <div class="flex flex-col gap-0.5 min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatDateFull(s.date) }}</span>
                <span class="text-sm text-gray-400 whitespace-nowrap">{{ s.spot.startTime }} 〜 {{ s.spot.endTime }}</span>
                <span class="text-sm font-medium text-gray-900 truncate">{{ s.spot.name }}</span>
              </div>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-if="s.isMc"
                  class="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100"
                >司会者</span>
                <template v-else>
                  <span
                    v-for="slot in parseSlots(s.selectedSlots ?? '')"
                    :key="slot"
                    class="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100"
                  >{{ slot }}</span>
                </template>
              </div>
            </div>
            <span class="material-icons text-base text-gray-300 shrink-0 mt-0.5">chevron_right</span>
          </li>
        </ul>
      </div>

      <!-- 参加予定のPW -->
      <div>
        <h3 class="text-base font-semibold text-gray-700 mb-3">参加予定のPW</h3>
        <div v-if="myConfirmed.length === 0" class="text-sm text-gray-400">
          参加予定のPWはありません
        </div>
        <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
          <li
            v-for="s in myConfirmed"
            :key="s.id"
            class="flex items-start gap-4 py-3 cursor-pointer hover:bg-gray-50 rounded transition-colors -mx-1 px-1"
            @click="nav.openRotationView(s.id)"
          >
            <div class="flex flex-col gap-0.5 min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatDateFull(s.date) }}</span>
                <span class="text-sm text-gray-400 whitespace-nowrap">{{ s.spot.startTime }} 〜 {{ s.spot.endTime }}</span>
                <span class="text-sm font-medium text-gray-900 truncate">{{ s.spot.name }}</span>
              </div>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-if="s.isMc"
                  class="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100"
                >司会者</span>
              </div>
            </div>
            <span
              class="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white shrink-0 mt-0.5"
            >ローテーションへ<span class="material-icons text-sm leading-none">arrow_forward</span></span>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
