<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AuthPage from '@/components/AuthPage.vue'
import HomeView from '@/views/HomeView.vue'
import MemberView from '@/views/MemberView.vue'
import { useAppStore } from '@/stores/app'
import { menuApi } from '@/api'

const store = useAppStore()
const loading = ref(true)

// 'auth' = 登录/注册页，'main' = 主应用页，'member' = 个人主页
const view = ref<'auth' | 'main' | 'member'>('auth')
const authDefaultTab = ref<'login' | 'register'>('login')

// 监听登录状态，自动切换视图
watch(() => store.isLoggedIn, (isLoggedIn) => {
  if (!isLoggedIn) {
    view.value = 'auth'
    authDefaultTab.value = 'login'
  }
})

onMounted(async () => {
  try {
    const data = await menuApi.getMenu()
    store.setMenu(data)
  } catch (e: any) {
    ElMessage.warning('无法加载菜单，请检查后端服务是否启动')
  } finally {
    loading.value = false
  }
})

function enterMain() {
  view.value = 'main'
}

function goMember() {
  view.value = 'member'
}

function goBack() {
  view.value = 'main'
}

function openAuth(tab: 'login' | 'register' = 'login') {
  view.value = 'auth'
  authDefaultTab.value = tab
}
</script>

<template>
  <!-- Loading screen -->
  <div v-if="loading" class="loading-screen">
    <div class="loading-content">
      <span class="brand-mark">F</span>
      <p>FIKA · 咖啡与轻食</p>
      <small>正在连接...</small>
    </div>
  </div>

  <!-- Auth page -->
  <AuthPage v-else-if="view === 'auth'" :default-tab="authDefaultTab" @enter-main="enterMain" @login-success="enterMain" />

  <!-- Main application -->
  <HomeView v-else-if="view === 'main'" @logout="view = 'auth'" @go-member="goMember" @open-login="openAuth('login')" @open-register="openAuth('register')" />

  <!-- Member page -->
  <MemberView v-else-if="view === 'member'" @back="goBack" />
</template>

<style>
body { margin: 0; }

.loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e3028;
  color: #fffdf9;
}

.loading-content {
  text-align: center;
  p {
    font-size: 20px;
    letter-spacing: 0.1em;
    margin-top: 16px;
    opacity: 0.9;
  }
  small {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    opacity: 0.5;
    letter-spacing: 0.05em;
  }
}

.brand-mark {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #e06d35;
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-family: serif;
}
</style>
