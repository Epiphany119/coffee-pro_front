<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeApi } from '@/api'
import type { StoreResponse } from '@/api/types'
import { useMerchantStore } from '@/stores/merchant'

const router = useRouter()
const mstore = useMerchantStore()

/** '' = 方式选择页 / 'choose' = 入驻现有店铺 / 'create' = 开新店 */
const mode = ref<'' | 'choose' | 'create'>('')
const loading = ref(false)
const stores = ref<StoreResponse[]>([])
const joining = ref(false)

const createForm = reactive({
  name: '',
  address: '',
  phone: '',
  businessHours: '08:00-22:00'
})
const creating = ref(false)

onMounted(async () => {
  mstore.loadSession()
  if (!mstore.isLoggedIn) {
    router.replace('/merchant/auth')
    return
  }
  // 已入驻商家不可再入驻（一商一店）
  if (mstore.hasJoined) {
    ElMessage.warning('您已入驻店铺，一个商家只能入驻一家店')
    router.replace('/merchant')
    return
  }
  await loadAvailable()
})

async function loadAvailable() {
  loading.value = true
  try {
    stores.value = await storeApi.available()
  } catch (e: any) {
    ElMessage.error(e.message || '加载店铺失败')
  } finally {
    loading.value = false
  }
}

async function confirmJoin(store: StoreResponse) {
  try {
    await ElMessageBox.confirm(
      `确定入驻「${store.name}」吗？入驻后该店归您管理，一个商家只能入驻一家店。`,
      '确认入驻',
      { confirmButtonText: '确定入驻', cancelButtonText: '再想想', type: 'warning' }
    )
  } catch {
    return // 用户取消
  }
  joining.value = true
  try {
    const res = await storeApi.bind(store.storeId, mstore.merchant!.id)
    mstore.setJoinedStore(res)
    ElMessage.success(`已成功入驻「${res.name}」`)
    router.replace('/merchant')
  } catch (e: any) {
    ElMessage.error(e.message || '入驻失败')
  } finally {
    joining.value = false
  }
}

async function createStore() {
  if (!createForm.name.trim()) {
    ElMessage.warning('请填写店名')
    return
  }
  creating.value = true
  try {
    const res = await storeApi.create({
      name: createForm.name.trim(),
      address: createForm.address.trim() || undefined,
      phone: createForm.phone.trim() || undefined,
      businessHours: createForm.businessHours.trim() || undefined,
      merchantId: mstore.merchant!.id
    })
    mstore.setJoinedStore(res)
    ElMessage.success(`「${res.name}」开店成功`)
    router.replace('/merchant')
  } catch (e: any) {
    ElMessage.error(e.message || '开店失败')
  } finally {
    creating.value = false
  }
}

function backHome() {
  router.push('/merchant')
}
</script>

<template>
  <div class="m-join">
    <header class="m-topbar">
      <div class="m-brand">
        <span class="brand-mark">F</span>
        <div>
          <strong>入驻 FIKA</strong>
          <small>{{ mstore.merchant?.merchantNo }} · 请选择开店方式</small>
        </div>
      </div>
      <button class="ghost-btn" @click="backHome">← 返回</button>
    </header>

    <main class="m-body">
      <!-- 方式选择 -->
      <div v-if="!mode" class="m-modes">
        <button class="mode-card" @click="mode = 'choose'">
          <span class="mode-icon">🏪</span>
          <strong>入驻现有店铺</strong>
          <small>从 FIKA 21 家门店中选择一家，网红店铺推流更好</small>
        </button>
        <button class="mode-card" @click="mode = 'create'">
          <span class="mode-icon">✨</span>
          <strong>开新店</strong>
          <small>创建属于你自己的自定义店铺</small>
        </button>
      </div>

      <!-- 选择现有店铺 -->
      <div v-else-if="mode === 'choose'">
        <div class="m-choose-head">
          <button class="back-btn" @click="mode = ''">← 换一种方式</button>
          <h2>选择要入驻的门店</h2>
          <p class="m-muted">共 {{ stores.length }} 家可入驻门店</p>
        </div>
        <div v-if="loading" class="m-empty">加载中...</div>
        <div v-else-if="stores.length === 0" class="m-empty">
          暂无可入驻的门店，试试开新店？
        </div>
        <div v-else class="m-grid">
          <button
            v-for="s in stores"
            :key="s.storeId"
            class="store-card"
            :disabled="joining"
            @click="confirmJoin(s)"
          >
            <div class="store-card-name">{{ s.name }}</div>
            <div class="store-card-meta">
              <p v-if="s.address">📍 {{ s.address }}</p>
              <p v-if="s.businessHours">🕐 {{ s.businessHours }}</p>
              <p v-if="!s.address && !s.businessHours" class="m-muted">资料待完善</p>
            </div>
            <span class="join-btn">入驻开店 →</span>
          </button>
        </div>
      </div>

      <!-- 开新店 -->
      <div v-else>
        <div class="m-choose-head">
          <button class="back-btn" @click="mode = ''">← 换一种方式</button>
          <h2>开新店</h2>
          <p class="m-muted">创建属于你的自定义店铺</p>
        </div>
        <form class="m-create-form" @submit.prevent="createStore">
          <label>
            <span>店名 *</span>
            <input v-model="createForm.name" placeholder="如 Fika・我的店" autocomplete="off" />
          </label>
          <label>
            <span>地址</span>
            <input v-model="createForm.address" placeholder="店铺地址" autocomplete="off" />
          </label>
          <label>
            <span>联系电话</span>
            <input v-model="createForm.phone" placeholder="联系电话" autocomplete="off" />
          </label>
          <label>
            <span>营业时间</span>
            <input v-model="createForm.businessHours" placeholder="如 08:00-22:00" autocomplete="off" />
          </label>
          <button class="primary-btn" type="submit" :disabled="creating">
            {{ creating ? '开店中...' : '确认开店' }}
          </button>
        </form>
      </div>
    </main>
  </div>
</template>

<style scoped>
.m-join {
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

.ghost-btn {
  border: 1px solid rgba(255, 253, 249, .35);
  background: transparent;
  color: var(--paper);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  &:hover { border-color: var(--orange); color: var(--orange); }
}

.m-body {
  max-width: 760px;
  margin: 0 auto;
  padding: 36px 24px;
}

.m-modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.mode-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  transition: all .2s;
  &:hover {
    border-color: var(--orange);
    box-shadow: var(--shadow);
    transform: translateY(-2px);
  }
  .mode-icon { font-size: 34px; }
  strong { font-size: 17px; color: var(--pine); }
  small { font-size: 12.5px; color: var(--muted); line-height: 1.6; }
}

.m-choose-head {
  margin-bottom: 22px;
  .back-btn {
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 8px;
    &:hover { color: var(--orange); }
  }
  h2 { font-size: 22px; color: var(--pine); }
  .m-muted { font-size: 13px; color: var(--muted); margin-top: 6px; }
}

.m-empty { text-align: center; color: var(--muted); padding: 50px 0; }

.m-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.store-card {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 20px;
  text-align: left;
  transition: all .2s;
  &:hover:not(:disabled) {
    border-color: var(--orange);
    box-shadow: var(--shadow);
  }
  &:disabled { opacity: .5; cursor: not-allowed; }
}

.store-card-name { font-size: 16px; font-weight: 700; color: var(--pine); }

.store-card-meta {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  p { font-size: 12.5px; color: var(--muted); }
  .m-muted { color: #b0a89a; }
}

.join-btn {
  display: inline-block;
  margin-top: 12px;
  font-size: 13px;
  color: var(--orange);
  font-weight: 600;
}

.m-create-form {
  background: var(--paper);
  border-radius: 18px;
  padding: 28px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 16px;
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    span { font-size: 13px; color: var(--muted); }
    input {
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fff;
      outline: none;
      &:focus { border-color: var(--orange); }
    }
  }
}

.primary-btn {
  border: none;
  background: var(--orange);
  color: #fff;
  padding: 13px 0;
  border-radius: 10px;
  font-size: 15px;
  letter-spacing: .15em;
  &:hover:not(:disabled) { opacity: .9; }
  &:disabled { opacity: .5; cursor: not-allowed; }
}
</style>
