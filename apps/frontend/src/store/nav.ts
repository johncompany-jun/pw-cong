import { defineStore } from 'pinia'
import { ref } from 'vue'
import { router } from '../router'

export const useNavStore = defineStore('nav', () => {
  const sidebarOpen = ref(false)

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
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

  return { sidebarOpen, toggleSidebar, closeSidebar, navigate, openApplicantManagement, openRotationEditor, openRotationView }
})
