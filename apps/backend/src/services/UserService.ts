import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../db/schema'

const DEFAULT_PASSWORD = 'SmpwFa10'

export class UserService {
  async list() {
    const all = await db.select().from(users).orderBy(users.createdAt)
    return all.map(this.sanitize)
  }

  async create(data: {
    email: string
    name: string
    password?: string
    isAdmin: boolean
    gender: string | null
  }) {
    const passwordHash = await bcrypt.hash(data.password ?? DEFAULT_PASSWORD, 10)
    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        passwordHash,
        isAdmin: data.isAdmin,
        gender: data.gender,
      })
      .returning()
    return this.sanitize(user)
  }

  async update(id: number, data: { name?: string; email?: string; isAdmin?: boolean }) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning()
    if (!user) throw new Error('ユーザーが見つかりません')
    return this.sanitize(user)
  }

  async delete(id: number) {
    await db.delete(users).where(eq(users.id, id))
  }

  async bulk(rows: { email: string; name: string; gender: string; password: string }[]) {
    const results: { email: string; ok: boolean; error?: string }[] = []
    for (const row of rows) {
      try {
        await this.create({ ...row, isAdmin: false, gender: row.gender || null })
        results.push({ email: row.email, ok: true })
      } catch (e: unknown) {
        results.push({ email: row.email, ok: false, error: e instanceof Error ? e.message : 'エラー' })
      }
    }
    return results
  }

  private sanitize(user: typeof users.$inferSelect) {
    const { passwordHash: _, ...rest } = user
    return rest
  }
}
