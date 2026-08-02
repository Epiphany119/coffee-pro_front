<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import ProductCard from './ProductCard.vue'
import type { Product } from '@/api/types'

const store = useAppStore()
const searchKeyword = ref('')
const quickPick = ref('')

const filteredProducts = computed(() => {
  let list = store.products.filter(p => p.categoryCode === store.activeCategory)

  if (quickPick.value === 'favorites') {
    const favs = store.getFavorites()
    list = store.products.filter(p => favs.has(p.code))
  } else if (quickPick.value === 'light') {
    list = store.products.filter(p => p.categoryCode === 'food')
  }

  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = store.products.filter(p =>
      `${p.name} ${p.description} ${p.categoryCode}`.toLowerCase().includes(kw)
    )
  }
  return list
})

function setCategory(code: string) {
  store.activeCategory = code
  quickPick.value = ''
}

function setQuickPick(action: string) {
  quickPick.value = quickPick.value === action ? '' : action
}

function selectProduct(product: Product) {
  emit('select-product', product)
}

const emit = defineEmits<{ 'select-product': [product: Product] }>()
</script>

<template>
  <section class="menu-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">ORDER ONLINE</p>
        <h2>今日菜单</h2>
      </div>
      <label class="search-box">
        <span>⌕</span>
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索咖啡、甜点或轻食"
        />
      </label>
    </div>

    <div class="quick-picks">
      <button
        class="quick-pick"
        :class="{ active: quickPick === 'favorites' }"
        @click="setQuickPick('favorites')"
      >♡ 我的收藏</button>
      <button
        class="quick-pick"
        :class="{ active: quickPick === 'afternoon' }"
        @click="setQuickPick('afternoon')"
      >☀ 下午茶搭配</button>
      <button
        class="quick-pick"
        :class="{ active: quickPick === 'light' }"
        @click="setQuickPick('light')"
      >⚡ 低卡轻食</button>
    </div>

    <div class="category-tabs">
      <button
        v-for="cat in store.categories"
        :key="cat.code"
        class="category-tab"
        :class="{ active: store.activeCategory === cat.code }"
        @click="setCategory(cat.code)"
      >
        {{ cat.icon }} {{ cat.name }}
      </button>
    </div>

    <div v-if="filteredProducts.length" class="product-grid">
      <ProductCard
        v-for="p in filteredProducts"
        :key="p.code"
        :product="p"
        @click="selectProduct(p)"
      />
    </div>
    <div v-else class="empty-state">没有找到合适的商品，换个关键词试试。</div>
  </section>
</template>

<style lang="scss" scoped>
.menu-section {
  min-width: 0;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: end;
  margin-bottom: 18px;

  h2 {
    font-family: "DM Serif Display", "Noto Sans SC", serif;
    font-size: 28px;
    margin: 3px 0 0;
  }
}

.eyebrow {
  font-size: 11px;
  letter-spacing: .16em;
  font-weight: 700;
  margin: 0;
  color: var(--orange);
}

.search-box {
  width: 255px;
  position: relative;

  span {
    position: absolute;
    left: 12px;
    top: 8px;
    font-size: 20px;
    color: var(--muted);
    pointer-events: none;
  }

  input {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #fff;
    padding: 10px 12px 10px 32px;
    font-size: 12px;
    outline: none;
    color: var(--ink);

    &::placeholder { color: var(--muted); }

    &:focus {
      border-color: var(--orange);
      box-shadow: 0 0 0 3px rgba(224, 109, 53, .12);
    }
  }
}

.quick-picks {
  display: flex;
  gap: 8px;
  overflow: auto;
  margin-bottom: 17px;
  padding-bottom: 3px;
}

.quick-pick {
  flex: 0 0 auto;
  border: 1px solid #ecd5ae;
  border-radius: 99px;
  background: #fff9ee;
  color: #8c5a16;
  padding: 7px 11px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;

  &:hover { background: #f7e5c6; }
}

.category-tabs {
  display: flex;
  gap: 8px;
  overflow: auto;
  padding-bottom: 12px;
  margin-bottom: 5px;
}

.category-tab {
  white-space: nowrap;
  border: 1px solid var(--line);
  background: var(--paper);
  border-radius: 99px;
  padding: 8px 13px;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  transition: background .18s, color .18s;

  &.active {
    background: var(--pine);
    border-color: var(--pine);
    color: #fff;
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.empty-state {
  color: var(--muted);
  text-align: center;
  padding: 38px;
  font-size: 14px;
}
</style>
