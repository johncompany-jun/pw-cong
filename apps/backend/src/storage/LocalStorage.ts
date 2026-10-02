import { mkdir, readFile, writeFile, unlink, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { LayoutStorage, StoredObject } from './types'

export class LocalStorage implements LayoutStorage {
  private root: string
  private metaDir: string

  constructor(root: string) {
    this.root = resolve(root)
    this.metaDir = join(this.root, '.meta')
  }

  private pathFor(key: string): string {
    return join(this.root, key)
  }

  private metaPathFor(key: string): string {
    return join(this.metaDir, `${key}.json`)
  }

  async put(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
    const filePath = this.pathFor(key)
    const metaPath = this.metaPathFor(key)
    await mkdir(dirname(filePath), { recursive: true })
    await mkdir(dirname(metaPath), { recursive: true })
    await writeFile(filePath, Buffer.from(body))
    await writeFile(metaPath, JSON.stringify({ contentType }))
  }

  async get(key: string): Promise<StoredObject | null> {
    const filePath = this.pathFor(key)
    try {
      await stat(filePath)
    } catch {
      return null
    }
    const buf = await readFile(filePath)
    let contentType = 'application/octet-stream'
    try {
      const meta = JSON.parse(await readFile(this.metaPathFor(key), 'utf8')) as { contentType?: string }
      if (meta.contentType) contentType = meta.contentType
    } catch { /* no meta */ }
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    return { body: ab, contentType, contentLength: buf.byteLength }
  }

  async delete(key: string): Promise<void> {
    try { await unlink(this.pathFor(key)) } catch { /* not found */ }
    try { await unlink(this.metaPathFor(key)) } catch { /* not found */ }
  }
}
