<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './store/auth'
import LoginPage from './pages/Login.vue'
import DashboardPage from './pages/Dashboard.vue'

const auth = useAuthStore()

onMounted(() => {
  auth.fetchMe()
})
</script>

<template>
  <div v-if="!auth.ready" class="min-h-screen flex items-center justify-center bg-gray-50">
    <span class="material-icons animate-spin text-indigo-500 text-4xl">autorenew</span>
  </div>
  <template v-else>
    <LoginPage v-if="!auth.isLoggedIn" />
    <DashboardPage v-else />
  </template>
</template>
