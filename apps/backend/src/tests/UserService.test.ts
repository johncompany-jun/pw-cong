import { describe, test, expect } from 'bun:test'
import { createTestDb } from './setup'
import { UserService } from '../services/UserService'

const db = createTestDb()
const service = new UserService(db)

describe('UserService', () => {
  test('ユーザーを作成できる', async () => {
    const user = await service.create({
      email: 'user1@example.com',
      name: '山田太郎',
      isAdmin: false,
      gender: 'male',
    })
    expect(user.email).toBe('user1@example.com')
    expect(user.name).toBe('山田太郎')
    expect(user.gender).toBe('male')
    expect(user).not.toHaveProperty('passwordHash')
  })

  test('一覧が取得できる', async () => {
    await service.create({ email: 'user2@example.com', name: '田中花子', isAdmin: false, gender: 'female' })
    const list = await service.list()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list.every(u => !('passwordHash' in u))).toBe(true)
  })

  test('重複メールアドレスはエラー', async () => {
    expect(
      service.create({ email: 'user1@example.com', name: '別の人', isAdmin: false, gender: null })
    ).rejects.toThrow()
  })

  test('ユーザー情報を更新できる', async () => {
    const user = await service.create({ email: 'update@example.com', name: '更新前', isAdmin: false, gender: null })
    const updated = await service.update(user.id, { name: '更新後' })
    expect(updated.name).toBe('更新後')
  })

  test('存在しないユーザーの更新はエラー', async () => {
    expect(service.update(99999, { name: '誰か' })).rejects.toThrow()
  })

  test('ユーザーを削除できる', async () => {
    const user = await service.create({ email: 'delete@example.com', name: '削除対象', isAdmin: false, gender: null })
    await service.delete(user.id)
    const list = await service.list()
    expect(list.find(u => u.id === user.id)).toBeUndefined()
  })

  test('bulkでCSVインポートできる', async () => {
    const rows = [
      { email: 'bulk1@example.com', name: 'バルク一', gender: 'male', password: 'pass1' },
      { email: 'bulk2@example.com', name: 'バルク二', gender: 'female', password: 'pass2' },
      { email: 'bulk1@example.com', name: '重複', gender: 'male', password: 'pass3' }, // 重複
    ]
    const results = await service.bulk(rows)
    expect(results[0].ok).toBe(true)
    expect(results[1].ok).toBe(true)
    expect(results[2].ok).toBe(false)
  })
})
