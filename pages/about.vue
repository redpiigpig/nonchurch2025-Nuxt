<script setup>
import { computed } from "vue";
import { useLanguage } from "~/composables/useLanguage";

const { currentLang } = useLanguage();

const IMG_BOOK = "https://res.cloudinary.com/nonchurch2025/image/upload/v1776522457/000605878_01_500_500-removebg-preview.png";
const IMG_CAMP = "https://res.cloudinary.com/nonchurch2025/image/upload/v1776521960/2025%E7%84%A1%E5%A2%83%E7%95%8C%E8%80%85%E6%94%A4%E4%BD%8D.jpg";
const IMG_LECTURE = "https://res.cloudinary.com/nonchurch2025/image/upload/v1776521965/2025%E6%BC%94%E8%AC%9B%E6%9C%83%E5%90%88%E7%85%A7.jpg";

const contentMap = {
  "zh-TW": {
    title: "認識無境界者",
    sections: [
      {
        heading: "無教會主義與台灣歷史",
        paras: [
          "　　無教會主義（Non-Church Movement）源自於二十世紀初日本的思想家內村鑑三，他主張真正的信仰無須倚靠中央化的教會體制、神職人員與會堂建築，每位信徒都有權利去思索基督信仰對自己的意義並做出實踐。這個運動具備兩層「三項定義」：在活動層面上，以固定集會、演講與辦雜誌為三大特徵；在思想層面上，則具備去體制化的教會觀、信徒的獨立精神，以及強烈的國族認同。",
          "　　台灣的無教會運動始於1911年，歷經日治時期到戰後，形成了如台南集會與北投集會等本土信徒的網絡，也曾出現如《下樂姆》等在教會界頗具影響力的刊物。然而，隨著時代變遷、日語世代凋零，以及逐漸融入長老教會等因素，台灣的無教會集會傳統走向了式微。直到廖本恩出版了《無境界的信徒們：台灣無教會百年史》一書，才讓我們重新聽見這個埋藏在台灣教會史當中的聲音。受到這段歷史的啟發，我們決定在2025年初創辦《無境界者》雜誌，為這個世代傳承無教會的精神。",
        ],
        img: IMG_BOOK,
        imgCaption: "廖本恩《無境界的信徒們：台灣無教會百年史（1911-2011）》<br>（新北：真哪噠出版社，2024年9月）",
        imgPosition: "right",
      },
      {
        heading: "「無境界主義」的特徵",
        paras: [
          "　　雖然本刊的思想源頭是無教會主義，但我們進一步發展出了「無境界主義」（Non-Boundary Movement）的特色。歷史上的台灣無教會者不僅跨越了教會的界線，更主動與體制內人士保持友誼與合作，展現出不畏藩籬的「無境界」跨界精神。",
          "　　在此基礎上，《無境界者》展現出自己的時代特色，我們對性別議題、多元身體經驗、人權議題、宗教對話以及後現代議題有著特別的關注與重視。我們主張神學不應被教會經驗所限縮，希望能透過融入諸位作者真實的生命經驗與閱歷，打造出一種屬於青年世代的、本土的，且生發於教會體制外的神學。",
        ],
        img: IMG_CAMP,
        imgCaption: "弘誓性別營營隊期間無境界者的攤位，編輯和作者們的合照<br>（2025.07.19 拍攝於桃園佛教弘誓學院）",
        imgPosition: "below",
      },
      {
        heading: "刊物活動與實踐",
        paras: [
          "　　在實踐方面，我們是一份以線上為主、紙本為輔的自由信仰雜誌，每兩個月會定期發刊。每年七月，我們會定期報導並參與由佛教弘誓學院舉辦的「性別友善自在營」，將其作為跨宗教合作與性別對話的實踐場域。接著在八月，我們會舉辦一年一度的雜誌年度演講會，透過線下與線上的結合，讓刊物成為不同人群與信仰社群之間相遇的橋樑。",
        ],
        img: IMG_LECTURE,
        imgCaption: "2025 無境界者年度演講會大合照<br>（2025.08.02 拍攝於台北衛理公會恩友堂）",
        imgPosition: "below",
      },
      {
        heading: "未來展望",
        paras: [
          "　　未來，我們希望能夠以《無境界者》作為一個核心平台，重建台灣無教會運動的集會傳統。不僅如此，我們更期盼能進一步建立基督徒公共知識份子的沙龍，讓信仰不再只是一種個人化的靈性慰藉，而是能承擔起社會實踐的公共責任。同時，我們也致力於打造一個信仰寬容與對話的平台，在尊重多元與差異的基礎上，讓不同宗教與思想體系能夠彼此傾聽、深化理解，讓信仰成為一趟真正無境界的共生旅程。",
        ],
      },
    ],
  },
  "zh-HK": {
    title: "認識無境界者",
    sections: [
      {
        heading: "無教會主義與台灣歷史",
        paras: [
          "　　無教會主義（Non-Church Movement）源自二十世紀初日本嘅思想家內村鑑三，佢主張真正嘅信仰無須依靠中央化嘅教會體制、神職人員與會堂建築，每位信徒都有權利去思索基督信仰對自己嘅意義並做出實踐。呢個運動具備兩層「三項定義」：喺活動層面，以固定集會、演講同辦雜誌為三大特徵；喺思想層面，則具備去體制化嘅教會觀、信徒嘅獨立精神，以及強烈嘅國族認同。",
          "　　台灣嘅無教會運動始於1911年，歷經日治時期到戰後，形成咗如台南集會與北投集會等本土信徒嘅網絡，亦曾出現如《下樂姆》等在教會界頗具影響力嘅刊物。然而，隨著時代變遷、日語世代凋零，以及逐漸融入長老教會等因素，台灣嘅無教會集會傳統走向咗式微。直到廖本恩出版咗《無境界的信徒們：台灣無教會百年史》一書，先令我哋重新聽見呢個埋藏喺台灣教會史當中嘅聲音。受到呢段歷史嘅啟發，我哋決定喺2025年初創辦《無境界者》雜誌，為呢個世代傳承無教會嘅精神。",
        ],
        img: IMG_BOOK,
        imgCaption: "廖本恩《無境界的信徒們：台灣無教會百年史（1911-2011）》<br>（新北：真哪噠出版社，2024年9月）",
        imgPosition: "right",
      },
      {
        heading: "「無境界主義」嘅特徵",
        paras: [
          "　　雖然本刊嘅思想源頭係無教會主義，但我哋進一步發展出咗「無境界主義」（Non-Boundary Movement）嘅特色。歷史上嘅台灣無教會者唔單止跨越咗教會嘅界線，更主動與體制內人士保持友誼同合作，展現出唔畏藩籬嘅「無境界」跨界精神。",
          "　　喺此基礎上，《無境界者》展現出自己嘅時代特色，我哋對性別議題、多元身體經驗、人權議題、宗教對話以及後現代議題有著特別嘅關注與重視。我哋主張神學唔應該被教會經驗所限縮，希望能透過融入各位作者真實嘅生命經驗與閱歷，打造出一種屬於青年世代嘅、本土嘅，且生發於教會體制外嘅神學。",
        ],
        img: IMG_CAMP,
        imgCaption: "弘誓性別營營隊期間無境界者嘅攤位，編輯同作者們嘅合照<br>（2025.07.19 拍攝於桃園佛教弘誓學院）",
        imgPosition: "below",
      },
      {
        heading: "刊物活動與實踐",
        paras: [
          "　　喺實踐方面，我哋係一份以線上為主、紙本為輔嘅自由信仰雜誌，每兩個月會定期發刊。每年七月，我哋會定期報導並參與由佛教弘誓學院舉辦嘅「性別友善自在營」，將其作為跨宗教合作與性別對話嘅實踐場域。接著喺八月，我哋會舉辦一年一度嘅雜誌年度演講會，透過線下與線上嘅結合，讓刊物成為不同人群與信仰社群之間相遇嘅橋樑。",
        ],
        img: IMG_LECTURE,
        imgCaption: "2025 無境界者年度演講會大合照<br>（2025.08.02 拍攝於台北衛理公會恩友堂）",
        imgPosition: "below",
      },
      {
        heading: "未來展望",
        paras: [
          "　　未來，我哋希望能夠以《無境界者》作為一個核心平台，重建台灣無教會運動嘅集會傳統。唔單止咁，我哋更期盼能進一步建立基督徒公共知識份子嘅沙龍，讓信仰唔再只係一種個人化嘅靈性慰藉，而係能承擔起社會實踐嘅公共責任。同時，我哋亦致力於打造一個信仰寬容與對話嘅平台，喺尊重多元與差異嘅基礎上，讓不同宗教與思想體系能夠互相傾聽、深化理解，讓信仰成為一趟真正無境界嘅共生旅程。",
        ],
      },
    ],
  },
  "zh-CN": {
    title: "认识无境界者",
    sections: [
      {
        heading: "无教会主义与台湾历史",
        paras: [
          "　　无教会主义（Non-Church Movement）源自二十世纪初日本的思想家内村鉴三，他主张真正的信仰无须依靠中央化的教会体制、神职人员与会堂建筑，每位信徒都有权利去思索基督信仰对自己的意义并做出实践。这个运动具备两层「三项定义」：在活动层面上，以固定集会、演讲与办杂志为三大特征；在思想层面上，则具备去体制化的教会观、信徒的独立精神，以及强烈的国族认同。",
          "　　台湾的无教会运动始于1911年，历经日治时期到战后，形成了如台南集会与北投集会等本土信徒的网络，也曾出现如《下乐姆》等在教会界颇具影响力的刊物。然而，随着时代变迁、日语世代凋零，以及逐渐融入长老教会等因素，台湾的无教会集会传统走向了式微。直到廖本恩出版了《无境界的信徒们：台湾无教会百年史》一书，才让我们重新听见这个埋藏在台湾教会史当中的声音。受到这段历史的启发，我们决定在2025年初创办《无境界者》杂志，为这个世代传承无教会的精神。",
        ],
        img: IMG_BOOK,
        imgCaption: "廖本恩《无境界的信徒们：台湾无教会百年史（1911-2011）》<br>（新北：真哪噠出版社，2024年9月）",
        imgPosition: "right",
      },
      {
        heading: "「无境界主义」的特征",
        paras: [
          "　　虽然本刊的思想源头是无教会主义，但我们进一步发展出了「无境界主义」（Non-Boundary Movement）的特色。历史上的台湾无教会者不仅跨越了教会的界线，更主动与体制内人士保持友谊与合作，展现出不畏藩篱的「无境界」跨界精神。",
          "　　在此基础上，《无境界者》展现出自己的时代特色，我们对性别议题、多元身体经验、人权议题、宗教对话以及后现代议题有着特别的关注与重视。我们主张神学不应被教会经验所限缩，希望能透过融入诸位作者真实的生命经验与阅历，打造出一种属于青年世代的、本土的，且生发于教会体制外的神学。",
        ],
        img: IMG_CAMP,
        imgCaption: "弘誓性别营营队期间无境界者的摊位，编辑和作者们的合照<br>（2025.07.19 拍摄于桃园佛教弘誓学院）",
        imgPosition: "below",
      },
      {
        heading: "刊物活动与实践",
        paras: [
          "　　在实践方面，我们是一份以线上为主、纸本为辅的自由信仰杂志，每两个月会定期发刊。每年七月，我们会定期报导并参与由佛教弘誓学院举办的「性别友善自在营」，将其作为跨宗教合作与性别对话的实践场域。接着在八月，我们会举办一年一度的杂志年度演讲会，透过线下与线上的结合，让刊物成为不同人群与信仰社群之间相遇的桥梁。",
        ],
        img: IMG_LECTURE,
        imgCaption: "2025 无境界者年度演讲会大合照<br>（2025.08.02 拍摄于台北卫理公会恩友堂）",
        imgPosition: "below",
      },
      {
        heading: "未来展望",
        paras: [
          "　　未来，我们希望能够以《无境界者》作为一个核心平台，重建台湾无教会运动的集会传统。不仅如此，我们更期盼能进一步建立基督徒公共知识分子的沙龙，让信仰不再只是一种个人化的灵性慰藉，而是能承担起社会实践的公共责任。同时，我们也致力于打造一个信仰宽容与对话的平台，在尊重多元与差异的基础上，让不同宗教与思想体系能够彼此倾听、深化理解，让信仰成为一趟真正无境界的共生旅程。",
        ],
      },
    ],
  },
  en: {
    title: "About Faith Without Boundary",
    sections: [
      {
        heading: "The Non-Church Movement and Taiwan",
        paras: [
          "The Non-Church Movement (無教會主義, Mukyōkaishugi) traces its origins to the early twentieth-century Japanese thinker Uchimura Kanzō, who argued that genuine faith requires neither a centralized church institution, professional clergy, nor dedicated buildings. Every believer, he maintained, has the right to discern the meaning of the Christian faith for themselves and to live it out accordingly. The movement is defined by two overlapping sets of three characteristics: in terms of activity, it centers on regular gatherings, public lectures, and the publication of journals; in terms of thought, it embodies a de-institutionalized ecclesiology, the spiritual independence of individual believers, and a strong sense of national identity.",
          "Taiwan's Non-Church Movement began in 1911 and, through the Japanese colonial period and the postwar era, gave rise to networks of local believers such as the Tainan and Beitou gatherings, as well as influential publications like Shorakumu. Over time, however, the movement gradually faded—shaped by generational change, the passing of Japanese-speaking Christians, and the absorption of many members into the Presbyterian Church. It was not until Liao Ben-en published Faith Beyond Walls: A Centennial History of Taiwan's Non-Church Movement, 1911–2011 that this buried chapter of Taiwan's Christian history was brought back to light. Inspired by that history, we founded Faith Without Boundary in early 2025 to carry the non-church spirit into a new generation.",
        ],
        img: IMG_BOOK,
        imgCaption: "Liao Ben-en, <i>Faith Beyond Walls: A Centennial History of Taiwan's Non-Church Movement, 1911–2011</i><br>(New Taipei: Zhennada Press, September 2024)",
        imgPosition: "right",
      },
      {
        heading: "The Non-Boundary Movement",
        paras: [
          "Though the Non-Church Movement is our intellectual wellspring, we have developed a distinctive outlook of our own, which we call the Non-Boundary Movement (無境界主義). Taiwan's historical non-church believers did not only cross the boundaries of institutional Christianity—they actively maintained friendships and collaborations with those within established churches, embodying a spirit of boundless, cross-border engagement.",
          "Building on this foundation, Faith Without Boundary brings its own contemporary character to bear. We pay particular attention to questions of gender, diverse bodily experiences, human rights, interreligious dialogue, and postmodern thought. We believe that theology should not be confined by church experience; our aim is to weave together the authentic life stories and perspectives of our contributors in order to forge a theology that is youthful, rooted in Taiwan, and born outside the structures of the institutional church.",
        ],
        img: IMG_CAMP,
        imgCaption: "Faith Without Boundary booth at the Gender-Inclusive Retreat Camp, with editors and contributors<br>(Photo: July 19, 2025 · Buddhist Hongshi College, Taoyuan)",
        imgPosition: "below",
      },
      {
        heading: "Activities and Practice",
        paras: [
          "In practice, Faith Without Boundary is a primarily digital, supplementarily print, free-faith journal published on a bimonthly basis. Each July, we cover and participate in the Gender-Inclusive Retreat Camp organized by the Buddhist Hongshi College, treating it as a site of interreligious cooperation and gender dialogue. Then in August, we hold our annual lecture event, combining in-person and online formats to make the journal a meeting point for people of diverse backgrounds and faith communities.",
        ],
        img: IMG_LECTURE,
        imgCaption: "Group photo at the 2025 Faith Without Boundary Annual Lecture<br>(Photo: August 2, 2025 · The Methodist Friendship Church, Taipei)",
        imgPosition: "below",
      },
      {
        heading: "Looking Ahead",
        paras: [
          "Looking to the future, we hope to make Faith Without Boundary a central platform for rebuilding the gathering tradition of Taiwan's Non-Church Movement. Beyond that, we aspire to establish a salon for Christian public intellectuals—a space where faith is no longer merely a private source of spiritual comfort, but can bear genuine public responsibility for social transformation. We are equally committed to creating a platform of religious tolerance and dialogue, one that, grounded in respect for plurality and difference, enables different religious and philosophical traditions to listen to one another, deepen their mutual understanding, and make faith a truly boundless journey of coexistence.",
        ],
      },
    ],
  },
  ja: {
    title: "無境界者について",
    sections: [
      {
        heading: "無教会主義と台湾の歴史",
        paras: [
          "　　無教会主義（Non-Church Movement）は、二十世紀初頭の日本の思想家・内村鑑三に端を発します。彼は、真の信仰とは中央集権的な教会制度や聖職者、礼拝堂に依存するものではなく、すべての信徒がキリスト信仰の意味を自ら探求し、実践する権利を持つと主張しました。この運動は二重の「三つの定義」を備えています。活動面では定期的な集会・講演・雑誌発行の三つを特徴とし、思想面では脱制度的な教会観・信徒の精神的自立・強い民族的アイデンティティを備えています。",
          "　　台湾の無教会運動は1911年に始まり、日本統治時代から戦後にかけて、台南集会や北投集会のような本土信徒のネットワークを形成し、《下樂姆》のような教会界で影響力を持つ刊行物も生まれました。しかし時代の変遷、日本語世代の高齢化、長老教会への統合などにより、台湾の無教会集会の伝統は次第に衰退していきました。廖本恩が《無境界的信徒們：台灣無教會百年史（1911-2011）》を出版したことで、台湾のキリスト教史に埋もれていたこの声が再び聞こえるようになりました。この歴史に触発され、私たちは2025年初頭に《無境界者》誌を創刊し、この世代に無教会の精神を受け継いでいくことを決意しました。",
        ],
        img: IMG_BOOK,
        imgCaption: "廖本恩《無境界的信徒們：台灣無教會百年史（1911-2011）》<br>（新北：真哪噠出版社、2024年9月）",
        imgPosition: "right",
      },
      {
        heading: "「無境界主義」の特徴",
        paras: [
          "　　本誌の思想的源泉は無教会主義ですが、私たちはさらに「無境界主義」（Non-Boundary Movement）という独自の特色を打ち出しています。歴史上の台湾の無教会者たちは教会の境界を越えるだけでなく、制度内の人々とも積極的に友好関係や協力関係を築き、垣根を恐れない「無境界」的な越境精神を体現していました。",
          "　　この精神を受け継ぎながら、《無境界者》は現代的な特色を持ちます。私たちはジェンダー問題、多様な身体経験、人権問題、宗教間対話、ポストモダンな問いに特別な関心を寄せています。神学は教会の経験のみに縛られるべきではないと主張し、各執筆者の真の生命経験と見識を織り交ぜることで、青年世代のための、台湾に根ざした、教会制度の外から生まれる神学を作り上げることを目指しています。",
        ],
        img: IMG_CAMP,
        imgCaption: "弘誓学院ジェンダー合宿における無境界者ブース、編集者と執筆者の集合写真<br>（2025年7月19日・桃園 佛教弘誓学院にて撮影）",
        imgPosition: "below",
      },
      {
        heading: "刊行活動と実践",
        paras: [
          "　　実践面において、私たちはオンラインを主軸に紙面を補助とする自由な信仰雑誌で、二ヶ月ごとに定期発行しています。毎年七月には、仏教弘誓学院が主催する「ジェンダーフレンドリー合宿」を取材・参加し、宗教間協力とジェンダー対話の実践の場として位置づけています。そして八月には年次講演会を開催し、対面とオンラインを組み合わせることで、誌面を異なる人々や信仰コミュニティが出会う橋渡しの場にしています。",
        ],
        img: IMG_LECTURE,
        imgCaption: "2025年《無境界者》年次講演会 集合写真<br>（2025年8月2日・台北 台湾衛理公会恩友堂にて撮影）",
        imgPosition: "below",
      },
      {
        heading: "今後の展望",
        paras: [
          "　　今後は、《無境界者》を核心的なプラットフォームとして、台湾の無教会運動における集会の伝統を再建することを目指します。さらに、キリスト教的な公共知識人のサロンを設立することを展望しています。信仰が単なる個人的な霊的慰めにとどまらず、社会実践への公共的責任を担えるようにするためです。同時に、信仰の寛容さと対話のプラットフォームを作り、多元性と差異を尊重しながら、異なる宗教・思想体系が互いに耳を傾け、理解を深め合い、信仰が真に境界のない共生の旅となるよう力を尽くしています。",
        ],
      },
    ],
  },
  ko: {
    title: "무경계자 소개",
    sections: [
      {
        heading: "무교회주의와 대만의 역사",
        paras: [
          "　무교회주의（無教會主義, Non-Church Movement）는 20세기 초 일본의 사상가 우치무라 간조（内村鑑三）에서 비롯됩니다. 그는 진정한 신앙은 중앙집권적 교회 체제나 성직자, 예배당에 의존할 필요가 없으며, 모든 신자는 기독교 신앙의 의미를 스스로 탐구하고 실천할 권리가 있다고 주장했습니다. 이 운동은 두 겹의 '세 가지 정의'를 지닙니다. 활동 면에서는 정기 모임·강연·잡지 발행의 세 가지가 특징이며, 사상 면에서는 탈제도적 교회관·신자의 영적 자립심·강한 민족 정체성을 갖추고 있습니다.",
          "　대만의 무교회 운동은 1911년에 시작되어, 일제강점기부터 전후에 이르기까지 타이난 집회와 베이터우 집회 등 본토 신자들의 네트워크를 형성했으며, 《下樂姆》과 같이 교회계에서 상당한 영향력을 지닌 간행물도 탄생했습니다. 그러나 시대의 변천, 일본어 세대의 노령화, 장로교회로의 흡수 등으로 인해 대만의 무교회 집회 전통은 점차 쇠퇴해 갔습니다. 랴오번언（廖本恩）이 《무경계의 신도들：대만 무교회 백년사（1911-2011）》를 출판하면서 대만 교회사 속에 묻혀 있던 이 목소리가 다시 들려오게 되었습니다. 이 역사에서 영감을 받아, 저희는 2025년 초에 《무경계자》지를 창간하여 이 세대에 무교회의 정신을 계승하기로 결정했습니다.",
        ],
        img: IMG_BOOK,
        imgCaption: "랴오번언, 《무경계의 신도들：대만 무교회 백년사（1911-2011）》<br>（신베이：真哪噠出版社, 2024년 9월）",
        imgPosition: "right",
      },
      {
        heading: "「무경계주의」의 특징",
        paras: [
          "　본지의 사상적 원천은 무교회주의이지만, 저희는 더 나아가 「무경계주의」（Non-Boundary Movement）라는 독자적인 특색을 발전시켰습니다. 역사적으로 대만의 무교회 신자들은 교회의 경계를 넘어서는 것에 그치지 않고, 제도 내의 인사들과도 적극적으로 우정과 협력 관계를 유지하며 울타리를 두려워하지 않는 '무경계'적 초월의 정신을 보여주었습니다.",
          "　이러한 토대 위에서, 《무경계자》는 현대적 특색을 드러냅니다. 저희는 젠더 문제, 다양한 신체 경험, 인권 문제, 종교 간 대화, 그리고 포스트모던 문제에 특별한 관심과 비중을 두고 있습니다. 신학은 교회의 경험에 의해 제한되어서는 안 된다고 주장하며, 집필진 한 사람 한 사람의 진실한 삶의 경험과 통찰을 담아냄으로써 청년 세대를 위한, 대만에 뿌리내린, 교회 제도 밖에서 싹트는 신학을 만들어 가고자 합니다.",
        ],
        img: IMG_CAMP,
        imgCaption: "弘誓학원 젠더 친화 캠프 기간 무경계자 부스, 편집자와 집필자 단체사진<br>（2025.07.19 · 타오위안 불교홍서학원에서 촬영）",
        imgPosition: "below",
      },
      {
        heading: "간행 활동과 실천",
        paras: [
          "　실천적 측면에서, 저희는 온라인을 주축으로 종이책을 보조적으로 발행하는 자유로운 신앙 잡지로서, 두 달에 한 번 정기 발행하고 있습니다. 매년 7월에는 불교 홍서학원（弘誓學院）이 주최하는 '젠더 친화 캠프'를 취재하고 참가하여 종교 간 협력과 젠더 대화의 실천 장으로 삼고 있습니다. 이어서 8월에는 연례 강연회를 개최하여, 오프라인과 온라인을 결합한 방식으로 잡지가 다양한 사람들과 신앙 공동체가 만나는 다리가 되도록 하고 있습니다.",
        ],
        img: IMG_LECTURE,
        imgCaption: "2025 무경계자 연례 강연회 단체사진<br>（2025.08.02 · 타이베이 대만 웨슬리교회 은혜당에서 촬영）",
        imgPosition: "below",
      },
      {
        heading: "미래 전망",
        paras: [
          "　앞으로 저희는 《무경계자》를 핵심 플랫폼으로 삼아 대만 무교회 운동의 집회 전통을 재건하고자 합니다. 더 나아가, 기독교 공공 지식인들의 살롱을 구축하여, 신앙이 단순히 개인적인 영적 위로에 그치지 않고 사회적 실천의 공공적 책임을 짊어질 수 있도록 하고자 합니다. 동시에, 신앙의 관용과 대화의 플랫폼을 만들어 나가는 데도 힘쓰고 있습니다. 다원성과 차이를 존중하는 토대 위에서, 서로 다른 종교와 사상 체계가 귀를 기울이고 이해를 심화하며, 신앙이 진정으로 경계 없는 공생의 여정이 될 수 있기를 기대합니다.",
        ],
      },
    ],
  },
};

const t = computed(() => contentMap[currentLang.value] || contentMap["zh-TW"]);

useSeoMeta({
  title: "認識無境界者 — 無境界者雜誌",
  description: "無教會主義源自日本思想家內村鑑三，台灣無教會運動始於1911年。《無境界者》雜誌承繼此精神，發展出屬於當代的無境界主義。",
});
</script>

<template>
  <div class="about-page">
    <h1 class="page-main-title">
      <span class="emoji">📖</span>{{ t.title }}<span class="emoji">📖</span>
    </h1>

    <div class="main-divider"></div>

    <div class="about-content">
      <template v-for="(section, i) in t.sections" :key="i">
        <h3>{{ section.heading }}</h3>

        <!-- 圖片靠右浮動，文字環繞 -->
        <div v-if="section.imgPosition === 'right'" class="section-with-float">
          <figure class="img-float-right">
            <img :src="section.img" :alt="section.imgCaption" />
            <figcaption v-html="section.imgCaption"></figcaption>
          </figure>
          <p v-for="(para, j) in section.paras" :key="j">{{ para }}</p>
          <div class="clearfix"></div>
        </div>

        <!-- 文字在上，圖片在下 -->
        <template v-else>
          <p v-for="(para, j) in section.paras" :key="j">{{ para }}</p>
          <figure v-if="section.img" class="img-below">
            <img :src="section.img" :alt="section.imgCaption" />
            <figcaption v-html="section.imgCaption.replace(/\n/g, '<br>')"></figcaption>
          </figure>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
p {
  line-height: 1.8;
  margin: 0.5rem;
  text-align: justify;
  font-family: "Times New Roman", "DFKai-SB", "標楷體", serif;
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

/* ── 圖片 ── */
.img-float-right {
  float: right;
  margin: 0 0 1rem 1.8rem;
  width: 360px;
  text-align: center;
}
.img-float-right img {
  width: 100%;
  border-radius: 4px;
}
.clearfix::after {
  content: "";
  display: table;
  clear: both;
}
.img-below {
  margin: 1.5rem auto;
  text-align: center;
}
.img-below img {
  width: 700px;
  max-width: 100%;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.12);
}
figcaption {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #888;
  font-family: sans-serif;
  line-height: 1.6;
  text-indent: 0;
}
.img-float-right figcaption {
  white-space: nowrap;
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
  .img-float-right {
    float: none;
    margin: 1rem auto;
    max-width: 100%;
  }
}
</style>
