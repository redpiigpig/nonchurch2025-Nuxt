// 修正靈修引言尾部日期錯誤（26 筆）
// 只替換字串最後一次出現，確保不動到正文

const https = require('https')
require('dotenv').config()
const URL_BASE = 'https://pottupypvdzamztdhsah.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_KEY

function sbGet(path) {
  return new Promise((resolve, reject) => {
    https.get(URL_BASE + path, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve(JSON.parse(d)))
    }).on('error', reject)
  })
}

function sbPatch(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request(URL_BASE + path, {
      method: 'PATCH',
      headers: {
        apikey: KEY, Authorization: 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Prefer: 'return=minimal'
      }
    }, res => {
      res.resume()
      res.on('end', () => resolve(res.statusCode))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// 最後一次出現替換
function replaceLast(str, find, rep) {
  const idx = str.lastIndexOf(find)
  if (idx === -1) return null // 找不到
  return str.slice(0, idx) + rep + str.slice(idx + find.length)
}

const FIXES = [
  // A年顯現期 wk02
  { y: 'A', s: 'epiphany',  w: 2,  find: '顯現節後第二主日前夕',     rep: '顯現節後第三主日前夕' },
  // C年大齋期 wk03, wk04
  { y: 'C', s: 'lent',      w: 3,  find: '大齋期第二主日',           rep: '大齋期第三主日' },
  { y: 'C', s: 'lent',      w: 4,  find: '大齋期第二主日',           rep: '大齋期第四主日' },
  // C年復活期 wk03
  { y: 'C', s: 'easter',    w: 3,  find: '復活節後第二主日',         rep: '復活節後第三主日' },
  // C年聖靈降臨後 wk03-wk24（系統性少一）
  { y: 'C', s: 'pentecost', w:  3, find: '降臨節第二主日前夕',       rep: '降臨節第三主日前夕' },
  { y: 'C', s: 'pentecost', w:  4, find: '降臨節第三主日前夕',       rep: '降臨節第四主日前夕' },
  { y: 'C', s: 'pentecost', w:  5, find: '降臨節第四主日前夕',       rep: '降臨節第五主日前夕' },
  { y: 'C', s: 'pentecost', w:  6, find: '降臨節第五主日前夕',       rep: '降臨節第六主日前夕' },
  { y: 'C', s: 'pentecost', w:  7, find: '降臨節第六主日前夕',       rep: '降臨節第七主日前夕' },
  { y: 'C', s: 'pentecost', w:  8, find: '降臨節第七主日前夕',       rep: '降臨節第八主日前夕' },
  { y: 'C', s: 'pentecost', w:  9, find: '降臨節第八主日前夕',       rep: '降臨節第九主日前夕' },
  { y: 'C', s: 'pentecost', w: 10, find: '降臨節第九主日前夕',       rep: '降臨節第十主日前夕' },
  { y: 'C', s: 'pentecost', w: 11, find: '降臨節第十主日前夕',       rep: '降臨節第十一主日前夕' },
  { y: 'C', s: 'pentecost', w: 12, find: '降臨節第十一主日前夕',     rep: '降臨節第十二主日前夕' },
  { y: 'C', s: 'pentecost', w: 13, find: '降臨節第十二主日前夕',     rep: '降臨節第十三主日前夕' },
  { y: 'C', s: 'pentecost', w: 14, find: '降臨節第十三主日前夕',     rep: '降臨節第十四主日前夕' },
  { y: 'C', s: 'pentecost', w: 15, find: '降臨節第十四主日前夕',     rep: '降臨節第十五主日前夕' },
  { y: 'C', s: 'pentecost', w: 16, find: '降臨節第十五主日前夕',     rep: '降臨節第十六主日前夕' },
  { y: 'C', s: 'pentecost', w: 17, find: '降臨節第十六主日前夕',     rep: '降臨節第十七主日前夕' },
  { y: 'C', s: 'pentecost', w: 18, find: '降臨節第十七主日前夕',     rep: '降臨節第十八主日前夕' },
  { y: 'C', s: 'pentecost', w: 19, find: '降臨節第十八主日前夕',     rep: '降臨節第十九主日前夕' },
  { y: 'C', s: 'pentecost', w: 20, find: '降臨節第十九主日前夕',     rep: '降臨節第二十主日前夕' },
  { y: 'C', s: 'pentecost', w: 21, find: '降臨節第二十主日前夕',     rep: '降臨節第二十一主日前夕' },
  { y: 'C', s: 'pentecost', w: 22, find: '降臨節第二十一主日前夕',   rep: '降臨節第二十二主日前夕' },
  { y: 'C', s: 'pentecost', w: 23, find: '降臨節第二十二主日前夕',   rep: '降臨節第二十三主日前夕' },
  { y: 'C', s: 'pentecost', w: 24, find: '降臨節第二十三主日前夕',   rep: '降臨節第二十四主日前夕' },
]

async function main() {
  // 一次拉所有有 intro_letter 的資料
  const rows = await sbGet(
    '/rest/v1/pong_lectionary_weeks?select=id,lectionary_year,season,week_num,intro_letter' +
    '&intro_letter=not.is.null&limit=200'
  )
  const idMap = {}
  rows.forEach(r => { idMap[`${r.lectionary_year}-${r.season}-${r.week_num}`] = r })

  let ok = 0, err = 0, skip = 0
  for (const fix of FIXES) {
    const key = `${fix.y}-${fix.s}-${fix.w}`
    const row = idMap[key]
    if (!row) { console.log(`⚠️  ${key} 找不到`); skip++; continue }

    const updated = replaceLast(row.intro_letter, fix.find, fix.rep)
    if (!updated) { console.log(`⚠️  ${key} 找不到目標字串「${fix.find}」`); skip++; continue }

    console.log(`[${key}] 替換成功`)
    console.log(`  舊: ...${row.intro_letter.slice(-60)}`)
    console.log(`  新: ...${updated.slice(-60)}`)

    const status = await sbPatch(
      `/rest/v1/pong_lectionary_weeks?id=eq.${row.id}`,
      { intro_letter: updated }
    )
    if (status === 204 || status === 200) { console.log(`  ✅ 已更新`); ok++ }
    else { console.log(`  ❌ HTTP ${status}`); err++ }
  }
  console.log(`\n完成：更新 ${ok}　跳過 ${skip}　錯誤 ${err}`)
}

main().catch(console.error)
