/**
 * Update pong_lectionary_weeks (Year A Advent Week 1) with HTML-formatted content.
 * Run: node scripts/update_lectionary_html.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dir, '../.env')
for (const raw of readFileSync(envPath, 'utf8').split('\n')) {
  const line = raw.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const appendices = [
  {
    title: '甲年將臨節期的主日經課表',
    body: `<p>以下根據《修訂版通用經課》The Revised Common Lectionary</p>
<table>
<thead><tr><th>將臨節期</th><th>舊約</th><th>詩篇</th><th>書信</th><th>福音</th></tr></thead>
<tbody>
<tr><td>第一週（主日）</td><td>賽 2:1-5</td><td>詩 122</td><td>羅 13:11-14</td><td>太 24:36-44</td></tr>
<tr><td>第二週（主日）</td><td>賽 11:1-10</td><td>詩 72:1-7, 18-19</td><td>羅 15:4-13</td><td>太 3:1-12</td></tr>
<tr><td>第三週（主日）</td><td>賽 35:1-10</td><td>詩 146:5-10<br>或路 1:47-55</td><td>雅 5:7-10</td><td>太 11:2-11</td></tr>
<tr><td>第四週（主日）</td><td>賽 7:10-16</td><td>詩 80:1-7, 17-19</td><td>羅 1:1-7</td><td>太 1:18-25</td></tr>
</tbody>
</table>`,
  },
  {
    title: '將臨節期崇拜中的點燭儀式',
    body: `<p>在將臨節期間，必須預備一個將臨節花環的燭台，或自備五個燭台，外圍四個燭台分別放置三支紫色蠟燭、一支粉紅色蠟燭，中間的燭台放置一支白色的蠟燭（通常要比其他的蠟燭高些）。</p>
<p>每主日開始禮拜之前，必須先有點燭的儀式，點燭前最好先唱「以馬內利懇求降臨」《聯合詩選 57》作為開始。</p>
<h4 class="wk-lit-week">第一主日（希望）</h4>
<p>啟：這是將臨節期第一個主日，也是象徵「希望」的主日！</p>
<p>應：我們的希望在上主，以及祂愛子基督耶穌裏。</p>
<p>啟：上主是我們唯一的指望，祂應許要施行拯救，成全公義！</p>
<p class="wk-lit-action">點燃第一支紫色蠟燭</p>
<h4 class="wk-lit-week">第二主日（和平）</h4>
<p>啟：這是將臨節期第二個主日，也是象徵「和平」的主日！</p>
<p>應：我們的平安奠基於上主，以及祂的愛子基督耶穌裏。</p>
<p>啟：施洗約翰以及眾先知已經提醒我們，要預備上主所賜的平安！</p>
<p class="wk-lit-action">點燃第一、二支紫色蠟燭</p>
<h4 class="wk-lit-week">第三主日（喜樂）</h4>
<p>啟：這是將臨節期的第三個主日，也是象徵「喜樂」的主日！</p>
<p>應：我們全因上主、以及祂的愛子耶穌基督而喜樂。</p>
<p>啟：喜樂是上主的禮物，我們期待上主的應許與行動！</p>
<p class="wk-lit-action">點燃第一、二支紫色蠟燭以及粉紅色的蠟燭</p>
<h4 class="wk-lit-week">第四主日（愛）</h4>
<p>啟：這是將臨節期的第四個主日，也是象徵「愛」的主日！</p>
<p>應：耶穌將上主的慈愛活化在我們當中，祂也是人類大愛的典範。</p>
<p>啟：我們信靠基督，活在基督裏，也就是活在愛中，主阿！願你快來！</p>
<p class="wk-lit-action">點燃第一、二支紫色蠟燭，粉紅色蠟燭，以及第三支紫色蠟燭</p>
<p class="wk-lit-note">＊【中間白色蠟燭，則於平安夜禮拜時點燃】</p>`,
  },
  {
    title: '本週小組討論',
    body: `<p class="wk-disc-author">鄭沂珊 撰</p>
<h4 class="wk-disc-subtitle">一、光臨黑夜，盼臨心界</h4>
<p>本週經課以「光」為中心線索：以賽亞宣告萬國行在耶和華的光中（賽2:1–5），主耶穌勸勉門徒當在末世警醒（太 24:36–44），約翰則記錄施洗約翰在曠野見證光的來臨（約1:19–28）。挪亞在洪水後踏上新地（創8:1–19），羅馬書呼召信徒披戴光明（羅 13:11–14），希伯來書指向信心的前行（來 11:32–40）。在混亂與不確定之中，光已臨到，而關鍵在於人心是否預備迎接。你願意在黑暗仍深時就行在光裡嗎？你的生命是否願意被光照，引領你進入清醒、盼望與更新？</p>
<h4 class="wk-disc-subtitle">二、洪煙散盡，恩約更新</h4>
<p>挪亞經歷洪水與地的更新（創 8:1–19；9:1–17），象徵審判後的重生。以賽亞宣告上主的慈愛永不離開祂的百姓（賽54:1–10；賽 30:19–26），並指出祂的應許必然成就。羅馬書勸勉信徒與基督一同進入新生命（羅 6:1–11），馬太福音則指出主的話比天地更長存（太 24:23–35）。恩約的更新不在於我們的穩定，而在於上主的信實。當人生的「洪煙」逐漸散去，你看見祂為你預備的新地了嗎？你願意再次以信心回應祂永不移去的約嗎？</p>
<h4 class="wk-disc-subtitle">三、道臨曠野，心備正途</h4>
<p>以賽亞呼喊：「在曠野預備耶和華的路」（賽40:1–11），施洗約翰則在約旦河旁作見證，承認自己不是基督，只是「修直主道」的聲音（約 1:19–28）。主耶穌教導門徒警醒，因人子來的時辰無人能知（太 24:36–44）。以賽亞又宣告：「耶和華必在洗淨之後，使那日的榮光作庇蔭」（賽4:2–6），表示悔改是預備的起點。使徒行傳記載使徒們在關鍵時刻尋求主的引導（徒1:12–17,21–26；徒13:16–25），顯示生命是一條順服、仰望與更新的路。你的心是否仍有未被整平的崎嶇？在這將臨期，你願意如何修直內在的道路，使基督得以臨到、顯現、更新你？</p>`,
  },
]

async function update() {
  const { error } = await supabase
    .from('pong_lectionary_weeks')
    .update({
      theme_essay_title: '將臨節期的意義：\n主啊！願你快來！',
      appendices,
    })
    .eq('lectionary_year', 'A')
    .eq('season', 'advent')
    .eq('week_num', 1)

  if (error) {
    console.error('Update error:', error.message)
    process.exit(1)
  }
  console.log('Updated theme_essay_title and appendices successfully.')
}

update()
