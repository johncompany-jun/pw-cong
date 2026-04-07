import bcrypt from 'bcryptjs'
import { db } from './db'
import { users } from './db/schema'

async function seed() {
  const password = await bcrypt.hash('password', 10)

  await db
    .insert(users)
    .values([
      { email: 'admin@example.com', name: '管理者', passwordHash: password, isAdmin: true },
      { email: 'user@example.com', name: '一般ユーザー', passwordHash: password, isAdmin: false },
      // 男性 5人
      { email: 'tanaka.kenji@example.com', name: '田中 健二', passwordHash: password, isAdmin: false, gender: 'male' },
      { email: 'suzuki.hiroshi@example.com', name: '鈴木 浩', passwordHash: password, isAdmin: false, gender: 'male' },
      { email: 'sato.takuma@example.com', name: '佐藤 拓馬', passwordHash: password, isAdmin: false, gender: 'male' },
      { email: 'yamamoto.ryota@example.com', name: '山本 涼太', passwordHash: password, isAdmin: false, gender: 'male' },
      { email: 'ito.shota@example.com', name: '伊藤 翔太', passwordHash: password, isAdmin: false, gender: 'male' },
      // 女性 10人
      { email: 'watanabe.yuki@example.com', name: '渡辺 由紀', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'nakamura.haruka@example.com', name: '中村 春香', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'kobayashi.ayaka@example.com', name: '小林 彩花', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'kato.misaki@example.com', name: '加藤 美咲', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'yoshida.rina@example.com', name: '吉田 里奈', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'yamada.nana@example.com', name: '山田 奈々', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'hayashi.mao@example.com', name: '林 真央', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'inoue.yuna@example.com', name: '井上 由奈', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'kimura.saki@example.com', name: '木村 咲希', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'matsumoto.aoi@example.com', name: '松本 葵', passwordHash: password, isAdmin: false, gender: 'female' },
    ])
    .onConflictDoNothing()

  console.log('Seed complete')
  console.log('  admin@example.com / password (admin)')
  console.log('  user@example.com  / password')
  console.log('  + 男性5人・女性10人のダミーユーザー（全員 password）')
  process.exit(0)
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
