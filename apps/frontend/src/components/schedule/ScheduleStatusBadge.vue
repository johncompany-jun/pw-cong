<script setup lang="ts">
import { ScheduleStatusLabel, ScheduleStatusStyle } from '../../constants/scheduleStatus'
defineProps<{ status: string }>()
</script>

<template>
  <span
    :class="['inline-block px-2 py-0.5 rounded-full text-xs font-medium border',
      ScheduleStatusStyle[status] ?? 'bg-gray-100 text-gray-600 border-gray-200']"
  >
    {{ ScheduleStatusLabel[status] ?? status }}
  </span>
</template>
