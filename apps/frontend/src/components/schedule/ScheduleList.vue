<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../store/auth'
import ScheduleStatusBadge from './ScheduleStatusBadge.vue'
import type { ScheduleStatusType } from '../../constants/scheduleStatus'

type ScheduleItem = {
  id: number
  date: string
  status: ScheduleStatusType
  spot: { id: number; name: string; startTime: string; endTime: string }
  mcUserId: number | null
  mcUserName: string | null
  applicantCount: number
}

type Pagination = { total: number; page: number; totalPages: number; limit: number }

const props = defineProps<{
  schedules: ScheduleItem[]
  pagination: Pagination
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  edit: [schedule: ScheduleItem]
  delete: [id: number]
  pageChange: [page: number]
  manageApplicants: [schedule: ScheduleItem]
}>()

const auth = useAuthStore()

const pageNumbers = computed(() => {
  const { page, totalPages } = props.pagination
  const range: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) range.push(i)
  } else {
    range.push(1)
    if (page > 3) range.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i)
    if (page < totalPages - 2) range.push('...')
    range.push(totalPages)
  }
  return range
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
    <div v-if="loading" class="p-8 text-center text-gray-400 text-sm">読み込み中...</div>
    <div v-else-if="error" class="p-8 text-center text-red-500 text-sm">{{ error }}</div>
    <div v-else-if="schedules.length === 0" class="p-8 text-center text-gray-400 text-sm">
      スケジュールがありません
    </div>
    <template v-else>
      <div class="overflow-x-auto">
        <table class="w-max border-separate border-spacing-0 text-sm">
          <thead class="sticky top-0 z-10">
            <tr class="border-b border-gray-200 bg-gray-50">
              <th class="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap sticky left-0 z-20 bg-gray-50 border-b border-gray-200">日付</th>
              <th class="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap bg-gray-50 border-b border-gray-200">スポット</th>
              <th class="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap bg-gray-50 border-b border-gray-200">時間</th>
              <th class="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap bg-gray-50 border-b border-gray-200">司会者</th>
              <th class="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap bg-gray-50 border-b border-gray-200">ステータス</th>
              <th class="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap bg-gray-50 border-b border-gray-200">申込数</th>
              <th v-if="auth.user?.isAdmin" class="px-4 py-3 bg-gray-50 border-b border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="s in schedules"
              :key="s.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="px-4 py-3 text-gray-900 whitespace-nowrap sticky left-0 bg-white border-b border-gray-100">{{ formatDate(s.date) }}</td>
              <td class="px-4 py-3 text-gray-700 font-medium border-b border-gray-100">{{ s.spot.name }}</td>
              <td class="px-4 py-3 text-gray-500 whitespace-nowrap border-b border-gray-100">
                {{ s.spot.startTime }} 〜 {{ s.spot.endTime }}
              </td>
              <td class="px-4 py-3 text-gray-700 text-sm whitespace-nowrap border-b border-gray-100">
                {{ s.mcUserName ?? '―' }}
              </td>
              <td class="px-4 py-3 border-b border-gray-100">
                <ScheduleStatusBadge :status="s.status" />
              </td>
              <td class="px-4 py-3 text-gray-700 text-sm border-b border-gray-100">
                {{ s.applicantCount }}人
              </td>
              <td v-if="auth.user?.isAdmin" class="px-4 py-3 text-right whitespace-nowrap border-b border-gray-100">
                <button
                  @click="emit('manageApplicants', s)"
                  class="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs transition-colors mr-1"
                >申込者管理</button>
                <button
                  @click="emit('edit', s)"
                  class="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs transition-colors mr-1"
                >編集</button>
                <button
                  @click="emit('delete', s.id)"
                  class="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs transition-colors"
                >削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ページネーション -->
      <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-4">
        <p class="text-xs text-gray-400">
          全 {{ pagination.total }} 件 / {{ pagination.page }} / {{ pagination.totalPages }} ページ
        </p>
        <div class="flex items-center gap-1">
          <button
            @click="emit('pageChange', pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-2 py-1 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border-gray-300 hover:bg-gray-50 text-gray-600"
          >
            <span class="material-icons text-base leading-none">chevron_left</span>
          </button>
          <template v-for="p in pageNumbers" :key="p">
            <span v-if="p === '...'" class="px-1 text-gray-400 text-sm">…</span>
            <button
              v-else
              @click="emit('pageChange', p as number)"
              :class="['px-3 py-1 rounded-lg border text-sm transition-colors',
                p === pagination.page
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-600']"
            >{{ p }}</button>
          </template>
          <button
            @click="emit('pageChange', pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="px-2 py-1 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border-gray-300 hover:bg-gray-50 text-gray-600"
          >
            <span class="material-icons text-base leading-none">chevron_right</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
