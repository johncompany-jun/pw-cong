<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { API, useApi } from '../composables/useApi'
import SpotForm from '../components/spot/SpotForm.vue'
import SpotList from '../components/spot/SpotList.vue'

const { authHeaders } = useApi()

const spots = ref<any[]>([])
const loading = ref(false)
const error = ref('')

async function fetchSpots() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/api/spots`, { headers: authHeaders() })
    if (!res.ok) throw new Error('スポット情報の取得に失敗しました')
    spots.value = await res.json()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
}

onMounted(fetchSpots)
</script>

<template>
  <div class="flex flex-col gap-6">
    <SpotForm @created="fetchSpots" />
    <SpotList :spots="spots" :loading="loading" :error="error" @deleted="fetchSpots" @updated="fetchSpots" />
  </div>
</template>
