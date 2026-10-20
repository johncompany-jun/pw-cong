<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useApi } from '../../composables/useApi'
import { useNotify } from '../../composables/useNotify'

type Recipient = {
  userId: number
  name: string
  email: string
  assignments: { timeSlot: string; location: string }[]
}

type Admin = {
  userId: number
  name: string
  email: string
  alreadyAssigned: boolean
}

type Draft = {
  recipients: Recipient[]
  admins: Admin[]
  defaultSubject: string
  defaultBody: string
  lastSentAt: string | null
  lastRecipientCount: number | null
}

const props = defineProps<{ scheduleId: number }>()
const emit = defineEmits<{ close: [] }>()

const api = useApi()
const notify = useNotify()

const loading = ref(true)
const sending = ref(false)
const error = ref('')
const draft = ref<Draft | null>(null)
const subject = ref('')
const body = ref('')
const checkedAdminIds = ref<Set<number>>(new Set())

const selectableAdmins = computed(() =>
  draft.value ? draft.value.admins.filter(a => !a.alreadyAssigned) : []
)

const totalRecipientCount = computed(() => {
  if (!draft.value) return 0
  return draft.value.recipients.length + checkedAdminIds.value.size
})

function toggleAdmin(id: number) {
  const next = new Set(checkedAdminIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  checkedAdminIds.value = next
}

onMounted(async () => {
  try {
    const data = await api.get<Draft>(`/rotations/${props.scheduleId}/notify-draft`)
    draft.value = data
    subject.value = data.defaultSubject
    body.value = data.defaultBody
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
})

async function send() {
  if (!subject.value.trim() || !body.value.trim()) {
    notify.error('件名と本文は必須です')
    return
  }
  if (!draft.value || totalRecipientCount.value === 0) {
    notify.error('送信対象がいません')
    return
  }
  if (!confirm(`${totalRecipientCount.value} 人に通知メールを送信します。よろしいですか？`)) return

  sending.value = true
  try {
    const res = await api.post<{ sent: number }>(`/rotations/${props.scheduleId}/notify`, {
      subject: subject.value,
      body: body.value,
      additionalUserIds: Array.from(checkedAdminIds.value),
    })
    notify.success(`${res.sent} 人に通知を送信しました`)
    emit('close')
  } catch (e: unknown) {
    notify.error(e instanceof Error ? e.message : '送信に失敗しました')
  } finally {
    sending.value = false
  }
}

function formatSentAt(iso: string): string {
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  return d.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="emit('close')">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
      <div class="flex items-center justify-between mb-5">
        <h3 class="text-base font-semibold text-gray-900">参加者に通知メールを送信</h3>
        <button @click="emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
      <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

      <template v-else-if="draft">
        <div
          v-if="draft.lastSentAt"
          class="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
        >
          <span class="material-icons text-sm align-middle mr-1">info</span>
          前回: {{ formatSentAt(draft.lastSentAt) }} に {{ draft.lastRecipientCount }} 人へ送信済み
        </div>

        <div class="mb-4">
          <p class="text-sm font-medium text-gray-600 mb-2">
            参加者 ({{ draft.recipients.length }} 人) <span class="text-xs text-gray-400">自動で全員に送信</span>
          </p>
          <div v-if="draft.recipients.length === 0" class="text-sm text-gray-400">
            ローテーションに割り当てられている参加者がいません
          </div>
          <ul v-else class="flex flex-col gap-1 max-h-32 overflow-y-auto bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
            <li v-for="r in draft.recipients" :key="r.userId" class="flex items-center gap-2">
              <span class="font-medium">{{ r.name }}</span>
              <span class="text-xs text-gray-400">{{ r.email }}</span>
            </li>
          </ul>
        </div>

        <div v-if="selectableAdmins.length > 0" class="mb-4">
          <p class="text-sm font-medium text-gray-600 mb-2">
            追加で通知する管理者 <span class="text-xs text-gray-400">参加していなくても送信できます</span>
          </p>
          <ul class="flex flex-col gap-1 max-h-40 overflow-y-auto bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
            <li v-for="a in selectableAdmins" :key="a.userId">
              <label class="flex items-center gap-2 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  :checked="checkedAdminIds.has(a.userId)"
                  @change="toggleAdmin(a.userId)"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span class="font-medium">{{ a.name }}</span>
                <span class="text-xs text-gray-400">{{ a.email }}</span>
              </label>
            </li>
          </ul>
        </div>

        <div class="flex flex-col gap-1.5 mb-4">
          <label class="text-sm font-medium text-gray-600">件名</label>
          <input
            v-model="subject"
            type="text"
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div class="flex flex-col gap-1.5 mb-2">
          <label class="text-sm font-medium text-gray-600">本文</label>
          <textarea
            v-model="body"
            rows="10"
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-y"
          />
        </div>
        <p class="text-xs text-gray-400 mb-5">
          参加者のメール末尾には、本人の担当（時間と地点）が自動で付与されます
        </p>

        <div class="flex items-center justify-between gap-2">
          <span class="text-xs text-gray-500">
            送信予定: {{ totalRecipientCount }} 人
          </span>
          <div class="flex gap-2">
            <button
              type="button"
              @click="emit('close')"
              :disabled="sending"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              @click="send"
              :disabled="sending || totalRecipientCount === 0"
              class="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <span class="material-icons text-base">send</span>
              {{ sending ? '送信中...' : '送信する' }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
