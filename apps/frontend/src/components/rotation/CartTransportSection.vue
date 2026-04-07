<script setup lang="ts">
type AssignmentType = 'cart_prepare' | 'cart_cleanup' | 'transport_go' | 'transport_return'
type SpecialAssignment = { id: number; assignmentType: AssignmentType; userId: number; userName: string }

const ASSIGNMENT_LABELS: Record<AssignmentType, string> = {
  cart_prepare: 'カート準備',
  cart_cleanup: 'カート片付け',
  transport_go: '運搬（行き）',
  transport_return: '運搬（帰り）',
}

const props = defineProps<{
  specialAssignments: SpecialAssignment[]
  currentUserId?: number
}>()

function assignedByType(type: AssignmentType) {
  return props.specialAssignments.filter(a => a.assignmentType === type)
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100">
      <h3 class="font-semibold text-gray-900">カート運搬</h3>
    </div>
    <div class="divide-y divide-gray-100">
      <div
        v-for="type in (Object.keys(ASSIGNMENT_LABELS) as AssignmentType[])"
        :key="type"
        class="px-5 py-3 flex items-center gap-3"
      >
        <p class="text-sm font-medium text-gray-700 w-32 shrink-0">{{ ASSIGNMENT_LABELS[type] }}</p>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="sa in assignedByType(type)"
            :key="sa.id"
            class="inline-block text-xs px-2.5 py-1 rounded-full font-medium"
            :class="sa.userId === currentUserId
              ? 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300'
              : 'bg-gray-100 text-gray-700'"
          >
            {{ sa.userName }}
          </span>
          <span v-if="assignedByType(type).length === 0" class="text-xs text-gray-400">未設定</span>
        </div>
      </div>
    </div>
  </div>
</template>
