<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { API, useApi } from '../../composables/useApi'
import { ScheduleStatus, ScheduleStatusLabel, type ScheduleStatusType } from '../../constants/scheduleStatus'

type Schedule = { id: number; date: string; spot: { id: number }; status: ScheduleStatusType; mcUserId?: number | null }
type Spot = { id: number; name: string }
type User = { id: number; name: string }

const props = defineProps<{ schedule?: Schedule }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const { authHeaders } = useApi()

const date = ref('')
const spotId = ref<number | ''>('')
const status = ref<ScheduleStatusType>(ScheduleStatus.DRAFT)
const mcUserId = ref<number | ''>('')
const spots = ref<Spot[]>([])
const users = ref<User[]>([])

const isEdit = !!props.schedule

const baseStatusValues = [ScheduleStatus.DRAFT, ScheduleStatus.OPEN, ScheduleStatus.CANCELLED]
const statusOptions = computed(() => {
  const values = props.schedule && !baseStatusValues.includes(props.schedule.status as typeof baseStatusValues[number])
    ? [...baseStatusValues, props.schedule.status]
    : baseStatusValues
  return values.map(v => ({ value: v, label: ScheduleStatusLabel[v] }))
})

onMounted(async () => {
  const [spotsRes, usersRes] = await Promise.all([
    fetch(`${API}/api/spots`, { headers: authHeaders() }),
    fetch(`${API}/api/users`, { headers: authHeaders() }),
  ])
  if (spotsRes.ok) spots.value = await spotsRes.json()
  if (usersRes.ok) users.value = await usersRes.json()

  if (props.schedule) {
    date.value = props.schedule.date
    spotId.value = props.schedule.spot.id
    status.value = props.schedule.status
    mcUserId.value = props.schedule.mcUserId ?? ''
  }
})

async function submit() {
  if (!date.value || spotId.value === '') return
  try {
    const url = isEdit ? `${API}/api/schedules/${props.schedule!.id}` : `${API}/api/schedules`
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        date: date.value,
        spotId: Number(spotId.value),
        status: status.value,
        mcUserId: mcUserId.value !== '' ? Number(mcUserId.value) : null,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? '保存に失敗しました')
    }
    emit('saved')
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="emit('close')">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-base font-semibold text-gray-900">
          {{ isEdit ? 'スケジュールを編集' : '新規スケジュール作成' }}
        </h3>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
          <span class="material-icons">close</span>
        </button>
      </div>

      <form @submit.prevent="submit" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600">日付</label>
          <input
            v-model="date"
            type="date"
            required
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600">スポット</label>
          <select
            v-model="spotId"
            required
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="" disabled>スポットを選択</option>
            <option v-for="s in spots" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600">司会者</label>
          <select
            v-model="mcUserId"
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="">なし</option>
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-gray-600">ステータス</label>
          <select
            v-model="status"
            required
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {{ isEdit ? '保存' : '作成' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
