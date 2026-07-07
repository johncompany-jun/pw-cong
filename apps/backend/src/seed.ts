import bcrypt from 'bcryptjs'
import { db } from './db'
import { users } from './db/schema'

async function seed() {
  const password = await bcrypt.hash('Gosho0059', 10)

  await db
    .insert(users)
    .values([
      { email: 'admin@example.com', name: '管理者', passwordHash: password, isAdmin: true },
      { email: 'user@example.com', name: '一般ユーザー', nameKana: 'いっぱんゆーざー', passwordHash: password, isAdmin: false },
      // 男性 5人
      { email: 'tanaka.kenji@example.com', name: '田中 健二', nameKana: 'たなか けんじ', passwordHash: password, isAdmin: false, gender: 'male' },
      { email: 'suzuki.hiroshi@example.com', name: '鈴木 浩', nameKana: 'すずき ひろし', passwordHash: password, isAdmin: false, gender: 'male' },
      { email: 'sato.takuma@example.com', name: '佐藤 拓馬', nameKana: 'さとう たくま', passwordHash: password, isAdmin: false, gender: 'male' },
      { email: 'yamamoto.ryota@example.com', name: '山本 涼太', nameKana: 'やまもと りょうた', passwordHash: password, isAdmin: false, gender: 'male' },
      { email: 'ito.shota@example.com', name: '伊藤 翔太', nameKana: 'いとう しょうた', passwordHash: password, isAdmin: false, gender: 'male' },
      // 女性 10人
      { email: 'watanabe.yuki@example.com', name: '渡辺 由紀', nameKana: 'わたなべ ゆき', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'nakamura.haruka@example.com', name: '中村 春香', nameKana: 'なかむら はるか', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'kobayashi.ayaka@example.com', name: '小林 彩花', nameKana: 'こばやし あやか', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'kato.misaki@example.com', name: '加藤 美咲', nameKana: 'かとう みさき', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'yoshida.rina@example.com', name: '吉田 里奈', nameKana: 'よしだ りな', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'yamada.nana@example.com', name: '山田 奈々', nameKana: 'やまだ なな', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'hayashi.mao@example.com', name: '林 真央', nameKana: 'はやし まお', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'inoue.yuna@example.com', name: '井上 由奈', nameKana: 'いのうえ ゆな', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'kimura.saki@example.com', name: '木村 咲希', nameKana: 'きむら さき', passwordHash: password, isAdmin: false, gender: 'female' },
      { email: 'matsumoto.aoi@example.com', name: '松本 葵', nameKana: 'まつもと あおい', passwordHash: password, isAdmin: false, gender: 'female' },
    ])
    .onConflictDoNothing()

  console.log('Seed complete')
  console.log('  admin@example.com / Gosho0059 (admin)')
  console.log('  user@example.com  / Gosho0059')
  console.log('  + 男性5人・女性10人のダミーユーザー（全員 Gosho0059）')
  process.exit(0)
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
