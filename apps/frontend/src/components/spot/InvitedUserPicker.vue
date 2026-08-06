<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { API, useApi } from '../../composables/useApi'

type User = { id: number; name: string; nameKana?: string | null; email: string }

const props = defineProps<{ modelValue: number[] }>()
const emit = defineEmits<{ 'update:modelValue': [number[]] }>()

const { authHeaders } = useApi()

const users = ref<User[]>([])
const query = ref('')
const loading = ref(false)

const selectedIds = ref<Set<number>>(new Set(props.modelValue))

watch(() => props.modelValue, (v) => {
  selectedIds.value = new Set(v)
})

async function fetchUsers() {
  loading.value = true
  try {
    const res = await fetch(`${API}/api/users`, { headers: authHeaders() })
    if (res.ok) users.value = await res.json()
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)

const filteredUsers = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(u =>
    u.name.toLowerCase().includes(q) ||
    (u.nameKana ?? '').toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q),
  )
})

const selectedUsers = computed(() =>
  users.value.filter(u => selectedIds.value.has(u.id)),
)

function toggle(id: number) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
  emit('update:modelValue', Array.from(next))
}

function removeSelected(id: number) {
  toggle(id)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 選択済みチップ -->
    <div v-if="selectedUsers.length > 0" class="flex flex-wrap gap-1.5">
      <span
        v-for="user in selectedUsers"
        :key="user.id"
        class="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs"
      >
        {{ user.name }}
        <button
          type="button"
          @click="removeSelected(user.id)"
          class="text-indigo-400 hover:text-indigo-700"
        >
          <span class="material-icons text-[0.9rem]">close</span>
        </button>
      </span>
    </div>

    <!-- 検索 -->
    <input
      v-model="query"
      placeholder="名前・よみがな・メールで検索"
      class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
    />

    <!-- ユーザー候補リスト -->
    <div class="border border-gray-200 rounded-lg max-h-56 overflow-y-auto">
      <div v-if="loading" class="p-4 text-center text-gray-400 text-xs">読み込み中...</div>
      <div v-else-if="filteredUsers.length === 0" class="p-4 text-center text-gray-400 text-xs">
        該当ユーザーがいません
      </div>
      <label
        v-for="user in filteredUsers"
        :key="user.id"
        class="flex items-center gap-3 px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="selectedIds.has(user.id)"
          @change="toggle(user.id)"
          class="accent-indigo-600"
        />
        <div class="flex-1 min-w-0">
          <div class="text-sm text-gray-900 truncate">{{ user.name }}</div>
          <div class="text-[11px] text-gray-400 truncate">{{ user.email }}</div>
        </div>
      </label>
    </div>

    <p class="text-[11px] text-gray-400">選択済み {{ selectedIds.size }} 名</p>
  </div>
</template>
