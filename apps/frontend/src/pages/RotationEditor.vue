<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useNavStore } from '../store/nav'
import { useRotationGrid, type SpotPoint } from '../composables/useRotationGrid'
import { formatDateFull } from '../utils'
import RotationGrid from '../components/rotation/RotationGrid.vue'

type Participant = { userId: number; name: string; approvedSlots: string[] }
type Assignment = { id: number; timeSlot: string; columnKey: string; userId: number; userName: string }
type ScheduleInfo = {
  id: number; date: string; status: string; slotGranularity: number; rotationNotes: string | null; mcUserName: string | null
  spot: { id: number; name: string; startTime: string; endTime: string }
}

const api = useApi()
const nav = useNavStore()
const route = useRoute()
const scheduleId = Number(route.params.id)

const schedule = ref<ScheduleInfo | null>(null)
const points = ref<SpotPoint[]>([])
const participants = ref<Participant[]>([])
const assignments = ref<Assignment[]>([])
const loading = ref(false)
const error = ref('')
const confirming = ref(false)
const notes = ref('')
const savingNotes = ref(false)

const { rotationSlots, columns, parentSlot } = useRotationGrid(schedule, points)

async function saveNotes() {
  if (!schedule.value) return
  savingNotes.value = true
  try {
    await api.put(`/schedules/${schedule.value.id}`, { rotationNotes: notes.value || null })
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  } finally {
    savingNotes.value = false
  }
}

async function setStatus(status: 'confirmed' | 'open') {
  if (!schedule.value) return
  confirming.value = true
  try {
    await api.put(`/schedules/${schedule.value.id}`, { status })
    schedule.value = { ...schedule.value, status }
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  } finally {
    confirming.value = false
  }
}

function availableFor(timeSlot: string): Participant[] {
  const parent = parentSlot(timeSlot)
  return participants.value.filter(p => p.approvedSlots.includes(parent))
}

function cellUserId(timeSlot: string, colKey: string): number | null {
  const a = assignments.value.find(a => a.timeSlot === timeSlot && a.columnKey === colKey)
  return a ? a.userId : null
}

function assignedUserIds(timeSlot: string, excludeColKey: string): Set<number> {
  return new Set(
    assignments.value
      .filter(a => a.timeSlot === timeSlot && a.columnKey !== excludeColKey)
      .map(a => a.userId)
  )
}

async function onCellChange(timeSlot: string, colKey: string, event: Event) {
  const select = event.target as HTMLSelectElement
  const userId = select.value ? Number(select.value) : null
  try {
    await api.put(`/rotations/${scheduleId}/cell`, { timeSlot, columnKey: colKey, userId })
    assignments.value = assignments.value.filter(a => !(a.timeSlot === timeSlot && a.columnKey === colKey))
    if (userId !== null) {
      const p = participants.value.find(p => p.userId === userId)
      if (p) {
        assignments.value.push({ id: Date.now(), timeSlot, columnKey: colKey, userId, userName: p.name })
      }
    }
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
    select.value = String(cellUserId(timeSlot, colKey) ?? '')
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await api.get<{
      schedule: ScheduleInfo
      points: SpotPoint[]
      participants: Participant[]
      assignments: Assignment[]
    }>(`/rotations/${scheduleId}`)
    schedule.value = data.schedule
    points.value = data.points
    participants.value = data.participants
    assignments.value = data.assignments
    notes.value = data.schedule.rotationNotes ?? ''
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
      @click="nav.navigate('/rotation')"
      class="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
    >
      <span class="material-icons text-base">arrow_back</span>
      ローテーション管理に戻る
    </button>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <template v-else-if="schedule">
      <div>
        <h2 class="mt-0 text-xl font-semibold text-indigo-950">ローテーション編集</h2>
        <p class="text-sm text-gray-500 mt-1">
          {{ formatDateFull(schedule.date) }}　{{ schedule.spot.name }}
          　{{ schedule.spot.startTime }} 〜 {{ schedule.spot.endTime }}
          　{{ schedule.slotGranularity }}分枠
          <span v-if="schedule.mcUserName">　司会: {{ schedule.mcUserName }}</span>
        </p>
      </div>

      <div v-if="points.length === 0" class="text-sm text-gray-400">
        このスポットにポイントが登録されていません
      </div>
      <div v-else-if="participants.length === 0" class="text-sm text-gray-400">
        確定済みの参加者がいません
      </div>

      <RotationGrid v-else :rotation-slots="rotationSlots" :columns="columns">
        <template #default="{ timeSlot, col }">
          <select
            :value="cellUserId(timeSlot, col.key) ?? ''"
            @change="onCellChange(timeSlot, col.key, $event)"
            class="w-full text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
            :class="cellUserId(timeSlot, col.key) ? 'border-indigo-300 bg-indigo-50 text-indigo-800 font-medium' : ''"
          >
            <option value="">---</option>
            <option
              v-for="p in availableFor(timeSlot)"
              :key="p.userId"
              :value="p.userId"
              :disabled="assignedUserIds(timeSlot, col.key).has(p.userId)"
            >
              {{ p.name }}{{ assignedUserIds(timeSlot, col.key).has(p.userId) ? ' (配置済)' : '' }}
            </option>
          </select>
        </template>
      </RotationGrid>

      <p class="text-xs text-gray-400">
        ※ 選択できるのはその時間帯に参加確定している方のみです。同一人物を同じ時間帯に複数箇所へ配置することはできません。
      </p>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-700">注意事項（任意）</label>
        <textarea
          v-model="notes"
          @blur="saveNotes"
          :disabled="savingNotes"
          rows="4"
          placeholder="参加者へ伝える注意事項があれば入力してください"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-60 resize-y"
        />
        <p class="text-xs text-gray-400">フォームからフォーカスが外れたときに自動保存されます</p>
      </div>

      <div class="flex justify-end pt-2">
        <div v-if="schedule.status === 'confirmed'" class="flex items-center gap-3">
          <span class="flex items-center gap-2 text-sm text-blue-700 font-semibold">
            <span class="material-icons text-base">check_circle</span>
            確定済み
          </span>
          <button
            @click="setStatus('open')"
            :disabled="confirming"
            class="text-xs px-3 py-1.5 border border-gray-300 hover:border-red-300 text-gray-500 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
          >確定を解除する</button>
        </div>
        <button
          v-else
          @click="setStatus('confirmed')"
          :disabled="confirming"
          class="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
        >
          <span class="material-icons text-base">check_circle</span>
          {{ confirming ? '確定中...' : 'スケジュールを確定する' }}
        </button>
      </div>
    </template>
  </div>
</template>
