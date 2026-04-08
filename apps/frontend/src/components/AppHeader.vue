<script setup lang="ts">
import { useAuthStore } from '../store/auth'
import { useNavStore } from '../store/nav'

const auth = useAuthStore()
const nav = useNavStore()
</script>

<template>
  <header class="h-14 px-5 flex items-center gap-3 bg-indigo-600 text-white sticky top-0 z-200">
    <button
      class="md:hidden flex items-center justify-center p-1 rounded hover:bg-white/15 transition-colors"
      aria-label="メニュー"
      @click="nav.toggleSidebar"
    >
      <span class="material-icons">{{ nav.sidebarOpen ? 'close' : 'menu' }}</span>
    </button>

    <h1 class="text-lg font-bold tracking-wide flex-1">PW管理</h1>

    <div class="flex items-center gap-2.5">
      <span class="text-sm max-sm:hidden">{{ auth.user?.name }}</span>
      <span v-if="auth.user?.isAdmin" class="text-xs px-2 py-0.5 rounded-full bg-white/20 whitespace-nowrap">
        管理者
      </span>
      <button
        class="flex items-center gap-1 px-2.5 py-1.5 text-sm border border-white/30 rounded bg-white/15 hover:bg-white/25 transition-colors"
        @click="auth.logout"
      >
        <span class="material-icons text-[1.125rem]">logout</span>
        <span class="max-sm:hidden">ログアウト</span>
      </button>
    </div>
  </header>
</template>
