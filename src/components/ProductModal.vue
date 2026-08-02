<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { CONDIMENTS, SIZE_LABELS, SIZE_EXTRAS } from '@/api/types'
import type { Product } from '@/api/types'

const props = defineProps<{
  product: Product | null
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [item: any]
}>()

const store = useAppStore()
const selectedSize = ref('MEDIUM')
const selectedCondiments = ref(new Set<string>())

watch(() => props.product, (p) => {
  if (p) {
    selectedSize.value = 'MEDIUM'
    selectedCondiments.value = new Set()
  }
})

const unitPrice = computed(() => {
  if (!props.product) return 0
  const sizeExtra = (SIZE_EXTRAS[props.product.categoryCode] || SIZE_EXTRAS.coffee)[selectedSize.value] || 0
  const condTotal = [...selectedCondiments.value].reduce((s, c) => s + (CONDIMENTS[c]?.price || 0), 0)
  return Number(props.product.basePrice) + sizeExtra + condTotal
})

const finalPrice = computed(() => unitPrice.value * store.memberRate())

function toggleCondiment(code: string) {
  if (selectedCondiments.value.has(code)) selectedCondiments.value.delete(code)
  else selectedCondiments.value.add(code)
}

function addToCart() {
  if (!props.product) return
  emit('confirm', {
    productCode: props.product.code,
    productName: props.product.name,
    categoryCode: props.product.categoryCode,
    size: selectedSize.value,
    condiments: [...selectedCondiments.value].sort(),
    quantity: 1,
    unitPrice: unitPrice.value
  })
  emit('close')
}

function fmtMoney(v: number) {
  return `¥${Number(v || 0).toFixed(2)}`
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :show-close="false"
    width="760px"
    class="product-modal"
    @update:model-value="$emit('close')"
  >
    <template #header>
      <div class="modal-close" @click="$emit('close')">×</div>
    </template>

    <div v-if="product" class="product-modal-card">
      <div class="modal-image">
        <img :src="product.imageUrl" :alt="product.name" />
      </div>
      <div class="config-body">
        <div class="config-heading">
          <h2>{{ product.name }}</h2>
          <span>{{ fmtMoney(product.basePrice) }} 起</span>
        </div>

        <!-- Size -->
        <div class="config-group">
          <h3>选择规格</h3>
          <div class="choice-group">
            <el-tag
              v-for="size in ['SMALL', 'MEDIUM', 'LARGE']"
              :key="size"
              class="choice"
              :type="selectedSize === size ? 'dark' : 'info'"
              @click="selectedSize = size"
            >
              {{ SIZE_LABELS[size] }}
              {{ (SIZE_EXTRAS[product.categoryCode] || SIZE_EXTRAS.coffee)[size] ? `+${fmtMoney((SIZE_EXTRAS[product.categoryCode] || SIZE_EXTRAS.coffee)[size])}` : '· 基础价' }}
            </el-tag>
          </div>
        </div>

        <!-- Condiments -->
        <div v-if="product.allowedCondiments?.length" class="config-group">
          <h3>添加配料 <small>可多选</small></h3>
          <div class="choice-group">
            <el-tag
              v-for="code in product.allowedCondiments"
              :key="code"
              class="choice"
              :type="selectedCondiments.has(code) ? 'dark' : 'info'"
              @click="toggleCondiment(code)"
            >
              {{ CONDIMENTS[code]?.name || code }} +{{ fmtMoney(CONDIMENTS[code]?.price || 0) }}
            </el-tag>
          </div>
        </div>

        <div class="config-price">
          <span>本品小计</span>
          <b>{{ fmtMoney(finalPrice) }}</b>
        </div>

        <el-button type="primary" style="width:100%;background:var(--pine);border:none;" @click="addToCart">
          加入购物袋
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style lang="scss">
.product-modal {
  .el-dialog__body { padding: 0 !important; }
  .el-dialog__header { padding: 0; margin: 0; }
}

.product-modal-card {
  display: grid;
  grid-template-columns: 42% 58%;
  min-height: 420px;
}

.modal-image {
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    min-height: 420px;
    background: #ddd;
  }
}

.config-body {
  padding: 31px;
}

.config-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  h2 { margin: 0; font-size: 28px; font-weight: normal; }
  span { color: var(--orange); font-weight: bold; font-size: 16px; }
}

.config-group {
  margin: 23px 0;
  h3 { font-size: 13px; margin: 0 0 9px; small { color: var(--muted); font-weight: normal; } }
}

.choice-group {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.choice {
  cursor: pointer;
  border-radius: 9px;
  padding: 8px 10px;
  font-size: 12px;
  &.el-tag--dark {
    background: var(--pine);
    border-color: var(--pine);
    color: #fff;
  }
  &.el-tag--info {
    background: #fff;
    border-color: var(--line);
    color: var(--muted);
  }
}

.config-price {
  margin: 27px 0 10px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  b { font-size: 20px; color: var(--orange); }
}

.modal-close {
  position: absolute;
  right: 13px;
  top: 11px;
  width: 29px;
  height: 29px;
  border-radius: 50%;
  background: rgba(255,253,249,0.85);
  font-size: 22px;
  text-align: center;
  line-height: 29px;
  cursor: pointer;
  z-index: 10;
  color: var(--ink);
}
</style>
