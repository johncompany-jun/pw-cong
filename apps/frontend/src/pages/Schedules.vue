<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { API, useApi } from '../composables/useApi'
import { useAuthStore } from '../store/auth'
import { useNavStore } from '../store/nav'
import ScheduleFilterBar from '../components/schedule/ScheduleFilterBar.vue'
import ScheduleList from '../components/schedule/ScheduleList.vue'
import ScheduleFormModal from '../components/schedule/ScheduleFormModal.vue'
import type { ScheduleStatusType } from '../constants/scheduleStatus'

type ScheduleItem = {
  id: number
  date: string
  status: ScheduleStatusType
  spot: { id: number; name: string; startTime: string; endTime: string }
  mcUserId: number | null
  mcUserName: string | null
  applicantCount: number
}

const { authHeaders } = useApi()
const auth = useAuthStore()
const nav = useNavStore()

const schedules = ref<ScheduleItem[]>([])
const pagination = ref({ total: 0, page: 1, totalPages: 1, limit: 10 })
const loading = ref(false)
const error = ref('')
const statusFilter = ref('')
const showModal = ref(false)
const editingSchedule = ref<ScheduleItem | null>(null)

async function fetchSchedules() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      page: String(pagination.value.page),
      limit: '10',
    })
    if (statusFilter.value) params.set('status', statusFilter.value)

    const res = await fetch(`${API}/api/schedules?${params}`, { headers: authHeaders() })
    if (!res.ok) throw new Error('スケジュールの取得に失敗しました')
    const data = await res.json()
    schedules.value = data.data
    pagination.value = data.pagination
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
}

watch(statusFilter, () => {
  pagination.value.page = 1
  fetchSchedules()
})

function onPageChange(page: number) {
  pagination.value.page = page
  fetchSchedules()
}

function openCreate() {
  editingSchedule.value = null
  showModal.value = true
}

function openEdit(schedule: ScheduleItem) {
  editingSchedule.value = schedule
  showModal.value = true
}

function onSaved() {
  showModal.value = false
  fetchSchedules()
}

function onManageApplicants(schedule: ScheduleItem) {
  nav.openApplicantManagement(schedule.id)
}

async function onDelete(id: number) {
  if (!confirm('スケジュールを削除しますか？')) return
  try {
    const res = await fetch(`${API}/api/schedules/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? '削除に失敗しました')
    }
    fetchSchedules()
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}

onMounted(fetchSchedules)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <ScheduleFilterBar v-model="statusFilter" />
      <button
        v-if="auth.user?.isAdmin"
        @click="openCreate"
        class="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        <span class="material-icons text-base">add</span>
        新規作成
      </button>
    </div>

    <ScheduleList
      :schedules="schedules"
      :pagination="pagination"
      :loading="loading"
      :error="error"
      @edit="openEdit"
      @delete="onDelete"
      @page-change="onPageChange"
      @manage-applicants="onManageApplicants"
    />
  </div>

  <ScheduleFormModal
    v-if="showModal"
    :schedule="editingSchedule ?? undefined"
    @close="showModal = false"
    @saved="onSaved"
  />
</template>
