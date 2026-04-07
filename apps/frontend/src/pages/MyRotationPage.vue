<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useNavStore } from '../store/nav'
import { useAuthStore } from '../store/auth'
import ScheduleStatusBadge from '../components/schedule/ScheduleStatusBadge.vue'

type ScheduleItem = {
  id: number
  date: string
  status: string
  spot: { id: number; name: string; startTime: string; endTime: string }
}

const api = useApi()
const nav = useNavStore()
const auth = useAuthStore()

const schedules = ref<ScheduleItem[]>([])
const loading = ref(false)
const error = ref('')

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

onMounted(async () => {
  loading.value = true
  try {
    if (auth.user?.isAdmin) {
      const res = await api.get<{ data: ScheduleItem[] }>('/schedules?status=confirmed&limit=50&page=1')
      schedules.value = res.data.sort((a, b) => a.date.localeCompare(b.date))
    } else {
      schedules.value = await api.get<ScheduleItem[]>('/applications/my-confirmed-schedules')
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <h2 class="mt-0 text-xl font-semibold text-indigo-950">ローテーション</h2>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="schedules.length === 0" class="text-sm text-gray-400">
      参加予定のスケジュールはありません
    </div>

    <ul v-else class="divide-y divide-gray-200 border-t border-b border-gray-200">
      <li
        v-for="s in schedules"
        :key="s.id"
        class="flex items-center gap-4 py-3 hover:bg-gray-50 px-1 cursor-pointer transition-colors"
        @click="nav.openRotationView(s.id)"
      >
        <span class="text-sm text-gray-500 whitespace-nowrap">{{ formatDate(s.date) }}</span>
        <span class="text-sm text-gray-400 whitespace-nowrap">{{ s.spot.startTime }} 〜 {{ s.spot.endTime }}</span>
        <span class="text-sm font-medium text-gray-900 flex-1 truncate">{{ s.spot.name }}</span>
        <ScheduleStatusBadge :status="s.status" />
        <span class="material-icons text-gray-400 text-base">chevron_right</span>
      </li>
    </ul>
  </div>
</template>
