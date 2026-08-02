<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import type { Product } from '@/api/types'

const props = defineProps<{ product: Product }>()
const store = useAppStore()

const isFavorite = computed(() => store.getFavorites().has(props.product.code))

function toggleFav(e: Event) {
  e.stopPropagation()
  const set = store.getFavorites()
  if (set.has(props.product.code)) set.delete(props.product.code)
  else set.add(props.product.code)
  store.saveFavorites(set)
}

function tempLabel(temp?: string) {
  return ({ HOT: '热饮', COLD: '冰饮', BOTH: '冷热', ROOM: '常温' })[temp || ''] || '现制'
}

function fmtMoney(v: number) {
  return `¥${Number(v || 0).toFixed(2)}`
}
</script>

<template>
  <div class="product-card" @click="$emit('click', product)">
    <button
      class="fav-btn"
      :class="{ active: isFavorite }"
      @click="toggleFav"
    >
      {{ isFavorite ? '♥' : '♡' }}
    </button>
    <img
      :src="product.imageUrl"
      :alt="product.name"
      @error="($event.target as HTMLImageElement).style.opacity='0.3'"
    />
    <div class="product-card-info">
      <div class="product-card-top">
        <h3>{{ product.name }}</h3>
        <span class="temp-tag">{{ tempLabel(product.temperature) }}</span>
      </div>
      <p>{{ product.description }}</p>
      <div class="product-card-bottom">
        <b>{{ fmtMoney(product.basePrice) }}</b>
        <span>+</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.product-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: .18s transform, .18s box-shadow;
  position: relative;
  width: 273px;
  height: 247.33px;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 9px 20px rgba(37, 56, 43, .07);
  }
}

.fav-btn {
  border: 0;
  background: #fffdf9e5;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #a6aaa5;
  font-size: 17px;
  position: absolute;
  right: 8px;
  top: 8px;
  cursor: pointer;
  z-index: 1;
  transition: color .15s;

  &.active {
    color: var(--orange);
  }
}

img {
  height: 133px;
  width: 100%;
  object-fit: cover;
  background: #ddd;
  display: block;
}

.product-card-info {
  padding: 10px 11px 12px;
}

.product-card-top {
  display: flex;
  gap: 7px;
  align-items: start;
  justify-content: space-between;

  h3 {
    font-size: 14px;
    margin: 0;
    font-weight: 700;
    flex: 1;
  }
}

p {
  margin: 5px 0 9px;
  color: var(--muted);
  font-size: 11px;
  height: 31px;
  overflow: hidden;
  line-height: 1.4;
}

.product-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;

  b {
    color: var(--orange);
    font-size: 14px;
    font-weight: 700;
  }

  span {
    color: var(--muted);
    font-size: 14px;
  }
}

.temp-tag {
  font-size: 10px;
  color: #526c62;
  background: #ecf3ed;
  padding: 2px 5px;
  border-radius: 4px;
  flex: none;
  white-space: nowrap;
}
</style>
