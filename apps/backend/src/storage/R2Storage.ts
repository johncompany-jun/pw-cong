/// <reference types="@cloudflare/workers-types" />
import type { LayoutStorage, StoredObject } from './types'

export class R2Storage implements LayoutStorage {
  constructor(private bucket: R2Bucket) {}

  async put(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
    await this.bucket.put(key, body, {
      httpMetadata: { contentType },
    })
  }

  async get(key: string): Promise<StoredObject | null> {
    const obj = await this.bucket.get(key)
    if (!obj) return null
    const body = await obj.arrayBuffer()
    return {
      body,
      contentType: obj.httpMetadata?.contentType ?? 'application/octet-stream',
      contentLength: body.byteLength,
    }
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key)
  }
}
