<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useNavStore } from '../store/nav'
import { useAuthStore } from '../store/auth'
import ScheduleStatusBadge from '../components/schedule/ScheduleStatusBadge.vue'
import Pagination from '../components/Pagination.vue'

type ScheduleItem = {
  id: number
  date: string
  status: string
  spot: { id: number; name: string; startTime: string; endTime: string }
}

type PaginationData = { total: number; page: number; totalPages: number; limit: number }

const api = useApi()
const nav = useNavStore()
const auth = useAuthStore()

const schedules = ref<ScheduleItem[]>([])
const pagination = ref<PaginationData>({ total: 0, page: 1, totalPages: 0, limit: 25 })
const loading = ref(false)
const error = ref('')

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

async function fetchSchedules(page: number) {
  loading.value = true
  error.value = ''
  try {
    const path = auth.user?.isAdmin
      ? `/schedules?status=confirmed&page=${page}&limit=25`
      : `/applications/my-confirmed-schedules?page=${page}&limit=25`
    const res = await api.get<{ data: ScheduleItem[]; pagination: PaginationData }>(path)
    schedules.value = res.data
    pagination.value = res.pagination
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
}

function onPageChange(page: number) {
  if (page < 1 || page > pagination.value.totalPages) return
  fetchSchedules(page)
}

onMounted(() => fetchSchedules(1))
</script>

<template>
  <div class="flex flex-col gap-5">
    <h2 class="mt-0 text-xl font-semibold text-indigo-950">ローテーション</h2>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="schedules.length === 0" class="text-sm text-gray-400">
      参加予定のスケジュールはありません
    </div>

    <template v-else>
      <ul class="divide-y divide-gray-200 border-t border-b border-gray-200">
        <li
          v-for="s in schedules"
          :key="s.id"
          class="flex items-center gap-2 py-3 hover:bg-gray-50 px-1 cursor-pointer transition-colors"
          @click="nav.openRotationView(s.id)"
        >
          <div class="flex flex-col gap-0.5 min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatDate(s.date) }}</span>
              <span class="text-sm text-gray-400 whitespace-nowrap">{{ s.spot.startTime }} 〜 {{ s.spot.endTime }}</span>
            </div>
            <span class="text-sm font-medium text-gray-900 truncate">{{ s.spot.name }}</span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <ScheduleStatusBadge :status="s.status" />
            <span class="material-icons text-gray-400 text-base">chevron_right</span>
          </div>
        </li>
      </ul>

      <Pagination
        v-if="pagination.totalPages > 1"
        :pagination="pagination"
        @page-change="onPageChange"
      />
    </template>
  </div>
</template>
