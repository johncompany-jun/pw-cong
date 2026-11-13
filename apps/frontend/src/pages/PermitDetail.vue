<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import type { PermitDetail } from '../types/permit'
import PermitPreview from '../components/permit/PermitPreview.vue'

const route = useRoute()
const router = useRouter()
const api = useApi()

const permit = ref<PermitDetail | null>(null)
const loading = ref(false)
const error = ref('')

const id = computed(() => Number(route.params.id))

function formatPeriod(start: string, end: string): string {
  if (start === end) return formatDate(start)
  return `${formatDate(start)} 〜 ${formatDate(end)}`
}

function formatDate(d: string): string {
  const [y, m, dd] = d.split('-')
  return `${y}/${Number(m)}/${Number(dd)}`
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    permit.value = await api.get<PermitDetail>(`/permits/${id.value}`)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'エラーが発生しました'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="flex flex-col gap-6 min-w-0 w-full">
    <div>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        @click="router.push('/permits')"
      >
        <span class="material-icons text-base">arrow_back</span>一覧に戻る
      </button>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <template v-else-if="permit">
      <div class="flex flex-col gap-1 min-w-0">
        <h2 class="text-xl font-semibold text-indigo-950 break-words">許可証</h2>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span class="text-sm text-gray-600 whitespace-nowrap">{{ formatPeriod(permit.startDate, permit.endDate) }}</span>
          <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[11px] font-medium whitespace-nowrap">
            <span class="material-icons text-[0.9rem] leading-none">place</span>{{ permit.spotName }}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-6 min-w-0 w-full">
        <div v-for="f in permit.files" :key="f.id" class="flex flex-col gap-2 min-w-0 w-full">
          <span class="block text-xs text-gray-500 truncate">{{ f.fileName }}</span>
          <PermitPreview
            :permit-id="permit.id"
            :file-id="f.id"
            :mime-type="f.mimeType"
            :file-name="f.fileName"
          />
        </div>
      </div>
    </template>
  </div>
</template>
