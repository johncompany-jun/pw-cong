<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { API, useApi } from '../composables/useApi'
import { formatDateFull, parseSlots, isDeadlinePassed } from '../utils'
import ApplyForm from '../components/apply/ApplyForm.vue'
import ScheduleStatusBadge from '../components/schedule/ScheduleStatusBadge.vue'
import type { ScheduleStatusType } from '../constants/scheduleStatus'

type ScheduleItem = {
  id: number
  date: string
  status: ScheduleStatusType
  spot: { id: number; name: string; startTime: string; endTime: string }
}

type ApplicationItem = {
  id: number
  scheduleId: number
  selectedSlots: string
  cartPrepare: 'yes' | 'no'
  cartCleanup: 'yes' | 'no'
  carTransport: 'yes' | 'no'
  notes: string | null
}

type MyScheduleItem = {
  id: number
  date: string
  status: ScheduleStatusType
  spot: { id: number; name: string; startTime: string; endTime: string }
  selectedSlots: string
}

const { authHeaders } = useApi()

const schedules = ref<ScheduleItem[]>([])
const myApplications = ref<ApplicationItem[]>([])
const mySchedules = ref<MyScheduleItem[]>([])
const pagination = ref({ total: 0, page: 1, totalPages: 1, limit: 10 })
const loading = ref(false)
const error = ref('')
const openFormId = ref<number | null>(null)
const cancelling = ref<number | null>(null)

const applicationMap = computed(() =>
  new Map(myApplications.value.map(a => [a.scheduleId, a]))
)

const pastSchedules = computed(() =>
  mySchedules.value.filter(s => s.status !== 'open')
)

const pageNumbers = computed(() => {
  const { page, totalPages } = pagination.value
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

function appliedFor(scheduleId: number): ApplicationItem | undefined {
  return applicationMap.value.get(scheduleId)
}

function generateSlots(startTime: string, endTime: string): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  const slots: string[] = []
  for (let t = startMin; t + 30 <= endMin; t += 30) {
    const from = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    const to = `${String(Math.floor((t + 30) / 60)).padStart(2, '0')}:${String((t + 30) % 60).padStart(2, '0')}`
    slots.push(`${from}〜${to}`)
  }
  return slots
}


async function fetchData() {
  loading.value = true
  error.value = ''
  openFormId.value = null
  try {
    const params = new URLSearchParams({
      status: 'open',
      page: String(pagination.value.page),
      limit: String(pagination.value.limit),
    })
    const [schRes, appRes, mySchRes] = await Promise.all([
      fetch(`${API}/api/schedules?${params}`, { headers: authHeaders() }),
      fetch(`${API}/api/applications`, { headers: authHeaders() }),
      fetch(`${API}/api/applications/my-schedules`, { headers: authHeaders() }),
    ])
    if (!schRes.ok) throw new Error('スケジュールの取得に失敗しました')
    const schData = await schRes.json()
    schedules.value = schData.data
    pagination.value = schData.pagination
    if (appRes.ok) myApplications.value = await appRes.json()
    if (mySchRes.ok) mySchedules.value = await mySchRes.json()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
}

function onPageChange(page: number) {
  pagination.value.page = page
  fetchData()
}

function onSaved() {
  openFormId.value = null
  fetchData()
}

async function cancel(app: ApplicationItem) {
  if (!confirm('申込を取り消しますか？')) return
  cancelling.value = app.id
  try {
    const res = await fetch(`${API}/api/applications/${app.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? '取消に失敗しました')
    }
    fetchData()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  } finally {
    cancelling.value = null
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="flex flex-col gap-4">
    <h2 class="mt-0 text-xl font-semibold text-indigo-950">PW申込</h2>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div
      v-else-if="schedules.length === 0"
      class="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm shadow-sm"
    >
      受付中のスケジュールはありません
    </div>

    <div v-else class="flex flex-col gap-3">
      <p class="text-xs text-gray-400">全 {{ pagination.total }} 件</p>

      <div
        v-for="s in schedules"
        :key="s.id"
        class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
      >
        <div class="flex items-center justify-between px-5 py-4 gap-3">
          <div class="flex flex-col gap-0.5 min-w-0">
            <p class="text-base font-semibold text-gray-900 truncate">{{ s.spot.name }}</p>
            <p class="text-sm text-gray-500">
              {{ formatDateFull(s.date) }}　{{ s.spot.startTime }} 〜 {{ s.spot.endTime }}
              <span class="ml-2 text-xs text-gray-400">（{{ generateSlots(s.spot.startTime, s.spot.endTime).length }}枠）</span>
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <ScheduleStatusBadge v-if="!isDeadlinePassed(s.date)" :status="s.status" />
            <span
              v-if="appliedFor(s.id)"
              class="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium whitespace-nowrap"
            >
              申込済
            </span>
            <template v-else>
              <span
                v-if="isDeadlinePassed(s.date)"
                class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200 font-medium whitespace-nowrap"
              >
                受付締切
              </span>
              <button
                v-else
                @click="openFormId = openFormId === s.id ? null : s.id"
                class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {{ openFormId === s.id ? '閉じる' : '申し込む' }}
              </button>
            </template>
          </div>
        </div>

        <div
          v-if="appliedFor(s.id)"
          class="border-t border-gray-100 px-5 py-3 bg-indigo-50/50 flex flex-col gap-1.5"
        >
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">申込内容</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="slot in parseSlots(appliedFor(s.id)!.selectedSlots)"
              :key="slot"
              class="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full"
            >{{ slot }}</span>
          </div>
          <div class="flex gap-4 text-xs text-gray-600 flex-wrap">
            <span>カート運搬準備：{{ appliedFor(s.id)!.cartPrepare === 'yes' ? '可' : '不可' }}</span>
            <span>カート運搬片付け：{{ appliedFor(s.id)!.cartCleanup === 'yes' ? '可' : '不可' }}</span>
            <span>車でのカート運搬：{{ appliedFor(s.id)!.carTransport === 'yes' ? '可' : '不可' }}</span>
          </div>
          <p v-if="appliedFor(s.id)!.notes" class="text-xs text-gray-500">
            連絡事項：{{ appliedFor(s.id)!.notes }}
          </p>
          <div class="flex justify-end mt-1">
            <button
              @click="cancel(appliedFor(s.id)!)"
              :disabled="cancelling === appliedFor(s.id)!.id"
              class="text-xs px-3 py-1 text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              申込取消
            </button>
          </div>
        </div>

        <ApplyForm
          v-if="openFormId === s.id && !isDeadlinePassed(s.date)"
          :schedule="s"
          :slots="generateSlots(s.spot.startTime, s.spot.endTime)"
          @saved="onSaved"
          @cancel="openFormId = null"
        />
      </div>

      <div v-if="pagination.totalPages > 1" class="flex items-center justify-between gap-4 pt-1">
        <p class="text-xs text-gray-400">
          {{ pagination.page }} / {{ pagination.totalPages }} ページ
        </p>
        <div class="flex items-center gap-1">
          <button
            @click="onPageChange(pagination.page - 1)"
            :disabled="pagination.page <= 1"
            class="px-2 py-1 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border-gray-300 hover:bg-gray-50 text-gray-600"
          >
            <span class="material-icons text-base leading-none">chevron_left</span>
          </button>
          <template v-for="p in pageNumbers" :key="p">
            <span v-if="p === '...'" class="px-1 text-gray-400 text-sm">…</span>
            <button
              v-else
              @click="onPageChange(p as number)"
              :class="['px-3 py-1 rounded-lg border text-sm transition-colors',
                p === pagination.page
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-600']"
            >{{ p }}</button>
          </template>
          <button
            @click="onPageChange(pagination.page + 1)"
            :disabled="pagination.page >= pagination.totalPages"
            class="px-2 py-1 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border-gray-300 hover:bg-gray-50 text-gray-600"
          >
            <span class="material-icons text-base leading-none">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <template v-if="!loading && !error && pastSchedules.length > 0">
      <div>
        <h3 class="text-base font-semibold text-gray-700 mb-3">申込履歴</h3>
        <div class="flex flex-col gap-3">
          <div
            v-for="s in pastSchedules"
            :key="s.id"
            class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
          >
            <div class="flex items-center justify-between px-5 py-4 gap-3">
              <div class="flex flex-col gap-0.5 min-w-0">
                <p class="text-base font-semibold text-gray-900 truncate">{{ s.spot.name }}</p>
                <p class="text-sm text-gray-500">
                  {{ formatDateFull(s.date) }}　{{ s.spot.startTime }} 〜 {{ s.spot.endTime }}
                </p>
              </div>
              <ScheduleStatusBadge :status="s.status" />
            </div>
            <div class="border-t border-gray-100 px-5 py-3 bg-indigo-50/50 flex flex-col gap-1.5">
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">申込内容</p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="slot in parseSlots(s.selectedSlots)"
                  :key="slot"
                  class="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full"
                >{{ slot }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
