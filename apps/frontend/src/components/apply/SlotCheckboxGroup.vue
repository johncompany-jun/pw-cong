<script setup lang="ts">
defineProps<{ slots: string[]; modelValue: string[] }>()
defineEmits<{ 'update:modelValue': [string[]] }>()

function toggle(slot: string, current: string[], emit: (v: string[]) => void) {
  if (current.includes(slot)) {
    emit(current.filter(s => s !== slot))
  } else {
    emit([...current, slot])
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm font-medium text-gray-700">
      参加できる時間帯
      <span class="text-xs font-normal text-gray-400 ml-1">（複数選択可）</span>
    </p>
    <div class="flex flex-wrap gap-2">
      <label
        v-for="slot in slots"
        :key="slot"
        class="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm cursor-pointer transition-colors select-none"
        :class="modelValue.includes(slot)
          ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium'
          : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'"
      >
        <input
          type="checkbox"
          :value="slot"
          :checked="modelValue.includes(slot)"
          class="accent-indigo-600"
          @change="toggle(slot, modelValue, v => $emit('update:modelValue', v))"
        />
        {{ slot }}
      </label>
    </div>
  </div>
</template>
