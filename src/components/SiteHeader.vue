<script setup lang="ts">
import { computed, ref } from 'vue'
import fikaLogoMark from '@/assets/images/fika-logo-mark.png'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { storeApi } from '@/api'
import type { StoreResponse } from '@/api/types'

const store = useAppStore()

const nickname = computed(() => {
  const u = store.currentUser
  if (!u) return ''
  return u.nickname || u.username || ''
})

const firstChar = computed(() => nickname.value.slice(0, 1))
const memberLevel = computed(() => store.currentUser?.memberLevel || '普通会员')
const totalSpent = computed(() => store.currentUser?.totalSpent || 0)

function fmtMoney(v: number) {
  return `¥${Number(v || 0).toFixed(2)}`
}

const emit = defineEmits<{
  logout: []
  'go-member': []
  'open-login': []
  'open-register': []
}>()

// --- 店铺选择 ---
const currentStore = computed(() => store.currentStore)
const storeDialog = computed({
  get: () => store.storePickerOpen,
  set: (v) => (v ? store.openStorePicker() : store.closeStorePicker())
})
const loadingStores = ref(false)

/** 打开弹窗：已缓存列表直接用，否则拉全部店铺（含打烊，打烊置灰不可选） */
async function openStorePicker() {
  store.openStorePicker()
  if (store.storeList.length > 0) return
  loadingStores.value = true
  try {
    store.setStoreList(await storeApi.list())
  } catch (e: any) {
    ElMessage.error(e.message || '加载店铺列表失败')
  } finally {
    loadingStores.value = false
  }
}

/** 切换店铺：清空上一家店的购物袋与座位，避免串店 */
function switchStore(s: StoreResponse) {
  if (s.storeId === currentStore.value?.storeId) {
    store.closeStorePicker()
    return
  }
  store.setCurrentStore(s)
  store.closeStorePicker()
  ElMessage.success(`已切换到「${s.name}」，购物袋与座位已重置`)
}
</script>

<template>
  <header class="site-header">
    <div class="logo">
      <img class="brand-mark" :src="fikaLogoMark" alt="Fika" /><span>FIKA</span>
    </div>
    <div class="header-location" role="button" title="切换店铺" @click="openStorePicker">
      <span>●</span>
      <div>
        <b>{{ currentStore?.name || 'FIKA 静安店' }}</b>
        <small>现在营业 · 点击切换店铺</small>
      </div>
      <span class="switch-arrow">▾</span>
    </div>
    <div class="user-bar">
      <template v-if="!store.isLoggedIn">
        <a class="login-link" @click="$emit('open-login')">登录</a>
        <span style="color: var(--line); margin: 0 4px;">|</span>
        <a class="login-link" @click="$emit('open-register')">注册</a>
      </template>
      <template v-else>
        <div class="member-trigger" @click="$emit('go-member')">
          <div class="member-avatar">{{ firstChar }}</div>
          <div>
            {{ nickname }}
            <small>{{ memberLevel }} · {{ fmtMoney(totalSpent) }}</small>
          </div>
        </div>
      </template>
    </div>

    <!-- 店铺选择弹窗 -->
    <el-dialog v-model="storeDialog" title="选择店铺" width="420px" class="store-dialog">
      <p class="store-tip">选择一家正在营业的店铺，下单与该店铺交易（打烊店铺不可选）</p>
      <div v-loading="loadingStores" class="store-list">
        <div
          v-for="s in store.storeList"
          :key="s.storeId"
          class="store-item"
          :class="{ current: s.storeId === currentStore?.storeId, closed: s.status !== 'OPEN' }"
          @click="s.status === 'OPEN' && switchStore(s)"
        >
          <span class="store-dot" :class="s.status === 'OPEN' ? 'open' : 'closed'"></span>
          <div class="store-item-main">
            <b>{{ s.name }}</b>
            <small v-if="s.address">{{ s.address }}</small>
            <small v-else-if="s.businessHours">营业时间 {{ s.businessHours }}</small>
          </div>
          <span v-if="s.storeId === currentStore?.storeId" class="store-current">当前</span>
          <span v-else-if="s.status !== 'OPEN'" class="store-closed">已打烊</span>
          <span v-else class="store-go">切换 →</span>
        </div>
        <div v-if="!loadingStores && store.storeList.length === 0" class="store-empty">
          暂无店铺
        </div>
      </div>
      <p class="store-warn">切换店铺会清空当前购物袋与座位记录</p>
    </el-dialog>
  </header>
</template>

<style lang="scss" scoped>
.site-header {
  width: min(1240px, calc(100% - 40px));
  height: 78px;
  margin: auto;
  display: flex;
  align-items: center;
  gap: 30px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: "DM Serif Display", serif;
  font-size: 25px;
  letter-spacing: .06em;
  color: var(--ink);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.brand-mark {
  width: 31px;
  height: 31px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.header-location {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--muted);
  border-left: 1px solid var(--line);
  padding-left: 26px;
  font-size: 12px;
  cursor: pointer;

  > span:first-child {
    color: #4caf7d;
    font-size: 12px;
  }

  b, small { display: block; }
  b { color: var(--ink); font-size: 13px; }

  .switch-arrow {
    color: var(--pine);
    font-size: 11px;
    margin-left: 2px;
  }
}

.user-bar {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-link {
  border: 0;
  background: none;
  color: var(--pine);
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
  padding: 0;
}

.member-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--line);
  background: var(--paper);
  border-radius: 100px;
  padding: 7px 12px 7px 7px;
  color: var(--ink);
  font-size: 13px;
  cursor: pointer;
  transition: box-shadow .18s;

  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

  small { display: block; color: var(--muted); font-size: 10px; }
}

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f1d1bb;
  color: #914821;
  display: grid;
  place-items: center;
  font-weight: bold;
}

.store-tip {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 12px;
}

.store-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 60px;
}

.store-item {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--paper);
  cursor: pointer;
  transition: box-shadow .18s, border-color .18s;

  &:hover {
    box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    border-color: var(--pine);
  }

  &.current {
    border-color: var(--pine);
    background: rgba(45, 82, 62, 0.06);
  }

  /* 打烊店铺：置灰不可选（类似美团商品下架） */
  &.closed {
    opacity: 0.45;
    cursor: not-allowed;
    background: #f4f4f2;

    &:hover {
      box-shadow: none;
      border-color: var(--line);
    }
  }
}

.store-item-main {
  flex: 1;
  min-width: 0;

  b { display: block; color: var(--ink); font-size: 14px; }
  small { display: block; color: var(--muted); font-size: 11px; margin-top: 2px; }
}

/* 营业状态灯：营业中绿灯，打烊红灯 */
.store-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.open {
    background: #4caf7d;
    box-shadow: 0 0 0 3px rgba(76, 175, 125, 0.16);
  }

  &.closed {
    background: #e05c4a;
    box-shadow: 0 0 0 3px rgba(224, 92, 74, 0.16);
  }
}

.store-current {
  color: var(--pine);
  font-size: 12px;
  font-weight: bold;
}

.store-go {
  color: var(--orange);
  font-size: 12px;
  font-weight: bold;
}

.store-closed {
  color: #9aa3a0;
  font-size: 12px;
  font-weight: bold;
}

.store-empty {
  color: var(--muted);
  font-size: 13px;
  text-align: center;
  padding: 24px 0;
}

.store-warn {
  margin: 12px 0 0;
  color: var(--orange);
  font-size: 11px;
}
</style>
