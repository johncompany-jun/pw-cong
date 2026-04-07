<script setup lang="ts">
import { ref } from 'vue'
import { API, useApi } from '../../composables/useApi'
import PointInput, { type PointData } from './PointInput.vue'

const emit = defineEmits<{ created: [] }>()

const { authHeaders } = useApi()

const name = ref('')
const startTime = ref('09:00')
const endTime = ref('17:00')
const points = ref<PointData[]>([{ name: '', lat: null, lng: null, address: '' }])

function addPoint() {
  points.value.push({ name: '', lat: null, lng: null, address: '' })
}

function removePoint(index: number) {
  points.value.splice(index, 1)
}

async function submit() {
  try {
    const res = await fetch(`${API}/api/spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        name: name.value,
        startTime: startTime.value,
        endTime: endTime.value,
        points: points.value,
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? 'スポットの作成に失敗しました')
    }
    name.value = ''
    startTime.value = '09:00'
    endTime.value = '17:00'
    points.value = [{ name: '', lat: null, lng: null, address: '' }]
    emit('created')
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
    <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">新規スポット作成</h4>
    <form @submit.prevent="submit" class="flex flex-col gap-4">
      <!-- 基本情報 -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          v-model="name"
          placeholder="スポット名"
          required
          class="sm:col-span-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
        <div class="flex items-center gap-2">
          <input
            v-model="startTime"
            type="time"
            required
            class="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          <span class="text-gray-400 text-sm flex-shrink-0">〜</span>
          <input
            v-model="endTime"
            type="time"
            required
            class="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
      </div>

      <!-- ポイント -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-600">ポイント</span>
          <button
            type="button"
            @click="addPoint"
            class="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <span class="material-icons text-base">add_circle_outline</span>
            ポイントを追加
          </button>
        </div>
        <PointInput
          v-for="(point, i) in points"
          :key="i"
          v-model="points[i]"
          :index="i"
          @remove="removePoint(i)"
        />
      </div>

      <div class="flex justify-end">
        <button
          type="submit"
          class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          作成
        </button>
      </div>
    </form>
  </div>
</template>
