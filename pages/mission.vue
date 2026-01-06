<script setup>
import MainLayout from "~/components/MainLayout.vue";

useHead({
  title: "使命宣言 - 無境界者雜誌",
});
</script>

<template>
  <MainLayout>
    <div class="mission-page">
      <h1 class="page-main-title">
        <span class="emoji">📜</span>使命宣言<span class="emoji">📜</span>
      </h1>

      <div class="main-divider"></div>

      <div class="intro-text">
        <p>
          　　本刊物創辦之目的，是希望藉著參考生長在東亞的無教會主義神學，對當代台灣的教會現象與信仰生活進行反思與對話，為信仰者／非信仰者的神學思考提供一個不以教會為本位、自由發聲的平台。因此，本刊物按照無教會主義的精神與幾位共同發起人各自的信仰特徵，建構出以下七大核心關懷：
        </p>
      </div>

      <div class="mission-content">
        <h3>I 歷史｜Faith Rooted in History</h3>
        <p class="special-text">
          　　我們認為，信仰與神學論述並非憑空而生，而是植根於歷史之中。我們尊重教會的傳統，也承認信仰的發展與時代變遷息息相關。我們不僅關注基督信仰的正統歷史，也重視異端與邊緣神學的聲音，因為所有信仰實踐皆源自歷史的累積與回應。
        </p>

        <h3>II 自主｜The Call to Spiritual Autonomy</h3>
        <p class="special-text">
          　　我們認為，每位信仰者皆應承擔神學思考的責任，信仰乃是個人自主的回應，而非受制於權威的傳授。我們拒絕盲從於宗教體制，強調每個人都應在信仰中尋求真理，勇於面對屬靈的掙扎，並為自己的生命負責。
        </p>

        <h3>III 知識｜The Pursuit of Wisdom and Understanding</h3>
        <p class="special-text">
          　　我們認為，知識是通往真理的門徑，信仰與理性並非對立，而是相輔相成。我們提倡，信仰者應對這世界的各類知識抱持好奇心，因為唯有透過知識的拓展，我們才能更接近真理，並且以智慧回應世界。
        </p>

        <h3>IV 實況｜Faith in Context</h3>
        <p class="special-text">
          　　我們認為，信仰必須扎根於時代與土地的實況，神學不能脫離現實經驗。我們承認，每個時代、文化、民族與個體皆需在其獨特語境中建構信仰，使基督信仰成為「此時、此地、此人」的活潑見證。
        </p>

        <h3>V 多元｜Embracing Diversity in Faith</h3>
        <p class="special-text">
          　　我們認為，上帝的創造廣大而多元，信仰亦應反映此豐富性。我們尊重不同族群、文化、性別與宗教的多樣性，拒絕單一化與排他性的神學。我們相信，唯有在對話與交流中，信仰才能展現其真正的豐富與深度。
        </p>

        <h3>VI 公眾｜Faith as a Public Responsibility</h3>
        <p class="special-text">
          　　我們認為，信仰不僅是個人的靈性追求，更是一種社會實踐。我們關心政治、社會與生態，並視信仰為參與公共事務的力量。我們拒絕將信仰商品化，也反對將靈性侷限於個人化的慰藉，而忽視對世界的責任。
        </p>

        <h3>VII 對話｜Theology as a Dialogue</h3>
        <p class="special-text">
          　　我們認為，神學是一場與上帝和世界持續的對話，而非僵化的教條。我們鼓勵多元的聲音與開放的討論，與歷史、文化、世界和不同信仰觀點交流，在對話中深化對上帝與生命的理解。
        </p>
      </div>

      <br />
      <p class="signature">
        執筆者　張辰瑋 <span class="date">2025.02.09</span>
      </p>
    </div>
  </MainLayout>
</template>

<style scoped>
/* shared.css 已經在 nuxt.config 全域引入，這裡可以直接使用 */

p {
  line-height: 1.8;
  margin: 0.5rem;
  text-align: justify;
  font-family: serif;
  color: #444;
  font-size: 1.2rem;
}

h3 {
  margin: 2em 0 1em;
  text-indent: 1em;
  font-family: "Times New Roman", serif;
  font-weight: bold;
  color: #333;
  font-size: 1.5rem;
}

.special-text {
  font-family: "DFKai-SB", "標楷體", serif;
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
