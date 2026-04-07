<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useNavStore } from '../store/nav'

type AssignmentType = 'cart_prepare' | 'cart_cleanup' | 'transport_go' | 'transport_return'

type ScheduleDetail = {
  id: number
  date: string
  status: string
  slotGranularity: number
  spotPointCount: number
  spot: { id: number; name: string; startTime: string; endTime: string }
}

type Applicant = {
  id: number
  scheduleId: number
  userId: number
  selectedSlots: string
  approvedSlots: string | null
  cartPrepare: 'yes' | 'no'
  cartCleanup: 'yes' | 'no'
  carTransport: 'yes' | 'no'
  notes: string | null
  participationStatus: 'pending' | 'approved' | 'rejected'
  createdAt: string
  user: { id: number; name: string; email: string }
}

type SpecialAssignment = {
  id: number
  scheduleId: number
  userId: number
  assignmentType: AssignmentType
  user: { id: number; name: string }
}

const ASSIGNMENT_LABELS: Record<AssignmentType, string> = {
  cart_prepare: 'カート準備',
  cart_cleanup: 'カート片付け',
  transport_go: '運搬（行き）',
  transport_return: '運搬（帰り）',
}

const ASSIGNMENT_CAPABILITY: Record<AssignmentType, 'cartPrepare' | 'cartCleanup' | 'carTransport'> = {
  cart_prepare: 'cartPrepare',
  cart_cleanup: 'cartCleanup',
  transport_go: 'carTransport',
  transport_return: 'carTransport',
}

const api = useApi()
const nav = useNavStore()
const route = useRoute()
const scheduleId = Number(route.params.id)

const schedule = ref<ScheduleDetail | null>(null)
const applicants = ref<Applicant[]>([])
const specialAssignments = ref<SpecialAssignment[]>([])
const loading = ref(false)
const error = ref('')
const togglingSlot = ref<string | null>(null)
const granularity = ref(30)

async function saveGranularity(value: number) {
  granularity.value = value
  if (!schedule.value) return
  try {
    await api.put(`/schedules/${scheduleId}`, { slotGranularity: value })
    schedule.value = { ...schedule.value, slotGranularity: value }
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}

const slots = computed(() => {
  if (!schedule.value) return []
  const { startTime, endTime } = schedule.value.spot
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  const result: string[] = []
  for (let t = startMin; t + 30 <= endMin; t += 30) {
    const from = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    const to = `${String(Math.floor((t + 30) / 60)).padStart(2, '0')}:${String((t + 30) % 60).padStart(2, '0')}`
    result.push(`${from}〜${to}`)
  }
  return result
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

function parseSlots(json: string | null): string[] {
  try { return JSON.parse(json ?? '[]') } catch { return [] }
}

function hasSlot(a: Applicant, slot: string) {
  return parseSlots(a.selectedSlots).includes(slot)
}

function isChecked(a: Applicant, slot: string) {
  return parseSlots(a.approvedSlots).includes(slot)
}

function slotCheckedCount(slot: string) {
  return applicants.value.filter(a => isChecked(a, slot)).length
}

function assignedUsers(type: AssignmentType) {
  return specialAssignments.value.filter(a => a.assignmentType === type)
}

function candidates(type: AssignmentType) {
  const cap = ASSIGNMENT_CAPABILITY[type]
  const assignedIds = assignedUsers(type).map(a => a.userId)
  return applicants.value.filter(
    a => a[cap] === 'yes' && parseSlots(a.approvedSlots).length > 0 && !assignedIds.includes(a.userId),
  )
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [sch, apps, assignments] = await Promise.all([
      api.get<ScheduleDetail>(`/schedules/${scheduleId}`),
      api.get<Applicant[]>(`/applications/by-schedule/${scheduleId}`),
      api.get<SpecialAssignment[]>(`/special-assignments/${scheduleId}`),
    ])
    schedule.value = sch
    granularity.value = sch.slotGranularity ?? 30
    applicants.value = apps
    specialAssignments.value = assignments
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
}

// 枠セルをクリック → チェック/解除（参加ステータスは自動管理）
async function toggleSlot(a: Applicant, slot: string) {
  if (!hasSlot(a, slot)) return
  const key = `${a.id}-${slot}`
  if (togglingSlot.value === key) return
  togglingSlot.value = key

  const current = parseSlots(a.approvedSlots)
  const next = current.includes(slot)
    ? current.filter(s => s !== slot)
    : [...current, slot]

  try {
    // approvedSlots更新 + 参加ステータスも自動で設定
    const [updated] = await Promise.all([
      api.put<Applicant>(`/applications/${a.id}/approved-slots`, { approvedSlots: next }),
      api.put(`/applications/${a.id}/participation`, { status: next.length > 0 ? 'approved' : 'pending' }),
    ])
    const idx = applicants.value.findIndex(x => x.id === a.id)
    if (idx !== -1) {
      applicants.value[idx] = {
        ...applicants.value[idx],
        approvedSlots: updated.approvedSlots,
        participationStatus: next.length > 0 ? 'approved' : 'pending',
      }
    }
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  } finally {
    togglingSlot.value = null
  }
}

async function addAssignment(userId: number, assignmentType: AssignmentType) {
  try {
    const row = await api.post<SpecialAssignment>('/special-assignments', { scheduleId, userId, assignmentType })
    if (row) {
      const user = applicants.value.find(a => a.userId === userId)?.user ?? { id: userId, name: '' }
      specialAssignments.value.push({ ...row, user })
    }
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}

async function removeAssignment(id: number) {
  try {
    await api.delete(`/special-assignments/${id}`)
    specialAssignments.value = specialAssignments.value.filter(a => a.id !== id)
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}


onMounted(fetchData)
</script>

<template>
  <div class="flex flex-col gap-5">
    <button
      @click="nav.navigate('/schedules')"
      class="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
    >
      <span class="material-icons text-base">arrow_back</span>
      スケジュール管理に戻る
    </button>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <template v-else-if="schedule">
      <div>
        <h2 class="mt-0 text-xl font-semibold text-indigo-950">申込者管理</h2>
        <div class="flex items-center flex-wrap gap-3 mt-1">
          <p class="text-sm text-gray-500">
            {{ formatDate(schedule.date) }}　{{ schedule.spot.name }}
            　{{ schedule.spot.startTime }} 〜 {{ schedule.spot.endTime }}
          </p>
          <label class="flex items-center gap-1.5 text-sm text-gray-500">
            <span>ローテーション枠:</span>
            <select
              :value="granularity"
              @change="saveGranularity(Number(($event.target as HTMLSelectElement).value))"
              class="border border-gray-300 rounded-md px-2 py-0.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="10">10分</option>
              <option value="15">15分</option>
              <option value="20">20分</option>
              <option value="30">30分</option>
            </select>
          </label>
        </div>
      </div>

      <!-- 申込者 × 枠 マトリックス -->
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="font-semibold text-gray-900">申込一覧</h3>
            <p class="text-xs text-gray-400 mt-0.5">申し込んだ枠をタップして参加枠を確定してください</p>
          </div>
        </div>

        <div v-if="applicants.length === 0" class="p-8 text-center text-gray-400 text-sm">
          申込者がいません
        </div>

        <div v-else class="overflow-x-auto overflow-y-auto max-h-[60vh]">
          <table class="w-full text-sm">
            <thead class="sticky top-0 z-10">
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap sticky left-0 z-20 bg-gray-50">氏名</th>
                <th
                  v-for="slot in slots"
                  :key="slot"
                  class="px-3 py-2 text-gray-500 font-medium text-center whitespace-nowrap text-xs"
                >
                  <div>{{ slot }}</div>
                  <div class="font-normal mt-0.5">
                    <span :class="slotCheckedCount(slot) >= Math.floor(30 / granularity) * schedule.spotPointCount * 2 ? 'text-green-600' : 'text-orange-400'" class="font-semibold">{{ slotCheckedCount(slot) }}</span>
                    <span class="text-gray-400">/{{ Math.floor(30 / granularity) * schedule.spotPointCount * 2 }}名</span>
                  </div>
                </th>
                <th class="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">備考</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="a in applicants"
                :key="a.id"
                class="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <!-- 氏名 -->
                <td class="px-4 py-3 whitespace-nowrap sticky left-0 bg-white">
                  <p class="font-medium text-gray-900">{{ a.user.name }}</p>
                  <div class="flex gap-1.5 mt-0.5 flex-wrap">
<span v-if="a.cartPrepare === 'yes'" class="text-xs text-indigo-400">準備可</span>
                    <span v-if="a.cartCleanup === 'yes'" class="text-xs text-indigo-400">片付可</span>
                    <span v-if="a.carTransport === 'yes'" class="text-xs text-indigo-400">車運搬可</span>
                  </div>
                </td>

                <!-- 枠セル：申込済みのものだけクリック可能 -->
                <td
                  v-for="slot in slots"
                  :key="slot"
                  class="px-3 py-3 text-center"
                >
                  <button
                    v-if="hasSlot(a, slot)"
                    @click="toggleSlot(a, slot)"
                    :disabled="togglingSlot === `${a.id}-${slot}`"
                    :class="[
                      'inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-all disabled:opacity-40',
                      isChecked(a, slot)
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-300 text-gray-300 hover:border-green-400 hover:text-green-400',
                    ]"
                  >
                    <span class="material-icons text-base leading-none">check</span>
                  </button>
                  <!-- 申込なし -->
                  <span v-else class="block w-8 h-8 mx-auto" />
                </td>

                <!-- 備考 -->
                <td class="px-4 py-3 text-xs text-gray-500 max-w-36 truncate">
                  {{ a.notes ?? '' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 特別担当 -->
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">特別担当</h3>
          <p class="text-xs text-gray-400 mt-0.5">参加枠が確定した方の中で「可」と回答した方が候補に表示されます</p>
        </div>

        <div class="divide-y divide-gray-100">
          <div
            v-for="type in (Object.keys(ASSIGNMENT_LABELS) as AssignmentType[])"
            :key="type"
            class="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3"
          >
            <p class="text-sm font-medium text-gray-700 w-32 shrink-0 pt-1">{{ ASSIGNMENT_LABELS[type] }}</p>
            <div class="flex-1">
              <div class="flex flex-wrap gap-2 mb-2">
                <span
                  v-for="sa in assignedUsers(type)"
                  :key="sa.id"
                  class="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full"
                >
                  {{ sa.user.name }}
                  <button @click="removeAssignment(sa.id)" class="hover:text-red-600 transition-colors ml-0.5">
                    <span class="material-icons text-xs leading-none">close</span>
                  </button>
                </span>
                <span v-if="assignedUsers(type).length === 0" class="text-xs text-gray-400">未設定</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="c in candidates(type)"
                  :key="c.userId"
                  @click="addAssignment(c.userId, type)"
                  class="text-xs px-2.5 py-1 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 border border-gray-200 hover:border-indigo-300 rounded-full transition-colors"
                >+ {{ c.user.name }}</button>
                <span v-if="candidates(type).length === 0 && assignedUsers(type).length === 0" class="text-xs text-gray-300">
                  （候補者なし）
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
