<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useNavStore } from '../store/nav'
import { useAuthStore } from '../store/auth'
import { useRotationGrid } from '../composables/useRotationGrid'
import { formatDateFull } from '../utils'
import RotationGrid from '../components/rotation/RotationGrid.vue'
import CartTransportSection from '../components/rotation/CartTransportSection.vue'

type SpotPoint = { id: number; name: string; sortOrder: number; lat: number | null; lng: number | null; address: string | null }
type AssignmentType = 'cart_prepare' | 'cart_cleanup' | 'transport_go' | 'transport_return'
type Assignment = { id: number; timeSlot: string; columnKey: string; userId: number; userName: string }
type SpecialAssignment = { id: number; assignmentType: AssignmentType; userId: number; userName: string }
type ScheduleInfo = {
  id: number; date: string; status: string; slotGranularity: number; rotationNotes: string | null; mcUserName: string | null
  spot: { id: number; name: string; startTime: string; endTime: string }
}

const api = useApi()
const nav = useNavStore()
const auth = useAuthStore()
const route = useRoute()
const scheduleId = Number(route.params.id)

const schedule = ref<ScheduleInfo | null>(null)
const points = ref<SpotPoint[]>([])
const assignments = ref<Assignment[]>([])
const specialAssignmentsList = ref<SpecialAssignment[]>([])
const loading = ref(false)
const error = ref('')

const { rotationSlots, columns } = useRotationGrid(schedule, points)

function cellAssignment(timeSlot: string, colKey: string): Assignment | null {
  return assignments.value.find(a => a.timeSlot === timeSlot && a.columnKey === colKey) ?? null
}

function isMyCell(timeSlot: string, colKey: string): boolean {
  return cellAssignment(timeSlot, colKey)?.userId === auth.user?.id
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await api.get<{
      schedule: ScheduleInfo
      points: SpotPoint[]
      participants: unknown[]
      assignments: Assignment[]
      specialAssignments: SpecialAssignment[]
    }>(`/rotations/${scheduleId}`)
    schedule.value = data.schedule
    points.value = data.points
    assignments.value = data.assignments
    specialAssignmentsList.value = data.specialAssignments
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <button
      @click="nav.navigate('/my-rotation')"
      class="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
    >
      <span class="material-icons text-base">arrow_back</span>
      ローテーション一覧に戻る
    </button>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <template v-else-if="schedule">
      <div>
        <h2 class="mt-0 text-xl font-semibold text-indigo-950">ローテーション</h2>
        <p class="text-sm text-gray-500 mt-1">
          {{ formatDateFull(schedule.date) }}　{{ schedule.spot.name }}
          　{{ schedule.spot.startTime }} 〜 {{ schedule.spot.endTime }}
          <span v-if="schedule.mcUserName">　司会: {{ schedule.mcUserName }}</span>
        </p>
      </div>

      <div v-if="points.length === 0" class="text-sm text-gray-400">
        このスポットにポイントが登録されていません
      </div>

      <div v-if="points.length > 0" class="flex flex-col gap-1">
        <p class="text-xs font-medium text-gray-500 mb-1">ポイント一覧</p>
        <div
          v-for="(point, i) in points"
          :key="point.id"
          class="flex items-center gap-2 text-sm"
        >
          <span class="text-xs text-gray-400 w-5 text-center shrink-0">{{ i + 1 }}</span>
          <span class="font-medium text-gray-700">{{ point.name }}</span>
          <a
            v-if="point.lat !== null"
            :href="`https://www.google.com/maps?q=${point.lat},${point.lng}`"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-700 underline transition-colors"
          >
            <span class="material-icons text-[0.85rem]">open_in_new</span>
            {{ point.address ?? 'マップで開く' }}
          </a>
          <span v-else class="text-xs text-gray-400">（位置未設定）</span>
        </div>
      </div>

      <RotationGrid v-if="points.length > 0" :rotation-slots="rotationSlots" :columns="columns">
        <template #default="{ timeSlot, col }">
          <span
            v-if="cellAssignment(timeSlot, col.key)"
            class="inline-block text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap"
            :class="isMyCell(timeSlot, col.key)
              ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300'
              : 'text-gray-700'"
          >
            {{ cellAssignment(timeSlot, col.key)?.userName }}
          </span>
          <span v-else class="text-gray-200 text-xs">---</span>
        </template>
      </RotationGrid>

      <div v-if="schedule.rotationNotes" class="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <h3 class="text-sm font-semibold text-amber-800 mb-1">注意事項</h3>
        <p class="text-sm text-amber-700 whitespace-pre-wrap">{{ schedule.rotationNotes }}</p>
      </div>

      <CartTransportSection
        :special-assignments="specialAssignmentsList"
        :current-user-id="auth.user?.id"
      />
    </template>
  </div>
</template>
