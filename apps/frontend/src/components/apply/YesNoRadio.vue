<script setup lang="ts">
defineProps<{ label: string; modelValue: 'yes' | 'no' }>()
defineEmits<{ 'update:modelValue': ['yes' | 'no'] }>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <p class="text-sm font-medium text-gray-700">{{ label }}</p>
    <div class="flex gap-5">
      <label class="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
        <input
          type="radio"
          :name="label"
          value="yes"
          :checked="modelValue === 'yes'"
          class="accent-indigo-600"
          @change="$emit('update:modelValue', 'yes')"
        />可
      </label>
      <label class="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
        <input
          type="radio"
          :name="label"
          value="no"
          :checked="modelValue === 'no'"
          class="accent-indigo-600"
          @change="$emit('update:modelValue', 'no')"
        />不可
      </label>
    </div>
  </div>
</template>
