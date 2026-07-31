import fs from "node:fs";
const ISSUE_ID = 9;
const LOCALES = ["en", "ja", "ko", "zh_CN", "zh_HK"];

const ISSUE_SOURCE_INTRO_HOME = `本期《無境界者》以「世界是我的牧區──龐君華會督紀念專輯」為題，紀念於 2026 年 1 月 15 日安息主懷的台灣衛理公會前會督龐君華牧師。
「世界是我的牧區」本是約翰‧衛斯理的名言，也是龐會督一生事奉的寫照——他所牧養的從不只是一間堂會，而是跨越台港兩地、跨越宗派藩籬的廣闊禾場。在他驟然離世的哀傷裡，我們選擇不只是追悼，更要細細回望這位牧者如何以其生命，為衛斯理的循道精神作了當代的註腳。從最親近的家人、同工與摯友的追憶，到對他公共神學與循道精神的思索，這一期，是我們這一代人共同對一位牧者的紀念。`;

const ISSUE_SOURCE_INTRO_CFP =
  "下期《無境界者》（2026年07-08月號）將沿兩條線索前行：一條從佛教弘誓學院的「性別友善自在營」出發，重新思考宗教傳統中對身體的界線；另一條回到歷史，探討濟南教會與台灣無教會主義的因緣。誠摯徵求性別與宗教身體政治、濟南教會與無教會主義史等相關稿件，邀您一同在身體與體制的邊界上，尋找一種無境界的信仰。";

const ISSUE_INTRO_CFP_ZH_TW =
  "下期《無境界者》（2026年07-08月號）將以「禁‧戒的身體與無境界的信仰」為主題，沿兩條線索前行：一條從佛教弘誓學院的「性別友善自在營」出發，重新思考宗教傳統中對身體的界線；另一條回到歷史，探討濟南教會與台灣無教會主義的因緣。誠摯徵求性別與宗教身體政治、濟南教會與無教會主義史等相關稿件，邀您一同在身體與體制的邊界上，尋找一種無境界的信仰。";

const ISSUE_INTRO_HOME = {
  en: `This issue of Faith Without Boundary takes “The World Is My Parish—A Memorial Issue for Bishop Pong Kwan-wah” as its theme, commemorating the Rev. Pong Kwan-wah, former bishop of the Methodist Church in Taiwan, who rested in the Lord on January 15, 2026.
“The world is my parish” was originally John Wesley’s famous declaration, and it also portrays Bishop Pong’s lifetime of ministry. His pastoral care was never confined to a single congregation; it reached across Taiwan and Hong Kong and beyond denominational boundaries into a vast field of service. Amid the grief of his sudden passing, we choose not only to mourn but also to look closely at how this pastor’s life offered a contemporary annotation to Wesley’s Methodist spirit. From memories shared by his closest family, co-workers, and friends to reflections on his public theology and Methodist spirit, this issue is our generation’s collective remembrance of a pastor.`,
  ja: `本号の『境界なき者』は「世界は私の牧区──龐君華監督追悼特集」をテーマに、2026年1月15日に主のみもとに召された台湾メソジスト教会前監督・龐君華牧師を記念します。
「世界は私の牧区」はもともとジョン・ウェスレーの名言であり、龐監督の生涯にわたる奉仕を映し出す言葉でもあります。彼が牧したのは決して一つの教会だけではなく、台湾と香港をまたぎ、教派の垣根を越えて広がる大きな働きの場でした。突然の別れという悲しみのなかで、私たちはただ追悼するだけでなく、この牧者がその生涯をもってウェスレーのメソジスト精神にどのような現代的注釈を加えたのかを、丁寧に振り返ります。最も身近な家族、同労者、親しい友人の思い出から、彼の公共神学とメソジスト精神をめぐる考察まで、本号は私たちの世代が一人の牧者にささげる共同の記念です。`,
  ko: `이번 호 『경계 없는 자』는 「세계는 나의 교구──팡쥔화 감독 추모 특집」을 주제로, 2026년 1월 15일 주님의 품에 안긴 대만 감리교회 전 감독 팡쥔화 목사를 기립니다.
「세계는 나의 교구」는 본래 존 웨슬리의 명언이자 팡 감독의 평생 사역을 보여 주는 말이기도 합니다. 그가 목양한 곳은 한 교회에만 머물지 않았으며, 대만과 홍콩을 잇고 교파의 울타리를 넘어 펼쳐진 넓은 사역의 현장이었습니다. 그의 갑작스러운 별세를 슬퍼하면서도 우리는 추모에만 머물지 않고, 이 목자가 자신의 삶으로 웨슬리의 감리교 정신에 어떤 동시대적 주석을 남겼는지 세심히 되돌아봅니다. 가장 가까운 가족과 동역자, 벗들의 기억에서부터 그의 공공신학과 감리교 정신에 대한 성찰까지, 이번 호는 우리 세대가 한 목자를 함께 기억하는 자리입니다.`,
  zh_CN: `本期《无境界者》以「世界是我的牧区──庞君华会督纪念专辑」为题，纪念于2026年1月15日安息主怀的台湾卫理公会前会督庞君华牧师。
「世界是我的牧区」本是约翰·卫斯理的名言，也是庞会督一生事奉的写照——他所牧养的从不只是一间堂会，而是跨越台港两地、跨越宗派藩篱的广阔禾场。在他骤然离世的哀伤里，我们选择不只是追悼，更要细细回望这位牧者如何以其生命，为卫斯理的循道精神作了当代的注脚。从最亲近的家人、同工与挚友的追忆，到对他公共神学与循道精神的思索，这一期，是我们这一代人共同对一位牧者的纪念。`,
  zh_HK: `本期《無境界者》以「世界是我的牧區──龐君華會督紀念專輯」為題，紀念於2026年1月15日安息主懷的台灣衛理公會前會督龐君華牧師。
「世界是我的牧區」本是約翰．衛斯理的名言，也是龐會督一生事奉的寫照——他所牧養的從不只是一間堂會，而是跨越台港兩地、跨越宗派藩籬的廣闊禾場。在他驟然離世的哀傷裡，我們選擇不只是追悼，更要細細回望這位牧者如何以其生命，為衛斯理的循道精神作了當代的註腳。從最親近的家人、同工與摯友的追憶，到對他公共神學與循道精神的思索，這一期，是我們這一代人共同對一位牧者的紀念。`,
};

const ISSUE_INTRO_CFP = {
  en: "The next issue of Faith Without Boundary (July–August 2026), themed “The Disciplined Body and a Faith Without Boundary,” follows two threads: one begins at the Hongshi Buddhist College’s “Gender-Friendly Retreat,” rethinking the boundaries religious traditions draw around the body; the other returns to history to explore the ties between Jinan Presbyterian Church and Taiwan’s Non-Church (Mukyōkai) movement. We warmly invite submissions on gender and the religious politics of the body, the history of Jinan Church and the Non-Church movement, and related themes. Join us at the boundaries of body and institution as we seek a faith without boundary.",
  ja: "次号の『境界なき者』（2026年7-8月号）は「規律される身体と、境界なき信仰」をテーマに、二つの糸をたどります。ひとつは仏教弘誓学院の「ジェンダー・フレンドリー自在キャンプ」から出発し、宗教伝統が身体に引く境界を問い直すこと。もうひとつは歴史へ遡り、済南教会と台湾の無教会主義との因縁を探ることです。ジェンダーと宗教の身体政治、済南教会と無教会主義の歴史などに関する原稿を心より募集します。身体と制度の境界に立ち、ともに境界なき信仰を探しましょう。",
  ko: "다음 호 『경계 없는 자』(2026년 7-8월호)는 「규율되는 몸, 그리고 경계 없는 신앙」을 주제로 두 갈래의 실마리를 따라갑니다. 하나는 불교 홍서학원의 「젠더 친화 자재 캠프」에서 출발해 종교 전통이 몸에 긋는 경계를 다시 생각하는 것이고, 다른 하나는 역사로 돌아가 제남교회와 대만 무교회주의의 인연을 탐구하는 것입니다. 젠더와 종교의 몸 정치, 제남교회와 무교회주의의 역사 등 관련 원고를 정중히 모집합니다. 몸과 제도의 경계에서 함께 경계 없는 신앙을 찾아가기를 바랍니다.",
  zh_CN: "下期《无境界者》（2026年07-08月号）将以「禁‧戒的身体与无境界的信仰」为主题，沿两条线索前行：一条从佛教弘誓学院的「性别友善自在营」出发，重新思考宗教传统中对身体的界线；另一条回到历史，探讨济南教会与台湾无教会主义的因缘。诚挚征求性别与宗教身体政治、济南教会与无教会主义史等相关稿件，邀您一同在身体与体制的边界上，寻找一种无境界的信仰。",
  zh_HK: "下期《無境界者》（2026年07-08月號）將以「禁‧戒的身體與無境界的信仰」為主題，沿兩條線索前行：一條從佛教弘誓學院的「性別友善自在營」出發，重新思考宗教傳統中對身體的界線；另一條回到歷史，探討濟南教會與台灣無教會主義的因緣。誠摯徵求性別與宗教身體政治、濟南教會與無教會主義史等相關稿件，邀請您一同在身體與體制的邊界上，尋找一種信仰上的無境界。",
};

const SOURCE_SUMMARIES = {
  "9-4我是在修的人": "龐君華會督透過與一位傳統信仰長輩的對話，反思現代人在高壓生活中對心靈寧靜的渴求。他指出基督信仰中本有豐富的靈性操練資源，呼籲信徒透過日復一日的靈修，將親近上主轉化為「心靈的習慣」，進而成為他人的屬靈陪伴者。",
  "9-5不只是牧師，不只是師母": "本文專訪與龐會督相伴四十載、攜手走過台港兩地服事的楊肇悅師母。師母特別以妻子與同工、夥伴等多面向的視角，訴說她所認識的龐君華。她從最初與龐牧師在校園團契相識、成為異鄉求學的支柱，到在城中教會中「配合者」的角色，娓娓道出這位多面向的牧者在公共的牧養角色之外，於生命各階段真實的心路歷程。",
  "9-6活出真實的門徒生活": "本文專訪 2019 年起接任城中教會主任牧師的邱泰耀牧師。邱牧師以二十多年的同工視角，回顧龐會督如何把衛理宗的禮儀與傳統一磚一瓦帶回台灣、如何在台灣衛理公會普遍受國語禮拜堂與敬拜讚美影響的氛圍中堅守經課與班會精神，並分享他自己作為接續者，如何在崇拜、靈修陪伴與聖經靈修上承接龐會督未竟的願景。",
  "9-7循道精神的同行者": "本文專訪與龐會督相識近三十年的吳昶興教授。吳老師既是華人基督教史學者，也是城中牧區首任義務傳道，與龐會督在香港崇基、城中教會、衛理神學院等階段皆有深厚同窗、同工情誼。透過他「歷史學者」與「義務傳道」的雙重視角，回顧龐會督如何推動禮儀更新與循道精神的回歸，以及他為信念奔走一生、即使受到誤解也憑信前行的牧者身影。",
  "9-8念君華": "本文是崇基學院神學院退休教授邢福增為龐君華會督所寫的紀念文。作者回溯一九八七年兩人在香港中文大學的相遇，細數君華如何成為他臺灣政治與本土神學的啟蒙者，並記述君華在崇基完成本土神學研究、出任宗文社副社長、與在香港的學術足跡。從香港到臺灣、兩人相知近四十載，最後作者以「雲與霧」為喻，深情送別這位以生命繪出天國風景的牧者。",
  "9-9與龐牧師一起唱詩歌": "本文作者是城中教會詩班指揮。她整理出龐君華會督生前鍾愛的音樂與詩歌——從倪柝聲的〈神，你正在重排我的前途〉、拉威爾的〈波麗露〉、〈聖法蘭西斯的祈禱〉到潘霍華的〈所有美善力量〉等歌曲，並邀請城中詩班一同協助錄影錄音，以龐牧師最喜歡的詩歌來紀念他。網站附上聆聽連結與歌詞，願本文能以音樂擁抱思念龐牧師的每一個心靈。",
  "9-10一位牧者之死": "今年初，作者因讀榮格的《伊雍》而開始練習觀察自己的無意識——寫夢日記、睡前積極想像、捕捉日間突然浮現的意象。就在這樣的練習途中，他驟然接到曾經支持自己的牧者安息的消息。這篇〈一位牧者之死〉，是一月十五日到十九日這五天觀察日記的改寫，以類似意識流的手法，讓夢境、積極想像與現實中的按牧禮、主日、詩歌分享會彼此滲透。作者一邊以榮格的語言解讀自己的哀慟，也重新理解牧者之死所帶來的新的動能，以及成為屬靈孤兒與無境界者的意義。",
  "9-11讓我們繼續今天的崇拜": "作者以城中教會音樂同工的視角追憶龐君華會督：從她2016年踏進城中教會的大門、成為詩班指揮，以及逐漸熟悉四疊崇拜的實踐與城中「不用PPT的傳統崇拜」風格，記下龐牧師對崇拜音樂的重視與信任，以及一段亦師亦友的關係。",
  "9-12從合一到破碎": "本文以衛理公會為例，探討1949年後來台的建制教會在歷史與政治變遷中逐漸「小群化」的現象。作者反思宗教改革與合一的關聯，呼籲教會在認識自身傳統中尋求真實的合一。",
  "9-13從敬虔到公義": "作者是以龐牧師的兩篇學位論文並結合對他後來牧養的歷程來去探討他的公共神學理念。文中，作者首先總結龐牧師公共神學的特點，認為其具有十分深厚的循道宗社會改良主義的色彩，並將其與改革宗的政治理想主義進行對照，以此來理解龐牧師對長老教會公共神學的解讀與評論。文末，作者也認為龐牧師一生的牧養歷程也正符合其公共神學的理念，成為台灣教會中一種典範。",
  "9-14內村鑑三與衛理宗的緣分": "提倡無教會主義的內村鑑三，長期被認為是反對所有宗派的基督教思想家。然而，其實內村與一個宗派的緣分特別深刻，那就是：衛理宗。他曾一度是衛理公會的會友，即使後來離開了，仍有許多（泛）衛理宗的友人們。究竟內村與（泛）衛理宗有什麼樣的緣分？就讓我們來探索看看吧！",
  "9-15我的循道宗史": "本文是張辰瑋「我的信仰史」系列第六篇，回顧他與龐君華會督相知相惜的一段循道宗因緣。他最初因為泰澤祈禱在城中教會結識龐牧師，兩人以神學與歷史為茶敘話題，龐牧師更成為他神學路上的貴人與「屬靈父親」。文章坦述作者在宗派認同、牧職呼召與身分認同間的掙扎，以及最終未能完成學業、令伯樂感到失望的痛楚，但仍舊對於這段合一路上的相伴感到珍貴。",
  "9-16信仰乃是叫人好好活著": "本文從「世界是我的牧區」的另一面切入：世界固然是上主的牧區，教會有時卻反而更不像上主的牧區。作者回顧自己揭發冒充學經歷的教會騙子陳斯隆、反遭提告卻獲不起訴的經過，以及社青集體出走後與福昌教會合作、繼續經營「教會社青五四三」的歷程。文章藉潘霍華「為他者的存有」，主張信仰的見證在於服事邊緣弱勢、打破傳統框架，指出實踐「世界是上主的牧區」最終是要幫助眾人好好活著。",
  "9-17當講章不再只是給答案": "當我們把聖經當成答案庫時，往往繼承了答案，卻忘記了原本的問題。許多經文其實是作者對特定處境的回應，而非放諸四海皆準的標準答案。本文以彼得前書為例，提出一種處境式講道法，嘗試讓詮釋過程被看見，並重新思考當經文與當代處境不再重合時，我們如何在兩者之間承受尚未被解決的張力。",
  "9-18擬真的樂園，重啟的幻象": "本文以科幻經典《駭客任務》為切入點，以此批判基督宗教的各種末世論。文章指出，無論是訴諸靈魂解脫的「天堂論」，還是期盼宇宙重啟的「新天新地論」，其底層邏輯皆如同母體系統的「藍色藥丸」，潛移默化地催生了面對社會苦難的「旁觀者效應」。當救贖被寄託於彼岸或末日的神聖暴力時，人類在現實中的反抗意志便遭到閹割。",
};

const ARTICLE_SUMMARIES = {
  "9-4我是在修的人": {
    en: "Through a conversation with an elder rooted in traditional faith, Bishop Pong Kwan-wah reflects on modern people’s longing for inner peace amid high-pressure lives. He points to Christianity’s rich resources for spiritual practice and calls believers, through daily devotion, to turn closeness to God into a “habit of the heart” and thereby become spiritual companions to others.",
    ja: "龐君華監督は、伝統信仰を持つ年長者との対話を通して、高圧的な生活のなかで現代人が心の静けさを求めていることを省察します。キリスト教信仰には豊かな霊的修練の資源があると指摘し、日々の霊修によって神に近づくことを「心の習慣」へと変え、他者の霊的な同伴者となるよう信徒に呼びかけます。",
    ko: "팡쥔화 감독은 전통 신앙을 지닌 한 어른과의 대화를 통해, 고압적인 삶 속에서 현대인이 마음의 평안을 갈망하는 현실을 성찰합니다. 그는 기독교 신앙 안에 풍성한 영성 훈련의 자원이 있음을 밝히고, 신자들이 날마다 경건 생활을 이어 가며 하나님께 가까이 나아가는 일을 ‘마음의 습관’으로 만들고 다른 이들의 영적 동반자가 되기를 권합니다.",
    zh_CN: "庞君华会督透过与一位传统信仰长辈的对话，反思现代人在高压生活中对心灵宁静的渴求。他指出基督信仰中本有丰富的灵性操练资源，呼吁信徒透过日复一日的灵修，将亲近上主转化为「心灵的习惯」，进而成为他人的属灵陪伴者。",
    zh_HK: "龐君華會督透過與一位傳統信仰長輩的對話，反思現代人在高壓生活中對心靈寧靜的渴求。他指出基督信仰中本有豐富的靈性操練資源，呼籲信徒透過日復一日的靈修，將親近上主轉化為「心靈的習慣」，進而成為他人的屬靈陪伴者。",
  },
  "9-5不只是牧師，不只是師母": {
    en: "This interview features Mrs. Yang Chao-yueh, who accompanied Bishop Pong for forty years and shared in ministry with him across Taiwan and Hong Kong. Speaking from her many perspectives as wife, co-worker, and partner, she tells of the Pong Kwan-wah she knew. From their first meeting at Campus Fellowship and her support during his studies away from home to her role as his “partner” at Chengzhong Methodist Church, she recounts the genuine inner journey of this many-sided pastor through each stage of life beyond his public pastoral role.",
    ja: "本稿では、龐監督と四十年にわたり歩みを共にし、台湾と香港でともに奉仕した楊肇悦師母にインタビューします。師母は妻、同労者、パートナーという多面的な視点から、自らが知る龐君華について語ります。キャンパス・フェローシップで龐牧師と出会い、異郷で学ぶ彼を支えた時期から、城中教会で「協力者」を務めた日々まで、公的な牧会者としての姿の背後にある、この多面的な牧者の各人生段階における率直な心の歩みを丁寧に語ります。",
    ko: "이 글은 팡 감독과 40년을 함께하며 대만과 홍콩에서 사역한 양자오웨 사모를 인터뷰합니다. 사모는 아내이자 동역자이며 동반자라는 여러 시선으로 자신이 알던 팡쥔화를 이야기합니다. 캠퍼스 펠로우십에서 팡 목사를 처음 만나 타지 유학의 버팀목이 된 때부터 청중교회에서 ‘협력자’로 함께한 역할까지, 공적인 목회 역할 너머에 있던 이 다면적인 목자의 생애 각 단계와 진솔한 마음의 여정을 들려줍니다.",
    zh_CN: "本文专访与庞会督相伴四十载、携手走过台港两地服事的杨肇悦师母。师母特别以妻子与同工、伙伴等多面向的视角，诉说她所认识的庞君华。她从最初与庞牧师在校园团契相识、成为异乡求学的支柱，到在城中教会中「配合者」的角色，娓娓道出这位多面向的牧者在公共的牧养角色之外，于生命各阶段真实的心路历程。",
    zh_HK: "本文專訪與龐會督相伴四十載、攜手走過台港兩地服事的楊肇悅師母。師母特別以妻子與同工、夥伴等多面向的視角，訴說她所認識的龐君華。她從最初與龐牧師在校園團契相識、成為異鄉求學的支柱，到在城中教會中擔任「配合者」的角色，娓娓道出這位多面向的牧者在公共的牧養角色之外，於生命各階段真實的心路歷程。",
  },
  "9-6活出真實的門徒生活": {
    en: "This article interviews the Rev. Chiu Tai-yao, who became senior pastor of Chengzhong Methodist Church in 2019. Drawing on more than twenty years as Bishop Pong’s co-worker, Chiu recalls how the bishop brought Methodist liturgy and tradition back to Taiwan brick by brick, and how he upheld the spirit of the lectionary and class meeting amid a Taiwanese Methodist climate deeply shaped by Mandarin-speaking churches and praise-and-worship practice. He also shares how, as a successor, he is carrying forward Bishop Pong’s unfinished vision through worship, spiritual companionship, and biblical spirituality.",
    ja: "本稿では、2019年から城中教会の主任牧師を務める邱泰耀牧師にインタビューします。邱牧師は二十年以上にわたる同労者の視点から、龐監督がメソジストの典礼と伝統を一つ一つ台湾へ持ち帰ったこと、また台湾メソジスト教会が国語礼拝堂やプレイズ＆ワーシップの影響を広く受けるなかで、聖書日課とクラス・ミーティングの精神を守ったことを振り返ります。さらに後継者として、礼拝、霊的同伴、聖書に根ざす霊性を通して、龐監督の未完のヴィジョンをどのように受け継いでいるかを語ります。",
    ko: "이 글은 2019년부터 청중교회 담임목사로 섬기는 추타이야오 목사를 인터뷰합니다. 추 목사는 20여 년간 동역한 시선으로 팡 감독이 감리교의 예전과 전통을 벽돌 한 장씩 쌓듯 대만에 되살린 과정, 그리고 대만 감리교회가 중국어 예배당과 찬양 예배의 영향을 널리 받는 분위기 속에서도 성서일과와 속회 정신을 지킨 일을 돌아봅니다. 또한 후임자로서 예배와 영적 동행, 성경 영성을 통해 팡 감독의 미완의 비전을 어떻게 이어 가는지 나눕니다.",
    zh_CN: "本文专访2019年起接任城中教会主任牧师的邱泰耀牧师。邱牧师以二十多年的同工视角，回顾庞会督如何把卫理宗的礼仪与传统一砖一瓦带回台湾、如何在台湾卫理公会普遍受国语礼拜堂与敬拜赞美影响的氛围中坚守经课与班会精神，并分享他自己作为接续者，如何在崇拜、灵修陪伴与圣经灵修上承接庞会督未竟的愿景。",
    zh_HK: "本文專訪2019年起接任城中教會主任牧師的邱泰耀牧師。邱牧師以二十多年的同工視角，回顧龐會督如何把衛理宗的禮儀與傳統一磚一瓦帶回台灣、如何在台灣衛理公會普遍受國語禮拜堂與敬拜讚美影響的氛圍中堅守經課與班會精神，並分享他自己作為接續者，如何在崇拜、靈修陪伴與聖經靈修上承接龐會督未竟的願景。",
  },
  "9-7循道精神的同行者": {
    en: "This interview features Professor Wu Chang-hsing, who knew Bishop Pong for nearly thirty years. Wu is both a historian of Chinese Christianity and the first volunteer preacher of the Chengzhong parish; he and Bishop Pong shared deep bonds as classmates and co-workers through their years at Chung Chi in Hong Kong, Chengzhong Methodist Church, and the Methodist Graduate School of Theology. From his dual perspective as “historian” and “volunteer preacher,” he recalls how Bishop Pong promoted liturgical renewal and a return to the Methodist spirit, portraying a pastor who devoted his life to his convictions and continued in faith even when misunderstood.",
    ja: "本稿では、龐監督と約三十年にわたり親交を結んだ呉昶興教授にインタビューします。呉教授は華人キリスト教史の研究者であると同時に、城中牧区初の義務伝道者でもあり、香港の崇基、城中教会、メソジスト神学院などの各時期に龐監督と深い学友・同労者の絆を築きました。「歴史学者」と「義務伝道者」という二つの視点から、龐監督が典礼刷新とメソジスト精神への回帰をいかに推し進めたかを振り返り、誤解を受けても信仰によって歩み、生涯を信念のために捧げた牧者の姿を描きます。",
    ko: "이 글은 팡 감독과 약 30년을 알고 지낸 우창싱 교수를 인터뷰합니다. 우 교수는 중국 기독교사 연구자이자 청중목구 최초의 의무 전도자로, 홍콩 충기와 청중교회, 감리교 신학원 등 여러 시기에 팡 감독과 깊은 학우 및 동역의 우정을 나누었습니다. 그는 ‘역사학자’와 ‘의무 전도자’라는 두 시선으로 팡 감독이 예전 갱신과 감리교 정신의 회복을 어떻게 이끌었는지 돌아보고, 오해를 받으면서도 믿음으로 나아가며 평생 신념을 위해 달린 목자의 모습을 그립니다.",
    zh_CN: "本文专访与庞会督相识近三十年的吴昶兴教授。吴老师既是华人基督教史学者，也是城中牧区首任义务传道，与庞会督在香港崇基、城中教会、卫理神学院等阶段皆有深厚同窗、同工情谊。透过他「历史学者」与「义务传道」的双重视角，回顾庞会督如何推动礼仪更新与循道精神的回归，以及他为信念奔走一生、即使受到误解也凭信前行的牧者身影。",
    zh_HK: "本文專訪與龐會督相識近三十年的吳昶興教授。吳老師既是華人基督教史學者，也是城中牧區首任義務傳道，與龐會督在香港崇基、城中教會、衛理神學院等階段皆有深厚同窗、同工情誼。透過他「歷史學者」與「義務傳道」的雙重視角，回顧龐會督如何推動禮儀更新與循道精神的回歸，以及他為信念奔走一生、即使受到誤解也憑信前行的牧者身影。",
  },
  "9-8念君華": {
    en: "This memorial essay for Bishop Pong Kwan-wah is written by Professor Ying Fuk-tsang, retired professor of Chung Chi Divinity School. The author looks back to their meeting at the Chinese University of Hong Kong in 1987, recounting how Kwan-wah awakened his interest in Taiwanese politics and contextual theology. He also records Kwan-wah’s scholarly path in Hong Kong, from completing research on contextual theology at Chung Chi to serving as deputy director of the Christian Study Centre on Chinese Religion and Culture. After nearly forty years of friendship from Hong Kong to Taiwan, the author finally invokes “cloud and mist” to bid a heartfelt farewell to this pastor who painted a vision of God’s kingdom with his life.",
    ja: "本稿は、崇基学院神学院の退職教授・邢福増が龐君華監督のために書いた追悼文です。著者は1987年に香港中文大学で二人が出会った時を振り返り、君華が台湾政治と本土神学への関心を開いてくれたことを語ります。また、崇基で本土神学の研究を完成させ、宗文社の副社長を務めるなど、君華が香港で残した学術的足跡を記します。香港から台湾へ、約四十年にわたり互いを知り合った末に、著者は「雲と霧」を比喩として、その生涯で神の国の風景を描いた牧者に深い思いを込めて別れを告げます。",
    ko: "이 글은 충기학원 신학원 은퇴 교수 싱푸청이 팡쥔화 감독을 기리며 쓴 추모문입니다. 저자는 1987년 홍콩중문대학에서 두 사람이 만난 일을 되돌아보며, 쥔화가 자신에게 대만 정치와 토착신학을 눈뜨게 한 사람이었음을 이야기합니다. 또한 쥔화가 충기에서 토착신학 연구를 마치고 종문사 부사장을 맡는 등 홍콩에서 남긴 학문적 발자취를 기록합니다. 홍콩에서 대만까지 거의 40년 동안 서로를 알아 온 저자는 마지막에 ‘구름과 안개’를 비유로 삼아, 삶으로 하나님 나라의 풍경을 그린 이 목자에게 깊은 마음으로 작별을 고합니다.",
    zh_CN: "本文是崇基学院神学院退休教授邢福增为庞君华会督所写的纪念文。作者回溯一九八七年两人在香港中文大学的相遇，细数君华如何成为他台湾政治与本土神学的启蒙者，并记述君华在崇基完成本土神学研究、出任宗文社副社长，以及在香港留下的学术足迹。从香港到台湾、两人相知近四十载，最后作者以「云与雾」为喻，深情送别这位以生命绘出天国风景的牧者。",
    zh_HK: "本文是崇基學院神學院退休教授邢福增為龐君華會督所寫的紀念文。作者回溯一九八七年兩人在香港中文大學的相遇，細數君華如何成為他台灣政治與本土神學的啟蒙者，並記述君華在崇基完成本土神學研究、出任宗文社副社長，以及在香港留下的學術足跡。從香港到台灣、兩人相知近四十載，最後作者以「雲與霧」為喻，深情送別這位以生命繪出天國風景的牧者。",
  },
  "9-9與龐牧師一起唱詩歌": {
    en: "The author is the choir director of Chengzhong Methodist Church. She gathers the music and hymns Bishop Pong Kwan-wah loved in life—from Watchman Nee’s “God, You Are Reordering My Future,” Ravel’s Boléro, and “The Prayer of Saint Francis” to Bonhoeffer’s “By Gracious Powers.” She also invited the Chengzhong choir to help make video and audio recordings, commemorating Pastor Pong through his favourite hymns. Listening links and lyrics are included on the website, in the hope that this article may embrace through music every heart that misses him.",
    ja: "著者は城中教会の聖歌隊指揮者です。龐君華監督が生前愛した音楽と讃美歌——倪柝声の〈神よ、あなたは私の前途を組み替えておられる〉、ラヴェルの〈ボレロ〉、〈聖フランシスコの祈り〉、ボンヘッファーの〈善き力にわれ囲まれ〉など——を選び、城中聖歌隊にも映像・音声の収録への協力を依頼し、龐牧師が最も愛した讃美歌によって彼を記念しました。ウェブサイトには視聴リンクと歌詞を掲載し、この文章が音楽を通して龐牧師を慕うすべての心を包むことを願います。",
    ko: "저자는 청중교회 성가대 지휘자입니다. 그는 팡쥔화 감독이 생전에 사랑한 음악과 찬송가를 정리했습니다. 워치만 니의 〈하나님, 당신은 나의 앞날을 다시 배열하고 계십니다〉, 라벨의 〈볼레로〉, 〈성 프란치스코의 기도〉, 본회퍼의 〈선한 능력으로〉 등이 포함됩니다. 또한 청중교회 성가대에 영상과 음원 녹음을 부탁해 팡 목사가 가장 사랑한 찬송으로 그를 기렸습니다. 웹사이트에는 감상 링크와 가사를 실었으며, 이 글이 음악으로 팡 목사를 그리워하는 모든 마음을 품어 주기를 바랍니다.",
    zh_CN: "本文作者是城中教会诗班指挥。她整理出庞君华会督生前钟爱的音乐与诗歌——从倪柝声的〈神，你正在重排我的前途〉、拉威尔的〈波丽露〉、〈圣法兰西斯的祈祷〉到潘霍华的〈所有美善力量〉等歌曲，并邀请城中诗班一同协助录像录音，以庞牧师最喜欢的诗歌来纪念他。网站附上聆听链接与歌词，愿本文能以音乐拥抱思念庞牧师的每一个心灵。",
    zh_HK: "本文作者是城中教會詩班指揮。她整理出龐君華會督生前鍾愛的音樂與詩歌——從倪柝聲的〈神，你正在重排我的前途〉、拉威爾的〈波麗露〉、〈聖法蘭西斯的祈禱〉到潘霍華的〈所有美善力量〉等歌曲，並邀請城中詩班一同協助錄影錄音，以龐牧師最喜歡的詩歌來紀念他。網站附上聆聽連結與歌詞，願本文能以音樂擁抱思念龐牧師的每一個心靈。",
  },
  "9-10一位牧者之死": {
    en: "Early this year, after reading Jung’s Aion, the author began practising observation of his own unconscious—keeping a dream journal, engaging in active imagination before sleep, and noting images that surfaced suddenly during the day. In the midst of this practice, he abruptly received news that a pastor who had once supported him had died. “The Death of a Pastor” reworks his observation journals from January 15 to 19 in a stream-of-consciousness-like form, allowing dreams and active imagination to permeate an ordination service, Sunday worship, and a hymn-sharing gathering in the waking world. As the author interprets his grief through Jungian language, he also comes to understand anew the fresh energy brought by a pastor’s death and what it means to become a spiritual orphan and one without boundary.",
    ja: "今年初め、著者はユングの『アイオーン』を読んだことをきっかけに、自らの無意識を観察する練習を始めました——夢日記を書き、眠る前に能動的想像を行い、日中に突然浮かぶイメージを捉えるというものです。その実践のさなか、かつて自分を支えてくれた牧者が召されたという知らせを突然受けます。〈一人の牧者の死〉は、1月15日から19日までの五日間の観察日記を、意識の流れに似た手法で書き直した作品です。夢と能動的想像が、現実の按手礼、主日礼拝、讃美歌を分かち合う集いへと互いに浸透していきます。著者はユングの言葉で自らの悲嘆を読み解きながら、牧者の死がもたらす新たな力と、霊的孤児そして境界なき者となる意味を捉え直します。",
    ko: "올해 초 저자는 융의 『아이온』을 읽고 자신의 무의식을 관찰하는 연습을 시작했습니다. 꿈 일기를 쓰고, 잠들기 전 적극적 상상을 하며, 낮 동안 갑자기 떠오르는 이미지를 붙잡는 일이었습니다. 그러던 중 한때 자신을 지지해 준 목자가 별세했다는 소식을 갑작스레 받았습니다. 〈한 목자의 죽음〉은 1월 15일부터 19일까지 닷새 동안 쓴 관찰 일기를 의식의 흐름과 비슷한 방식으로 다시 쓴 작품입니다. 꿈과 적극적 상상이 현실의 목사 안수식, 주일 예배, 찬송 나눔 모임과 서로 스며듭니다. 저자는 융의 언어로 자신의 애도를 해석하는 동시에, 목자의 죽음이 가져온 새로운 동력과 영적 고아이자 경계 없는 자가 된다는 의미를 새롭게 이해합니다.",
    zh_CN: "今年初，作者因读荣格的《伊雍》而开始练习观察自己的无意识——写梦日记、睡前积极想象、捕捉日间突然浮现的意象。就在这样的练习途中，他骤然接到曾经支持自己的牧者安息的消息。这篇〈一位牧者之死〉，是一月十五日到十九日这五天观察日记的改写，以类似意识流的手法，让梦境、积极想象与现实中的按牧礼、主日、诗歌分享会彼此渗透。作者一边以荣格的语言解读自己的哀恸，也重新理解牧者之死所带来的新的动能，以及成为属灵孤儿与无境界者的意义。",
    zh_HK: "今年初，作者因讀榮格的《伊雍》而開始練習觀察自己的無意識——寫夢日記、睡前積極想像、捕捉日間突然浮現的意象。就在這樣的練習途中，他驟然接到曾經支持自己的牧者安息的消息。這篇〈一位牧者之死〉，是一月十五日到十九日這五天觀察日記的改寫，以類似意識流的手法，讓夢境、積極想像與現實中的按牧禮、主日、詩歌分享會彼此滲透。作者一邊以榮格的語言解讀自己的哀慟，也重新理解牧者之死所帶來的新的動能，以及成為屬靈孤兒與無境界者的意義。",
  },
  "9-11讓我們繼續今天的崇拜": {
    en: "The author remembers Bishop Pong Kwan-wah from her perspective as a music co-worker at Chengzhong Methodist Church: from first entering the church in 2016 and becoming choir director to gradually becoming familiar with the practice of four-fold worship and Chengzhong’s style of “traditional worship without PowerPoint.” She records Pastor Pong’s regard for and trust in worship music, as well as a relationship in which he was both teacher and friend.",
    ja: "著者は城中教会の音楽同労者という視点から龐君華監督を偲びます。2016年に城中教会の扉をくぐり聖歌隊指揮者となった時から、四重の礼拝の実践と城中の「PPTを使わない伝統礼拝」というスタイルに次第に親しむまでをたどり、龐牧師が礼拝音楽に寄せた重視と信頼、そして師であり友でもあった関係を記します。",
    ko: "저자는 청중교회 음악 동역자의 시선으로 팡쥔화 감독을 추억합니다. 2016년 청중교회 문을 처음 들어서 성가대 지휘자가 된 때부터 사중 예배의 실천과 청중교회의 ‘PPT를 쓰지 않는 전통 예배’ 방식에 차츰 익숙해지기까지를 돌아보며, 예배 음악을 소중히 여기고 신뢰했던 팡 목사의 모습과 스승이자 벗이었던 관계를 기록합니다.",
    zh_CN: "作者以城中教会音乐同工的视角追忆庞君华会督：从她2016年踏进城中教会的大门、成为诗班指挥，以及逐渐熟悉四叠崇拜的实践与城中「不用PPT的传统崇拜」风格，记下庞牧师对崇拜音乐的重视与信任，以及一段亦师亦友的关系。",
    zh_HK: "作者以城中教會音樂同工的視角追憶龐君華會督：從她2016年踏進城中教會的大門、成為詩班指揮，以及逐漸熟悉四疊崇拜的實踐與城中「不用PPT的傳統崇拜」風格，記下龐牧師對崇拜音樂的重視與信任，以及一段亦師亦友的關係。",
  },
  "9-12從合一到破碎": {
    en: "Taking the Methodist Church as its example, this article examines how the established churches that came to Taiwan after 1949 gradually became isolated small groups amid historical and political change. The author reflects on the relationship between the Reformation and unity, calling the church to seek genuine unity through understanding its own tradition.",
    ja: "本稿はメソジスト教会を例に、1949年以降に台湾へ来た制度的教会が、歴史的・政治的変動のなかで次第に孤立した「小集団」へと変わっていった現象を考察します。著者は宗教改革と一致の関係を省察し、教会が自らの伝統を理解するなかで真の一致を求めるよう呼びかけます。",
    ko: "이 글은 감리교회를 사례로 삼아, 1949년 이후 대만에 들어온 제도 교회가 역사적·정치적 변화 속에서 점차 고립된 ‘소집단’으로 변해 간 현상을 살핍니다. 저자는 종교개혁과 일치의 관계를 성찰하며, 교회가 자신의 전통을 이해하는 가운데 참된 일치를 추구하도록 요청합니다.",
    zh_CN: "本文以卫理公会为例，探讨1949年后来台的建制教会在历史与政治变迁中逐渐「小群化」的现象。作者反思宗教改革与合一的关联，呼吁教会在认识自身传统中寻求真实的合一。",
    zh_HK: "本文以衛理公會為例，探討1949年後來台的建制教會在歷史與政治變遷中逐漸「小群化」的現象。作者反思宗教改革與合一的關聯，呼籲教會在認識自身傳統中尋求真實的合一。",
  },
  "9-13從敬虔到公義": {
    en: "The author explores Pastor Pong’s ideas of public theology through his two degree theses together with the course of his later pastoral ministry. The article first summarizes the characteristics of his public theology, arguing that it bears a strong Methodist social-reformist character, and contrasts it with Reformed political idealism in order to understand Pastor Pong’s reading and critique of the Presbyterian Church’s public theology. In closing, the author suggests that Pastor Pong’s lifetime of pastoral ministry embodied his public theology and became a model within the Taiwanese church.",
    ja: "著者は龐牧師の二本の学位論文と、その後の牧会の歩みをあわせて検討し、彼の公共神学の理念を探ります。まず龐牧師の公共神学の特徴を整理し、そこにメソジストの社会改良主義が色濃く表れていると捉え、改革派の政治的理想主義と対照することで、龐牧師による長老教会の公共神学の解釈と批評を理解しようとします。最後に、龐牧師の生涯にわたる牧会そのものが彼の公共神学を体現し、台湾の教会における一つの模範となったと論じます。",
    ko: "저자는 팡 목사의 두 학위논문과 이후의 목회 여정을 함께 살피며 그의 공공신학 사상을 탐구합니다. 먼저 팡 목사 공공신학의 특징을 정리하고, 그 안에 감리교 사회개량주의의 색채가 매우 짙다고 보며, 이를 개혁교회의 정치적 이상주의와 대조해 팡 목사가 장로교회의 공공신학을 어떻게 해석하고 비평했는지 이해합니다. 글의 끝에서 저자는 팡 목사의 평생 목회 여정 자체가 그의 공공신학 이념에 부합했으며 대만 교회 안에서 하나의 모범이 되었다고 평가합니다.",
    zh_CN: "作者以庞牧师的两篇学位论文，并结合他后来的牧养历程，探讨他的公共神学理念。文中，作者首先总结庞牧师公共神学的特点，认为其具有十分深厚的循道宗社会改良主义色彩，并将其与改革宗的政治理想主义进行对照，以此理解庞牧师对长老教会公共神学的解读与评论。文末，作者也认为庞牧师一生的牧养历程正符合其公共神学理念，成为台湾教会中的一种典范。",
    zh_HK: "作者以龐牧師的兩篇學位論文，並結合他後來的牧養歷程，探討他的公共神學理念。文中，作者首先總結龐牧師公共神學的特點，認為其具有十分深厚的循道宗社會改良主義色彩，並將其與改革宗的政治理想主義進行對照，以此理解龐牧師對長老教會公共神學的解讀與評論。文末，作者也認為龐牧師一生的牧養歷程正符合其公共神學理念，成為台灣教會中的一種典範。",
  },
  "9-14內村鑑三與衛理宗的緣分": {
    en: "Uchimura Kanzō, an advocate of the Non-Church movement, has long been regarded as a Christian thinker opposed to every denomination. Yet Uchimura in fact had an especially deep bond with one denomination: Methodism. He was once a member of the Methodist Church, and even after leaving it he still had many friends in the broader Methodist family. What exactly were Uchimura’s ties to Methodism? Let us explore them together.",
    ja: "無教会主義を唱えた内村鑑三は、長いあいだ、あらゆる教派に反対したキリスト教思想家と見なされてきました。しかし実際には、内村はある一つの教派ととりわけ深い縁を結んでいました。それがメソジストです。彼は一時期メソジスト教会の会員であり、離れた後も多くの（広義の）メソジストの友人たちとつながっていました。内村とメソジストにはどのような縁があったのでしょうか。ともに探ってみましょう。",
    ko: "무교회주의를 제창한 우치무라 간조는 오랫동안 모든 교파에 반대한 기독교 사상가로 여겨져 왔습니다. 그러나 실제로 우치무라는 한 교파와 특히 깊은 인연을 맺었는데, 바로 감리교입니다. 그는 한때 감리교회 교인이었으며, 나중에 떠난 뒤에도 넓은 의미의 감리교 전통에 속한 많은 친구가 있었습니다. 우치무라와 감리교에는 과연 어떤 인연이 있었을까요? 함께 살펴봅시다.",
    zh_CN: "提倡无教会主义的内村鉴三，长期被认为是反对所有宗派的基督教思想家。然而，其实内村与一个宗派的缘分特别深刻，那就是：卫理宗。他曾一度是卫理公会的会友，即使后来离开了，仍有许多（泛）卫理宗的友人们。究竟内村与（泛）卫理宗有什么样的缘分？就让我们来探索看看吧！",
    zh_HK: "提倡無教會主義的內村鑑三，長期被認為是反對所有宗派的基督教思想家。然而，其實內村與一個宗派的緣分特別深刻，那就是：衛理宗。他曾一度是衛理公會的會友，即使後來離開了，仍有許多（泛）衛理宗的友人。究竟內村與（泛）衛理宗有甚麼樣的緣分？就讓我們來探索看看吧！",
  },
  "9-15我的循道宗史": {
    en: "This is the sixth article in Thomas Chang’s “My Faith Story” series, recalling the Methodist bond of mutual understanding and appreciation he shared with Bishop Pong Kwan-wah. He first met Pastor Pong through Taizé prayer at Chengzhong Methodist Church. Over tea they talked theology and history, and Pastor Pong became both a benefactor on his theological path and his “spiritual father.” The article speaks candidly of the author’s struggles with denominational identity, a call to ministry, and personal identity, as well as the pain of failing to complete his studies and disappointing the mentor who believed in him. Even so, he continues to treasure their companionship on the road toward unity.",
    ja: "本稿は張辰瑋の「私の信仰史」シリーズ第六篇であり、龐君華監督と互いに理解し大切にし合ったメソジストの縁を振り返ります。著者は最初、城中教会のテゼの祈りを通して龐牧師と出会い、二人はお茶を囲んで神学と歴史を語り合いました。龐牧師はやがて、著者の神学の道における恩人であり「霊的な父」となります。文章は、教派的アイデンティティ、牧職への召命、自己認識をめぐる葛藤、そして学業を修了できず、自分を見いだしてくれた師を失望させた痛みを率直に語りながらも、一致への道で共に歩んだ時間を今なお大切にしています。",
    ko: "이 글은 장천웨이의 ‘나의 신앙사’ 연작 여섯 번째 글로, 팡쥔화 감독과 서로 알아보고 아꼈던 감리교의 인연을 돌아봅니다. 저자는 처음 청중교회의 떼제 기도를 통해 팡 목사를 만났고, 두 사람은 차를 마시며 신학과 역사를 이야기했습니다. 팡 목사는 그의 신학 여정에서 귀인이자 ‘영적 아버지’가 되었습니다. 글은 교파 정체성과 목회 소명, 자기 정체성을 둘러싼 저자의 갈등, 끝내 학업을 마치지 못해 자신을 알아봐 준 스승을 실망시킨 아픔을 솔직히 고백하면서도, 일치를 향한 길에서 함께한 시간을 여전히 소중히 간직합니다.",
    zh_CN: "本文是张辰玮「我的信仰史」系列第六篇，回顾他与庞君华会督相知相惜的一段循道宗因缘。他最初因为泰泽祈祷在城中教会结识庞牧师，两人以神学与历史为茶叙话题，庞牧师更成为他神学路上的贵人与「属灵父亲」。文章坦述作者在宗派认同、牧职呼召与身分认同间的挣扎，以及最终未能完成学业、令伯乐感到失望的痛楚，但仍旧对这段合一路上的相伴感到珍贵。",
    zh_HK: "本文是張辰瑋「我的信仰史」系列第六篇，回顧他與龐君華會督相知相惜的一段循道宗因緣。他最初因為泰澤祈禱在城中教會結識龐牧師，兩人以神學與歷史為茶敘話題，龐牧師更成為他神學路上的貴人與「屬靈父親」。文章坦述作者在宗派認同、牧職呼召與身分認同之間的掙扎，以及最終未能完成學業、令伯樂感到失望的痛楚，但仍舊對這段合一路上的相伴感到珍貴。",
  },
  "9-16信仰乃是叫人好好活著": {
    en: "This article approaches “the world is my parish” from another side: while the world is indeed God’s parish, the church can sometimes look even less like God’s parish. The author recounts exposing the church fraudster Chen Szu-lung, who falsified his academic and professional credentials, being sued in return but not indicted, and then partnering with Fuchang Church after a group of young adults left their congregation to continue operating “Church Young Adults 543.” Drawing on Bonhoeffer’s “being for others,” the article argues that the witness of faith lies in serving the marginalized and breaking traditional frameworks, and that putting “the world is God’s parish” into practice ultimately means helping everyone live well.",
    ja: "本稿は「世界は私の牧区」を別の側面から捉えます。世界は確かに神の牧区ですが、教会がかえって神の牧区らしくなくなることもあります。著者は、学歴と経歴を偽った教会の詐欺師・陳斯隆を告発し、逆に告訴されながら不起訴となった経緯、また社会人青年たちが集団で教会を離れた後、福昌教会と協力して「教会社青五四三」を続けてきた歩みを振り返ります。ボンヘッファーの「他者のための存在」を手がかりに、信仰の証しは周縁化された弱い立場の人々に仕え、伝統的枠組みを打ち破ることにあると主張し、「世界は神の牧区」を実践するとは、究極的にはすべての人がよく生きられるよう助けることだと語ります。",
    ko: "이 글은 ‘세계는 나의 교구’의 다른 면에서 출발합니다. 세계는 분명 하나님의 교구이지만, 교회가 때로는 오히려 하나님의 교구답지 않을 수 있습니다. 저자는 학력과 경력을 속인 교회 사기꾼 천쓰룽을 폭로했다가 도리어 고소당했으나 불기소 처분을 받은 과정, 그리고 청년들이 집단으로 교회를 나온 뒤 푸창교회와 협력해 ‘교회 청년 543’을 계속 운영한 여정을 돌아봅니다. 본회퍼의 ‘타자를 위한 존재’를 통해, 신앙의 증언은 주변부의 약자를 섬기고 전통적 틀을 깨는 데 있으며, ‘세계는 하나님의 교구’를 실천하는 일은 결국 모두가 잘 살아가도록 돕는 것이라고 말합니다.",
    zh_CN: "本文从「世界是我的牧区」的另一面切入：世界固然是上主的牧区，教会有时却反而更不像上主的牧区。作者回顾自己揭发冒充学经历的教会骗子陈斯隆、反遭提告却获不起诉的经过，以及社青集体出走后与福昌教会合作、继续经营「教会社青五四三」的历程。文章借潘霍华「为他者的存有」，主张信仰的见证在于服事边缘弱势、打破传统框架，指出实践「世界是上主的牧区」最终是要帮助众人好好活着。",
    zh_HK: "本文從「世界是我的牧區」的另一面切入：世界固然是上主的牧區，教會有時卻反而更不像上主的牧區。作者回顧自己揭發冒充學經歷的教會騙子陳斯隆、反遭提告卻獲不起訴的經過，以及社青集體出走後與福昌教會合作、繼續經營「教會社青五四三」的歷程。文章藉潘霍華「為他者的存有」，主張信仰的見證在於服事邊緣弱勢、打破傳統框架，指出實踐「世界是上主的牧區」最終是要幫助眾人好好活著。",
  },
  "9-17當講章不再只是給答案": {
    en: "When we treat the Bible as a bank of answers, we often inherit the answers while forgetting the original questions. Many passages are in fact an author’s response to a particular situation rather than standard answers that apply everywhere. Taking 1 Peter as an example, this article proposes a contextual approach to preaching that seeks to make the process of interpretation visible. It also reconsiders how, when a biblical text and the contemporary situation no longer coincide, we might bear the still-unresolved tension between them.",
    ja: "聖書を答えの貯蔵庫として扱うとき、私たちはしばしば答えを受け継ぎながら、そのもとにあった問いを忘れてしまいます。多くの聖書箇所は、どこにでも通用する標準解答ではなく、著者が特定の状況に応答したものです。本稿はペトロの手紙一を例に、解釈の過程を見えるものにする状況的説教法を提示し、聖書本文と現代の状況が重ならなくなったとき、両者のあいだに残る未解決の緊張を私たちがどのように担いうるかを問い直します。",
    ko: "우리가 성경을 답안 창고로 여길 때, 흔히 답은 물려받으면서도 그 답을 낳은 본래의 질문은 잊습니다. 많은 본문은 어디에나 적용되는 표준 답이 아니라 저자가 특정 상황에 응답한 글입니다. 이 글은 베드로전서를 사례로 해석의 과정을 드러내려는 상황적 설교 방법을 제안하고, 성경 본문과 오늘의 상황이 더는 겹치지 않을 때 우리가 그 사이에 아직 풀리지 않은 긴장을 어떻게 감당할 수 있는지 다시 묻습니다.",
    zh_CN: "当我们把圣经当成答案库时，往往继承了答案，却忘记了原本的问题。许多经文其实是作者对特定处境的回应，而非放诸四海皆准的标准答案。本文以彼得前书为例，提出一种处境式讲道法，尝试让诠释过程被看见，并重新思考当经文与当代处境不再重合时，我们如何在两者之间承受尚未被解决的张力。",
    zh_HK: "當我們把聖經當成答案庫時，往往繼承了答案，卻忘記了原本的問題。許多經文其實是作者對特定處境的回應，而非放諸四海皆準的標準答案。本文以彼得前書為例，提出一種處境式講道法，嘗試讓詮釋過程被看見，並重新思考當經文與當代處境不再重合時，我們如何在兩者之間承受尚未被解決的張力。",
  },
  "9-18擬真的樂園，重啟的幻象": {
    en: "Taking the science-fiction classic The Matrix as its point of departure, this article critiques the various forms of Christian eschatology. It argues that whether one appeals to a “heaven” of release for the soul or awaits a “new heaven and new earth” that reboots the cosmos, the underlying logic resembles the Matrix’s “blue pill,” quietly fostering a bystander effect in the face of social suffering. When redemption is entrusted to the world beyond or to the sacred violence of the end times, humanity’s will to resist in the present is castrated.",
    ja: "本稿はSFの古典『マトリックス』を切り口に、キリスト教のさまざまな終末論を批判します。魂の解放に訴える「天国論」であれ、宇宙の再起動を待ち望む「新天新地論」であれ、その根底にある論理はマトリックスの「青い薬」に似ており、社会の苦難を前にした「傍観者効果」を知らず知らずのうちに生み出すと指摘します。救いが彼岸や終末の聖なる暴力に委ねられるとき、人間が現実のなかで抵抗する意志は去勢されてしまいます。",
    ko: "이 글은 SF 고전 『매트릭스』를 출발점으로 기독교의 여러 종말론을 비판합니다. 영혼의 해방을 내세우는 ‘천국론’이든 우주의 재부팅을 기대하는 ‘새 하늘과 새 땅’이든, 그 밑바탕의 논리는 매트릭스의 ‘파란 약’과 같아서 사회적 고통 앞에서 방관자 효과를 조용히 길러 낸다고 지적합니다. 구원이 저편 세계나 종말의 거룩한 폭력에 맡겨질 때, 현실에서 저항하려는 인간의 의지는 거세됩니다.",
    zh_CN: "本文以科幻经典《黑客帝国》为切入点，以此批判基督宗教的各种末世论。文章指出，无论是诉诸灵魂解脱的「天堂论」，还是期盼宇宙重启的「新天新地论」，其底层逻辑皆如同母体系统的「蓝色药丸」，潜移默化地催生了面对社会苦难的「旁观者效应」。当救赎被寄托于彼岸或末日的神圣暴力时，人类在现实中的反抗意志便遭到阉割。",
    zh_HK: "本文以科幻經典《廿二世紀殺人網絡》為切入點，以此批判基督宗教的各種末世論。文章指出，無論是訴諸靈魂解脫的「天堂論」，還是期盼宇宙重啟的「新天新地論」，其底層邏輯皆如同母體系統的「藍色藥丸」，潛移默化地催生了面對社會苦難的「旁觀者效應」。當救贖被寄託於彼岸或末日的神聖暴力時，人類在現實中的反抗意志便遭到閹割。",
  },
};

function loadEnv() {
  const values = {};
  for (const line of fs.readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

function validatePayload() {
  for (const locale of LOCALES) {
    if (!ISSUE_INTRO_HOME[locale]?.trim()) throw new Error(`Missing issue ${locale}.intro_home`);
    if (!ISSUE_INTRO_CFP[locale]?.trim()) throw new Error(`Missing issue ${locale}.intro_cfp`);
  }
  if (Object.keys(SOURCE_SUMMARIES).length !== Object.keys(ARTICLE_SUMMARIES).length) {
    throw new Error("Source and translation article counts differ");
  }
  for (const [id, translations] of Object.entries(ARTICLE_SUMMARIES)) {
    if (!SOURCE_SUMMARIES[id]) throw new Error(`Missing source summary for ${id}`);
    for (const locale of LOCALES) {
      if (!translations[locale]?.trim()) throw new Error(`Missing ${id} ${locale} summary`);
    }
  }
}

const env = loadEnv();
const requiredEnv = ["VITE_SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
for (const key of requiredEnv) {
  if (!env[key]) throw new Error(`Missing ${key} in .env`);
}

validatePayload();
const shouldApply = process.argv.includes("--apply");
const restBase = `${env.VITE_SUPABASE_URL}/rest/v1`;
const restHeaders = {
  apikey: env.SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function rest(pathname, options = {}) {
  const response = await fetch(`${restBase}${pathname}`, {
    ...options,
    headers: { ...restHeaders, ...(options.headers || {}) },
  });
  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

const issueRows = await rest(
  `/issues?id=eq.${ISSUE_ID}&select=intro_home,intro_cfp,cfp_title,cfp_theme,translations`,
);
if (issueRows.length !== 1) throw new Error(`Issue ${ISSUE_ID} not found`);
const issue = issueRows[0];
try {
  if (issue.intro_home !== ISSUE_SOURCE_INTRO_HOME) {
    throw new Error("Issue 9 intro_home changed after this refresh was prepared; aborting");
  }
  if (issue.intro_cfp !== ISSUE_SOURCE_INTRO_CFP && issue.intro_cfp !== ISSUE_INTRO_CFP_ZH_TW) {
    throw new Error("Issue 9 intro_cfp changed after this refresh was prepared; aborting");
  }

  const previewFields = ["cfp_title", "cfp_theme"];
  for (const locale of LOCALES) {
    for (const field of previewFields) {
      if (!issue.translations?.[locale]?.[field]?.trim()) {
        throw new Error(`Existing next-issue translation is missing: ${locale}.${field}`);
      }
    }
  }

  const ids = Object.keys(SOURCE_SUMMARIES);
  const articleRows = (await rest(
    `/articles?issue=eq.${ISSUE_ID}&select=id,summary,translations&order=id.asc`,
  )).filter((row) => ids.includes(row.id));
  if (articleRows.length !== ids.length) {
    throw new Error(`Expected ${ids.length} articles, found ${articleRows.length}`);
  }
  for (const row of articleRows) {
    if (row.summary !== SOURCE_SUMMARIES[row.id]) {
      throw new Error(`${row.id} summary changed after this refresh was prepared; aborting`);
    }
  }

  if (!shouldApply) {
    console.log(`Dry run passed: issue ${ISSUE_ID}, ${ids.length} article summaries, ${LOCALES.length} locales.`);
    console.log("Run again with --apply to write the validated translations.");
    process.exitCode = 0;
  } else {
    const nextIssueTranslations = structuredClone(issue.translations || {});
    for (const locale of LOCALES) {
      nextIssueTranslations[locale] = {
        ...(nextIssueTranslations[locale] || {}),
        intro_home: ISSUE_INTRO_HOME[locale],
        intro_cfp: ISSUE_INTRO_CFP[locale],
      };
    }
    await rest(`/issues?id=eq.${ISSUE_ID}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        intro_cfp: ISSUE_INTRO_CFP_ZH_TW,
        translations: nextIssueTranslations,
      }),
    });

    for (const row of articleRows) {
      const nextTranslations = structuredClone(row.translations || {});
      for (const locale of LOCALES) {
        nextTranslations[locale] = {
          ...(nextTranslations[locale] || {}),
          summary: ARTICLE_SUMMARIES[row.id][locale],
        };
      }
      await rest(`/articles?id=eq.${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ translations: nextTranslations }),
      });
    }

    const [verifiedIssue] = await rest(
      `/issues?id=eq.${ISSUE_ID}&select=intro_cfp,translations`,
    );
    const verifyArticles = (await rest(
      `/articles?issue=eq.${ISSUE_ID}&select=id,translations`,
    )).filter((row) => ids.includes(row.id));
    if (verifiedIssue.intro_cfp !== ISSUE_INTRO_CFP_ZH_TW) {
      throw new Error("Verification failed for issue intro_cfp");
    }
    for (const locale of LOCALES) {
      if (verifiedIssue.translations?.[locale]?.intro_home !== ISSUE_INTRO_HOME[locale]) {
        throw new Error(`Verification failed for issue ${locale}.intro_home`);
      }
      if (verifiedIssue.translations?.[locale]?.intro_cfp !== ISSUE_INTRO_CFP[locale]) {
        throw new Error(`Verification failed for issue ${locale}.intro_cfp`);
      }
    }
    for (const row of verifyArticles) {
      for (const locale of LOCALES) {
        if (row.translations?.[locale]?.summary !== ARTICLE_SUMMARIES[row.id][locale]) {
          throw new Error(`Verification failed for ${row.id} ${locale}.summary`);
        }
      }
    }
    console.log(`Applied and verified: issue ${ISSUE_ID}, ${ids.length} article summaries, ${LOCALES.length} locales.`);
    console.log("Next-issue intro_cfp was refreshed; cfp_title and cfp_theme were audited as complete in all five locales.");
  }
} catch (error) {
  throw error;
}
