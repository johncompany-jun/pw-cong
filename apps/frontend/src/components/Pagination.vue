<script setup lang="ts">
import { computed } from 'vue'

type PaginationData = { total: number; page: number; totalPages: number; limit: number }

const props = defineProps<{ pagination: PaginationData }>()
const emit = defineEmits<{ pageChange: [page: number] }>()

const pageNumbers = computed(() => {
  const { page, totalPages } = props.pagination
  const range: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) range.push(i)
  } else {
    range.push(1)
    if (page > 3) range.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) range.push(i)
    if (page < totalPages - 2) range.push('...')
    range.push(totalPages)
  }
  return range
})
</script>

<template>
  <div class="flex items-center justify-between gap-4 pt-2">
    <p class="text-xs text-gray-400">
      全 {{ pagination.total }} 件 / {{ pagination.page }} / {{ pagination.totalPages }} ページ
    </p>
    <div class="flex items-center gap-1">
      <button
        @click="emit('pageChange', pagination.page - 1)"
        :disabled="pagination.page <= 1"
        class="px-2 py-1 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border-gray-300 hover:bg-gray-50 text-gray-600"
      >
        <span class="material-icons text-base leading-none">chevron_left</span>
      </button>
      <template v-for="p in pageNumbers" :key="p">
        <span v-if="p === '...'" class="px-1 text-gray-400 text-sm">…</span>
        <button
          v-else
          @click="emit('pageChange', p as number)"
          :class="['px-3 py-1 rounded-lg border text-sm transition-colors',
            p === pagination.page
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-600']"
        >{{ p }}</button>
      </template>
      <button
        @click="emit('pageChange', pagination.page + 1)"
        :disabled="pagination.page >= pagination.totalPages"
        class="px-2 py-1 rounded-lg border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white border-gray-300 hover:bg-gray-50 text-gray-600"
      >
        <span class="material-icons text-base leading-none">chevron_right</span>
      </button>
    </div>
  </div>
</template>
