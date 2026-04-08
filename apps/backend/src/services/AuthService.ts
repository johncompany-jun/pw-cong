import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { AppDB } from '../db'
import { users } from '../db/schema'
import { generateToken } from '../auth'

export class AuthService {
  constructor(private db: AppDB, private jwtSecret: string) {}

  async login(email: string, password: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
    })
    if (!user) {
      throw new Error('メールアドレスまたはパスワードが正しくありません')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new Error('メールアドレスまたはパスワードが正しくありません')
    }

    const token = await generateToken(
      { sub: user.id, email: user.email, isAdmin: user.isAdmin },
      this.jwtSecret,
    )

    return { token, user: this.sanitize(user) }
  }

  async me(userId: number) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    })
    if (!user) throw new Error('ユーザーが見つかりません')
    return this.sanitize(user)
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    })
    if (!user) throw new Error('ユーザーが見つかりません')

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new Error('現在のパスワードが正しくありません')

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, userId))
  }

  private sanitize(user: typeof users.$inferSelect) {
    const { passwordHash: _, ...rest } = user
    return rest
  }
}
