import { defineStore } from 'pinia'
import { ref } from 'vue'
import { router } from '../router'

export const useNavStore = defineStore('nav', () => {
  const sidebarOpen = ref(false)
  const sidebarCollapsed = ref(
    typeof localStorage !== 'undefined' && localStorage.getItem('sidebarCollapsed') === 'true'
  )

  function toggleSidebar() {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      sidebarCollapsed.value = !sidebarCollapsed.value
      localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value))
    } else {
      sidebarOpen.value = !sidebarOpen.value
    }
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  function navigate(path: string) {
    router.push(path)
    closeSidebar()
  }

  function openApplicantManagement(scheduleId: number) {
    router.push(`/schedules/${scheduleId}/applicants`)
    closeSidebar()
  }

  function openRotationEditor(scheduleId: number) {
    router.push(`/rotation/${scheduleId}`)
    closeSidebar()
  }

  function openRotationView(scheduleId: number) {
    router.push(`/my-rotation/${scheduleId}`)
    closeSidebar()
  }

  return { sidebarOpen, sidebarCollapsed, toggleSidebar, closeSidebar, navigate, openApplicantManagement, openRotationEditor, openRotationView }
})
