<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { orderApi, memberApi, membershipApi } from '@/api'
import type { Product, Coupon } from '@/api/types'

import SiteHeader from '@/components/SiteHeader.vue'
import HeroSection from '@/components/HeroSection.vue'
import FlashSalePanel from '@/components/FlashSalePanel.vue'
import MenuSection from '@/components/MenuSection.vue'
import CartPanel from '@/components/CartPanel.vue'
import ProductModal from '@/components/ProductModal.vue'
import OrderHistory from '@/components/OrderHistory.vue'
import MemberModal from '@/components/MemberModal.vue'
import FloatingRobot from '@/components/FloatingRobot.vue'
import SeatPanel from '@/components/SeatPanel.vue'
import PayDialog from '@/components/PayDialog.vue'
import TopupDialog from '@/components/TopupDialog.vue'

const store = useAppStore()
const emit = defineEmits<{ 'go-member': []; 'open-login': []; 'open-register': [] }>()

const selectedProduct = ref<Product | null>(null)
const flashSaleClaimNo = ref<string | null>(null)
const showProductModal = ref(false)
const showMemberModal = ref(false)
const fulfillmentType = ref('PICKUP')
const submitting = ref(false)

/** 下单后支付弹窗（下单成功自动拉起，可选"稍后支付"） */
const payVisible = ref(false)
const payOrderId = ref<number | null>(null)
const payPaymentNo = ref<string | null>(null)

/** 凑单弹窗（购物袋进度条"去凑单"打开） */
const topupVisible = ref(false)
const topupGap = ref(0)

/** 首屏招牌必须来自当前门店的真实菜单，优先找冷萃/拿铁；无匹配时回退第一款咖啡。 */
const featuredProduct = computed(() => {
  const coffee = store.products.filter(p => p.categoryCode === 'coffee')
  return coffee.find(p => /云朵|冷萃|拿铁/i.test(`${p.name} ${p.code}`)) || coffee[0] || store.products[0] || null
})

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
      data = await orderApi.getGuestOrders(await store.ensureGuestId())
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
    const vouchers = await membershipApi.getVouchers(store.currentUser.id)
    const usableVouchers = (vouchers || [])
      .filter(v => v.status === 0 && (!v.expiresAt || new Date(v.expiresAt).getTime() > Date.now()))
      .map(v => ({
        code: v.voucherNo,
        name: v.name,
        minimum: v.minimum || 0,
        discount: v.discount,
        description: `卡券包兑换券 · 满 ¥${v.minimum || 0} 可用`
      }))
    data.coupons = [...(data.coupons || []), ...usableVouchers]
    store.updateMemberDashboard(data)
  } catch (e) {
    console.warn('member', e)
  }
}

function selectProduct(product: Product, claimNo: string | null = null) {
  flashSaleClaimNo.value = claimNo
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
        customSize: item.customSize,
        condiments: item.condiments,
        quantity: item.quantity
      })),
      userId: store.isLoggedIn ? store.currentUser?.id ?? null : null,
      guestId: store.isLoggedIn ? null : await store.ensureGuestId(),
      storeId: store.currentStore?.storeId ?? null,
      couponCode: store.selectedCoupon?.code || null,
      flashSaleClaimNo: flashSaleClaimNo.value,
      fulfillmentType: fulfillmentType.value,
      note: store.orderNote.trim() || undefined
    }
    const data = await orderApi.createOrder(payload)
    ElMessage.success(
      `下单成功 · ${data.totalCups} 件，共 ¥${data.finalPrice}${data.earnedPoints ? ` · 获得 ${data.earnedPoints} 积分` : ''}`
    )
    store.clearCart()
    flashSaleClaimNo.value = null
    if (store.isLoggedIn) {
      store.updateUserSpent(data.totalSpent, data.memberLevel)
      await loadMemberDashboard()
    }
    await loadOrders()
    // 下单即待支付：拉起支付弹窗（携带下单时返回的 paymentNo，免查询）
    payOrderId.value = data.orderId ?? data.id
    payPaymentNo.value = data.paymentNo || null
    payVisible.value = true
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
      await orderApi.cancelUserOrder(id, 'cancel', store.currentUser!.id!)
    } else {
      await orderApi.cancelGuestOrder(id, 'cancel', await store.ensureGuestId())
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

/** 打开凑单弹窗：以当前还差金额作为推荐商品的价格上限 */
function openTopup(gap: number) {
  topupGap.value = gap
  topupVisible.value = true
}

function browseMenu() {
  document.querySelector('.shop-layout')?.scrollIntoView({ behavior: 'smooth' })
}

function openFeaturedProduct() {
  if (!featuredProduct.value) {
    ElMessage.info('菜单正在加载，请稍后再试')
    return
  }
  selectProduct(featuredProduct.value)
}
</script>

<template>
  <div class="main-layout">
    <SiteHeader @logout="store.logout()" @go-member="$emit('go-member')" @open-login="$emit('open-login')" @open-register="$emit('open-register')" @open-featured="openFeaturedProduct" />

    <HeroSection :featured-product="featuredProduct" @browse="browseMenu" @featured="openFeaturedProduct" />

    <!-- Service type -->
    <section class="service-switch">
      <button
        class="service-option"
        :class="{ active: fulfillmentType === 'PICKUP' }"
        @click="fulfillmentType = 'PICKUP'"
      >
        <span>🥡</span>
        <div>
          <b>路过就拿走</b>
          <small>{{ store.currentStore?.name || '静安店' }} · 约 12 分钟做好</small>
        </div>
      </button>
      <button
        class="service-option"
        :class="{ active: fulfillmentType === 'DINE_IN' }"
        @click="fulfillmentType = 'DINE_IN'"
      >
        <span>🍽</span>
        <div>
          <b>坐下来慢慢喝</b>
          <small>来店后扫码入座，慢一点也没关系</small>
        </div>
      </button>
      <label class="pickup-select">
        想什么时候喝
        <select v-model="fulfillmentType">
          <option value="ASAP">马上安排</option>
          <option value="15MIN">15 分钟后</option>
          <option value="30MIN">30 分钟后</option>
        </select>
      </label>
    </section>

    <!-- Shop layout -->
    <div class="shop-layout" id="menuAnchor">
      <div>
        <FlashSalePanel :products="store.products" @select="selectProduct" />
        <MenuSection @select-product="selectProduct" />
      </div>
      <CartPanel
        @submit="submitOrder"
        @clear="store.clearCart()"
        @open-member="showMemberModal = true; loadMemberDashboard()"
        @open-coupon="showMemberModal = true; loadMemberDashboard()"
        @open-topup="openTopup"
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
      :model-value="showMemberModal"
      @update:model-value="showMemberModal = $event"
      @select-coupon="selectCoupon"
    />

    <!-- Floating robot assistant -->
<!--    <FloatingRobot />-->

    <!-- Seat assignment & QR occupy -->
    <SeatPanel />

    <!-- 支付弹窗（下单后自动拉起；支付成功刷新订单） -->
    <PayDialog
      v-model="payVisible"
      :order-id="payOrderId"
      :payment-no="payPaymentNo"
      @paid="loadOrders"
    />

    <!-- 凑单弹窗（购物袋进度条"去凑单"打开，推荐 ≤ 还差金额的凑单品） -->
    <TopupDialog
      v-model="topupVisible"
      :store-id="store.currentStore?.storeId ?? null"
      :gap="topupGap"
    />
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
