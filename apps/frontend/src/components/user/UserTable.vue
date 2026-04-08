<script setup lang="ts">
import { ref, computed } from 'vue'
import { API, useApi } from '../../composables/useApi'
import { useAuthStore } from '../../store/auth'
import { Gender, GenderLabel } from '../../constants/gender'

const props = defineProps<{ users: any[]; loading: boolean; error: string }>()
const emit = defineEmits<{ deleted: []; updated: [] }>()

const { authHeaders } = useApi()
const auth = useAuthStore()

const query = ref('')
const editingId = ref<number | null>(null)
const editName = ref('')
const editEmail = ref('')
const editGender = ref('')
const editIsAdmin = ref(false)

function startEdit(user: any) {
  editingId.value = user.id
  editName.value = user.name
  editEmail.value = user.email
  editGender.value = user.gender ?? ''
  editIsAdmin.value = user.isAdmin
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id: number) {
  try {
    const res = await fetch(`${API}/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: editName.value, email: editEmail.value, gender: editGender.value || null, isAdmin: editIsAdmin.value }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? '更新に失敗しました')
    }
    editingId.value = null
    emit('updated')
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}

async function deleteUser(id: number) {
  if (!confirm('本当に削除しますか？')) return
  try {
    const res = await fetch(`${API}/api/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'ユーザーの削除に失敗しました')
    }
    emit('deleted')
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}

const filteredUsers = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.users
  return props.users.filter(u =>
    u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  )
})
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200">
      <input
        v-model="query"
        placeholder="名前・メールアドレスで検索"
        class="w-full sm:w-72 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
      />
    </div>
    <div v-if="loading" class="p-8 text-center text-gray-400 text-sm">読み込み中...</div>
    <div v-else-if="error" class="p-8 text-center text-red-500 text-sm">{{ error }}</div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50">
            <th class="text-left px-4 py-3 text-gray-500 font-medium sticky left-0 bg-gray-50 z-10 min-w-30">名前</th>
            <th class="text-left px-4 py-3 text-gray-500 font-medium min-w-45">メールアドレス</th>
            <th class="text-left px-4 py-3 text-gray-500 font-medium min-w-15">性別</th>
            <th class="text-left px-4 py-3 text-gray-500 font-medium min-w-17.5">権限</th>
            <th class="text-left px-4 py-3 text-gray-500 font-medium min-w-22.5">登録日</th>
            <th class="px-4 py-3 min-w-30"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in filteredUsers"
            :key="user.id"
            class="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
          >
            <td class="px-4 py-4 text-gray-900 font-medium sticky left-0 bg-white hover:bg-gray-50 z-10 min-w-30">
              <template v-if="editingId === user.id">
                <input
                  v-model="editName"
                  class="px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm w-28 focus:outline-none focus:border-indigo-500"
                />
              </template>
              <template v-else>
                <div class="flex flex-col gap-0.5">
                  <span>{{ user.name }}</span>
                  <span
                    v-if="user.id === auth.user?.id"
                    class="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded w-fit"
                  >ログイン中</span>
                </div>
              </template>
            </td>
            <td class="px-4 py-4 text-gray-500 whitespace-nowrap">
              <template v-if="editingId === user.id">
                <input
                  v-model="editEmail"
                  class="px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm w-48 focus:outline-none focus:border-indigo-500"
                />
              </template>
              <template v-else>{{ user.email }}</template>
            </td>
            <td class="px-4 py-4 text-gray-500 whitespace-nowrap">
              <template v-if="editingId === user.id">
                <select
                  v-model="editGender"
                  class="px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-</option>
                  <option :value="Gender.MALE">兄弟</option>
                  <option :value="Gender.FEMALE">姉妹</option>
                </select>
              </template>
              <template v-else>
                {{ user.gender ? GenderLabel[user.gender] ?? '-' : '-' }}
              </template>
            </td>
            <td class="px-4 py-4 whitespace-nowrap">
              <template v-if="editingId === user.id && user.gender === 'male'">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="editIsAdmin" class="accent-indigo-600" />
                  <span class="text-xs text-gray-600">管理者</span>
                </label>
              </template>
              <template v-else>
                <span :class="['inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                  user.isAdmin
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200']">
                  {{ user.isAdmin ? '管理者' : '一般' }}
                </span>
              </template>
            </td>
            <td class="px-4 py-4 text-gray-500 whitespace-nowrap">
              {{ new Date(user.createdAt).toLocaleDateString('ja-JP') }}
            </td>
            <td class="px-4 py-4 text-right whitespace-nowrap">
              <template v-if="editingId === user.id">
                <button
                  @click="saveEdit(user.id)"
                  class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors mr-1 text-xs"
                >保存</button>
                <button
                  @click="cancelEdit"
                  class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300 rounded-lg transition-colors text-xs"
                >取消</button>
              </template>
              <template v-else>
                <button
                  @click="startEdit(user)"
                  class="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors mr-1 text-xs"
                >編集</button>
                <button
                  v-if="user.id !== auth.user?.id"
                  @click="deleteUser(user.id)"
                  class="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors text-xs"
                >削除</button>
              </template>
            </td>
          </tr>
          <tr v-if="filteredUsers.length === 0">
            <td colspan="6" class="px-6 py-8 text-center text-gray-400">ユーザーがいません</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
