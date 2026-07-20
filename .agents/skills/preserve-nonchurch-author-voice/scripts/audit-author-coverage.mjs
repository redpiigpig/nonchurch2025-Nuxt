import fs from 'node:fs'
import path from 'node:path'

function findRepoRoot(start) {
  let current = path.resolve(start)
  while (true) {
    if (fs.existsSync(path.join(current, '.env')) && fs.existsSync(path.join(current, 'package.json'))) return current
    const parent = path.dirname(current)
    if (parent === current) throw new Error('找不到含 .env 與 package.json 的專案根目錄')
    current = parent
  }
}

function readEnv(file) {
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8').split(/\r?\n/)
      .filter(line => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map(line => {
        const i = line.indexOf('=')
        return [line.slice(0, i), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]
      })
  )
}

const root = findRepoRoot(process.cwd())
const env = readEnv(path.join(root, '.env'))
const base = env.VITE_SUPABASE_URL
const key = env.SUPABASE_SERVICE_KEY
if (!base || !key) throw new Error('缺少 VITE_SUPABASE_URL 或 SUPABASE_SERVICE_KEY')

const headers = { apikey: key, Authorization: `Bearer ${key}` }
async function get(resource) {
  const response = await fetch(`${base}/rest/v1/${resource}`, { headers })
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`)
  return response.json()
}

const [authors, articles] = await Promise.all([
  get('authors?select=id,name,real_name&order=id'),
  get('articles?select=id,title,author,author_display,issue,linked_author_ids&order=issue,id')
])

const requested = process.argv.find(arg => arg.startsWith('--author='))?.slice('--author='.length)
const rows = requested ? authors.filter(a => a.name.includes(requested) || a.real_name?.includes(requested)) : authors

for (const author of rows) {
  const direct = articles.filter(a => a.author === author.name || (author.real_name && a.author === author.real_name))
  const linked = articles.filter(a => Array.isArray(a.linked_author_ids) && a.linked_author_ids.map(Number).includes(Number(author.id)))
  const indirect = linked.filter(a => !direct.includes(a))
  console.log(`\n[${author.id}] ${author.name}｜親筆署名 ${direct.length}｜其他關聯 ${indirect.length}`)
  for (const article of direct) console.log(`  直接  issue ${article.issue ?? '-'}｜${article.id}｜${article.title}`)
  for (const article of indirect) console.log(`  關聯  issue ${article.issue ?? '-'}｜${article.id}｜${article.title}｜署名：${article.author || article.author_display || '-'}`)
}
