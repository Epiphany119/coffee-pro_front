import axios from 'axios'
import type {
  AuthRequest,
  AuthResponse,
  MenuResponse,
  OrderRequest,
  OrderResponse,
  OrderRecord,
  MemberDashboard,
  Product
} from './types'

// ============================================================
// FIKA 后端地址解析（多 IP 自适应）
// ============================================================
// 优先级：
//   1. URL 参数 ?apiHost=...  （小程序主动指定）
//   2. localStorage 'fika_api_host'  （上一次探测成功的地址）
//   3. 探测候选 IP 列表，找到第一个连得上的
//   4. 最终兜底 http://192.168.31.33:8088
//
// 浏览器开发环境（localhost）走 /api 相对路径，由 Vite 代理转发
// ============================================================

const isInMiniProgramWebView = (() => {
  try {
    // @ts-ignore
    return typeof wx !== 'undefined' && !!wx.miniProgram
  } catch { return false }
})()

const CANDIDATE_HOSTS = [
  'http://192.168.31.33:8088',  // 公司 WiFi
  'http://192.168.55.207:8088', // 家里（手机热点）
  'http://127.0.0.1:8088'       // 本机兜底
]

const PROBE_TIMEOUT_MS = 1500

function getUrlParamHost(): string {
  try {
    const params = new URLSearchParams(window.location.search)
    const host = params.get('apiHost')
    if (host) {
      const normalized = host.startsWith('http') ? host : `http://${host}`
      try { localStorage.setItem('fika_api_host', normalized) } catch {}
      return normalized
    }
  } catch {}
  return ''
}

function getCachedHost(): string {
  try {
    return localStorage.getItem('fika_api_host') || ''
  } catch { return '' }
}

async function probeHost(host: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS)
    const res = await fetch(`${host}/api/menu`, {
      method: 'GET',
      signal: ctrl.signal,
      mode: 'cors'
    })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

async function detectApiHost(): Promise<string> {
  const fromUrl = getUrlParamHost()
  if (fromUrl) return fromUrl

  const cached = getCachedHost()
  // 先验证缓存是否还活着，活的直接用
  if (cached && await probeHost(cached)) return cached

  // 并发探测所有候选
  const results = await Promise.all(
    CANDIDATE_HOSTS.map(async (host) => ({ host, ok: await probeHost(host) }))
  )
  const alive = results.find(r => r.ok)
  if (alive) {
    try { localStorage.setItem('fika_api_host', alive.host) } catch {}
    return alive.host
  }
  // 全失败，回退第一个
  return CANDIDATE_HOSTS[0]
}

const API_BASE = isInMiniProgramWebView
  ? await detectApiHost()
  : ''  // 浏览器走 Vite 代理

if (isInMiniProgramWebView) {
  console.log('[fika-api] WebView using backend:', API_BASE)
}

const request = axios.create({
  baseURL: API_BASE + '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

request.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('[fika-api] request failed:', err.config?.url, err.message)
    if (err.response?.status === 0) {
      throw new Error('网络连接失败，请检查后端服务是否启动')
    }
    throw new Error(err.response?.data?.message || err.message || '请求失败')
  }
)

export const authApi = {
  login: (data: AuthRequest) =>
    request.post<any, AuthResponse>('/auth/login', data),

  register: (data: AuthRequest) =>
    request.post<any, AuthResponse>('/auth/register', data),

  getUser: (id: number) =>
    request.get<any, AuthResponse>(`/auth/user/${id}`)
}

export const menuApi = {
  getMenu: () =>
    request.get<any, MenuResponse>('/menu')
}

export const orderApi = {
  createOrder: (data: OrderRequest) =>
    request.post<any, OrderResponse>('/order', data),

  getUserOrders: (userId: number) =>
    request.get<any, OrderRecord[]>(`/orders/user/${userId}`),

  getGuestOrders: (guestId: string) =>
    request.get<any, OrderRecord[]>(`/orders/guest/${encodeURIComponent(guestId)}`),

  getAllOrders: () =>
    request.get<any, OrderRecord[]>('/orders'),

  cancelUserOrder: (id: number, action: string) =>
    request.post<any, OrderResponse>(`/order/user/${id}/action?action=${action}`),

  cancelGuestOrder: (id: number, action: string) =>
    request.post<any, OrderResponse>(`/order/guest/${id}/action?action=${action}`)
}

export const memberApi = {
  getDashboard: (userId: number) =>
    request.get<any, MemberDashboard>(`/member/${userId}/dashboard`)
}

export const favoriteApi = {
  getFavorites: (userId: number) =>
    request.get<any, Product[]>(`/favorites/${userId}`),

  addFavorite: (userId: number, productCode: string) =>
    request.post<any, { success: boolean; message: string }>('/favorites', { userId, productCode }),

  removeFavorite: (userId: number, productCode: string) =>
    request.delete<any, { success: boolean; message: string }>(`/favorites/${userId}/${productCode}`)
}
