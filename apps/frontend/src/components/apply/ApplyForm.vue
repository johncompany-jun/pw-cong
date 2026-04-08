<script setup lang="ts">
import { ref } from 'vue'
import { API, useApi } from '../../composables/useApi'
import type { ScheduleStatusType } from '../../constants/scheduleStatus'
import SlotCheckboxGroup from './SlotCheckboxGroup.vue'
import YesNoRadio from './YesNoRadio.vue'

type ScheduleItem = {
  id: number
  date: string
  status: ScheduleStatusType
  spot: { id: number; name: string; startTime: string; endTime: string }
}

const props = defineProps<{
  schedule: ScheduleItem
  slots: string[]
}>()

const emit = defineEmits<{ saved: []; cancel: [] }>()

const { authHeaders } = useApi()

const selectedSlots = ref<string[]>([])
const cartPrepare = ref<'yes' | 'no'>('no')
const cartCleanup = ref<'yes' | 'no'>('no')
const carTransport = ref<'yes' | 'no'>('no')
const notes = ref('')
const submitting = ref(false)
const error = ref('')

async function submit() {
  if (selectedSlots.value.length === 0) {
    error.value = '参加する時間帯を1つ以上選択してください'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/api/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        scheduleId: props.schedule.id,
        selectedSlots: selectedSlots.value,
        cartPrepare: cartPrepare.value,
        cartCleanup: cartCleanup.value,
        carTransport: carTransport.value,
        notes: notes.value || null,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? '申込に失敗しました')
    }
    emit('saved')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="border-t border-gray-100 px-5 py-5 bg-gray-50 flex flex-col gap-5">

    <SlotCheckboxGroup :slots="slots" v-model="selectedSlots" />

    <!-- カート運搬 -->
    <div class="grid sm:grid-cols-3 gap-4">
      <YesNoRadio label="カート運搬準備" v-model="cartPrepare" />
      <YesNoRadio label="カート運搬片付け" v-model="cartCleanup" />
      <YesNoRadio label="車でのカート運搬" v-model="carTransport" />
    </div>

    <!-- 連絡事項 -->
    <div class="flex flex-col gap-1.5">
      <label class="text-sm font-medium text-gray-700">
        連絡事項
        <span class="text-xs font-normal text-gray-400 ml-1">（任意）</span>
      </label>
      <textarea
        v-model="notes"
        rows="3"
        placeholder="特記事項があればご記入ください"
        class="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
      />
    </div>

    <div v-if="error" class="text-sm text-red-500">{{ error }}</div>

    <!-- アクション -->
    <div class="flex justify-end gap-2">
      <button
        type="button"
        @click="emit('cancel')"
        class="px-4 py-2 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 text-sm rounded-lg transition-colors"
      >
        キャンセル
      </button>
      <button
        @click="submit"
        :disabled="submitting"
        class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {{ submitting ? '送信中...' : '申し込む' }}
      </button>
    </div>
  </div>
</template>
