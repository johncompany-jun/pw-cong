<script setup lang="ts">
import { ref } from 'vue'
import { API, useApi } from '../../composables/useApi'
import { Gender } from '../../constants/gender'

const emit = defineEmits<{ created: [] }>()

const { authHeaders } = useApi()

const newEmail = ref('')
const newName = ref('')
const newGender = ref('')
const newIsAdmin = ref(false)

async function createUser() {
  try {
    const res = await fetch(`${API}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        email: newEmail.value,
        name: newName.value,
        isAdmin: newIsAdmin.value,
        gender: newGender.value || null,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'ユーザーの作成に失敗しました')
    }
    newEmail.value = ''
    newName.value = ''
    newGender.value = ''
    newIsAdmin.value = false
    emit('created')
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
    <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">新規ユーザー作成</h4>
    <form @submit.prevent="createUser" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <input
        v-model="newEmail"
        type="email"
        placeholder="メールアドレス"
        required
        class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
      />
      <input
        v-model="newName"
        placeholder="名前"
        required
        class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
      />
      <select
        v-model="newGender"
        required
        class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
      >
        <option value="" disabled>性別を選択</option>
        <option :value="Gender.MALE">兄弟</option>
        <option :value="Gender.FEMALE">姉妹</option>
      </select>
      <div class="sm:col-span-3 flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input v-model="newIsAdmin" type="checkbox" class="accent-indigo-600" />
          管理者権限を付与
        </label>
        <button
          type="submit"
          class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          追加
        </button>
      </div>
    </form>
  </div>
</template>
