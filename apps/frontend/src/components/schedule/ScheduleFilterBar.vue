<script setup lang="ts">
import { ScheduleStatus, ScheduleStatusLabel } from '../../constants/scheduleStatus'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const filters = [
  { value: '', label: 'すべて' },
  { value: ScheduleStatus.DRAFT, label: ScheduleStatusLabel[ScheduleStatus.DRAFT] },
  { value: ScheduleStatus.OPEN, label: ScheduleStatusLabel[ScheduleStatus.OPEN] },
  { value: ScheduleStatus.CONFIRMED, label: ScheduleStatusLabel[ScheduleStatus.CONFIRMED] },
]
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="f in filters"
      :key="f.value"
      type="button"
      @click="emit('update:modelValue', f.value)"
      :class="['px-3 py-1.5 text-sm rounded-lg border transition-colors',
        modelValue === f.value
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50']"
    >
      {{ f.label }}
    </button>
  </div>
</template>
