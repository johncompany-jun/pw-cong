<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { API, useApi } from '../composables/useApi'
import UserForm from '../components/user/UserForm.vue'
import UserCsvUpload from '../components/user/UserCsvUpload.vue'
import UserTable from '../components/user/UserTable.vue'

const { authHeaders } = useApi()

const users = ref<any[]>([])
const loading = ref(false)
const error = ref('')

async function fetchUsers() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/api/users`, { headers: authHeaders() })
    if (!res.ok) throw new Error('ユーザー情報の取得に失敗しました')
    users.value = await res.json()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="flex flex-col gap-6">
    <UserForm @created="fetchUsers" />
    <UserCsvUpload @created="fetchUsers" />
    <UserTable :users="users" :loading="loading" :error="error" @deleted="fetchUsers" @updated="fetchUsers" />
  </div>
</template>
