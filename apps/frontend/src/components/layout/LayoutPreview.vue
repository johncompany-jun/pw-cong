<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useApi } from '../../composables/useApi'

const props = defineProps<{
  layoutId: number
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
    const blob = await api.getBlob(`/layouts/${props.layoutId}/files/${props.fileId}`)
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

watch(() => [props.layoutId, props.fileId], load, { immediate: true })

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
  <div v-else class="w-full">
    <div v-if="loading" class="text-sm text-gray-400 py-4">読み込み中...</div>
    <div v-else-if="error" class="text-sm text-red-500 py-4">{{ error }}</div>
    <template v-else-if="blobUrl">
      <img
        v-if="isImage(mimeType)"
        :src="blobUrl"
        :alt="fileName"
        class="block max-w-full h-auto rounded border border-gray-200"
      />
      <iframe
        v-else-if="isPdf(mimeType)"
        :src="blobUrl"
        class="w-full h-[70vh] border border-gray-200 rounded bg-white"
        :title="fileName"
      />
      <a
        v-else
        :href="blobUrl"
        :download="fileName"
        class="text-indigo-600 underline text-sm"
      >{{ fileName }} をダウンロード</a>
    </template>
  </div>
</template>
