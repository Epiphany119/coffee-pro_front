import axios from 'axios'
import type {
  AuthRequest,
  LoginChallenge,
  AuthResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  AssignSeatRequest,
  OccupySeatRequest,
  SeatResponse,
  MenuResponse,
  OrderRequest,
  OrderResponse,
  OrderRecord,
  MemberDashboard,
  Product,
  MerchantRegisterRequest,
  MerchantLoginRequest,
  MerchantResponse,
  MerchantDashboard,
  StoreMenuRequest,
  StoreRequest,
  StoreResponse,
  Category,
  CategoryRequest,
  StoreRecommendation,
  Voucher,
  RedeemItem,
  RedeemResult,
  AfterSaleRecord,
  FeedbackRecord,
  PaymentRecord,
  TopupProgress
  , FlashSaleActivity
  , FlashSaleClaim
  , FlashSaleClaimRecord
  , GrowthAgentAnalysis
  , GrowthAgentAction
  , CustomerAgentPlan
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

// 浏览器走 Vite 代理（baseURL 为空）；小程序 WebView 需探测后端地址
const API_BASE = ''

const request = axios.create({
  baseURL: API_BASE + '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

/**
 * 每次请求从会话快照读取令牌，避免 store 初始化顺序和刷新恢复时出现循环依赖。
 * 登录用户优先于商家；游客令牌只保存在 sessionStorage，关闭标签页即失效。
 */
function readAccessToken(preferMerchant = false): string | null {
  try {
    const user = JSON.parse(localStorage.getItem('fikaSession') || 'null')
    const merchant = JSON.parse(localStorage.getItem('fikaMerchant') || 'null')
    if (preferMerchant && merchant?.accessToken) return merchant.accessToken
    if (user?.accessToken) return user.accessToken
    if (merchant?.accessToken) return merchant.accessToken
    return sessionStorage.getItem('fikaGuestToken')
  } catch {
    return null
  }
}

request.interceptors.request.use((config) => {
  const path = config.url || ''
  // 登录、注册、找回密码和游客建会话都是公开接口。绝不能附带旧 Token：
  // 否则后端会在进入登录控制器前校验到已过期 Token，表现为“重新登录也登录不上”。
  const publicSessionRequest = path === '/auth/login'
    || path === '/auth/register'
    || path === '/auth/forgot-password'
    || path === '/auth/reset-password'
    || path === '/auth/login-challenge'
    || path === '/merchant/login'
    || path === '/merchant/register'
    || path === '/guest/session'
  if (publicSessionRequest) {
    delete config.headers.Authorization
    return config
  }
  // 商家端订单、座位、店铺接口也必须使用商家令牌；用户与商家同时登录时不能误带用户令牌。
  const merchantRequest = path.startsWith('/merchant/')
    || path.startsWith('/store/')
    || path.startsWith('/seat/list')
    || (path === '/orders' && !!config.params?.storeId)
    || (path.startsWith('/orders/') && path.includes('storeId='))
  const token = readAccessToken(merchantRequest)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// WebView 场景：异步探测后端地址（构建目标不支持顶层 await，探测完成后写入 baseURL）
if (isInMiniProgramWebView) {
  detectApiHost().then((host) => {
    request.defaults.baseURL = host + '/api'
    console.log('[fika-api] WebView using backend:', host)
  })
}

request.interceptors.response.use(
  (res) => {
    const body = res.data
    return body && body.data ? body.data : body
  },
  (err) => {
    console.error('[fika-api] request failed:', err.config?.url, err.message)
    // 令牌过期后不保留无效快照，下一次登录不会再把它带到公开登录接口。
    // 按请求域清理，避免一个身份失效时误清除另一个独立面板的会话。
    if (err.response?.status === 401) {
      try {
        const path = err.config?.url || ''
        if (path.startsWith('/merchant/') || path.startsWith('/store/')) {
          localStorage.removeItem('fikaMerchant')
          localStorage.removeItem('fikaMerchantStore')
        } else {
          localStorage.removeItem('fikaSession')
          sessionStorage.removeItem('fikaGuestToken')
        }
      } catch {}
    }
    if (err.response?.status === 0) {
      throw new Error('网络连接失败，请检查后端服务是否启动')
    }
    throw new Error(err.response?.data?.message || err.message || '请求失败')
  }
)

export const authApi = {
  /** 后端签发的短时、一次性验证码；登录成功或刷新后即作废。 */
  loginChallenge: () => request.get<any, LoginChallenge>('/auth/login-challenge'),

  login: (data: AuthRequest) =>
    request.post<any, AuthResponse>('/auth/login', data),

  register: (data: AuthRequest) =>
    request.post<any, AuthResponse>('/auth/register', data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    request.post<any, ForgotPasswordResponse>('/auth/forgot-password', data),

  resetPassword: (data: ResetPasswordRequest) =>
    request.post<any, AuthResponse>('/auth/reset-password', data),

  getUser: (id: number) =>
    request.get<any, AuthResponse>(`/auth/user/${id}`),

  /** 用户店铺偏好（数据库存储，非浏览器） */
  getPreference: (id: number) =>
    request.get<any, { success: boolean; lastStoreId: number | null }>(`/auth/user/${id}/preference`),

  updatePreference: (id: number, storeId: number | null) =>
    request.put<any, { success: boolean; message: string }>(`/auth/user/${id}/preference`, { storeId })
}

export const locationApi = {
  saveUserLocation: (userId: number, latitude: number, longitude: number) =>
    request.post<any, { success: boolean }>('/location/user', { userId, latitude, longitude }),
  recommend: (latitude: number, longitude: number, limit = 5) =>
    request.get<any, StoreRecommendation[]>('/location/recommend', { params: { latitude, longitude, limit } })
}

/** 游客会话（未登录身份由后端签发入库，前端仅内存持有） */
export const guestApi = {
  createSession: async () => {
    const result = await request.post<any, { success: boolean; guestId: string; accessToken?: string }>('/guest/session')
    try {
      if (result.accessToken) sessionStorage.setItem('fikaGuestToken', result.accessToken)
    } catch {}
    return result
  }
}

export const menuApi = {
  getMenu: (storeId?: number) =>
    request.get<any, MenuResponse>('/menu', { params: { storeId } })
}

/** 用户侧检索与个性化推荐（由服务端按当前身份和店铺计算） */
export const discoveryApi = {
  search: (storeId: number, keyword: string, limit = 12) =>
    request.get<any, Product[]>('/discovery/search', { params: { storeId, keyword, limit } }),
  recommendations: (params: { storeId: number; userId?: number | null; guestId?: string | null; limit?: number }) =>
    request.get<any, Product[]>('/discovery/recommendations', { params })
}

export const flashSaleApi = {
  current: (storeId: number) => request.get<any, FlashSaleActivity[]>('/flash-sales/current', { params: { storeId } }),
  claim: (activityId: number, data: { userId?: number | null; guestId?: string | null }) =>
    request.post<any, FlashSaleClaim>(`/flash-sales/${activityId}/claim`, data),
  claims: (params: { userId?: number | null; guestId?: string | null }) =>
    request.get<any, FlashSaleClaimRecord[]>('/flash-sales/claims', { params })
}

/** 顾客点单 Agent：只生成受控菜单方案，确认下单仍走订单/支付的正式链路。 */
export const customerAgentApi = {
  plan: (data: { storeId: number; userId?: number | null; guestId?: string | null; message: string }) =>
    request.post<any, CustomerAgentPlan>('/customer-agent/plan', data),
  /** 只提交一次性方案令牌；商品行由服务端从已审计的方案快照读取。 */
  confirm: (data: { planToken: string; storeId: number; userId?: number | null; guestId?: string | null; fulfillmentType: string; includeAddOn?: boolean }, idempotencyKey = createIdempotencyKey()) =>
    request.post<any, OrderResponse>('/customer-agent/plans/confirm', data, { headers: { 'Idempotency-Key': idempotencyKey } })
}

export const seatApi = {
  /** 按人数分配空闲座位，返回座位信息与落座二维码 */
  assign: (data: AssignSeatRequest) =>
    request.post<any, SeatResponse>('/seat/assign', data),

  /** 解析二维码内容（座位编号） */
  resolve: (code: string) =>
    request.get<any, SeatResponse>('/seat/resolve', { params: { code } }),

  /** 确认落座 */
  occupy: (id: number, data: OccupySeatRequest) =>
    request.post<any, SeatResponse>(`/seat/${id}/occupy`, data),

  /** 离座释放 */
  leave: (id: number) =>
    request.post<any, SeatResponse>(`/seat/${id}/leave`),

  /** 全部座位状态（storeId 为空查全部） */
  list: (storeId?: number) =>
    request.get<any, SeatResponse[]>('/seat/list', { params: { storeId } }),

  /** 按身份查当前店已落座座位（幽灵占座恢复：本地无座位时找回自己占的座） */
  occupied: (params: { storeId: number; userId?: number; guestId?: string }) =>
    request.get<any, SeatResponse[]>('/seat/occupied', { params })
}

export const orderApi = {
  /**
   * 每次用户确认下单生成一枚幂等键；网络重试应复用同一枚 key，后端会返回原订单。
   * 默认值适用于一次正常提交，调用方可传入 key 实现显式重试。
   */
  createOrder: (data: OrderRequest, idempotencyKey = createIdempotencyKey()) =>
    request.post<any, OrderResponse>('/order', data, { headers: { 'Idempotency-Key': idempotencyKey } }),

  getUserOrders: (userId: number) =>
    request.get<any, OrderRecord[]>(`/orders/user/${userId}`),

  getGuestOrders: (guestId: string) =>
    request.get<any, OrderRecord[]>(`/orders/guest/${encodeURIComponent(guestId)}`),

  getAllOrders: () =>
    request.get<any, OrderRecord[]>('/orders'),

  cancelUserOrder: (id: number, action: string, userId: number) =>
    request.post<any, OrderResponse>(`/order/user/${id}/action?action=${action}&userId=${userId}`),

  cancelGuestOrder: (id: number, action: string, guestId: string) =>
    request.post<any, OrderResponse>(`/order/guest/${id}/action?action=${action}&guestId=${encodeURIComponent(guestId)}`),

  /** 商家端：店铺订单列表（status 空 = 全部） */
  getStoreOrders: (storeId: number, status?: string) =>
    request.get<any, OrderRecord[]>('/orders', { params: { storeId, status } }),

  /** 商家端：订单状态操作（start 接单 / complete 完成 / cancel 取消） */
  merchantAction: (orderId: number, action: string, storeId: number) =>
    request.post<any, OrderResponse>(`/orders/${orderId}/action?action=${action}&storeId=${storeId}`)
}

export const notificationApi = {
  getUserNotifications: (userId: number) => request.get<any, any[]>(`/notifications/user/${userId}`)
}

function createIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {}
  return `fika-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

export const afterSaleApi = {
  /** 创建售后单（仅已完成订单，同订单防重复） */
  createAfterSale: (data: { userId: number; orderId: number; type: string; reason: string }) =>
    request.post<any, AfterSaleRecord>('/after-sale', data),

  /** 我的售后单列表 */
  getMyAfterSales: (userId: number) =>
    request.get<any, AfterSaleRecord[]>(`/after-sale/user/${userId}`),

  /** 商家售后工作台 */
  getStoreAfterSales: (storeId: number, status?: string) =>
    request.get<any, AfterSaleRecord[]>('/merchant/after-sales', { params: { storeId, status } }),

  process: (id: number, storeId: number, data: { status: string; handlerNote: string }) =>
    request.put<any, AfterSaleRecord>(`/merchant/after-sales/${id}`, data, { params: { storeId } }),

  /** 提交订单反馈（仅已完成订单） */
  createFeedback: (data: { userId: number; orderId: number; content: string; rating?: number }) =>
    request.post<any, FeedbackRecord>('/after-sale/feedback', data),

  /** 我的反馈列表 */
  getMyFeedbacks: (userId: number) =>
    request.get<any, FeedbackRecord[]>(`/after-sale/feedback/user/${userId}`),

  /** 按订单查反馈列表（商家端订单明细展示用） */
  getOrderFeedbacks: (orderId: number) =>
    request.get<any, FeedbackRecord[]>(`/after-sale/feedback/order/${orderId}`),

  /** 按商品 id 查反馈列表（点餐界面商品下方展示用） */
  getProductFeedbacks: (productId: number) =>
    request.get<any, FeedbackRecord[]>(`/after-sale/feedback/product/${productId}`)
}

/** 凑单（购物袋满减进度条 + 凑单推荐） */
export const topupApi = {
  /** 凑单进度：购物袋金额距最近满减门槛还差多少（reached=true 已达标） */
  getProgress: (params: { userId?: number | null; amount: number; couponCode?: string | null }) =>
    request.get<any, TopupProgress>('/topup/progress', { params }),

  /** 凑单推荐：仅推最低可买价 ≤ maxPrice 的凑单品（topup=1，按价格升序） */
  getProducts: (storeId: number, maxPrice: number) =>
    request.get<any, Product[]>(`/topup/products`, { params: { storeId, maxPrice } })
}

export const payApi = {
  /** 为订单创建支付单（幂等：同订单已有支付单直接返回） */
  createPayment: (orderId: number) =>
    request.post<any, PaymentRecord>('/pay/create', { orderId }),
  /** 发起支付（MOCK 直接成功；微信/支付宝/银行未接入返回 501） */
  pay: (paymentNo: string, channel: string) =>
    request.post<any, PaymentRecord>('/pay/pay', { paymentNo, channel }),

  /** 按支付单号查询 */
  getByPaymentNo: (paymentNo: string) =>
    request.get<any, PaymentRecord>(`/pay/${paymentNo}`),

  /** 按订单查询支付单（"去支付"入口拉取 paymentNo） */
  getByOrderId: (orderId: number) =>
    request.get<any, PaymentRecord>(`/pay/order/${orderId}`)
}

export const memberApi = {
  getDashboard: (userId: number) =>
    request.get<any, MemberDashboard>(`/member/${userId}/dashboard`)
}

/** 会员体系（等级/积分兑换/权益/卡券包） */
export const membershipApi = {
  getCard: (userId: number) =>
    request.get<any, any>(`/membership/card`, { params: { userId } }),

  initCard: (userId: number) =>
    request.post<any, any>(`/membership/card/init`, { userId }),

  getBenefits: (userId: number) =>
    request.get<any, any[]>(`/membership/benefits`, { params: { userId } }),

  getLevelRules: () =>
    request.get<any, any>(`/membership/level-rules`),

  /** 积分兑换项列表（规则后端下发，前端免硬编码） */
  getRedeemItems: () =>
    request.get<any, RedeemItem[]>(`/membership/redeem-items`),

  redeemPoints: (userId: number, itemCode: string) =>
    request.post<any, RedeemResult>(`/membership/points/redeem`, { userId, itemCode }),

  getVouchers: (userId: number) =>
    request.get<any, Voucher[]>(`/membership/vouchers`, { params: { userId } })
}

/** 收藏（登录用户按 userId、游客按 guestId，均由后端入库隔离） */
export const favoriteApi = {
  getFavorites: (params: { userId?: number; guestId?: string }) =>
    request.get<any, Product[]>('/favorites', { params }),

  addFavorite: (params: { userId?: number; guestId?: string; productCode: string }) =>
    request.post<any, { success: boolean; message: string }>('/favorites', params),

  removeFavorite: (params: { userId?: number; guestId?: string; productCode: string }) =>
    request.delete<any, { success: boolean; message: string }>('/favorites', { params }),

  /** 游客登录后把游客收藏合并到用户账号 */
  merge: (userId: number, guestId: string) =>
    request.post<any, { success: boolean; message: string }>('/favorites/merge', { userId, guestId })
}

// ============================================================
// 商家 / 店铺模块（商家界面）
// ============================================================

export const merchantApi = {
  /** 商家注册（商家编号 sj-xxx 由服务端生成） */
  register: (data: MerchantRegisterRequest) =>
    request.post<any, MerchantResponse>('/merchant/register', data),

  /** 商家登录（商家编号 + 密码） */
  login: (data: MerchantLoginRequest) =>
    request.post<any, MerchantResponse>('/merchant/login', data),

  /** 商家信息 */
  getMerchant: (id: number) =>
    request.get<any, MerchantResponse>(`/merchant/${id}`),

  updateProfile: (id: number, data: { nickname?: string; phone?: string }) =>
    request.put<any, MerchantResponse>(`/merchant/${id}/profile`, data),

  changePassword: (id: number, data: { oldPassword: string; newPassword: string }) =>
    request.put<any, { success: boolean; message: string }>(`/merchant/${id}/password`, data),

  /** 我的店铺（登录后入驻状态） */
  myStores: (id: number) =>
    request.get<any, StoreResponse[]>(`/merchant/${id}/stores`),

  /** 商家工作台：店铺概览 + 今日统计 + 营业额柱状图(range: 7d/14d/28d/12w) + 近期订单 */
  dashboard: (merchantId: number, range?: string) =>
    request.get<any, MerchantDashboard>(`/merchant/${merchantId}/dashboard`, { params: { range } }),

  /** 店长增长 Agent：受控数据分析、待审批营销动作与审计记录。 */
  growthAgentAnalyze: (merchantId: number, message: string) =>
    request.post<any, GrowthAgentAnalysis>(`/merchant/${merchantId}/growth-agent/analyze`, { message }),
  growthAgentCreateAction: (merchantId: number, data: { actionType: string; title: string; proposal: Record<string, unknown> }) =>
    request.post<any, { id: number; status: string; message: string }>(`/merchant/${merchantId}/growth-agent/actions`, data),
  growthAgentExecuteAction: (merchantId: number, actionId: number) =>
    request.post<any, { id: number; status: string; affectedUsers: number; message: string }>(`/merchant/${merchantId}/growth-agent/actions/${actionId}/execute`),
  growthAgentActions: (merchantId: number) =>
    request.get<any, GrowthAgentAction[]>(`/merchant/${merchantId}/growth-agent/actions`)
}

export const storeApi = {
  /** 创建店铺（开新店，可带 merchantId 直接归属） */
  create: (data: StoreRequest) =>
    request.post<any, StoreResponse>('/store', data),

  /** 全部店铺列表 */
  list: () =>
    request.get<any, StoreResponse[]>('/store/list'),

  /** 可入驻店铺列表（21 家种子店中未入驻的） */
  available: () =>
    request.get<any, StoreResponse[]>('/store/available'),

  /** 营业中店铺列表（用户端左上角选店） */
  open: () =>
    request.get<any, StoreResponse[]>('/store/open'),

  /** 入驻已有店铺 */
  bind: (storeId: number, merchantId: number) =>
    request.post<any, StoreResponse>(`/store/${storeId}/bind`, null, { params: { merchantId } }),

  /** 更新店铺 */
  update: (storeId: number, data: StoreRequest) =>
    request.put<any, StoreResponse>(`/store/${storeId}`, data),

  /** 商家端：店铺菜单全量（含下架商品） */
  menuList: (storeId: number) =>
    request.get<any, Product[]>(`/store/${storeId}/menu`),

  /** 商家端：新增商品（店内 code 唯一） */
  menuCreate: (storeId: number, data: StoreMenuRequest) =>
    request.post<any, Product>(`/store/${storeId}/menu`, data),

  /** 商家端：编辑商品（改价/改名/上下架） */
  menuUpdate: (storeId: number, productId: number, data: Partial<StoreMenuRequest>) =>
    request.put<any, Product>(`/store/${storeId}/menu/${productId}`, data),

  /** 店铺可见类目：共享类目 + 该店自定义类目 */
  categories: (storeId: number) =>
    request.get<any, Category[]>(`/store/${storeId}/categories`),

  /** 商家端：创建自定义类目（仅本店可见） */
  createCategory: (storeId: number, data: CategoryRequest) =>
    request.post<any, Category>(`/store/${storeId}/category`, data),

  /** 商家端：上传商品图片（本地磁盘存储），返回 { url } */
  uploadMenuImage: async (storeId: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post(`/api/store/${storeId}/menu/image`, fd, {
      timeout: 30000,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(readAccessToken() ? { Authorization: `Bearer ${readAccessToken()}` } : {})
      }
    })
    const body = res.data
    return body && body.data ? body.data : body
  }
}
