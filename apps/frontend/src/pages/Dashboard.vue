<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import Sidebar from '../components/Sidebar.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <div class="flex flex-1 relative">
      <Sidebar />
      <main class="flex-1 p-6 bg-gray-50 min-w-0 overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
