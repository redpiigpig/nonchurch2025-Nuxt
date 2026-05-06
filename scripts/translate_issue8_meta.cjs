/**
 * 第八期 issues 表多語翻譯（手譯版本，不用 Gemini）
 *
 * 來源欄位：title / date / intro_home / intro_cfp / cfp_title / cfp_theme / cfp_deadline
 * 目標語言：en / ja / ko / zh_CN / zh_HK
 * 寫入：issues.translations[lang]
 *
 * 用法：
 *   node scripts/translate_issue8_meta.cjs dry  # 不寫入，只印出
 *   node scripts/translate_issue8_meta.cjs      # 實寫入
 */
require("dotenv").config({ quiet: true });

const DRY = process.argv.includes("dry");
const ISSUE_ID = 8;
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("❌ 缺少 VITE_SUPABASE_URL 或 SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const TRANSLATIONS = {
  en: {
    title: "The Kingdom of God on Earth and Buddhism for Human Realm",
    date: "March-April 2026 Issue",
    cfp_title:
      "The World Is My Parish: A Memorial Issue for Bishop Pang Chun-hua",
    cfp_deadline: "June 15, 2026",
    intro_home:
      "This issue of \"Faith Without Boundary\" begins from the most painful Lin Family Massacre during Taiwan's democratization process and the founding of Yi-Kuang Presbyterian Church, asking: when suffering and injustice come before us, does faith lead us to escape from reality, or does it grant us the courage to face the world directly? When Buddhist worldly compassion meets Christian social practice on this suffering land, can faith communities transform grief and indignation into love for the land, becoming vessels that bear suffering and advocate for justice?\n\nThe special feature and cover story of this issue interview Elder Tian Meng-shu and revisit Lin Yi-hsiung's fearless actions and the worldly development of Modern Chan Buddhism, witnessing the convergence of justice and compassion. The Theme Square begins from the memory and forgiveness of historical tragedies, and then explores—through the perspectives of religious sociology, Jungian psychology, and phenomenology—how the sacred sheds its veil and walks into the human world, while reflecting on how to refuse coercion in the name of the sacred. The Diverse Forum, in turn, rethinks church tradition and future visions through the conservative tensions of theological education, classical cosmological texts, and the historical evolution of episcopacy.\n\nFaith should not be a closed fortress, but a driving force that compels us to enter the world, face suffering, and embrace diversity. We invite readers to walk together into these historical intersections forged in suffering, and to ponder how, within highly complex contemporary society, we may transcend denominational and tangible boundaries, refusing to abandon our vows even when sentient beings do evil, and through concrete action become that light which illuminates all in the human world.",
    intro_cfp:
      'The next issue of "Faith Without Boundary" （May-June 2026） will be themed 「The World Is My Parish: A Memorial Issue for Bishop Pang Chun-hua」, commemorating the life and ministry of Bishop Pang and exploring the influence of Wesleyan thought on contemporary churches in Taiwan. During his lifetime, Bishop Pang devoted himself to liturgical renewal, discipleship training, and theological education, and was deeply concerned with ecumenical unity—like a contemporary John Wesley. We sincerely invite submissions regarding Bishop Pang\'s life and reminiscences, Wesleyan theology, ecumenical unity, and related topics, and invite you to ponder with us: in our contemporary context, how shall we inherit and embody this expansive vision that transcends boundaries and shepherds the world?',
    cfp_theme:
      'The former Bishop of the Methodist Church in Taiwan—our beloved Bishop Pang Chun-hua—rested in the Lord on January 15, 2026. During his lifetime, he devoted himself to promoting liturgical renewal, discipleship formation, and theological education within the Methodist Church, and held a deep concern for ecumenical unity. His lifelong ministry, much like a contemporary John Wesley, embodied everywhere the Methodist spirit of "the world is my parish."\n\nTherefore, the next issue of "Faith Without Boundary" will be themed "The World Is My Parish: A Memorial Issue for Bishop Pang Chun-hua," hoping to commemorate with our readers the life and ministry of Bishop Pang, and to explore in depth the influence of Wesleyan theology and the Methodist spirit on contemporary churches in Taiwan.\n\nWe sincerely invite your active submissions. Whether reminiscences and testimonies of Bishop Pang\'s life and ministry, or critiques and reflections on Wesleyan theology, liturgical renewal, discipleship formation, ecumenical unity, and related topics—all are warmly welcome. Let us together, through this work of memorial and writing, inherit and continue that expansive vision of faith which transcends parish and denominational boundaries, calling us to take up the responsibility of shepherding wherever in the world we may be.',
  },

  ja: {
    title: "地上の神の国と人間仏教",
    date: "2026年03-04月号",
    cfp_title: "世界は我が牧区──龐君華監督記念特集",
    cfp_deadline: "2026年6月15日",
    intro_home:
      "今号の『無境界者』は、台湾の民主化の過程における最も痛ましい林宅血案と義光長老教会の創立から出発し、その時代の苦難と不正義が目の前に迫った時、信仰は私たちを現実から逃避させるのか、それとも世間に直面する勇気を与えてくれるのかを問います。仏教の社会参加と、キリスト教の社会的実践が、苦しめられた大地の上で交差する時、信仰共同体は悲しみと憤りを大地への愛へと変え、苦難を担い、正義を提唱する器となれるのでしょうか？\n\n今号の特集コーナーと表紙物語では、田孟淑長老にインタビューし、林義雄氏の畏れぬ行動と現代禅の社会参加の発展を振り返り、正義と慈悲の交差を見届けます。テーマ広場では、歴史的悲劇の記憶と赦しから出発し、宗教社会学、ユング心理学、現象学の視点を通して、聖なるものがいかにして帷を脱ぎ、人間の世界へと入って来るのかを探求し、聖なるものの名を借りた強要をいかにして拒むかを反省します。さらに多元講堂では、神学教育の保守化の緊張、古典的宇宙観の文献、そして司教制の歴史的変遷を通して、教会の伝統と未来のビジョンを再考します。\n\n信仰は閉ざされた城塞であってはならず、私たちを世間へと押し出し、苦難に直面させ、多元性を抱きしめさせる原動力であるべきです。読者の皆様が、苦難の中で鍛え抜かれたこれらの歴史の交差点に共に足を踏み入れ、高度に複雑化した現代社会において、宗派や有形の境界をいかに超え、衆生に悪があってもその誓願を捨てることなく、具体的な行動をもって人間世界をあまねく照らす光となれるかを、共に思索してくださるようお誘いします。",
    intro_cfp:
      "次号の『無境界者』（2026年05-06月号）は「世界は我が牧区──龐君華監督記念特集」をテーマとし、龐監督の生涯と奉仕を記念し、ウェスレー思想が現代台湾教会に与えた影響を探求します。龐監督は生前、教会において典礼の刷新、弟子訓練、神学教育の推進に尽力され、普遍的な教会一致への深い関心を抱いておられた、まさに現代のジョン・ウェスレーのような方でした。龐監督の生涯の回想、ウェスレー神学、教会一致などに関する原稿を心より募集し、皆様と共に問いかけます。現代の状況において、私たちはこの境界を越え、世界を牧する広大なビジョンを、いかに継承し実践していくべきでしょうか？",
    cfp_theme:
      "台湾メソジスト教会の前監督──私たちが敬愛する龐君華監督──は2026年1月15日に主の御許に召されました。生前、メソジスト教会において典礼の刷新、弟子の育成、神学教育の推進に尽力され、教会の合一に深い関心を寄せておられました。生涯にわたる奉仕は、まるで現代のジョン・ウェスレーのように、いたるところで「世界は我が牧区」というメソジストの精神を実践しておられました。\n\nそのため、次号の『無境界者』は「世界は我が牧区──龐君華監督記念特集」をテーマとし、読者の皆様と共に龐監督の生涯と奉仕の軌跡を記念し、ウェスレー神学とメソジスト精神が現代台湾教会にもたらした影響を深く探求したいと願っています。\n\n皆様の積極的なご投稿を心より歓迎いたします。龐監督の生涯の回想や奉仕の証であれ、ウェスレー神学、典礼の刷新、弟子の育成、教会の合一などに関する評論や省察であれ、すべて大歓迎です。この記念と書き留めの作業を通して、教区や宗派の境界を越え、世界のどこにいても進んで牧養の責任を引き受けるよう私たちを召す、その信仰のビジョンを共に継承し、永続させていきましょう。",
  },

  ko: {
    title: "지상의 신국과 인간 불교",
    date: "2026년 03-04월호",
    cfp_title: "세계는 나의 목회구역──팡쥔화 감독 추모 특집",
    cfp_deadline: "2026년 6월 15일",
    intro_home:
      "이번 호 『무경계자』는 대만 민주화 과정에서 가장 가슴 아픈 임댁(林宅) 혈안과 의광장로교회의 설립에서 출발하여, 그 시대의 고난과 불의가 우리 앞에 닥쳤을 때 신앙은 과연 우리를 현실로부터 도피하게 하는지, 아니면 세상에 정면으로 맞설 용기를 주는지 묻습니다. 불교의 입세적 관심과 기독교의 사회적 실천이 고난받는 이 땅 위에서 만날 때, 신앙 공동체는 슬픔과 분노를 이 땅에 대한 사랑으로 승화시키며, 고난을 짊어지고 정의를 옹호하는 그릇이 될 수 있을까요?\n\n이번 호의 특별 기고란과 표지 이야기에서는 톈멍수(田孟淑) 장로를 인터뷰하고, 린이슝(林義雄) 선생의 두려움 없는 행동과 현대선(現代禪)의 입세적 발전을 회고하며, 정의와 자비의 만남을 증언합니다. 주제 광장에서는 역사적 비극에 대한 기억과 용서로부터 출발하여, 종교사회학, 융 심리학, 현상학의 관점을 통해 거룩함이 어떻게 휘장을 벗고 인간 세상으로 들어오는지 탐구하며, 거룩함이라는 이름의 강압을 어떻게 거부할 것인지 성찰합니다. 또한 다원 강당에서는 신학 교육의 보수화 긴장, 고전 우주관의 문헌, 그리고 주교제의 역사적 변천을 통해 교회 전통과 미래의 비전을 다시 성찰합니다.\n\n신앙은 닫힌 요새가 되어서는 안 되며, 우리로 하여금 세상으로 나아가 고난에 직면하고 다양성을 끌어안게 하는 동력이어야 합니다. 독자 여러분이 함께 고난 속에서 단련된 이러한 역사의 만남의 지점들로 들어가, 고도로 복잡한 현대 사회에서 어떻게 종파와 유형의 경계를 넘어, 중생에게 악이 있더라도 그 서원을 버리지 않고, 구체적인 행동으로 인간 세상을 두루 비추는 빛이 될 수 있을지 사유해 주시기를 청합니다.",
    intro_cfp:
      "다음 호 『무경계자』（2026년 05-06월호）는 「세계는 나의 목회구역──팡쥔화 감독 추모 특집」을 주제로, 팡 감독의 생애와 사역을 기리고, 웨슬리 사상이 현대 대만 교회에 미친 영향을 탐구합니다. 팡 감독은 생전에 교회 안에서 예전 갱신, 제자 훈련, 신학 교육의 추진에 헌신하셨으며, 보편 교회의 일치에 깊은 관심을 가지셨던, 마치 현대의 존 웨슬리와 같은 분이셨습니다. 팡 감독의 생애에 대한 회고, 웨슬리 신학, 교회 일치 등 관련 원고를 진심으로 모집하며, 함께 사유해 주시기를 청합니다. 오늘날의 상황에서, 우리는 어떻게 경계를 넘어 세계를 목양하는 이 광대한 비전을 계승하고 실천해 갈 수 있을까요?",
    cfp_theme:
      "대만 감리교회의 전 감독──우리가 존경하는 팡쥔화 감독──께서 2026년 1월 15일 주님의 품에 안기셨습니다. 생전에 감리교회 안에서 예전 갱신, 제자 양성, 신학 교육의 추진에 헌신하시고, 교회의 일치에 깊은 관심을 가지셨습니다. 평생의 사역은 마치 현대의 존 웨슬리처럼, 모든 곳에서 「세계는 나의 목회구역」이라는 감리교 정신을 실천해 오셨습니다.\n\n따라서 다음 호 『무경계자』는 「세계는 나의 목회구역──팡쥔화 감독 추모 특집」을 주제로, 독자 여러분과 함께 팡 감독의 생애와 사역의 궤적을 기리고, 웨슬리의 신학 사상과 감리교 정신이 현대 대만 교회에 미친 영향을 깊이 있게 탐구하고자 합니다.\n\n여러분의 적극적인 투고를 진심으로 환영합니다. 팡 감독의 생애에 대한 회고와 사역의 증언이든, 웨슬리 신학, 예전 갱신, 제자 양성, 교회 일치 등 관련 주제에 대한 평론과 성찰이든, 모두 크게 환영합니다. 이러한 추모와 기록 속에서, 교구와 교파의 경계를 넘어 세계 어느 곳에 있든 목양의 책임을 기꺼이 짊어지도록 우리를 부르시는 그 신앙의 비전을 함께 계승하고 이어가도록 합시다.",
  },

  zh_CN: {
    title: "地上神国与人间佛教",
    date: "2026年03-04月号",
    cfp_title: "世界是我的牧区──庞君华会督纪念专辑",
    cfp_deadline: "2026年6月15日",
    intro_home:
      "本期《无境界者》从台湾民主化历程中最沉痛的林宅血案与义光教会的建立出发，探问当时代的苦难与不公义来到眼前时，信仰究竟是带领我们逃避现实，还是赋予我们直面世间的勇气？当佛教的入世关怀与基督教的社会实践在受苦的土地上交会，信仰群体是否能化悲愤为对土地的爱，成为承担苦难与倡议公义的器皿？\n\n本期特稿专区与封面故事专访了田孟淑长老，并回顾林义雄先生的无畏行动与现代禅的入世发展，见证公义与慈悲的交会；主题广场则从对历史悲剧的记忆与宽恕出发，进而透过宗教社会学、荣格心理学与现象学的视角，探讨神圣如何褪去帷幕走入人间，并反思如何拒绝以神圣为名的挟制。此外，多元讲堂亦透过神学教育的保守化张力、古典宇宙观的文献与主教制的历史演变，重新省思教会传统与未来的愿景。\n\n信仰不应是封闭的堡垒，而是促使我们走入世间、直面苦难并拥抱多元的动力。我们邀请读者一同走入这些在苦难中淬炼出的历史交会点，思索在高度复杂的当代社会里，如何超越宗派与有形的界线，不因众生有恶而舍弃誓愿，并以具体的行动成为那在人间普照一切的光。",
    intro_cfp:
      "下期《无境界者》（2026年05-06月号）将以「世界是我的牧区──庞君华会督纪念专辑」为题，纪念庞会督的生平事奉，并探讨卫斯理思想对当代台湾教会的影响。庞会督生前在教会中致力推动礼仪更新、门徒训练与神学教育，并深切关心普世教会合一，宛如当代的约翰‧卫斯理。诚挚征求关于庞会督的生平回忆、卫斯理神学及教会合一等相关稿件，并邀您一同思索：在当代的处境中，我们该如何延续并实践这份跨越藩篱、牧养世界的宽广愿景？",
    cfp_theme:
      "台湾卫理公会前会督──我们所敬爱的庞君华会督──于2026年1月15日安息主怀。他生前致力于在卫理公会当中推动礼仪更新、门徒培育与神学教育，并对教会合一充满着深切的关怀。他一生的事奉，宛如当代的约翰‧卫斯理一般，无处不在实践着「世界是我的牧区」的循道精神。\n\n因此，下一期的《无境界者》将以「世界是我的牧区──庞君华会督纪念专辑」为题，期盼能与读者一同纪念庞会督的生平与事奉轨迹，并深入探讨卫斯理的神学思想与循道精神对当代台湾教会所带来的影响。\n\n我们诚挚邀请您踊跃投稿。无论是关于庞会督的生平回忆与事奉见证，或是针对卫斯理神学、礼仪更新、门徒培育及教会合一等相关议题的评论与反思，都非常欢迎。让我们一同在这份纪念与书写中，传承并延续那份跨越教区与宗派边界、呼召我们无论在世界哪个角落都愿意承担起牧养责任的信仰愿景。",
  },

  zh_HK: {
    title: "地上神國與人間佛教",
    date: "2026年03-04月號",
    cfp_title: "世界是我的牧區──龐君華會督紀念專輯",
    cfp_deadline: "2026年6月15日",
    intro_home:
      "今期《無境界者》從台灣民主化歷程中最沉痛嘅林宅血案同義光教會嘅建立出發，探問當時代嘅苦難同不公義來到眼前時，信仰究竟係帶領我哋逃避現實，定係賦予我哋直面世間嘅勇氣？當佛教嘅入世關懷同基督教嘅社會實踐喺受苦嘅土地上交會，信仰群體又可唔可以化悲憤為對土地嘅愛，成為承擔苦難同倡議公義嘅器皿？\n\n今期特稿專區同封面故事專訪咗田孟淑長老，並回顧林義雄先生嘅無畏行動同現代禪嘅入世發展，見證公義與慈悲嘅交會；主題廣場就從對歷史悲劇嘅記憶同寬恕出發，進而透過宗教社會學、榮格心理學同現象學嘅視角，探討神聖點樣褪去帷幕走入人間，並反思點樣拒絕以神聖為名嘅挾制。此外，多元講堂亦都透過神學教育嘅保守化張力、古典宇宙觀嘅文獻同主教制嘅歷史演變，重新省思教會傳統同未來嘅願景。\n\n信仰唔應該係封閉嘅堡壘，而係促使我哋走入世間、直面苦難並擁抱多元嘅動力。我哋邀請讀者一齊走入呢啲喺苦難中淬鍊出嚟嘅歷史交會點，思索喺高度複雜嘅當代社會裡面，點樣超越宗派同有形嘅界線，唔會因為眾生有惡而捨棄誓願，並以具體嘅行動成為嗰道喺人間普照一切嘅光。",
    intro_cfp:
      "下期《無境界者》（2026年05-06月號）將會以「世界是我的牧區──龐君華會督紀念專輯」為題，紀念龐會督嘅生平事奉，並探討衛斯理思想對當代台灣教會嘅影響。龐會督生前喺教會中致力推動禮儀更新、門徒訓練同神學教育，並深切關心普世教會合一，宛如當代嘅約翰‧衛斯理。誠摯徵求關於龐會督嘅生平回憶、衛斯理神學同教會合一等相關稿件，並邀你一齊思索：喺當代嘅處境中，我哋應該點樣延續並實踐呢份跨越藩籬、牧養世界嘅寬廣願景？",
    cfp_theme:
      "台灣衛理公會前會督──我哋所敬愛嘅龐君華會督──喺2026年1月15日安息主懷。佢生前致力於喺衛理公會當中推動禮儀更新、門徒培育同神學教育，並對教會合一充滿著深切嘅關懷。佢一生嘅事奉，宛如當代嘅約翰‧衛斯理一般，無處不在實踐著「世界是我的牧區」嘅循道精神。\n\n因此，下一期嘅《無境界者》將會以「世界是我的牧區──龐君華會督紀念專輯」為題，期盼能夠同讀者一齊紀念龐會督嘅生平同事奉軌跡，並深入探討衛斯理嘅神學思想同循道精神對當代台灣教會所帶來嘅影響。\n\n我哋誠摯邀請你踴躍投稿。無論係關於龐會督嘅生平回憶同事奉見證，定係針對衛斯理神學、禮儀更新、門徒培育同教會合一等相關議題嘅評論同反思，都非常歡迎。等我哋一齊喺呢份紀念同書寫中，傳承並延續嗰份跨越教區同宗派邊界、呼召我哋無論喺世界邊個角落都願意承擔起牧養責任嘅信仰願景。",
  },
};

const FIELDS = [
  "title",
  "date",
  "intro_home",
  "intro_cfp",
  "cfp_title",
  "cfp_theme",
  "cfp_deadline",
];

function validate(t) {
  const langs = ["en", "ja", "ko", "zh_CN", "zh_HK"];
  for (const l of langs) {
    if (!t[l]) throw new Error(`缺少語言 ${l}`);
    for (const f of FIELDS) {
      if (typeof t[l][f] !== "string" || !t[l][f].trim())
        throw new Error(`${l}.${f} 缺失或空白`);
    }
    const cfp = t[l].intro_cfp;
    if (!cfp.includes("（") || !cfp.includes("）"))
      throw new Error(`${l}.intro_cfp 缺少全形括號（）`);
    if (!cfp.includes("「") || !cfp.includes("」"))
      throw new Error(`${l}.intro_cfp 缺少全形引號「」`);
  }
}

async function writeTranslations() {
  const r = await fetch(`${SUPA_URL}/rest/v1/issues?id=eq.${ISSUE_ID}`, {
    method: "PATCH",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ translations: TRANSLATIONS }),
  });
  if (!r.ok) {
    throw new Error(
      `寫入失敗 HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`,
    );
  }
  return (await r.json()).length;
}

(async () => {
  console.log(
    `🚀 Vol.${ISSUE_ID} 主題多語翻譯（手譯）${DRY ? "（DRY，僅印出）" : "（實寫入）"}`,
  );

  validate(TRANSLATIONS);
  console.log("✓ 翻譯通過校驗（5 語言 × 7 欄位 + 全形標點檢查）\n");

  for (const lang of ["en", "ja", "ko", "zh_CN", "zh_HK"]) {
    const t = TRANSLATIONS[lang];
    console.log(`────────── [${lang}] ──────────`);
    console.log(`title:        ${t.title}`);
    console.log(`date:         ${t.date}`);
    console.log(`cfp_title:    ${t.cfp_title}`);
    console.log(`cfp_deadline: ${t.cfp_deadline}`);
    console.log(`intro_home (${t.intro_home.length}字):`);
    console.log(`  ${t.intro_home.replace(/\n/g, "\n  ")}`);
    console.log(`intro_cfp (${t.intro_cfp.length}字):`);
    console.log(`  ${t.intro_cfp.replace(/\n/g, "\n  ")}`);
    console.log(`cfp_theme (${t.cfp_theme.length}字):`);
    console.log(`  ${t.cfp_theme.replace(/\n/g, "\n  ")}`);
    console.log("");
  }

  if (DRY) {
    console.log("🟡 DRY 模式，未寫入。確認無誤後拿掉 dry 參數重跑。");
    return;
  }

  console.log("💾 寫入 issues.translations…");
  const n = await writeTranslations();
  console.log(`✅ 完成，影響 ${n} 列`);
})().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
