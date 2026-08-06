<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { orderApi, favoriteApi, membershipApi } from '@/api'
import { STATUS_LABELS, CATEGORY_META, sizeText } from '@/api/types'
import type { Product, RedeemItem, Voucher } from '@/api/types'

const store = useAppStore()

const emit = defineEmits<{
  'back': []
}>()

const activeTab = ref<'orders' | 'favorites' | 'points'>('orders')

onMounted(async () => {
  if (store.isLoggedIn && store.currentUser?.id) {
    await loadOrders()
    await loadFavorites()
    await loadMemberDashboard()
    await loadMembership()
  }
})

// --- Membership（会员卡积分 / 卡券包 / 兑换） ---
/** 积分以会员卡账本为准（兑换扣减即时同步），未开卡自动开卡 */
const cardPoints = ref(0)
const vouchers = ref<Voucher[]>([])
/** 兑换项由后端 /membership/redeem-items 下发（免硬编码，改规则不用动前端） */
const redeemItems = ref<RedeemItem[]>([])

async function loadMembership() {
  if (!store.currentUser?.id) return
  try {
    let card = await membershipApi.getCard(store.currentUser.id)
    if (!card) card = await membershipApi.initCard(store.currentUser.id)
    cardPoints.value = card?.points ?? 0
    await Promise.all([loadVouchers(), loadRedeemItems()])
  } catch (e) {
    console.warn('membership', e)
  }
}

async function loadVouchers() {
  if (!store.currentUser?.id) return
  try {
    vouchers.value = (await membershipApi.getVouchers(store.currentUser.id)) || []
  } catch (e) {
    console.warn('vouchers', e)
  }
}

async function loadRedeemItems() {
  try {
    redeemItems.value = (await membershipApi.getRedeemItems()) || []
  } catch (e) {
    console.warn('redeem-items', e)
  }
}

function canRedeem(item: RedeemItem) {
  return cardPoints.value >= item.costPoints
}

async function redeem(item: RedeemItem) {
  if (!store.currentUser?.id) return
  if (!confirm(`确认用 ${item.costPoints} 积分兑换「${item.name}」吗？兑换后直接发放到卡券包`)) return
  try {
    const result = await membershipApi.redeemPoints(store.currentUser.id, item.code)
    ElMessage.success(result.message)
    await loadMembership()
    await loadMemberDashboard()
  } catch (e: any) {
    ElMessage.error(`兑换失败：${e.message}`)
  }
}

// --- Orders ---
const orders = ref<any[]>([])
const orderFilter = ref('all')

async function loadOrders() {
  if (!store.currentUser?.id) return
  try {
    const data = await orderApi.getUserOrders(store.currentUser.id)
    orders.value = data || []
  } catch (e) {
    console.warn(e)
  }
}

const filteredOrders = computed(() => {
  if (orderFilter.value === 'all') return orders.value
  return orders.value.filter(o => o.status === orderFilter.value)
})

async function cancelOrder(id: number) {
  if (!confirm('确定取消这笔订单吗？')) return
  try {
    await orderApi.cancelUserOrder(id, 'cancel')
    ElMessage.success('订单已取消')
    await loadOrders()
    // 取消后同步刷新：累计消费/等级（已完成订单取消会扣回）+ 积分账本
    await loadMemberDashboard()
    await loadMembership()
  } catch (e: any) {
    ElMessage.error(`取消失败：${e.message}`)
  }
}

// --- Favorites ---
const favorites = ref<Product[]>([])

async function loadFavorites() {
  if (!store.currentUser?.id) return
  try {
    const data = await favoriteApi.getFavorites({ userId: store.currentUser.id })
    favorites.value = data || []
  } catch (e) {
    console.warn(e)
  }
}

async function removeFavorite(product: Product) {
  if (!store.currentUser?.id) return
  try {
    await favoriteApi.removeFavorite({ userId: store.currentUser.id, productCode: product.code })
    favorites.value = favorites.value.filter(p => p.code !== product.code)
    ElMessage.success('已取消收藏')
  } catch (e) {
    console.warn(e)
  }
}

function goToProduct(product: Product) {
  emit('back')
}

// --- Member ---
async function loadMemberDashboard() {
  if (!store.isLoggedIn || !store.currentUser?.id) return
  try {
    const { memberApi } = await import('@/api')
    const data = await memberApi.getDashboard(store.currentUser.id)
    store.updateMemberDashboard(data)
  } catch (e) {
    console.warn('member', e)
  }
}

function fmtMoney(v: number) {
  return `¥${Number(v || 0).toFixed(2)}`
}

function formatTime(value: string | number[]) {
  if (Array.isArray(value)) {
    return `${value[0]}-${String(value[1]).padStart(2, '0')}-${String(value[2]).padStart(2, '0')} ${String(value[3] || 0).padStart(2, '0')}:${String(value[4] || 0).padStart(2, '0')}`
  }
  return String(value || '').replace('T', ' ').slice(0, 16)
}

const m = computed(() => store.memberDashboard)

/** 总共已省金额：优先用后端 dashboard 的 totalSaved，接口未返回时从订单列表兜底计算（已完成订单 原价-实付 之和） */
const totalSaved = computed(() => {
  const fromApi = store.memberDashboard?.totalSaved
  if (fromApi != null && fromApi > 0) return fromApi
  return Math.round(orders.value
    .filter(o => o.status === 'COMPLETED')
    .reduce((s, o) => s + Math.max(0, (o.originalPrice || 0) - (o.finalPrice || 0)), 0) * 100) / 100
})

const nextLevelLabel = computed(() => {
  if (!m.value) return ''
  if (m.value.nextThreshold === 500) return 'SVIP 9折'
  return 'VIP 95折'
})

function handleLogout() {
  store.logout()
  emit('back')
}
</script>

<template>
  <div class="member-page">
    <!-- Header -->
    <div class="member-header">
      <div class="member-header-inner">
        <button class="back-btn" @click="$emit('back')">
          <span>←</span> 返回
        </button>
        <div class="member-profile">
          <div class="avatar-circle">
            {{ (store.currentUser?.nickname || store.currentUser?.username || 'U').slice(0, 1) }}
          </div>
          <div class="member-info">
            <h2>{{ store.currentUser?.nickname || store.currentUser?.username }}</h2>
            <p>{{ store.currentUser?.memberLevel || '普通会员' }}</p>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </div>

    <!-- Hero stats -->
    <div class="member-hero" v-if="m">
      <div class="hero-inner">
        <div class="stat-card">
          <b>{{ cardPoints }}</b>
          <small>可用积分</small>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card">
          <b>{{ fmtMoney(m.totalSpent) }}</b>
          <small>累计消费</small>
          <small class="saved-hint">已省 {{ fmtMoney(totalSaved) }}</small>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card">
          <b>{{ m.memberLevel }}</b>
          <small>当前等级</small>
        </div>
      </div>
    </div>

    <!-- Points progress -->
    <div class="points-section" v-if="m">
      <div class="points-inner">
        <div class="points-header">
          <span class="points-label">会员成长</span>
          <span class="points-pct">{{ m.progress }}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: Math.min(100, m.progress) + '%' }"></div>
        </div>
        <p class="points-hint" v-if="m.amountToNext > 0">
          再消费 {{ fmtMoney(m.amountToNext) }}，解锁 {{ nextLevelLabel }}
        </p>
        <p class="points-hint" v-else>已解锁最高会员折扣，感谢你的长期陪伴 ✦</p>
      </div>
    </div>

    <!-- Tab nav -->
    <div class="tab-nav">
      <div class="tab-nav-inner">
        <button :class="{ active: activeTab === 'orders' }" @click="activeTab = 'orders'">
          我的订单
        </button>
        <button :class="{ active: activeTab === 'favorites' }" @click="activeTab = 'favorites'">
          我的收藏
        </button>
        <button :class="{ active: activeTab === 'points' }" @click="activeTab = 'points'">
          积分权益
        </button>
      </div>
    </div>

    <!-- Tab: Orders -->
    <div v-if="activeTab === 'orders'" class="tab-content">
      <div class="orders-inner">
        <div class="filter-row">
          <el-tag
            v-for="f in ['all', 'PENDING', 'PREPARING', 'COMPLETED', 'CANCELED']"
            :key="f"
            :type="orderFilter === f ? 'dark' : 'info'"
            class="filter-chip"
            @click="orderFilter = f"
          >
            {{ f === 'all' ? '全部' : STATUS_LABELS[f] }}
          </el-tag>
        </div>

        <div v-if="filteredOrders.length" class="order-grid">
          <div v-for="o in filteredOrders" :key="o.id" class="order-card" :class="{ canceled: o.status === 'CANCELED' }">
            <div class="order-card-top">
              <span>#{{ o.id }}</span>
              <el-tag size="small" :type="o.status === 'COMPLETED' ? 'success' : o.status === 'CANCELED' ? 'danger' : o.status === 'PREPARING' ? '' : 'warning'">
                {{ STATUS_LABELS[o.status] || o.status }}
              </el-tag>
            </div>
            <p class="order-name">{{ o.beverageName }}</p>
            <p class="order-meta">
              {{ sizeText(o) }} · {{ o.condiments || '' }}
              · {{ formatTime(o.createdAt) }}
            </p>
            <div class="order-card-bottom">
              <div class="order-price">
                <span class="price-line">原价 <s class="price-original">{{ fmtMoney(o.originalPrice) }}</s></span>
                <span class="price-line pay">实付 <b>{{ fmtMoney(o.finalPrice) }}</b></span>
                <span v-if="o.finalPrice < o.originalPrice" class="price-line saved">
                  已省 <b>{{ fmtMoney(Math.round((o.originalPrice - o.finalPrice) * 100) / 100) }}</b>
                </span>
                <span v-else class="price-line saved none">已省 ¥0.00</span>
              </div>
              <el-button
                v-if="o.status === 'PENDING' || o.status === 'COMPLETED'"
                text
                type="danger"
                size="small"
                @click="cancelOrder(o.id)"
              >取消订单</el-button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          这里还没有订单，去 <em @click="$emit('back')">点单</em> 吧。
        </div>
      </div>
    </div>

    <!-- Tab: Favorites -->
    <div v-if="activeTab === 'favorites'" class="tab-content">
      <div class="favorites-inner">
        <div v-if="favorites.length" class="fav-grid">
          <div v-for="p in favorites" :key="p.code" class="fav-card" @click="goToProduct(p)">
            <div class="fav-img">
              <img v-if="p.imageUrl" :src="p.imageUrl" :alt="p.name" />
              <div v-else class="fav-img-placeholder">
                {{ CATEGORY_META[p.categoryCode]?.[1] || '☕' }}
              </div>
            </div>
            <div class="fav-body">
              <b>{{ p.name }}</b>
              <small>{{ CATEGORY_META[p.categoryCode]?.[0] || p.categoryCode }}</small>
              <span class="fav-price">{{ fmtMoney(p.basePrice) }}</span>
            </div>
            <button class="fav-remove" @click.stop="removeFavorite(p)">♥</button>
          </div>
        </div>
        <div v-else class="empty-state">
          还没有收藏任何商品，<em @click="$emit('back')">去逛逛</em>。
        </div>
      </div>
    </div>

    <!-- Tab: Points & Coupons -->
    <div v-if="activeTab === 'points'" class="tab-content">
      <div class="points-inner">
        <h3 class="section-title">积分兑换</h3>
        <div class="redeem-grid">
          <div v-for="r in redeemItems" :key="r.code" class="redeem-card" :class="{ disabled: !canRedeem(r) }">
            <div class="redeem-info">
              <b>{{ r.name }}</b>
              <small>{{ r.costPoints }} 积分 · 无门槛 · 兑换后直接发放到卡券包</small>
            </div>
            <el-button
              size="small"
              :type="canRedeem(r) ? 'primary' : 'info'"
              :disabled="!canRedeem(r)"
              @click="redeem(r)"
            >{{ canRedeem(r) ? '兑换' : '积分不足' }}</el-button>
          </div>
        </div>

        <h3 class="section-title">我的卡券包</h3>
        <div v-if="vouchers.length" class="voucher-list">
          <div v-for="v in vouchers" :key="v.id" class="voucher-card">
            <div class="voucher-left">
              <b>¥{{ v.discount }}</b>
              <small>{{ v.minimum > 0 ? '满' + v.minimum + '可用' : '无门槛' }}</small>
            </div>
            <div class="voucher-body">
              <b>{{ v.name }}</b>
              <small>{{ v.voucherNo }} · {{ formatTime(v.createdAt) }} 发放</small>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">卡券包还是空的，用积分兑换吧。</div>

        <h3 class="section-title">会员权益券</h3>
        <div v-if="m?.coupons?.length" class="coupon-list">
          <div v-for="c in m.coupons" :key="c.code" class="coupon-card">
            <div class="coupon-left">
              <b>{{ c.name }}</b>
              <small>{{ c.description }}</small>
            </div>
            <div class="coupon-right">
              <span v-if="c.discount > 0">-¥{{ c.discount }}</span>
              <small>满¥{{ c.minimum }}可用</small>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">暂无可用优惠券</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.member-page {
  min-height: 100vh;
  background: var(--paper);
}

// Header
.member-header {
  background: var(--pine);
  color: var(--paper);
  padding: 20px 0;
}

.member-header-inner {
  width: min(1240px, calc(100% - 40px));
  margin: auto;
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-btn {
  background: none;
  border: none;
  color: rgba(255,255,255,0.7);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  span { font-size: 18px; }
  &:hover { color: white; }
}

.member-profile {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar-circle {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: bold;
}

.member-info {
  h2 { margin: 0; font-size: 20px; font-weight: normal; }
  p { margin: 3px 0 0; font-size: 12px; color: rgba(255,255,255,0.6); }
}

.logout-btn {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.8);
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.2); color: white; }
}

// Hero stats
.member-hero {
  background: linear-gradient(160deg, #2c4a3a 0%, #3d6452 100%);
  padding: 24px 0 20px;
}

.hero-inner {
  width: min(1240px, calc(100% - 40px));
  margin: auto;
  display: flex;
  align-items: center;
  gap: 0;
}

.stat-card {
  flex: 1;
  text-align: center;
  b { display: block; color: white; font-size: 28px; }
  small { color: rgba(255,255,255,0.6); font-size: 11px; }
  .saved-hint {
    display: block;
    margin-top: 3px;
    color: #ffd9a8;
    font-size: 10px;
  }
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: rgba(255,255,255,0.15);
}

// Points
.points-section {
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}

.points-inner {
  width: min(1240px, calc(100% - 40px));
  margin: auto;
  padding: 18px 0;
}

.points-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 8px;
}

.points-label { color: var(--ink); font-weight: bold; }
.points-pct { color: var(--orange); }

.progress-track {
  height: 8px;
  background: #ebe5da;
  border-radius: 9px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 9px;
  background: linear-gradient(90deg, #e06d35, #f0a060);
  transition: width 0.4s;
}

.points-hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--muted);
}

// Tab nav
.tab-nav {
  background: var(--paper);
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-nav-inner {
  width: min(1240px, calc(100% - 40px));
  margin: auto;
  display: flex;
}

.tab-nav-inner button {
  flex: 1;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 14px 0;
  font-size: 14px;
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  &.active {
    color: var(--ink);
    border-color: var(--orange);
    font-weight: bold;
  }
  &:hover { color: var(--ink); }
}

// Tab content
.tab-content {
  padding: 28px 0 70px;
}

.orders-inner, .favorites-inner, .points-inner {
  width: min(1240px, calc(100% - 40px));
  margin: auto;
}

.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.filter-chip {
  cursor: pointer;
  border-radius: 99px;
  padding: 5px 12px;
  font-size: 11px;
  &.el-tag--dark { background: var(--pine); border-color: var(--pine); color: #fff; }
  &.el-tag--info { background: var(--paper); border-color: var(--line); color: var(--muted); }
}

.order-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (max-width: 900px) {
  .order-grid { grid-template-columns: 1fr; }
}

.order-card {
  background: white;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px;

  /* 已取消订单：整体置灰（同店铺打烊样式） */
  &.canceled {
    opacity: 0.45;
    background: #f4f4f2;
  }
}

.order-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}

.order-name {
  font-weight: normal;
  margin: 12px 0 5px;
  font-size: 14px;
}

.order-meta {
  font-size: 11px;
  color: var(--muted);
  margin: 0 0 12px;
  line-height: 1.5;
}

.order-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.order-price {
  display: flex;
  flex-direction: column;
  gap: 3px;

  .price-line {
    font-size: 11px;
    color: var(--muted);

    b { font-size: 12px; color: var(--muted); font-weight: 600; }
  }

  .price-original {
    color: var(--muted);
    text-decoration: line-through;
    font-size: 11px;
  }

  .pay b {
    color: var(--orange);
    font-size: 15px;
  }

  .saved b {
    color: #2e9e5b;
  }

  .saved.none {
    opacity: 0.55;
  }
}

// Favorites
.fav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

@media (max-width: 900px) {
  .fav-grid { grid-template-columns: repeat(2, 1fr); }
}

.fav-card {
  background: white;
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
}

.fav-img {
  height: 120px;
  background: #f7f3ee;
  display: flex;
  align-items: center;
  justify-content: center;
  img { width: 100%; height: 100%; object-fit: contain; padding: 8px; box-sizing: border-box; }
}

.fav-img-placeholder {
  font-size: 40px;
  opacity: 0.5;
}

.fav-body {
  padding: 10px 12px 12px;
  b { display: block; font-size: 13px; margin-bottom: 2px; }
  small { display: block; font-size: 10px; color: var(--muted); margin-bottom: 6px; }
}

.fav-price {
  color: var(--orange);
  font-size: 13px;
  font-weight: bold;
}

.fav-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255,255,255,0.9);
  border: 1px solid var(--line);
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--orange);
  font-size: 14px;
  &:hover { background: var(--orange); color: white; }
}

// Redeem（积分兑换）
.redeem-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 8px;
}

@media (max-width: 900px) {
  .redeem-grid { grid-template-columns: 1fr; }
}

.redeem-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;

  &.disabled {
    opacity: 0.55;
    background: #f4f4f2;
  }
}

.redeem-info {
  b { display: block; font-size: 14px; margin-bottom: 3px; }
  small { font-size: 11px; color: var(--muted); }
}

// Voucher（卡券包）
.voucher-list {
  display: grid;
  gap: 8px;
}

.voucher-card {
  display: flex;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}

.voucher-left {
  width: 92px;
  background: var(--pine);
  color: white;
  text-align: center;
  padding: 12px 0;
  flex-shrink: 0;

  b { display: block; font-size: 19px; }
  small { font-size: 10px; opacity: 0.8; }
}

.voucher-body {
  flex: 1;
  padding: 10px 14px;

  b { display: block; font-size: 13px; margin-bottom: 2px; }
  small { font-size: 10px; color: var(--muted); }
}

// Coupons
.section-title {
  font-size: 18px;
  font-weight: normal;
  margin: 0 0 14px;

  &:not(:first-child) {
    margin-top: 30px;
  }
}

.coupon-list {
  display: grid;
  gap: 10px;
}

.coupon-card {
  display: flex;
  border: 1px solid #ead8bc;
  background: #fffaf0;
  border-radius: 12px;
  overflow: hidden;
}

.coupon-left {
  flex: 1;
  padding: 14px 16px;
  b { display: block; font-size: 14px; margin-bottom: 3px; }
  small { font-size: 11px; color: var(--muted); }
}

.coupon-right {
  width: 90px;
  background: linear-gradient(135deg, #e06d35, #f0a060);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  span { font-size: 20px; font-weight: bold; }
  small { font-size: 10px; opacity: 0.8; margin-top: 2px; }
}

// Empty
.empty-state {
  color: var(--muted);
  text-align: center;
  padding: 50px 20px;
  font-size: 14px;
  em { color: var(--orange); font-style: normal; cursor: pointer; text-decoration: underline; }
}
</style>
