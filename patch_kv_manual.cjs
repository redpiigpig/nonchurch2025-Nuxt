// patch_kv_manual.cjs
// Manually patch 3 confirmed missing key_verse entries
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PATCHES = [
  {
    id: 365,
    book: '耶利米書',
    passage: '9:12-26',
    key_verse: `9:23 耶和華如此說：「智慧人不要因他的智慧誇口，勇士不要因他的力氣誇口，財主也不要因他的財富誇口；
9:24 誇口的卻要誇自己有聰明，認識我是耶和華，知道我喜悅在世上施行慈愛、公平和公義。這是耶和華說的。`,
  },
  {
    id: 370,
    book: '路加福音',
    passage: '9:43b-48',
    key_verse: `9:47 耶穌看出他們心中的議論，就領一個小孩子來，叫他站在自己旁邊，
9:48 對他們說：「凡為我的名接納這小孩子的，就是接納我；凡接納我的，就是接納那差我來的。你們中間最小的，他就是最大的。」`,
  },
  {
    id: 414,
    book: '哈巴谷書',
    passage: '3:1-16',
    key_verse: `3:2 耶和華啊，我聽見你的名聲；耶和華啊，我懼怕你的作為。求你在這些年間復興你的作為，在這些年間將它顯明出來；在發怒的時候以憐憫為念。`,
  },
];

async function main() {
  for (const p of PATCHES) {
    const { data: rows, error } = await supabase
      .from('pong_lectionary_days')
      .select('id, readings')
      .eq('id', p.id)
      .single();

    if (error || !rows) {
      console.error(`Fetch error id=${p.id}:`, error?.message);
      continue;
    }

    let matched = false;
    const newReadings = rows.readings.map(r => {
      if (r.book === p.book && r.passage === p.passage) {
        matched = true;
        console.log(`PATCH id=${p.id} ${r.book} ${r.passage}`);
        console.log(`  → ${p.key_verse.substring(0, 80).replace(/\n/g, '↵')}`);
        return { ...r, key_verse: p.key_verse };
      }
      return r;
    });

    if (!matched) {
      console.error(`NO MATCH id=${p.id} book=${p.book} passage=${p.passage}`);
      console.log('  Available readings:', rows.readings.map(r => `${r.book} ${r.passage}`).join(', '));
      continue;
    }

    const { error: upErr } = await supabase
      .from('pong_lectionary_days')
      .update({ readings: newReadings })
      .eq('id', p.id);

    if (upErr) console.error(`Update error id=${p.id}:`, upErr.message);
    else console.log(`  ✓ updated`);
  }
  console.log('\n完成');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
