<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { orderApi, memberApi } from '@/api'
import type { Product, Coupon } from '@/api/types'

import SiteHeader from '@/components/SiteHeader.vue'
import HeroSection from '@/components/HeroSection.vue'
import MenuSection from '@/components/MenuSection.vue'
import CartPanel from '@/components/CartPanel.vue'
import ProductModal from '@/components/ProductModal.vue'
import OrderHistory from '@/components/OrderHistory.vue'
import MemberModal from '@/components/MemberModal.vue'
import FloatingRobot from '@/components/FloatingRobot.vue'
import SeatPanel from '@/components/SeatPanel.vue'

const store = useAppStore()
const emit = defineEmits<{ 'go-member': []; 'open-login': []; 'open-register': [] }>()

const selectedProduct = ref<Product | null>(null)
const showProductModal = ref(false)
const showMemberModal = ref(false)
const fulfillmentType = ref('PICKUP')
const orderNote = ref('')
const submitting = ref(false)

onMounted(async () => {
  await loadOrders()
  if (store.isLoggedIn) {
    await loadMemberDashboard()
  }
})

watch(() => store.isLoggedIn, async (val) => {
  if (val) await loadMemberDashboard()
})

async function loadOrders() {
  try {
    let data
    if (store.isLoggedIn && store.currentUser?.id) {
      data = await orderApi.getUserOrders(store.currentUser.id)
    } else {
      data = await orderApi.getGuestOrders(store.getGuestId())
    }
    store.setOrders(data || [])
  } catch (e) {
    console.warn('orders', e)
  }
}

async function loadMemberDashboard() {
  if (!store.isLoggedIn || !store.currentUser?.id) return
  try {
    const data = await memberApi.getDashboard(store.currentUser.id)
    store.updateMemberDashboard(data)
  } catch (e) {
    console.warn('member', e)
  }
}

function selectProduct(product: Product) {
  selectedProduct.value = product
  showProductModal.value = true
}

function onAddToCart(item: any) {
  store.addToCart(item)
  ElMessage.success(`${item.productName} 已加入购物袋`)
}

async function submitOrder() {
  if (!store.cart.length) return
  submitting.value = true
  try {
    const payload = {
      items: store.cart.map(item => ({
        productCode: item.productCode,
        size: item.size,
        condiments: item.condiments,
        quantity: item.quantity
      })),
      userId: store.isLoggedIn ? store.currentUser?.id ?? null : null,
      guestId: store.isLoggedIn ? null : store.getGuestId(),
      couponCode: store.selectedCoupon?.code || null,
      fulfillmentType: fulfillmentType.value,
      note: orderNote.value.trim() || undefined
    }
    const data = await orderApi.createOrder(payload)
    ElMessage.success(
      `下单成功 · ${data.totalCups} 件，共 ¥${data.finalPrice}${data.earnedPoints ? ` · 获得 ${data.earnedPoints} 积分` : ''}`
    )
    store.clearCart()
    orderNote.value = ''
    if (store.isLoggedIn) {
      store.updateUserSpent(data.totalSpent, data.memberLevel)
      await loadMemberDashboard()
    }
    await loadOrders()
  } catch (e: any) {
    ElMessage.error(`下单失败：${e.message}`)
  } finally {
    submitting.value = false
  }
}

async function cancelOrder(id: number) {
  if (!confirm('确定取消这笔订单吗？')) return
  try {
    if (store.isLoggedIn) {
      await orderApi.cancelUserOrder(id, 'cancel')
    } else {
      await orderApi.cancelGuestOrder(id, 'cancel')
    }
    ElMessage.success('订单已取消')
    await loadOrders()
  } catch (e: any) {
    ElMessage.error(`取消失败：${e.message}`)
  }
}

function selectCoupon(coupon: Coupon) {
  store.selectedCoupon = coupon
  showMemberModal.value = false
  ElMessage.success('优惠券已放入购物袋')
}

function browseMenu() {
  document.querySelector('.shop-layout')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div class="main-layout">
    <SiteHeader @logout="store.logout()" @go-member="$emit('go-member')" @open-login="$emit('open-login')" @open-register="$emit('open-register')" />

    <HeroSection @browse="browseMenu" />

    <!-- Service type -->
    <section class="service-switch">
      <button
        class="service-option"
        :class="{ active: fulfillmentType === 'PICKUP' }"
        @click="fulfillmentType = 'PICKUP'"
      >
        <span>🥡</span>
        <div>
          <b>到店自取</b>
          <small>静安店 · 预计 12 分钟</small>
        </div>
      </button>
      <button
        class="service-option"
        :class="{ active: fulfillmentType === 'DINE_IN' }"
        @click="fulfillmentType = 'DINE_IN'"
      >
        <span>🍽</span>
        <div>
          <b>店内用餐</b>
          <small>请在下单后到前台取餐</small>
        </div>
      </button>
      <label class="pickup-select">
        取餐时间
        <select v-model="fulfillmentType">
          <option value="ASAP">尽快制作</option>
          <option value="15MIN">15 分钟后</option>
          <option value="30MIN">30 分钟后</option>
        </select>
      </label>
    </section>

    <!-- Shop layout -->
    <div class="shop-layout" id="menuAnchor">
      <MenuSection @select-product="selectProduct" />
      <CartPanel
        @submit="submitOrder"
        @clear="store.clearCart()"
        @open-member="loadMemberDashboard(); showMemberModal = true"
        @open-coupon="loadMemberDashboard(); showMemberModal = true"
      />
    </div>

    <!-- Order history -->
<!--    <OrderHistory @cancel="cancelOrder" />-->

    <!-- Product modal -->
    <ProductModal
      :product="selectedProduct"
      :visible="showProductModal"
      @close="showProductModal = false"
      @confirm="onAddToCart"
    />

    <!-- Member modal -->
    <MemberModal
      @close="showMemberModal = false"
      @select-coupon="selectCoupon"
    />

    <!-- Floating robot assistant -->
    <FloatingRobot />

    <!-- Seat assignment & QR occupy -->
    <SeatPanel />
  </div>
</template>

<style lang="scss" scoped>
.main-layout {
  width: 100%;
  min-height: 100vh;
  background: var(--cream);
  padding-bottom: 80px;
}

.service-switch {
  width: min(1240px, calc(100% - 40px));
  margin: 0 auto 28px;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 16px;
  display: flex;
  padding: 7px;
  gap: 6px;
}

.service-option {
  background: transparent;
  border: 0;
  border-radius: 11px;
  padding: 9px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  flex: 1;
  cursor: pointer;
  transition: background .18s;

  &.active {
    background: #edf0eb;
  }

  b, small { display: block; }
  b { font-size: 13px; color: var(--ink); font-weight: 700; }
  small { color: var(--muted); font-size: 11px; }
  span { font-size: 18px; }
}

.pickup-select {
  border-left: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  font-size: 12px;
  color: var(--muted);

  select {
    border: 0;
    background: transparent;
    color: var(--ink);
    font-weight: 600;
    outline: none;
    cursor: pointer;
  }
}

.shop-layout {
  width: min(1240px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 365px;
  gap: 28px;
  align-items: start;
}

@media (max-width: 900px) {
  .shop-layout {
    grid-template-columns: 1fr;
  }
}
</style>
