import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { AppDB } from '../db'
import { users, applications, specialAssignments, rotationAssignments, schedules } from '../db/schema'

const DEFAULT_PASSWORD = 'Gosho0059'

export class UserService {
  constructor(private db: AppDB) {}

  async list() {
    const all = await this.db.select().from(users).orderBy(users.createdAt)
    return all.map(this.sanitize)
  }

  async create(data: {
    email: string
    name: string
    nameKana?: string | null
    password?: string
    isAdmin: boolean
    gender: string | null
  }) {
    const passwordHash = await bcrypt.hash(data.password ?? DEFAULT_PASSWORD, 8)
    const [user] = await this.db
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        nameKana: data.nameKana ?? null,
        passwordHash,
        isAdmin: data.isAdmin,
        gender: data.gender,
      })
      .returning()
    return this.sanitize(user)
  }

  async update(id: number, data: { name?: string; nameKana?: string | null; email?: string; isAdmin?: boolean }) {
    const [user] = await this.db.update(users).set(data).where(eq(users.id, id)).returning()
    if (!user) throw new Error('ユーザーが見つかりません')
    return this.sanitize(user)
  }

  async delete(id: number) {
    // 外部キー参照を先に片付ける（本番 D1 は FK を強制するため、
    // 参照が残ったままだと削除が失敗する）
    await this.db.delete(applications).where(eq(applications.userId, id))
    await this.db.delete(specialAssignments).where(eq(specialAssignments.userId, id))
    await this.db.delete(rotationAssignments).where(eq(rotationAssignments.userId, id))
    // MC 担当は割当を外すだけ（スケジュール自体は残す）
    await this.db.update(schedules).set({ mcUserId: null }).where(eq(schedules.mcUserId, id))

    await this.db.delete(users).where(eq(users.id, id))
  }

  async bulk(rows: { email: string; name: string; nameKana?: string; gender: string; password: string }[]) {
    return Promise.all(
      rows.map(async row => {
        try {
          await this.create({ ...row, nameKana: row.nameKana || null, isAdmin: false, gender: row.gender || null })
          return { email: row.email, ok: true }
        } catch (e: unknown) {
          return { email: row.email, ok: false, error: e instanceof Error ? e.message : 'エラー' }
        }
      })
    )
  }

  private sanitize(user: typeof users.$inferSelect) {
    const { passwordHash: _, ...rest } = user
    return rest
  }
}
