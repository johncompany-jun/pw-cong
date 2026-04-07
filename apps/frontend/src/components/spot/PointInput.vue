<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { loadGoogleMaps } from '../../composables/useGoogleMaps'

export type PointData = {
  name: string
  lat: number | null
  lng: number | null
  address: string
}

const props = defineProps<{ modelValue: PointData; index: number }>()
const emit = defineEmits<{
  'update:modelValue': [value: PointData]
  remove: []
}>()

const searchInput = ref<HTMLInputElement | null>(null)
const mapEl = ref<HTMLDivElement | null>(null)
const showMap = ref(false)
const mapsError = ref('')

let map: any = null
let marker: any = null

// Autocomplete の初期化
onMounted(async () => {
  try {
    await loadGoogleMaps()
    const g = (window as any).google
    const ac = new g.maps.places.Autocomplete(searchInput.value!, {
      fields: ['formatted_address', 'geometry'],
    })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place.geometry?.location) return
      const lat: number = place.geometry.location.lat()
      const lng: number = place.geometry.location.lng()
      const address: string = place.formatted_address ?? ''
      emit('update:modelValue', { ...props.modelValue, lat, lng, address })
      if (searchInput.value) searchInput.value.value = address
      if (map) {
        map.setCenter({ lat, lng })
        map.setZoom(17)
        placeMarkerAt(lat, lng)
      }
    })
  } catch (e: unknown) {
    mapsError.value = e instanceof Error ? e.message : 'Google Maps エラー'
  }
})

// 地図の初期化（表示時のみ）
watch(showMap, async (val) => {
  if (!val || map) return
  await nextTick()
  try {
    await loadGoogleMaps()
    initMap()
  } catch (e: unknown) {
    mapsError.value = e instanceof Error ? e.message : 'Google Maps エラー'
  }
})

function initMap() {
  const g = (window as any).google
  const hasLocation = props.modelValue.lat !== null

  if (hasLocation) {
    createMap(g, { lat: props.modelValue.lat!, lng: props.modelValue.lng! }, 17)
    placeMarkerAt(props.modelValue.lat!, props.modelValue.lng!)
  } else if (navigator.geolocation) {
    // 一時的に世界地図で初期化しつつ現在地取得
    createMap(g, { lat: 35.6762, lng: 139.6503 }, 13)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        map.setCenter(center)
        map.setZoom(15)
      },
      () => { /* 許可されなかった場合はそのまま */ },
    )
  } else {
    createMap(g, { lat: 35.6762, lng: 139.6503 }, 13)
  }
}

function createMap(g: any, center: { lat: number; lng: number }, zoom: number) {
  map = new g.maps.Map(mapEl.value!, {
    center,
    zoom,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  })
  map.addListener('click', (e: any) => {
    const lat: number = e.latLng.lat()
    const lng: number = e.latLng.lng()
    placeMarkerAt(lat, lng)
    reverseGeocode(lat, lng)
  })
}

function placeMarkerAt(lat: number, lng: number) {
  const g = (window as any).google
  if (marker) {
    marker.setPosition({ lat, lng })
  } else {
    marker = new g.maps.Marker({ map, position: { lat, lng }, draggable: true })
    marker.addListener('dragend', () => {
      const pos = marker.getPosition()
      reverseGeocode(pos.lat(), pos.lng())
    })
  }
}

function reverseGeocode(lat: number, lng: number) {
  const g = (window as any).google
  new g.maps.Geocoder().geocode({ location: { lat, lng } }, (results: any, status: any) => {
    const address =
      status === 'OK' && results[0]
        ? results[0].formatted_address
        : `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    emit('update:modelValue', { ...props.modelValue, lat, lng, address })
    if (searchInput.value) searchInput.value.value = address
  })
}

function onNameInput(e: Event) {
  emit('update:modelValue', {
    ...props.modelValue,
    name: (e.target as HTMLInputElement).value,
  })
}
</script>

<template>
  <div class="flex gap-2 items-start p-3 bg-gray-50 border border-gray-200 rounded-lg">
    <span class="text-xs text-gray-400 font-medium mt-2.5 w-5 text-center shrink-0">
      {{ index + 1 }}
    </span>

    <div class="flex-1 flex flex-col gap-2">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <!-- ポイント名 -->
        <input
          :value="modelValue.name"
          @input="onNameInput"
          placeholder="ポイント名"
          required
          class="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
        />

        <!-- 住所検索 + 地図トグル -->
        <div class="flex gap-1.5">
          <div class="relative flex-1">
            <span class="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[1.1rem] pointer-events-none">
              location_on
            </span>
            <input
              ref="searchInput"
              :defaultValue="modelValue.address"
              placeholder="住所・場所で検索"
              class="w-full pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <button
            type="button"
            @click="showMap = !showMap"
            :class="['px-2.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 shrink-0',
              showMap
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50']"
          >
            <span class="material-icons text-base">map</span>
            地図
          </button>
        </div>
      </div>

      <!-- Google マップ -->
      <div
        v-show="showMap"
        ref="mapEl"
        class="w-full h-64 rounded-lg border border-gray-200 overflow-hidden"
      />

      <!-- ステータス -->
      <p v-if="mapsError" class="text-xs text-red-500">{{ mapsError }}</p>
      <p v-else-if="modelValue.lat !== null" class="text-xs text-gray-400 flex items-center gap-1">
        <span class="material-icons text-[0.9rem] text-green-500">check_circle</span>
        {{ modelValue.address }}
      </p>
    </div>

    <button
      type="button"
      @click="emit('remove')"
      class="mt-1.5 text-gray-300 hover:text-red-400 transition-colors shrink-0"
    >
      <span class="material-icons">close</span>
    </button>
  </div>
</template>
