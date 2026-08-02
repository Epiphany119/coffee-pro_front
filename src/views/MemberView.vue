<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { orderApi, favoriteApi } from '@/api'
import { STATUS_LABELS, SIZE_LABELS, CATEGORY_META } from '@/api/types'
import type { Product } from '@/api/types'

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
  }
})

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
  } catch (e: any) {
    ElMessage.error(`取消失败：${e.message}`)
  }
}

// --- Favorites ---
const favorites = ref<Product[]>([])

async function loadFavorites() {
  if (!store.currentUser?.id) return
  try {
    const data = await favoriteApi.getFavorites(store.currentUser.id)
    favorites.value = data || []
  } catch (e) {
    console.warn(e)
  }
}

async function removeFavorite(product: Product) {
  if (!store.currentUser?.id) return
  try {
    await favoriteApi.removeFavorite(store.currentUser.id, product.code)
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

const nextLevelLabel = computed(() => {
  if (!m.value) return ''
  if (m.value.nextThreshold === 300) return 'VIP 85折'
  return 'SVIP 7折'
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
          <b>{{ m.points }}</b>
          <small>可用积分</small>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-card">
          <b>{{ fmtMoney(m.totalSpent) }}</b>
          <small>累计消费</small>
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
          <div v-for="o in filteredOrders" :key="o.id" class="order-card">
            <div class="order-card-top">
              <span>#{{ o.id }}</span>
              <el-tag size="small" :type="o.status === 'COMPLETED' ? 'success' : o.status === 'CANCELED' ? 'danger' : o.status === 'PREPARING' ? '' : 'warning'">
                {{ STATUS_LABELS[o.status] || o.status }}
              </el-tag>
            </div>
            <p class="order-name">{{ o.beverageName }}</p>
            <p class="order-meta">
              {{ SIZE_LABELS[o.size] || o.size }} · {{ o.condiments || '' }}
              · {{ formatTime(o.createdAt) }}
            </p>
            <div class="order-card-bottom">
              <b>{{ fmtMoney(o.finalPrice) }}</b>
              <el-button
                v-if="o.status === 'PENDING'"
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
        <h3 class="section-title">我的优惠券</h3>
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
  align-items: center;
  b { color: var(--orange); font-size: 14px; }
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
  img { width: 100%; height: 100%; object-fit: cover; }
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

// Coupons
.section-title {
  font-size: 18px;
  font-weight: normal;
  margin: 0 0 14px;
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
