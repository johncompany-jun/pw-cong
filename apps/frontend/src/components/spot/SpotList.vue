<script setup lang="ts">
import { ref } from 'vue'
import { API, useApi } from '../../composables/useApi'
import PointInput, { type PointData } from './PointInput.vue'

type SpotPoint = { id: number; name: string; lat: number | null; lng: number | null; address: string | null }
type Spot = { id: number; name: string; startTime: string; endTime: string; points: SpotPoint[]; createdAt: string }

const props = defineProps<{ spots: Spot[]; loading: boolean; error: string }>()
const emit = defineEmits<{ deleted: []; updated: [] }>()

const { authHeaders } = useApi()

const editingId = ref<number | null>(null)
const editName = ref('')
const editStartTime = ref('')
const editEndTime = ref('')
const editPoints = ref<PointData[]>([])

function startEdit(spot: Spot) {
  editingId.value = spot.id
  editName.value = spot.name
  editStartTime.value = spot.startTime
  editEndTime.value = spot.endTime
  editPoints.value = spot.points.map(p => ({
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    address: p.address ?? '',
  }))
}

function cancelEdit() {
  editingId.value = null
}

function addEditPoint() {
  editPoints.value.push({ name: '', lat: null, lng: null, address: '' })
}

async function saveEdit(id: number) {
  try {
    const res = await fetch(`${API}/api/spots/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        name: editName.value,
        startTime: editStartTime.value,
        endTime: editEndTime.value,
        points: editPoints.value,
      }),
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

async function deleteSpot(id: number) {
  if (!confirm('スポットを削除しますか？ポイントもすべて削除されます。')) return
  try {
    const res = await fetch(`${API}/api/spots/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? '削除に失敗しました')
    }
    emit('deleted')
  } catch (e: unknown) {
    alert(e instanceof Error ? e.message : 'エラーが発生しました')
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="loading" class="py-8 text-center text-gray-400 text-sm">読み込み中...</div>
    <div v-else-if="error" class="py-8 text-center text-red-500 text-sm">{{ error }}</div>
    <div v-else-if="spots.length === 0" class="py-8 text-center text-gray-400 text-sm">
      スポットがありません
    </div>

    <!-- 編集フォーム -->
    <div v-if="editingId !== null" class="bg-white border border-indigo-200 rounded-xl p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h4 class="text-sm font-semibold text-gray-600">スポットを編集</h4>
        <button @click="cancelEdit" class="text-gray-400 hover:text-gray-600 transition-colors">
          <span class="material-icons">close</span>
        </button>
      </div>
      <form @submit.prevent="saveEdit(editingId!)" class="flex flex-col gap-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            v-model="editName"
            placeholder="スポット名"
            required
            class="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          <div class="flex items-center gap-2">
            <input
              v-model="editStartTime"
              type="time"
              required
              class="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <span class="text-gray-400 text-sm">〜</span>
            <input
              v-model="editEndTime"
              type="time"
              required
              class="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-600">ポイント</span>
            <button
              type="button"
              @click="addEditPoint"
              class="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span class="material-icons text-base">add_circle_outline</span>
              ポイントを追加
            </button>
          </div>
          <PointInput
            v-for="(point, i) in editPoints"
            :key="i"
            v-model="editPoints[i]"
            :index="i"
            @remove="editPoints.splice(i, 1)"
          />
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            @click="cancelEdit"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            保存
          </button>
        </div>
      </form>
    </div>

    <!-- スポット一覧 -->
    <div
      v-for="spot in spots"
      :key="spot.id"
      v-show="editingId !== spot.id"
      class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
    >
      <div class="px-5 py-4 flex items-center gap-3">
        <span class="material-icons text-indigo-400">place</span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900 truncate">{{ spot.name }}</p>
          <p class="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <span class="material-icons text-[0.85rem]">schedule</span>
            {{ spot.startTime }} 〜 {{ spot.endTime }}
          </p>
        </div>
        <span class="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
          <span class="material-icons text-[0.85rem]">location_on</span>
          {{ spot.points.length }} ポイント
        </span>
        <div class="flex gap-1.5 flex-shrink-0">
          <button
            @click="startEdit(spot)"
            class="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs transition-colors"
          >編集</button>
          <button
            @click="deleteSpot(spot.id)"
            class="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs transition-colors"
          >削除</button>
        </div>
      </div>

      <!-- ポイント一覧 -->
      <div v-if="spot.points.length > 0" class="border-t border-gray-100 px-5 py-3 flex flex-col gap-2">
        <div
          v-for="(point, i) in spot.points"
          :key="point.id"
          class="flex items-start gap-2 text-sm"
        >
          <span class="text-xs text-gray-400 w-5 text-center mt-0.5 flex-shrink-0">{{ i + 1 }}</span>
          <div class="flex-1 min-w-0">
            <span class="font-medium text-gray-700">{{ point.name }}</span>
            <a
              v-if="point.lat !== null"
              :href="`https://www.google.com/maps?q=${point.lat},${point.lng}`"
              target="_blank"
              rel="noopener"
              class="ml-2 text-xs text-indigo-500 hover:text-indigo-700 underline transition-colors"
            >
              {{ point.address }}
            </a>
            <span v-else class="ml-2 text-xs text-gray-400">（位置未設定）</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
