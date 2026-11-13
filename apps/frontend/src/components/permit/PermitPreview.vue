<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useApi } from '../../composables/useApi'

const props = defineProps<{
  permitId: number
  fileId: number
  mimeType: string
  fileName: string
  thumb?: boolean
}>()

const api = useApi()
const blobUrl = ref<string | null>(null)
const loading = ref(false)
const error = ref('')

const isImage = (m: string) => m.startsWith('image/')
const isPdf = (m: string) => m === 'application/pdf'

async function load() {
  revoke()
  loading.value = true
  error.value = ''
  try {
    const blob = await api.getBlob(`/permits/${props.permitId}/files/${props.fileId}`)
    blobUrl.value = URL.createObjectURL(blob)
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

function revoke() {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = null
  }
}

watch(() => [props.permitId, props.fileId], load, { immediate: true })

onBeforeUnmount(revoke)
</script>

<template>
  <!-- サムネイル表示 -->
  <div v-if="thumb" class="w-full h-full flex items-center justify-center bg-gray-50">
    <span v-if="loading" class="material-icons text-2xl text-gray-300 animate-pulse">image</span>
    <span v-else-if="error" class="material-icons text-2xl text-red-300" :title="error">broken_image</span>
    <template v-else-if="blobUrl">
      <img
        v-if="isImage(mimeType)"
        :src="blobUrl"
        :alt="fileName"
        class="w-full h-full object-cover"
      />
      <span
        v-else-if="isPdf(mimeType)"
        class="material-icons text-5xl text-red-400"
      >picture_as_pdf</span>
      <span v-else class="material-icons text-4xl text-gray-400">insert_drive_file</span>
    </template>
  </div>

  <!-- フル表示 -->
  <div v-else class="w-full min-w-0 max-w-full overflow-hidden">
    <div v-if="loading" class="text-sm text-gray-400 py-4">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500 py-4">{{ error }}</div>
    <template v-else-if="blobUrl">
      <img
        v-if="isImage(mimeType)"
        :src="blobUrl"
        :alt="fileName"
        class="block max-w-full h-auto rounded border border-gray-200"
      />
      <div v-else-if="isPdf(mimeType)" class="flex flex-col gap-2">
        <!-- モバイル: iOS Safari の PDF iframe が不安定なため、カード表示 + 開くボタン -->
        <a
          :href="blobUrl"
          target="_blank"
          rel="noopener"
          class="sm:hidden flex flex-col items-center justify-center gap-3 w-full py-10 px-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors"
        >
          <span class="material-icons text-6xl text-red-400">picture_as_pdf</span>
          <span class="text-sm text-gray-700 text-center break-all">{{ fileName }}</span>
          <span class="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <span class="material-icons text-base">open_in_new</span>PDF を開く
          </span>
        </a>
        <!-- デスクトップ: iframe でインライン表示 -->
        <iframe
          :src="blobUrl"
          class="hidden sm:block w-full h-[70vh] border border-gray-200 rounded bg-white"
          :title="fileName"
        />
        <a
          :href="blobUrl"
          target="_blank"
          rel="noopener"
          class="hidden sm:inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm self-start"
        >
          <span class="material-icons text-base">open_in_new</span>新しいタブで開く
        </a>
      </div>
      <a
        v-else
        :href="blobUrl"
        :download="fileName"
        class="text-indigo-600 underline text-sm"
      >{{ fileName }} をダウンロード</a>
    </template>
  </div>
</template>
