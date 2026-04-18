<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
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
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
    style="background-image: url('/login_bg.jpg')"
  >
    <form
      class="bg-white/80 rounded-lg shadow-md w-full max-w-sm p-8 flex flex-col gap-4"
      @submit.prevent="handleSubmit"
    >
      <h1 class="text-2xl font-bold text-center text-gray-800">ログイン</h1>

      <div v-if="error" class="px-3 py-2 rounded bg-red-50 text-red-600 text-sm">
        {{ error }}
      </div>

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
    </form>
  </div>
</template>
