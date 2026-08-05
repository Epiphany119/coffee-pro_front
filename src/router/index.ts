import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAppStore } from '@/stores/app'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue')
  },
  // ============ 商家端（独立界面，与用户端分离） ============
  {
    path: '/merchant/auth',
    name: 'merchant-auth',
    component: () => import('@/views/MerchantAuthView.vue')
  },
  {
    path: '/merchant',
    name: 'merchant-home',
    component: () => import('@/views/MerchantHomeView.vue')
  },
  {
    path: '/merchant/join',
    name: 'merchant-join',
    component: () => import('@/views/MerchantJoinView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
