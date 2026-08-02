<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { CONDIMENTS } from '@/api/types'

const store = useAppStore()

const m = computed(() => store.memberDashboard)

function fmtMoney(v: number) {
  return `¥${Number(v || 0).toFixed(2)}`
}

const emit = defineEmits<{
  close: []
  'select-coupon': [coupon: any]
}>()
</script>

<template>
  <el-dialog
    :model-value="!!m"
    title="会员中心"
    width="620px"
    @update:model-value="$emit('close')"
  >
    <div v-if="m" class="member-content">
      <section class="member-hero">
        <p class="eyebrow">FIKA MEMBERSHIP</p>
        <h2>{{ m.memberLevel }}</h2>
        <p>{{ m.nickname }}，每一次好好喝咖啡都值得被记录。</p>
        <div class="point-balance">
          <div><b>{{ m.points }}</b><small>可用积分</small></div>
          <div><b>{{ fmtMoney(m.totalSpent) }}</b><small>累计消费</small></div>
          <div><b>{{ m.pointsLevel }}</b><small>积分等级</small></div>
        </div>
      </section>

      <section class="member-progress">
        <div class="member-progress-top">
          <b>会员成长</b>
          <span>{{ m.progress }}%</span>
        </div>
        <div class="progress-track">
          <span :style="{ width: Math.min(100, m.progress) + '%' }"></span>
        </div>
        <p v-if="m.amountToNext > 0">
          再消费 {{ fmtMoney(m.amountToNext) }}，解锁 {{ m.nextThreshold === 300 ? 'VIP 85 折' : 'SVIP 7 折' }}。
        </p>
        <p v-else>已解锁最高会员折扣，感谢你的长期陪伴。</p>
      </section>

      <h3 class="coupon-title">会员权益券</h3>
      <div class="member-coupons">
        <div
          v-for="c in m.coupons"
          :key="c.code"
          class="member-coupon"
          @click="$emit('select-coupon', c)"
        >
          <div>
            <b>{{ c.name }}</b>
            <small>{{ c.description }}</small>
          </div>
          <span>立即使用 →</span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.member-content { padding: 0; }

.member-hero {
  background: linear-gradient(130deg, #203a2e, #44614f);
  color: #fff;
  border-radius: 16px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  &::after {
    content: "✦";
    font-size: 120px;
    position: absolute;
    right: 10px;
    top: -24px;
    color: rgba(255,255,255,0.08);
  }
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 0.16em;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--orange);
}

h2 {
  font-size: 30px;
  margin: 6px 0;
}

p {
  color: #d5e0d8;
  margin: 0;
  font-size: 13px;
}

.point-balance {
  display: flex;
  gap: 28px;
  margin-top: 20px;
  b { display: block; font-size: 23px; }
  small { color: #d5e0d8; font-size: 10px; }
}

.member-progress {
  margin: 24px 0;
}

.member-progress-top {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.progress-track {
  height: 8px;
  border-radius: 9px;
  background: #ebe5da;
  margin: 8px 0;
  overflow: hidden;
  span {
    height: 100%;
    display: block;
    border-radius: 9px;
    background: var(--orange);
    transition: width 0.3s;
  }
}

p { font-size: 11px; color: var(--muted); margin: 0; }

.coupon-title {
  font-size: 20px;
  margin: 20px 0 10px;
  font-weight: normal;
}

.member-coupons {
  display: grid;
  gap: 9px;
  margin-bottom: 16px;
}

.member-coupon {
  border: 1px solid #ead8bc;
  background: #fffaf0;
  border-radius: 11px;
  padding: 11px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  b { display: block; font-size: 13px; }
  small { display: block; font-size: 11px; color: var(--muted); margin-top: 2px; }
  span { color: var(--orange); font-size: 12px; font-weight: bold; align-self: center; }
  &:hover { background: #fff3dc; }
}
</style>
