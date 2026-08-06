<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useMerchantStore } from '@/stores/merchant'
import { merchantApi, seatApi } from '@/api'
import type { OrderRecord } from '@/api/types'
import {
  isTemplateStore,
  templateRecentOrders,
  templateSeatOverview,
  templateStats,
  templateWeekSales
} from '@/templates/merchantTemplates'

const mstore = useMerchantStore()

const stats = ref([
  { label: '今日营业额', value: '¥0.00', delta: '--', up: true },
  { label: '今日订单', value: '0', delta: '--', up: true },
  { label: '待处理订单', value: '0', delta: '需及时接单', up: false },
  { label: '座位占用率', value: '0%', delta: '--', up: false }
])

const seatOverview = ref([
  { label: '空闲', count: 0, color: '#dedbd2' },
  { label: '待落座', count: 0, color: '#e0a24b' },
  { label: '已占用', count: 0, color: '#4caf7d' }
])

const weekSales = ref<{ day: string; amount: number }[]>([])
const recentOrders = ref<OrderRecord[]>([])

const STATUS_TEXT: Record<string, string> = {
  PENDING: '待接单', PREPARING: '制作中', COMPLETED: '已完成', CANCELED: '已取消'
}

const statusClass = (s: string) =>
  s === 'PREPARING' ? 'making' : s === 'PENDING' ? 'pending' : s === 'CANCELED' ? 'cancel' : 'done'

const maxWeek = computed(() => Math.max(1, ...weekSales.value.map(w => w.amount)))
const totalSeats = computed(() => seatOverview.value.reduce((sum, s) => sum + s.count, 0))

function formatTime(value: string | number[]) {
  if (Array.isArray(value)) {
    return `${String(value[3] || 0).padStart(2, '0')}:${String(value[4] || 0).padStart(2, '0')}`
  }
  return String(value || '').replace('T', ' ').slice(11, 16)
}

function fmt(v: number) {
  return Number(v || 0).toFixed(2)
}

onMounted(async () => {
  const merchantId = mstore.merchant?.id
  const storeId = mstore.joinedStore?.storeId
  if (!merchantId || !storeId) return

  // 模板店（静安店）：展示内置模板数据，不走接口
  if (isTemplateStore(storeId)) {
    stats.value = templateStats
    weekSales.value = templateWeekSales
    recentOrders.value = templateRecentOrders
    seatOverview.value = templateSeatOverview
    return
  }

  try {
    const d = await merchantApi.dashboard(merchantId)
    const occupied = seatOverview.value[2].count
    const total = totalSeats.value
    stats.value = [
      { label: '今日营业额', value: `¥${fmt(d.todayRevenue)}`, delta: `${d.todayOrders} 单`, up: true },
      { label: '今日订单', value: String(d.todayOrders), delta: '今日累计', up: true },
      { label: '待处理订单', value: String(d.pendingOrders), delta: '需及时接单', up: false },
      { label: '座位占用率', value: total ? `${Math.round(occupied / total * 100)}%` : '0%', delta: `${total - occupied} 桌空闲`, up: false }
    ]
    weekSales.value = (d.weekSales || []).map(w => ({ day: w.day, amount: Number(w.amount || 0) }))
    recentOrders.value = d.recentOrders || []
    // 座位统计（前端按当前店铺拉取）
    const seats = await seatApi.list(storeId)
    seatOverview.value = [
      { label: '空闲', count: seats.filter(s => s.status === 'FREE').length, color: '#dedbd2' },
      { label: '待落座', count: seats.filter(s => s.status === 'ASSIGNED').length, color: '#e0a24b' },
      { label: '已占用', count: seats.filter(s => s.status === 'OCCUPIED').length, color: '#4caf7d' }
    ]
    const occupiedSeats = seatOverview.value[2].count
    stats.value[3] = {
      label: '座位占用率',
      value: totalSeats.value ? `${Math.round(occupiedSeats / totalSeats.value * 100)}%` : '0%',
      delta: `${totalSeats.value - occupiedSeats} 桌空闲`,
      up: false
    }
  } catch (e: any) {
    ElMessage.warning('工作台数据加载失败，请检查后端服务')
  }
})
</script>

<template>
  <div class="m-dashboard">
    <!-- 统计卡 -->
    <div class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card">
        <div class="stat-label">{{ s.label }}</div>
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-delta" :class="s.up ? 'up' : 'flat'">{{ s.delta }}</div>
      </div>
    </div>

    <div class="dash-row">
      <!-- 近 7 日营业额 -->
      <section class="panel chart-panel">
        <div class="panel-title">近 7 日营业额</div>
        <div class="bar-chart">
          <div v-for="w in weekSales" :key="w.day" class="bar-col">
            <div class="bar-track">
              <div class="bar" :style="{ height: (w.amount / maxWeek * 100) + '%' }"></div>
            </div>
            <div class="bar-day">{{ w.day }}</div>
            <div class="bar-amount">¥{{ w.amount }}</div>
          </div>
        </div>
      </section>

      <!-- 座位占用概览 -->
      <section class="panel seat-panel">
        <div class="panel-title">座位占用概览 <span class="panel-sub">共 {{ totalSeats }} 桌</span></div>
        <div class="seat-legend">
          <div v-for="s in seatOverview" :key="s.label" class="legend-item">
            <span class="legend-dot" :style="{ background: s.color }"></span>
            <span class="legend-label">{{ s.label }}</span>
            <b>{{ s.count }}</b>
          </div>
        </div>
        <div class="seat-bar">
          <div
            v-for="s in seatOverview"
            :key="s.label"
            class="seat-seg"
            :style="{ width: (s.count / totalSeats * 100) + '%', background: s.color }"
          ></div>
        </div>
        <div class="seat-note">实时座位数据，来自当前店铺</div>
      </section>
    </div>

    <!-- 近期订单 -->
    <section class="panel">
      <div class="panel-title">近期订单 <router-link class="more-link" to="/merchant/orders">查看全部 →</router-link></div>
      <table class="order-table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>时间</th>
            <th>桌位</th>
            <th>商品</th>
            <th>金额</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in recentOrders" :key="o.id">
            <td class="mono">#{{ o.id }}</td>
            <td class="muted">{{ formatTime(o.createdAt) }}</td>
            <td>{{ o.fulfillmentType === 'DINE_IN' ? '店内用餐' : '到店自取' }}</td>
            <td class="items">{{ o.beverageName }}{{ o.size ? '（' + o.size + '）' : '' }}</td>
            <td class="mono">¥{{ fmt(o.finalPrice) }}</td>
            <td><span class="order-badge" :class="statusClass(o.status)">{{ STATUS_TEXT[o.status] || o.status }}</span></td>
          </tr>
          <tr v-if="!recentOrders.length">
            <td colspan="6" class="muted" style="text-align:center; padding: 24px 0;">暂无订单</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.m-dashboard { display: flex; flex-direction: column; gap: 20px; }

/* 统计卡 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--paper);
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: var(--shadow);
  border: 1px solid rgba(222, 219, 210, .4);

  .stat-label { font-size: 13px; color: var(--muted); }
  .stat-value { font-size: 26px; font-weight: 800; color: var(--pine); margin-top: 6px; letter-spacing: .02em; }
  .stat-delta {
    margin-top: 8px;
    font-size: 12px;
    &.up { color: #2e7d32; }
    &.flat { color: var(--muted); }
  }
}

/* 双栏 */
.dash-row {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 16px;
}

.panel {
  background: var(--paper);
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: var(--shadow);
  border: 1px solid rgba(222, 219, 210, .4);
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--pine);
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .panel-sub { font-size: 12px; font-weight: 400; color: var(--muted); }
  .more-link { font-size: 12.5px; color: var(--orange); font-weight: 500; }
}

/* 柱状图 */
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 190px;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
}

.bar-track {
  flex: 1;
  width: 100%;
  max-width: 44px;
  display: flex;
  align-items: flex-end;
  background: var(--cream);
  border-radius: 8px;
  overflow: hidden;
}

.bar {
  width: 100%;
  background: linear-gradient(180deg, var(--orange), #d95a1f);
  border-radius: 8px 8px 0 0;
  min-height: 4px;
  transition: height .4s ease;
}

.bar-day { font-size: 11px; color: var(--muted); }
.bar-amount { font-size: 10.5px; color: var(--ink); font-weight: 600; }

/* 座位概览 */
.seat-legend {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--muted);

  b { margin-left: auto; color: var(--pine); font-size: 15px; }
}

.legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

.seat-bar {
  display: flex;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--cream);
}

.seat-note { margin-top: 10px; font-size: 11.5px; color: #b0a89a; }

/* 订单表 */
.order-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th {
    text-align: left;
    color: var(--muted);
    font-weight: 500;
    font-size: 12px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--line);
  }
  td {
    padding: 11px 10px;
    border-bottom: 1px solid rgba(222, 219, 210, .5);
    color: var(--ink);
  }
  tr:last-child td { border-bottom: none; }

  .mono { font-family: "SF Mono", Menlo, monospace; font-size: 12px; }
  .muted { color: var(--muted); }
  .items { color: var(--muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

.order-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 500;

  &.making { background: var(--soft-orange); color: #b3561e; }
  &.pending { background: #fdf1e7; color: #b78325; }
  &.done { background: #e4f3e6; color: #2e7d32; }
  &.cancel { background: #f5f0ea; color: #9a9083; }
}

.mock-tip { text-align: center; font-size: 11.5px; color: #b0a89a; }
</style>
