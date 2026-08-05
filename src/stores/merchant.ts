import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MerchantResponse, StoreResponse } from '@/api/types'

/**
 * 商家会话（与用户端 app store 完全隔离）
 * 持久化：fikaMerchant（商家信息）/ fikaMerchantStore（已入驻店铺）
 */
export const useMerchantStore = defineStore('merchant', () => {
  const merchant = ref<MerchantResponse | null>(null)
  /** 已入驻的店铺（一商一店，null = 未入驻） */
  const joinedStore = ref<StoreResponse | null>(null)

  const isLoggedIn = computed(() => merchant.value?.success === true && merchant.value?.id != null)
  const hasJoined = computed(() => joinedStore.value != null)

  function setMerchant(m: MerchantResponse) {
    merchant.value = m
    try { localStorage.setItem('fikaMerchant', JSON.stringify(m)) } catch {}
  }

  function setJoinedStore(s: StoreResponse | null) {
    joinedStore.value = s
    try {
      if (s) localStorage.setItem('fikaMerchantStore', JSON.stringify(s))
      else localStorage.removeItem('fikaMerchantStore')
    } catch {}
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem('fikaMerchant')
      if (raw) {
        const m = JSON.parse(raw)
        if (m && typeof m === 'object' && m.id != null && m.merchantNo) merchant.value = m
      }
      const rawStore = localStorage.getItem('fikaMerchantStore')
      if (rawStore) {
        const s = JSON.parse(rawStore)
        if (s && typeof s === 'object' && s.storeId != null) joinedStore.value = s
      }
    } catch {
      clear()
    }
  }

  function clear() {
    merchant.value = null
    joinedStore.value = null
    try {
      localStorage.removeItem('fikaMerchant')
      localStorage.removeItem('fikaMerchantStore')
    } catch {}
  }

  return { merchant, joinedStore, isLoggedIn, hasJoined, setMerchant, setJoinedStore, loadSession, clear }
})
