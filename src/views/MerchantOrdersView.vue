<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useMerchantStore } from '@/stores/merchant'
import { orderApi } from '@/api'
import type { OrderRecord } from '@/api/types'
import { sizeText } from '@/api/types'
import { isTemplateStore, templateOrders } from '@/templates/merchantTemplates'

const mstore = useMerchantStore()
const storeId = computed(() => mstore.joinedStore?.storeId)
/** 模板店（静安店）：只读展示模板订单 */
const templateMode = computed(() => isTemplateStore(storeId.value))

const STATUS_TEXT: Record<string, string> = {
  PENDING: '待接单', PREPARING: '制作中', COMPLETED: '已完成', CANCELED: '已取消'
}

const STATUS_KEYS = ['PENDING', 'PREPARING', 'COMPLETED', 'CANCELED']

const tabs = ref<{ key: string; count: number }[]>([])
const activeTab = ref('全部')
const orders = ref<OrderRecord[]>([])
const drawerOpen = ref(false)
const current = ref<OrderRecord | null>(null)

const filtered = computed(() =>
  activeTab.value === '全部'
    ? orders.value
    : orders.value.filter(o => o.status === activeTab.value)
)

function rebuildTabs() {
  tabs.value = [
    { key: '全部', count: orders.value.length },
    ...STATUS_KEYS.map(k => ({ key: k, count: orders.value.filter(o => o.status === k).length }))
  ]
}

function formatTime(value: string | number[]) {
  if (Array.isArray(value)) {
    return `${String(value[0])}-${String(value[1]).padStart(2, '0')}-${String(value[2]).padStart(2, '0')} ${String(value[3] || 0).padStart(2, '0')}:${String(value[4] || 0).padStart(2, '0')}`
  }
  return String(value || '').replace('T', ' ').slice(0, 16)
}

function fmt(v: number) {
  return Number(v || 0).toFixed(2)
}

async function loadOrders() {
  if (storeId.value == null) return
  // 模板店（静安店）：展示内置模板订单，不走接口
  if (templateMode.value) {
    orders.value = templateOrders
    rebuildTabs()
    return
  }
  try {
    const data = await orderApi.getStoreOrders(storeId.value)
    orders.value = data || []
    rebuildTabs()
  } catch (e: any) {
    ElMessage.warning('订单加载失败，请检查后端服务')
  }
}

onMounted(loadOrders)

function openDetail(o: OrderRecord) {
  current.value = o
  drawerOpen.value = true
}

async function doAction(o: OrderRecord, action: 'start' | 'complete' | 'cancel', tip: string) {
  if (storeId.value == null) return
  try {
    await orderApi.merchantAction(o.id, action, storeId.value)
    ElMessage.success(`订单 #${o.id} ${tip}`)
    drawerOpen.value = false
    await loadOrders()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

function accept(o: OrderRecord) {
  doAction(o, 'start', '已接单')
}

function finish(o: OrderRecord) {
  doAction(o, 'complete', '已完成')
}

function cancelOrder(o: OrderRecord) {
  doAction(o, 'cancel', '已取消')
}

function badgeClass(s: string) {
  if (s === 'PENDING') return 'pending'
  if (s === 'PREPARING') return 'making'
  if (s === 'CANCELED') return 'cancel'
  return 'done'
}

function itemText(o: OrderRecord) {
  let t = o.beverageName || ''
  if (o.size) t += `（${sizeText(o)}）`
  if (o.condiments) t += ` + ${o.condiments}`
  return t
}

function seatText(o: OrderRecord) {
  return o.fulfillmentType === 'DINE_IN' ? '店内用餐' : '到店自取'
}
</script>

<template>
  <div class="m-orders">
    <!-- 状态筛选 -->
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.key === '全部' ? '全部' : STATUS_TEXT[t.key] }}
        <span class="tab-count">{{ t.count }}</span>
      </button>
    </div>

    <!-- 订单列表 -->
    <div class="order-list">
      <div v-for="o in filtered" :key="o.id" class="order-row" @click="openDetail(o)">
        <div class="order-main">
          <div class="order-id">#{{ o.id }}</div>
          <div class="order-sub">
            <span>{{ seatText(o) }}</span>
            <span class="dot">·</span>
            <span>{{ formatTime(o.createdAt) }}</span>
            <span v-if="o.note" class="dot">·</span>
            <span v-if="o.note" class="remark">{{ o.note }}</span>
          </div>
        </div>
        <div class="order-items">
          {{ itemText(o) }}
        </div>
        <div class="order-amount">¥{{ fmt(o.finalPrice) }}</div>
        <div class="order-side">
          <span class="order-badge" :class="badgeClass(o.status)">{{ STATUS_TEXT[o.status] || o.status }}</span>
          <button
            v-if="!templateMode && o.status === 'PENDING'"
            class="act-btn primary"
            @click.stop="accept(o)"
          >接单</button>
          <button
            v-else-if="!templateMode && o.status === 'PREPARING'"
            class="act-btn"
            @click.stop="finish(o)"
          >完成出餐</button>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="empty">该状态下暂无订单</div>
    </div>

    <!-- 订单详情抽屉 -->
    <el-drawer v-model="drawerOpen" size="400px" :with-header="false">
      <template v-if="current">
        <div class="drawer-head">
          <div class="drawer-title">#{{ current.id }}</div>
          <div class="order-badge" :class="badgeClass(current.status)">{{ STATUS_TEXT[current.status] || current.status }}</div>
        </div>
        <div class="drawer-meta">
          <div class="meta-row"><span>桌位</span><b>{{ seatText(current) }}</b></div>
          <div class="meta-row"><span>下单时间</span><b>{{ formatTime(current.createdAt) }}</b></div>
          <div class="meta-row"><span>备注</span><b>{{ current.note || '无' }}</b></div>
        </div>
        <div class="drawer-items">
          <div class="item-row">
            <span class="item-name">{{ itemText(current) }}</span>
            <span class="item-price">¥{{ fmt(current.finalPrice) }}</span>
          </div>
        </div>
        <div class="drawer-total">
          <span>合计</span>
          <b>¥{{ fmt(current.finalPrice) }}</b>
        </div>
        <div class="drawer-actions">
          <button v-if="!templateMode && current.status === 'PENDING'" class="drawer-btn primary" @click="accept(current); drawerOpen = false">确认接单</button>
          <button v-if="!templateMode && current.status === 'PENDING'" class="drawer-btn danger" @click="cancelOrder(current)">取消订单</button>
          <button v-else-if="!templateMode && current.status === 'PREPARING'" class="drawer-btn" @click="finish(current); drawerOpen = false">完成出餐</button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.m-orders { display: flex; flex-direction: column; gap: 18px; }

/* 状态 tab */
.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  background: var(--paper);
  color: var(--muted);
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 13px;
  transition: all .18s;

  .tab-count {
    background: var(--cream);
    color: var(--muted);
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 999px;
  }

  &:hover { border-color: var(--orange); color: var(--orange); }
  &.active {
    background: var(--pine);
    border-color: var(--pine);
    color: var(--paper);
    .tab-count { background: rgba(255, 253, 249, .18); color: var(--paper); }
  }
}

/* 订单行 */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-row {
  display: flex;
  align-items: center;
  gap: 18px;
  background: var(--paper);
  border-radius: 14px;
  padding: 14px 18px;
  box-shadow: var(--shadow);
  border: 1px solid rgba(222, 219, 210, .4);
  cursor: pointer;
  transition: transform .15s, border-color .15s;

  &:hover { border-color: var(--orange); transform: translateY(-1px); }
}

.order-main { width: 210px; flex-shrink: 0; }

.order-id {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--pine);
}

.order-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 5px;

  .dot { opacity: .4; }
  .remark { color: var(--gold); }
}

.order-items {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-amount {
  font-size: 15px;
  font-weight: 700;
  color: var(--pine);
  width: 70px;
  text-align: right;
  font-family: "SF Mono", Menlo, monospace;
}

.order-side {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 210px;
  justify-content: flex-end;
}

.order-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 500;

  &.pending { background: #fdf1e7; color: #b78325; }
  &.making { background: var(--soft-orange); color: #b3561e; }
  &.done { background: #e4f3e6; color: #2e7d32; }
  &.cancel { background: #f1efea; color: #9a948a; }
}

.act-btn {
  border: 1px solid var(--pine);
  background: transparent;
  color: var(--pine);
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 8px;
  transition: all .18s;

  &.primary { background: var(--orange); border-color: var(--orange); color: #fff; }
  &:hover { opacity: .85; }
}

.empty { text-align: center; color: var(--muted); padding: 60px 0; font-size: 13px; }

/* 抽屉 */
.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.drawer-title {
  font-family: "SF Mono", Menlo, monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--pine);
}

.drawer-meta {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);

  .meta-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 13px;
    color: var(--muted);
    b { color: var(--ink); font-weight: 600; }
  }
}

.drawer-items {
  padding: 14px 0;
  border-bottom: 1px solid var(--line);

  .item-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    font-size: 13.5px;

    .item-name { flex: 1; color: var(--ink); }
    .item-qty { color: var(--muted); font-size: 12.5px; }
    .item-price { font-family: "SF Mono", Menlo, monospace; color: var(--pine); font-weight: 600; }
  }
}

.drawer-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0 20px;
  font-size: 14px;
  color: var(--muted);
  b { font-size: 20px; color: var(--pine); font-family: "SF Mono", Menlo, monospace; }
}

.drawer-btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: var(--pine);
  color: var(--paper);
  font-size: 14px;
  font-weight: 600;

  &.primary { background: var(--orange); color: #fff; }
  &.danger { background: #f3ece4; color: #b3561e; }
}
</style>
