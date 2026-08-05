<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { merchantApi } from '@/api'
import { useMerchantStore } from '@/stores/merchant'

const router = useRouter()
const mstore = useMerchantStore()
const loading = ref(true)

onMounted(async () => {
  mstore.loadSession()
  if (!mstore.isLoggedIn) {
    router.replace('/merchant/auth')
    return
  }
  try {
    // 刷新商家信息 + 入驻状态（覆盖本地缓存，防止跨账号残留）
    const info = await merchantApi.getMerchant(mstore.merchant!.id)
    if (info.success) mstore.setMerchant(info)
    const stores = await merchantApi.myStores(mstore.merchant!.id)
    mstore.setJoinedStore(stores && stores.length > 0 ? stores[0] : null)
  } catch (e: any) {
    ElMessage.warning(e.message || '加载店铺信息失败')
  } finally {
    loading.value = false
  }
})

function goJoin() {
  router.push('/merchant/join')
}

function logout() {
  mstore.clear()
  ElMessage.success('已退出登录')
  router.replace('/merchant/auth')
}

function backToUser() {
  router.push('/')
}
</script>

<template>
  <div class="m-home">
    <header class="m-topbar">
      <div class="m-brand">
        <span class="brand-mark">F</span>
        <div>
          <strong>FIKA 商家中心</strong>
          <small v-if="mstore.isLoggedIn">{{ mstore.merchant!.merchantNo }} · {{ mstore.merchant!.nickname || '未设置昵称' }}</small>
        </div>
      </div>
      <div class="m-top-actions">
        <button class="ghost-btn" @click="backToUser">用户端</button>
        <button class="ghost-btn" @click="logout">退出登录</button>
      </div>
    </header>

    <main class="m-body">
      <div v-if="loading" class="m-empty">加载中...</div>

      <!-- 已入驻：我的店铺卡片 -->
      <template v-else-if="mstore.hasJoined && mstore.joinedStore">
        <div class="m-section-title">
          <h2>我的店铺</h2>
          <span class="m-badge" :class="mstore.joinedStore.status === 'OPEN' ? 'open' : 'closed'">
            {{ mstore.joinedStore.status === 'OPEN' ? '营业中' : '已打烊' }}
          </span>
        </div>
        <div class="m-store-card">
          <div class="m-store-name">{{ mstore.joinedStore.name }}</div>
          <div class="m-store-meta">
            <p v-if="mstore.joinedStore.address">📍 {{ mstore.joinedStore.address }}</p>
            <p v-if="mstore.joinedStore.phone">📞 {{ mstore.joinedStore.phone }}</p>
            <p v-if="mstore.joinedStore.businessHours">🕐 {{ mstore.joinedStore.businessHours }}</p>
            <p v-if="!mstore.joinedStore.address && !mstore.joinedStore.phone && !mstore.joinedStore.businessHours" class="m-muted">店铺资料待完善</p>
          </div>
          <div class="m-store-actions">
            <button class="primary-btn" disabled>店铺管理（开发中）</button>
            <button class="ghost-btn" disabled>营业数据（开发中）</button>
          </div>
        </div>
      </template>

      <!-- 未入驻：入驻引导 -->
      <template v-else>
        <div class="m-hero">
          <h2>欢迎入驻 FIKA</h2>
          <p>选择一家现有门店即刻开店，网红店推流更好；也可以新建属于你的自定义店铺。</p>
          <button class="primary-btn big" @click="goJoin">选择入驻 →</button>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.m-home {
  min-height: 100vh;
  background: var(--cream);
}

.m-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--pine);
  color: var(--paper);
  padding: 14px 28px;
}

.m-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  .brand-mark {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--orange);
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-family: serif;
  }
  strong { font-size: 17px; letter-spacing: .03em; display: block; }
  small { font-size: 12px; opacity: .65; }
}

.m-top-actions { display: flex; gap: 10px; }

.ghost-btn {
  border: 1px solid rgba(255, 253, 249, .35);
  background: transparent;
  color: var(--paper);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  transition: all .2s;
  &:hover { border-color: var(--orange); color: var(--orange); }
}

.m-body {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px;
}

.m-empty { text-align: center; color: var(--muted); padding: 60px 0; }

.m-hero {
  background: var(--paper);
  border-radius: 20px;
  padding: 48px 40px;
  text-align: center;
  box-shadow: var(--shadow);
  h2 { font-size: 26px; color: var(--pine); }
  p { margin: 14px auto 28px; color: var(--muted); line-height: 1.7; max-width: 420px; }
}

.primary-btn {
  border: none;
  background: var(--orange);
  color: #fff;
  padding: 12px 32px;
  border-radius: 10px;
  font-size: 15px;
  letter-spacing: .1em;
  transition: opacity .2s;
  &:hover:not(:disabled) { opacity: .9; }
  &:disabled { opacity: .4; cursor: not-allowed; }
  &.big { padding: 14px 44px; font-size: 16px; }
}

.m-section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  h2 { font-size: 20px; color: var(--pine); }
}

.m-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  &.open { background: #e4f3e6; color: #2e7d32; }
  &.closed { background: #f3e4e4; color: #c0392b; }
}

.m-store-card {
  background: var(--paper);
  border-radius: 18px;
  padding: 28px;
  box-shadow: var(--shadow);
}

.m-store-name { font-size: 22px; font-weight: 700; color: var(--pine); }

.m-store-meta {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  p { font-size: 14px; color: var(--muted); }
  .m-muted { color: #b0a89a; }
}

.m-store-actions {
  margin-top: 22px;
  display: flex;
  gap: 12px;
}
</style>
