import { ref } from 'vue'

type NotifyType = 'success' | 'error' | 'info'

interface Notification {
  id: number
  message: string
  type: NotifyType
}

const notifications = ref<Notification[]>([])
let nextId = 0

export function useNotify() {
  function notify(message: string, type: NotifyType = 'info', duration = 3000) {
    const id = nextId++
    notifications.value.push({ id, message, type })
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    }, duration)
  }

  const success = (message: string) => notify(message, 'success')
  const error = (message: string) => notify(message, 'error')
  const info = (message: string) => notify(message, 'info')

  return { notifications, notify, success, error, info }
}
