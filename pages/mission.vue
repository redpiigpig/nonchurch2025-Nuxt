<script setup>
import { computed } from "vue";
import { useLanguage } from "~/composables/useLanguage";

const { currentLang } = useLanguage();

const contentMap = {
  "zh-TW": {
    title: "使命宣言",
    intro:
      "　　本刊物創辦之目的，是希望藉著參考生長在東亞的無教會主義神學，對當代台灣的教會現象與信仰生活進行反思與對話，為信仰者／非信仰者的神學思考提供一個不以教會為本位、自由發聲的平台。因此，本刊物按照無教會主義的精神與幾位共同發起人各自的信仰特徵，建構出以下七大核心關懷：",
    points: [
      {
        sub: "I 歷史｜Faith Rooted in History",
        text: "　　我們認為，信仰與神學論述並非憑空而生，而是植根於歷史之中。我們尊重教會的傳統，也承認信仰的發展與時代變遷息息相關。我們不僅關注基督信仰的正統歷史，也重視異端與邊緣神學的聲音，因為所有信仰實踐皆源自歷史的累積與回應。",
      },
      {
        sub: "II 自主｜The Call to Spiritual Autonomy",
        text: "　　我們認為，每位信仰者皆應承擔神學思考的責任，信仰乃是個人自主的回應，而非受制於權威的傳授。我們拒絕盲從於宗教體制，強調每個人都應在信仰中尋求真理，勇於面對屬靈的掙扎，並為自己的生命負責。",
      },
      {
        sub: "III 知識｜The Pursuit of Wisdom and Understanding",
        text: "　　我們認為，知識是通往真理的門徑，信仰與理性並非對立，而是相輔相成。我們提倡，信仰者應對這世界的各類知識抱持好奇心，因為唯有透過知識的拓展，我們才能更接近真理，並且以智慧回應世界。",
      },
      {
        sub: "IV 實況｜Faith in Context",
        text: "　　我們認為，信仰必須扎根於時代與土地的實況，神學不能脫離現實經驗。我們承認，每個時代、文化、民族與個體皆需在其獨特語境中建構信仰，使基督信仰成為「此時、此地、此人」的活潑見證。",
      },
      {
        sub: "V 多元｜Embracing Diversity in Faith",
        text: "　　我們認為，上帝的創造廣大而多元，信仰亦應反映此豐富性。我們尊重不同族群、文化、性別與宗教的多樣性，拒絕單一化與排他性的神學。我們相信，唯有在對話與交流中，信仰才能展現其真正的豐富與深度。",
      },
      {
        sub: "VI 公眾｜Faith as a Public Responsibility",
        text: "　　我們認為，信仰不僅是個人的靈性追求，更是一種社會實踐。我們關心政治、社會與生態，並視信仰為參與公共事務的力量。我們拒絕將信仰商品化，也反對將靈性侷限於個人化的慰藉，而忽視對世界的責任。",
      },
      {
        sub: "VII 對話｜Theology as a Dialogue",
        text: "　　我們認為，神學是一場與上帝和世界持續的對話，而非僵化的教條。我們鼓勵多元的聲音與開放的討論，與歷史、文化、世界和不同信仰觀點交流，在對話中深化對上帝與生命的理解。",
      },
    ],
    author: "執筆者　張辰瑋",
    date: "2025.02.09",
  },
  "zh-HK": {
    title: "使命宣言",
    intro:
      "　　本刊物創辦嘅目的，係希望藉住參考生長喺東亞嘅無教會主義神學，對當代台灣嘅教會現象同信仰生活進行反思同對話，為信仰者／非信仰者嘅神學思考提供一個唔以教會為本位、自由發聲嘅平台。因此，本刊物按照無教會主義嘅精神同幾位共同發起人各自嘅信仰特徵，建構出以下七大核心關懷：",
    points: [
      {
        sub: "I 歷史｜Faith Rooted in History",
        text: "　　我哋認為，信仰同神學論述並唔係憑空而生，而係植根於歷史之中。我哋尊重教會嘅傳統，亦承認信仰嘅發展同時代變遷息息相關。我哋唔單止關注基督信仰嘅正統歷史，亦重視異端同邊緣神學嘅聲音，因為所有信仰實踐都源自歷史嘅累積同回應。",
      },
      {
        sub: "II 自主｜The Call to Spiritual Autonomy",
        text: "　　我哋認為，每位信仰者都應該承擔神學思考嘅責任，信仰係個人自主嘅回應，而唔係受制於權威嘅傳授。我哋拒絕盲從宗教體制，強調每個人都應該喺信仰中尋求真理，勇於面對屬靈嘅掙扎，並為自己嘅生命負責。",
      },
      {
        sub: "III 知識｜The Pursuit of Wisdom and Understanding",
        text: "　　我哋認為，知識係通往真理嘅門徑，信仰同理性並唔對立，而係相輔相成。我哋提倡，信仰者應該對呢個世界嘅各類知識抱持好奇心，因為唯有透過知識嘅拓展，我哋先可以更加接近真理，並且以智慧回應世界。",
      },
      {
        sub: "IV 實況｜Faith in Context",
        text: "　　我哋認為，信仰必須扎根喺時代同土地嘅實況，神學唔能夠脫離現實經驗。我哋承認，每個時代、文化、民族同個體都需要喺其獨特語境中建構信仰，令基督信仰成為「此時、此地、此人」嘅活潑見證。",
      },
      {
        sub: "V 多元｜Embracing Diversity in Faith",
        text: "　　我哋認為，上帝嘅創造廣大而多元，信仰亦應該反映呢種豐富性。我哋尊重唔同族群、文化、性別同宗教嘅多樣性，拒絕單一化同排他性嘅神學。我哋相信，唯有喺對話同交流之中，信仰先至可以展現佢真正嘅豐富同深度。",
      },
      {
        sub: "VI 公眾｜Faith as a Public Responsibility",
        text: "　　我哋認為，信仰唔單止係個人嘅靈性追求，更加係一種社會實踐。我哋關心政治、社會同生態，並視信仰為參與公共事務嘅力量。我哋拒絕將信仰商品化，亦反對將靈性侷限喺個人化嘅慰藉，而忽視對世界嘅責任。",
      },
      {
        sub: "VII 對話｜Theology as a Dialogue",
        text: "　　我哋認為，神學係一場同上帝同世界持續嘅對話，而唔係僵化嘅教條。我哋鼓勵多元嘅聲音同開放嘅討論，與歷史、文化、世界同唔同信仰觀點交流，喺對話中深化對上帝同生命嘅理解。",
      },
    ],
    author: "執筆者　張辰瑋",
    date: "2025.02.09",
  },
  "zh-CN": {
    title: "使命宣言",
    intro:
      "　　本刊物创办之目的，是希望借着参考生长在东亚的无教会主义神学，对当代台湾的教会现象与信仰生活进行反思与对话，为信仰者／非信仰者的神学思考提供一个不以教会为本位、自由发声的平台。因此，本刊物按照无教会主义的精神与几位共同发起人各自的信仰特征，建构出以下七大核心关怀：",
    points: [
      {
        sub: "I 历史｜Faith Rooted in History",
        text: "　　我们认为，信仰与神学论述并非凭空而生，而是植根于历史之中。我们尊重教会的传统，也承认信仰的发展与时代变迁息息相关。我们不仅关注基督信仰的正统历史，也重视异端与边缘神学的声音，因为所有信仰实践皆源自历史的积累与回应。",
      },
      {
        sub: "II 自主｜The Call to Spiritual Autonomy",
        text: "　　我们认为，每位信仰者皆应承担神学思考的责任，信仰乃是个人自主的回应，而非受制于权威的传授。我们拒绝盲从于宗教体制，强调每个人都应在信仰中寻求真理，勇于面对属灵的挣扎，并为自己的生命负责。",
      },
      {
        sub: "III 知识｜The Pursuit of Wisdom and Understanding",
        text: "　　我们认为，知识是通往真理的门径，信仰与理性并非对立，而是相辅相成。我们提倡，信仰者应对这世界的各类知识抱持好奇心，因为唯有透过知识的拓展，我们才能更接近真理，并且以智慧回应世界。",
      },
      {
        sub: "IV 实况｜Faith in Context",
        text: "　　我们认为，信仰必须扎根于时代与土地的实况，神学不能脱离现实经验。我们承认，每个时代、文化、民族与个体皆需在其独特语境中建构信仰，使基督信仰成为「此时、此地、此人」的活泼见证。",
      },
      {
        sub: "V 多元｜Embracing Diversity in Faith",
        text: "　　我们认为，上帝的创造广大而多元，信仰亦应反映此丰富性。我们尊重不同族群、文化、性别与宗教的多样性，拒绝单一化与排他性的神学。我们相信，唯有在对话与交流中，信仰才能展现其真正的丰富与深度。",
      },
      {
        sub: "VI 公众｜Faith as a Public Responsibility",
        text: "　　我们认为，信仰不仅是个人的灵性追求，更是一种社会实践。我们关心政治、社会与生态，并视信仰为参与公共事务的力量。我们拒绝将信仰商品化，也反对将灵性局限于个人化的慰藉，而忽视对世界的责任。",
      },
      {
        sub: "VII 对话｜Theology as a Dialogue",
        text: "　　我们认为，神学是一场与上帝和世界持续的对话，而非僵化的教条。我们鼓励多元的声音与开放的讨论，与历史、文化、世界和不同信仰观点交流，在对话中深化对上帝与生命的理解。",
      },
    ],
    author: "执笔者　张辰玮",
    date: "2025.02.09",
  },
  en: {
    title: "Faith Without Boundary Mission Statement",
    intro:
      "The purpose of founding this publication is to draw upon the Non-Church Movement theology originating in East Asia to reflect on and engage in dialogue with contemporary church phenomena and faith life in Taiwan. It aims to provide a free-speaking platform for the theological reflection of believers and non-believers alike, one that is not church-centric. Therefore, based on the spirit of the Non-Church Movement and the diverse faith characteristics of its co-founders, this publication establishes the following seven core concerns:",
    points: [
      {
        sub: "I History｜Faith Rooted in History",
        text: "We believe that faith and theological discourse do not arise from a vacuum but are rooted in history. We respect church traditions and acknowledge that the development of faith is closely tied to changing times. We focus not only on the orthodox history of the Christian faith but also value the voices of heretical and marginal theologies.",
      },
      {
        sub: "II Autonomy｜The Call to Spiritual Autonomy",
        text: "We believe that every believer should take responsibility for theological thinking. Faith is a personal and autonomous response, not something dictated by authority. We refuse to blindly follow religious institutions, emphasizing that everyone should seek truth in faith, bravely face spiritual struggles, and take responsibility for their own lives.",
      },
      {
        sub: "III Knowledge｜The Pursuit of Knowledge and Wisdom",
        text: "We believe that knowledge is a gateway to truth. Faith and reason are not opposites but complement each other. We advocate that believers should remain curious about various fields of knowledge, because only through the expansion of knowledge can we draw closer to the truth and respond to the world with wisdom.",
      },
      {
        sub: "IV Context｜Faith in Context",
        text: "We believe that faith must be rooted in the realities of our time and land; theology cannot be detached from practical experience. We recognize that every era, culture, nation, and individual must construct their faith within their unique context, making the Christian faith a living testimony of 'here, now, and this person'.",
      },
      {
        sub: "V Diversity｜Embracing Diversity in Faith",
        text: "We believe that God's creation is vast and diverse, and faith should reflect this richness. We respect the diversity of different ethnicities, cultures, genders, and religions, rejecting monolithic and exclusionary theologies. We believe that only through dialogue can faith reveal its true depth.",
      },
      {
        sub: "VI Public｜Faith as a Public Responsibility",
        text: "We believe that faith is not merely an individual spiritual pursuit but also a social practice. We care about politics, society, and ecology, viewing faith as a force for participating in public affairs. We reject the commodification of faith and oppose confining spirituality to personalized consolation.",
      },
      {
        sub: "VII Dialogue｜Theology as a Dialogue",
        text: "We believe that theology is a continuous dialogue with God and the world, not rigid dogma. We encourage diverse voices and open discussions, exchanging perspectives with history, culture, the world, and different faiths to deepen our understanding of God and life.",
      },
    ],
    author: "Written by Thomas Chang",
    date: "February 9, 2025",
  },
  ja: {
    title: "無境界者使命宣言",
    intro:
      "　　本誌創刊の目的は、東アジアに生じた無教会主義神学を参考にしつつ、現代台湾の教会現象と信仰生活について反省と対話を行うことにあります。信者・非信者を問わず、教会中心主義にとらわれない自由な発言の場を提供することを目指しています。本誌は無教会主義の精神と共同発起人それぞれの信仰的特徴に基づき、以下の7つの核心的関心を掲げます：",
    points: [
      {
        sub: "I 歴史｜Faith Rooted in History",
        text: "　　信仰と神学論説は無から生じるものではなく、歴史に根ざしていると私たちは考えます。教会の伝統を尊重すると同時に、信仰の発展が時代の変遷と密接に関わっていることを認めます。キリスト教の正統的な歴史だけでなく、異端や周縁の神学の声も重視します。",
      },
      {
        sub: "II 自主｜The Call to Spiritual Autonomy",
        text: "　　すべての信仰者は神学的な思考の責任を負うべきだと考えます。信仰とは権威から与えられるものではなく、個人的で自主的な応答です。宗教体制への盲従を拒み、一人ひとりが信仰において真理を求め、自らの霊的な葛藤に向き合い、自らの人生に責任を持つことを強調します。",
      },
      {
        sub: "III 知識｜The Pursuit of Wisdom and Understanding",
        text: "　　知識は真理への扉であると考えます。信仰と理性は対立するものではなく、互いに補完し合うものです。信仰者は世界の様々な知識に対して好奇心を持ち続けるべきです。知識を広げることによってのみ、真理に近づき、知恵をもって世界に応答することができるからです。",
      },
      {
        sub: "IV 実況｜Faith in Context",
        text: "　　信仰は時代と土地の現実に根ざさなければならず、神学は現実の経験から切り離されてはならないと考えます。それぞれの時代、文化、民族、そして個人が、独自の文脈の中で信仰を構築し、信仰を「今、ここ、この人」の生き生きとした証しにする必要があると認識しています。",
      },
      {
        sub: "V 多元｜Embracing Diversity in Faith",
        text: "　　神の創造は広大で多様であり、信仰もその豊かさを反映するべきだと考えます。私たちは異なる民族、文化、ジェンダー、宗教の多様性を尊重し、画一的で排他的な神学を拒否します。対話と交流を通じてのみ、信仰はその真の豊かさと深さを示すことができると信じています。",
      },
      {
        sub: "VI 公衆｜Faith as a Public Responsibility",
        text: "　　信仰は単なる個人的な霊的追求にとどまらず、社会的な実践でもあると考えます。私たちは政治、社会、生態系に関心を持ち、信仰を公共の事柄に参加する力と見なします。信仰の商品化を拒み、霊性を個人的な慰めだけに限定し、世界への責任を無視することに反対します。",
      },
      {
        sub: "VII 対話｜Theology as a Dialogue",
        text: "　　神学とは神や世界との継続的な対話であり、硬直した教条ではないと考えます。私たちは多様な声と開かれた議論を奨励し、歴史、文化、世界、そして異なる信仰の視点と交流することで、神と生命への理解を深めていきます。",
      },
    ],
    author: "執筆者　張辰瑋（Thomas Chang）",
    date: "2025.02.09",
  },
  ko: {
    title: "무경계자 사명 선언",
    intro:
      "본 간행물의 창간 목적은 동아시아에서 자생한 무교회주의 신학을 참고하여, 현대 대만의 교회 현상과 신앙 생활에 대해 성찰하고 대화하는 데 있습니다. 신자와 비신자 모두의 신학적 사유를 위해, 교회 중심주의를 벗어난 자유로운 발언의 장을 제공하고자 합니다. 이에 본 간행물은 무교회주의 정신과 공동 발의자 각자의 신앙적 특징을 바탕으로 다음의 7대 핵심 관심사를 설정합니다:",
    points: [
      {
        sub: "I 역사｜Faith Rooted in History",
        text: "신앙과 신학적 담론은 허공에서 생겨난 것이 아니라 역사 속에 뿌리내리고 있다고 우리는 믿습니다. 교회의 전통을 존중하며, 신앙의 발전이 시대적 변천과 밀접하게 연관되어 있음을 인정합니다. 기독교 신앙의 정통 역사뿐만 아니라, 이단 및 주변부 신학의 목소리도 중시합니다.",
      },
      {
        sub: "II 자주｜The Call to Spiritual Autonomy",
        text: "모든 신앙인은 신학적 사유에 대한 책임을 져야 한다고 우리는 믿습니다. 신앙은 권위에 의해 주어지는 것이 아니라, 개인적이고 주체적인 응답입니다. 우리는 종교 체제에 대한 맹종을 거부하며, 누구나 신앙 안에서 진리를 구하고 영적인 갈등에 용기 있게 맞서며 자신의 삶에 책임져야 함을 강조합니다.",
      },
      {
        sub: "III 지식｜The Pursuit of Wisdom and Understanding",
        text: "지식은 진리로 나아가는 문이라고 우리는 믿습니다. 신앙과 이성은 대립하는 것이 아니라 상호 보완적입니다. 신앙인은 이 세상의 다양한 지식에 호기심을 가져야 합니다. 지식의 확장을 통해서만 진리에 더 가까이 다가가고, 지혜로써 세상에 응답할 수 있기 때문입니다.",
      },
      {
        sub: "IV 상황｜Faith in Context",
        text: "신앙은 시대와 삶의 터전이라는 현실에 뿌리내려야 하며, 신학은 현실적 경험과 분리될 수 없다고 우리는 믿습니다. 모든 시대, 문화, 민족, 그리고 개인은 각자의 고유한 맥락 속에서 신앙을 형성해야 하며, 이를 통해 기독교 신앙이 ‘지금, 여기, 이 사람’의 생생한 증거가 되어야 함을 인정합니다.",
      },
      {
        sub: "V 다원｜Embracing Diversity in Faith",
        text: "하나님의 창조는 광대하고 다양하며, 신앙 역시 이러한 풍성함을 반영해야 한다고 우리는 믿습니다. 우리는 다양한 민족, 문화, 젠더, 종교의 다양성을 존중하며, 획일화되고 배타적인 신학을 거부합니다. 오직 대화와 교류를 통해서만 신앙의 진정한 풍요로움과 깊이가 드러날 수 있다고 믿습니다.",
      },
      {
        sub: "VI 공중｜Faith as a Public Responsibility",
        text: "신앙은 개인적인 영적 추구일 뿐만 아니라 사회적 실천이라고 우리는 믿습니다. 우리는 정치, 사회, 생태 문제에 관심을 가지며, 신앙을 공공 문제에 참여하는 원동력으로 여깁니다. 신앙의 상품화를 거부하며, 영성을 개인적인 위안으로만 제한하여 세상에 대한 책임을 외면하는 것에 반대합니다.",
      },
      {
        sub: "VII 대화｜Theology as a Dialogue",
        text: "신학은 굳어진 교리가 아니라, 하나님 및 세상과 지속적으로 나누는 대화라고 우리는 믿습니다. 우리는 다양한 목소리와 열린 토론을 장려하며, 역사, 문화, 세상 및 다양한 신앙적 관점과 교류함으로써 하나님과 생명에 대한 이해를 심화시켜 나갑니다.",
      },
    ],
    author: "집필자　장천웨이 (Thomas Chang)",
    date: "2025.02.09",
  },
};

const t = computed(() => contentMap[currentLang.value] || contentMap["zh-TW"]);

const seoTitleMap = {
  default: "使命宣言 - 無境界者雜誌",
  "zh-HK": "使命宣言 - 無境界者雜誌",
  "zh-CN": "使命宣言 - 无境界者杂志",
  en: "Mission Statement - Faith Without Boundary",
  ja: "使命宣言 - 無境界者雑誌",
  ko: "사명 선언 - 무경계자 매거진",
};

useSeoMeta({
  title: () => seoTitleMap[currentLang.value] || seoTitleMap.default,
  description: () => t.value.intro,
  ogTitle: () => seoTitleMap[currentLang.value] || seoTitleMap.default,
  ogDescription: () => t.value.intro,
  ogImage:
    "https://pottupypvdzamztdhsah.supabase.co/storage/v1/object/public/images/system/default_cover.jpg",
});
</script>

<template>
  <div class="mission-page">
    <h1 class="page-main-title">
      <span class="emoji">📜</span>{{ t.title }}<span class="emoji">📜</span>
    </h1>

    <div class="main-divider"></div>

    <div class="intro-text">
      <p>{{ t.intro }}</p>
    </div>

    <div class="mission-content">
      <template v-for="(point, index) in t.points" :key="index">
        <h3>{{ point.sub }}</h3>
        <p class="special-text">{{ point.text }}</p>
      </template>
    </div>

    <br />
    <p class="signature">{{ t.author }} <span class="date">{{ t.date }}</span></p>
  </div>
</template>

<style scoped>
/* 請保留你原本 mission.vue 裡的所有 CSS，這裡完全沿用 */
p {
  line-height: 1.8;
  margin: 0.5rem;
  text-align: justify;
  font-family: serif;
  color: #555;
  font-size: 1.2rem;
}

h3 {
  margin: 2.5rem 0 1rem;
  text-indent: 1em;
  font-family: "Times New Roman", serif;
  font-weight: bold;
  color: #444;
  font-size: 1.4rem;
  line-height: 1.4;
}

.special-text {
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
}

.signature {
  text-align: right;
  margin-top: 2rem;
  font-family: serif;
}

.signature .date {
  display: block;
}

@media (max-width: 768px) {
  h3 {
    font-size: 1.3rem;
    text-indent: 0;
    text-align: center;
  }
  p {
    font-size: 1.1rem;
  }
}
</style>
