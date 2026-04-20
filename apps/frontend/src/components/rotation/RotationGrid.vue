<script setup lang="ts">
import { computed } from 'vue'
import type { Column } from '../../composables/useRotationGrid'

const props = defineProps<{
  rotationSlots: string[]
  columns: Column[]
}>()

const pointGroups = computed(() => {
  const seen = new Set<number>()
  const groups: { pointId: number; pointName: string }[] = []
  for (const col of props.columns) {
    if (!seen.has(col.pointId)) {
      seen.add(col.pointId)
      groups.push({ pointId: col.pointId, pointName: col.pointName })
    }
  }
  return groups
})
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-gray-200">
    <table class="w-max border-separate border-spacing-0 text-sm">
      <thead class="sticky top-0 z-10">
        <tr class="bg-gray-100 border-b border-gray-200">
          <th class="px-3 py-2 text-left text-xs font-medium text-gray-400 whitespace-nowrap sticky left-0 z-20 bg-gray-100 border-r-2 border-gray-300" rowspan="2">
            時間帯
          </th>
          <th
            v-for="group in pointGroups"
            :key="group.pointId"
            colspan="3"
            class="px-3 py-1.5 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-l-2 border-l-gray-300 border-b border-b-gray-200"
          >
            {{ group.pointName }}
          </th>
        </tr>
        <tr class="bg-gray-50 border-b border-gray-200">
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-3 py-2 text-center text-xs font-medium whitespace-nowrap min-w-24"
            :class="[
              col.isMimaori ? 'text-orange-600 bg-orange-50' : 'text-indigo-600',
              col.label === '①' ? 'border-l-2 border-gray-300' : 'border-l border-gray-100'
            ]"
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
