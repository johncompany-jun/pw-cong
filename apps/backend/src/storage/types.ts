export type StoredObject = {
  body: ArrayBuffer
  contentType: string
  contentLength: number
}

export interface LayoutStorage {
  put(key: string, body: ArrayBuffer, contentType: string): Promise<void>
  get(key: string): Promise<StoredObject | null>
  delete(key: string): Promise<void>
}
