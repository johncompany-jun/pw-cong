<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useNavStore } from '../store/nav'
import { useAuthStore } from '../store/auth'

const nav = useNavStore()
const auth = useAuthStore()
const route = useRoute()

const navItems = [
  { path: '/',          label: 'ダッシュボード',     icon: 'dashboard' },
  { path: '/apply',     label: 'PW申込',             icon: 'edit_calendar' },
  { path: '/my-rotation', label: 'ローテーション',   icon: 'swap_horiz' },
  { path: '/schedules', label: 'スケジュール管理',   icon: 'calendar_month', adminOnly: true },
  { path: '/rotation',  label: 'ローテーション管理', icon: 'manage_history', adminOnly: true },
  { path: '/spots',     label: 'スポット管理',       icon: 'map',            adminOnly: true },
  { path: '/users',     label: 'ユーザー管理',       icon: 'group',          adminOnly: true },
]

const visibleItems = navItems.filter(i => !i.adminOnly || auth.user?.isAdmin)

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <!-- オーバーレイ（モバイル） -->
  <div
    v-if="nav.sidebarOpen"
    class="fixed inset-0 top-14 bg-black/40 z-99 md:hidden"
    @click="nav.closeSidebar"
  />

  <nav
    class="w-55 bg-indigo-950 shrink-0 transition-transform duration-250
           md:translate-x-0
           max-md:fixed max-md:top-14 max-md:left-0 max-md:bottom-0 max-md:z-100"
    :class="nav.sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'"
  >
    <ul class="py-2">
      <li
        v-for="item in visibleItems"
        :key="item.path"
        class="flex items-center gap-2.5 px-5 py-3 text-sm text-indigo-200 cursor-pointer
               border-l-3 border-transparent whitespace-nowrap
               hover:bg-white/7 hover:text-white transition-colors duration-150"
        :class="isActive(item.path) ? 'bg-white/10 text-white border-l-indigo-400' : ''"
        @click="nav.navigate(item.path)"
      >
        <span class="material-icons text-xl">{{ item.icon }}</span>
        {{ item.label }}
      </li>
    </ul>
  </nav>
</template>
