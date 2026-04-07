<script setup lang="ts">
import type { Column } from '../../composables/useRotationGrid'

defineProps<{
  rotationSlots: string[]
  columns: Column[]
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-gray-200">
    <table class="w-max border-separate border-spacing-0 text-sm">
      <thead class="sticky top-0 z-10">
        <tr class="bg-gray-50 border-b border-gray-200">
          <th class="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap sticky left-0 z-20 bg-gray-50 border-r border-gray-200">
            時間帯
          </th>
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-3 py-2.5 text-center text-xs font-medium whitespace-nowrap border-r border-gray-100 last:border-r-0 min-w-28"
            :class="col.isMimaori ? 'text-orange-600 bg-orange-50' : 'text-indigo-600'"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="timeSlot in rotationSlots"
          :key="timeSlot"
          class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
        >
          <td class="px-3 py-2 text-xs text-gray-500 whitespace-nowrap font-medium sticky left-0 bg-white border-r border-gray-200">
            {{ timeSlot }}
          </td>
          <td
            v-for="col in columns"
            :key="col.key"
            class="px-2 py-2 border-r border-gray-100 last:border-r-0 text-center"
            :class="col.isMimaori ? 'bg-orange-50/40' : ''"
          >
            <slot :time-slot="timeSlot" :col="col" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
