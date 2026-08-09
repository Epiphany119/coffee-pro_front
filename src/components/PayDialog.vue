<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { payApi } from '@/api'
import { PAY_CHANNEL_LABELS, PAY_STATUS_LABELS } from '@/api/types'
import type { PaymentRecord } from '@/api/types'

/**
 * 支付弹窗：下单后/订单列表"去支付"入口统一复用。
 * 传入 orderId（+可选 paymentNo 免查询），打开时自动取/建支付单。
 */
const props = defineProps<{
  modelValue: boolean
  orderId: number | null
  paymentNo?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  'paid': [PaymentRecord]
}>()

const loading = ref(false)
const paying = ref(false)
const payment = ref<PaymentRecord | null>(null)
const channel = ref('MOCK')

/** 支付渠道选项：模拟支付默认推荐，真实渠道骨架占位（后端 501 会提示未接入） */
const channels = [
  { code: 'MOCK', desc: '开发/演示用，点击直接支付成功' },
  { code: 'WECHAT', desc: '待接入' },
  { code: 'ALIPAY', desc: '待接入' },
  { code: 'BANK', desc: '待接入' }
]

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    channel.value = 'MOCK'
    await loadPayment()
  }
)

async function loadPayment() {
  if (!props.orderId) return
  loading.value = true
  try {
    if (props.paymentNo) {
      payment.value = await payApi.getByPaymentNo(props.paymentNo)
    } else {
      try {
        payment.value = await payApi.getByOrderId(props.orderId)
      } catch (e) {
        // 无支付单（如历史订单）：幂等补建
        payment.value = await payApi.createPayment(props.orderId)
      }
    }
    if (payment.value?.status !== 'PENDING') {
      ElMessage.info(`该订单支付单状态：${PAY_STATUS_LABELS[payment.value?.status || ''] || payment.value?.status}，无需重复支付`)
      emit('update:modelValue', false)
    }
  } catch (e: any) {
    ElMessage.error(`支付单加载失败：${e.message}`)
    emit('update:modelValue', false)
  } finally {
    loading.value = false
  }
}

async function doPay() {
  if (!payment.value) return
  paying.value = true
  try {
    const result = await payApi.pay(payment.value.paymentNo, channel.value)
    ElMessage.success(`支付成功 · ${PAY_CHANNEL_LABELS[channel.value] || channel.value} ¥${Number(result.amount || 0).toFixed(2)}`)
    payment.value = result
    emit('paid', result)
    emit('update:modelValue', false)
  } catch (e: any) {
    ElMessage.error(`支付失败：${e.message}`)
  } finally {
    paying.value = false
  }
}

function fmtMoney(v: number) {
  return `¥${Number(v || 0).toFixed(2)}`
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="收银台"
    width="420px"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="pay-body">
      <template v-if="payment">
        <div class="pay-summary">
          <div class="pay-amount">
            <small>应付金额</small>
            <b>{{ fmtMoney(payment.amount) }}</b>
          </div>
          <div class="pay-no">
            支付单号 <span>{{ payment.paymentNo }}</span>
          </div>
        </div>

        <div class="pay-channels">
          <label
            v-for="c in channels"
            :key="c.code"
            class="pay-channel"
            :class="{ active: channel === c.code }"
          >
            <input v-model="channel" type="radio" :value="c.code" />
            <b>{{ PAY_CHANNEL_LABELS[c.code] || c.code }}</b>
            <small>{{ c.desc }}</small>
          </label>
        </div>
      </template>
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">稍后支付</el-button>
      <el-button type="primary" :loading="paying" :disabled="!payment" @click="doPay">
        确认支付
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.pay-body { min-height: 120px; }
.pay-summary {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 14px;
}
.pay-amount {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  small { color: var(--muted); font-size: 12px; }
  b { color: var(--orange); font-size: 26px; }
}
.pay-no {
  margin-top: 6px;
  font-size: 11px;
  color: var(--muted);
  span { color: var(--ink); font-weight: 600; }
}
.pay-channels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.pay-channel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: all .15s;
  input { display: none; }
  b { font-size: 13px; color: var(--ink); }
  small { font-size: 11px; color: var(--muted); }
  &.active {
    border-color: var(--orange);
    background: #fdf1e6;
    box-shadow: 0 0 0 1px var(--orange) inset;
  }
}
</style>
