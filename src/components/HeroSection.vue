<script setup lang="ts">
const emit = defineEmits<{ browse: [] }>()
</script>

<template>
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">TODAY'S PICK</p>
      <h1>把忙碌暂停，<em>喝一杯再走。</em></h1>
      <p>甄选咖啡豆、新鲜烘焙与轻盈的午后滋味。</p>
      <button class="btn btn-cream" @click="$emit('browse')">
        开始点单 <span>→</span>
      </button>
    </div>
    <div class="hero-card">
      <span class="hero-tag">夏日限定</span>
      <div class="hero-image">☕</div>
      <div>
        <p>冷萃云朵拿铁</p>
        <small>醇厚、清甜、刚刚好</small>
      </div>
      <b>¥ 28</b>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.hero {
  width: min(1240px, calc(100% - 40px));
  margin: 12px auto 20px;
  min-height: 290px;
  border-radius: 24px;
  background: var(--pine);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 44px 60px;
  overflow: hidden;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    width: 450px;
    height: 450px;
    right: 14%;
    top: -300px;
    border: 1px solid #ffffff25;
    border-radius: 50%;
    box-shadow: 0 0 0 42px #ffffff0b, 0 0 0 84px #ffffff09;
  }
}

.hero-copy {
  position: relative;
  z-index: 1;

  > p:not(.eyebrow) {
    color: #c1cbc5;
    margin: 10px 0 20px;
  }
}

.eyebrow {
  font-size: 11px;
  letter-spacing: .16em;
  font-weight: 700;
  color: var(--orange);
  margin: 0;
}

h1 {
  font-family: "DM Serif Display", "Noto Sans SC", serif;
  font-size: 38px;
  line-height: 1.14;
  margin: 9px 0;

  em {
    color: #f3ba6f;
    font-style: normal;
  }
}

.hero-card {
  z-index: 1;
  background: #fbf7f0;
  color: var(--ink);
  border-radius: 18px;
  padding: 15px;
  width: 240px;
  display: grid;
  grid-template-columns: 68px 1fr;
  gap: 10px;
  align-items: center;
  position: relative;
  box-shadow: 0 15px 30px #07130d55;
}

.hero-tag {
  position: absolute;
  right: 10px;
  top: 10px;
  font-size: 10px;
  background: var(--soft-orange);
  color: #b64d22;
  border-radius: 20px;
  padding: 3px 7px;
}

.hero-image {
  width: 68px;
  height: 72px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e3c9a8, #967250);
  display: grid;
  place-items: center;
  font-size: 37px;
}

.hero-card p {
  font-weight: bold;
  margin: 0;
}

.hero-card small {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.3;
}

.hero-card b {
  grid-column: 2;
  color: var(--orange);
  font-size: 17px;
}
</style>

<style lang="scss">
.btn {
  border: 0;
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 700;
  transition: .18s transform, .18s background, .18s opacity;
  cursor: pointer;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: .42;
    cursor: not-allowed;
    transform: none;
  }
}

.btn-cream {
  background: #f5e8d1;
  color: var(--pine);
  padding: 11px 18px;

  span {
    margin-left: 12px;
    font-size: 18px;
  }
}
</style>
