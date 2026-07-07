<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()

// 'select' = 一般ユーザーの名前選択 / 'admin' = 管理者ログイン
const mode = ref<'select' | 'admin'>('select')

// 名前選択
const users = ref<{ id: number; name: string; nameKana: string | null; gender: string | null }[]>([])
const selectedUserId = ref<number | null>(null)
const usersLoading = ref(true)
const search = ref('')

// 並び替えキー：よみがな優先、無ければ名前
const sortKey = (u: { name: string; nameKana: string | null }) => u.nameKana || u.name

// あいうえお順（よみがな基準・日本語ロケール）で並び替え
const sortedUsers = computed(() =>
  [...users.value].sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'ja')),
)

// 名前・よみがなで絞り込み
const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return sortedUsers.value
  return sortedUsers.value.filter(
    u => u.name.toLowerCase().includes(q) || (u.nameKana ?? '').toLowerCase().includes(q),
  )
})

// 管理者ログイン
const email = ref('')
const password = ref('')

const error = ref('')
const loading = ref(false)

onMounted(async () => {
  try {
    users.value = await auth.fetchSelectableUsers()
  } catch {
    error.value = 'ユーザー一覧の取得に失敗しました'
  } finally {
    usersLoading.value = false
  }
})

async function handleSelect() {
  if (!selectedUserId.value) return
  error.value = ''
  loading.value = true
  try {
    await auth.loginAsUser(selectedUserId.value)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'ログインに失敗しました'
  } finally {
    loading.value = false
  }
}

async function handleAdminLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'ログインに失敗しました'
  } finally {
    loading.value = false
  }
}

function switchMode(next: 'select' | 'admin') {
  mode.value = next
  error.value = ''
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
    style="background-image: url('/login_bg.jpg')"
  >
    <div class="bg-white/80 rounded-lg shadow-md w-full max-w-sm p-8 flex flex-col gap-4">
      <h1 class="text-2xl font-bold text-center text-gray-800">
        {{ mode === 'select' ? '名前を選択' : '管理者ログイン' }}
      </h1>

      <div v-if="error" class="px-3 py-2 rounded bg-red-50 text-red-600 text-sm">
        {{ error }}
      </div>

      <!-- 一般ユーザー：名前選択 -->
      <form v-if="mode === 'select'" class="flex flex-col gap-4" @submit.prevent="handleSelect">
        <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
          お名前
          <input
            v-model="search"
            type="text"
            :disabled="usersLoading"
            placeholder="名前で検索"
            class="px-3 py-2 border-2 border-gray-400 rounded text-base bg-white/80 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
          />
        </label>

        <div
          class="max-h-56 overflow-y-auto border-2 border-gray-300 rounded bg-white/80 divide-y divide-gray-200"
        >
          <p v-if="usersLoading" class="px-3 py-3 text-sm text-gray-500">読み込み中...</p>
          <p v-else-if="filteredUsers.length === 0" class="px-3 py-3 text-sm text-gray-500">
            該当する名前がありません
          </p>
          <button
            v-for="u in filteredUsers"
            :key="u.id"
            type="button"
            :class="[
              'w-full text-left px-3 py-2 text-base transition-colors',
              selectedUserId === u.id ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50',
            ]"
            @click="selectedUserId = u.id"
          >
            {{ u.name }}
          </button>
        </div>

        <button
          type="submit"
          :disabled="loading || !selectedUserId"
          class="py-2.5 bg-indigo-600 text-white rounded text-base font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {{ loading ? '進んでいます...' : '進む' }}
        </button>

        <button
          type="button"
          class="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          @click="switchMode('admin')"
        >
          管理者ログインはこちら
        </button>
      </form>

      <!-- 管理者：メール＋パスワード -->
      <form v-else class="flex flex-col gap-4" @submit.prevent="handleAdminLogin">
        <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
          メールアドレス
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="px-3 py-2 border-2 border-gray-400 rounded text-base bg-white/80 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        <label class="flex flex-col gap-1 text-sm font-medium text-gray-700">
          パスワード
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="px-3 py-2 border-2 border-gray-400 rounded text-base bg-white/80 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        <button
          type="submit"
          :disabled="loading"
          class="py-2.5 bg-indigo-600 text-white rounded text-base font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {{ loading ? 'ログイン中...' : 'ログイン' }}
        </button>

        <button
          type="button"
          class="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          @click="switchMode('select')"
        >
          名前選択に戻る
        </button>
      </form>
    </div>
  </div>
</template>
