import { describe, test, expect, beforeAll, mock } from 'bun:test'
import { createTestDb } from './setup'

const db = createTestDb()
mock.module('../db', () => ({ db }))

const { AuthService } = await import('../services/AuthService')
const { UserService } = await import('../services/UserService')

describe('AuthService', () => {
  const auth = new AuthService()
  const userService = new UserService()

  beforeAll(async () => {
    await userService.create({
      email: 'test@example.com',
      name: 'テストユーザー',
      password: 'password123',
      isAdmin: false,
      gender: null,
    })
    await userService.create({
      email: 'admin@example.com',
      name: '管理者',
      password: 'adminpass',
      isAdmin: true,
      gender: null,
    })
  })

  test('正しい認証情報でログインできる', async () => {
    const result = await auth.login('test@example.com', 'password123')
    expect(result.token).toBeTruthy()
    expect(result.user.email).toBe('test@example.com')
    expect(result.user).not.toHaveProperty('passwordHash')
  })

  test('管理者フラグが正しく返る', async () => {
    const result = await auth.login('admin@example.com', 'adminpass')
    expect(result.user.isAdmin).toBe(true)
  })

  test('存在しないメールアドレスはエラー', async () => {
    expect(auth.login('none@example.com', 'password')).rejects.toThrow()
  })

  test('パスワードが違うとエラー', async () => {
    expect(auth.login('test@example.com', 'wrongpass')).rejects.toThrow()
  })

  test('パスワード変更後に新パスワードでログインできる', async () => {
    const { user } = await auth.login('test@example.com', 'password123')
    await auth.changePassword(user.id, 'password123', 'newpassword')
    const result = await auth.login('test@example.com', 'newpassword')
    expect(result.token).toBeTruthy()
  })

  test('現在のパスワードが違うと変更できない', async () => {
    const { user } = await auth.login('test@example.com', 'newpassword')
    expect(auth.changePassword(user.id, 'wrongcurrent', 'anotherpass')).rejects.toThrow()
  })
})
