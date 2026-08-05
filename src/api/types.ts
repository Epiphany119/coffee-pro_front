export interface AuthRequest {
  username: string
  password: string
  nickname?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  id: number | null
  username: string | null
  nickname: string | null
  totalSpent: number
  memberLevel: string | null
}

export interface ForgotPasswordRequest {
  username: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface ForgotPasswordResponse {
  success: boolean
  message: string
  token: string
}

export interface AssignSeatRequest {
  peopleCount: number
  userId?: number | null
  guestId?: string | null
}

export interface OccupySeatRequest {
  userId?: number | null
  guestId?: string | null
}

export type SeatStatus = 'FREE' | 'ASSIGNED' | 'OCCUPIED'

export interface SeatResponse {
  seatId: number
  storeName: string
  seatNo: string
  code: string
  capacity: number
  status: SeatStatus
  /** 占用者用户 ID（null=无），用于归属校验 */
  assignedUserId: number | null
  /** 占用者游客 ID（null=无），用于归属校验 */
  assignedGuestId: string | null
  qrContent: string | null
  qrBase64: string | null
}

export interface Product {
  id: number
  code: string
  name: string
  categoryCode: string
  basePrice: number
  description: string
  imageUrl: string
  temperature: string
  allowedCondiments: string[]
}

export interface Category {
  code: string
  name: string
  icon: string
}

export interface MenuResponse {
  products: Product[]
  sizes: string[]
  observers: string[]
}

export interface CartItemRequest {
  productCode: string
  size: string
  condiments: string[]
  quantity: number
}

export interface OrderRequest {
  items: CartItemRequest[]
  userId: number | null
  guestId: string | null
  couponCode?: string | null
  fulfillmentType: string
  note?: string
}

export interface OrderItem {
  productCode: string
  beverageName: string
  categoryCode: string
  size: string
  condiments: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface OrderResponse {
  id: number
  beverageName: string
  originalPrice: number
  finalPrice: number
  pricingStrategy: string
  status: string
  message: string
  totalSpent: number
  memberLevel: string
  totalCups: number
  items: OrderItem[]
  categoryCode: string
  memberDiscount: number
  couponDiscount: number
  couponName: string
  earnedPoints: number
}

export interface OrderRecord {
  id: number
  beverageName: string
  size: string
  condiments: string
  originalPrice: number
  finalPrice: number
  status: string
  createdAt: string | number[]
  categoryCode?: string
}

export interface Coupon {
  code: string
  name: string
  minimum: number
  discount: number
  description: string
}

export interface MemberDashboard {
  nickname: string
  totalSpent: number
  memberLevel: string
  points: number
  pointsLevel: string
  nextThreshold: number
  amountToNext: number
  progress: number
  coupons: Coupon[]
}

export interface CartItem {
  productCode: string
  productName: string
  categoryCode: string
  size: string
  condiments: string[]
  quantity: number
  unitPrice: number
}

export interface CondimentOption {
  code: string
  name: string
  price: number
}

export const CONDIMENTS: Record<string, CondimentOption> = {
  mocha:       { code: 'mocha',        name: '摩卡',        price: 6 },
  whip:        { code: 'whip',          name: '奶油',        price: 4 },
  caramel:     { code: 'caramel',       name: '焦糖',        price: 5 },
  vanilla:     { code: 'vanilla',       name: '香草',        price: 3 },
  ice:         { code: 'ice',           name: '加冰',        price: 2 },
  oat_milk:    { code: 'oat_milk',     name: '燕麦奶',      price: 4 },
  taro_ball:   { code: 'taro_ball',    name: '芋圆',        price: 5 },
  coconut:     { code: 'coconut',       name: '椰果',        price: 3 },
  cheese_foam: { code: 'cheese_foam',  name: '芝士奶盖',    price: 6 },
  extra_sugar: { code: 'extra_sugar',  name: '加糖',        price: 1 }
}

export const SIZE_LABELS: Record<string, string> = {
  SMALL: '小份',
  MEDIUM: '中份',
  LARGE: '大份'
}

export const SIZE_EXTRAS: Record<string, Record<string, number>> = {
  coffee:   { SMALL: 0, MEDIUM: 2, LARGE: 4 },
  tea:      { SMALL: 0, MEDIUM: 2, LARGE: 4 },
  dessert:  { SMALL: 0, MEDIUM: 1, LARGE: 2 },
  food:     { SMALL: 0, MEDIUM: 1, LARGE: 2 },
  ice:      { SMALL: 0, MEDIUM: 2, LARGE: 4 }
}

export const CATEGORY_META: Record<string, [string, string]> = {
  coffee:   ['咖啡',   '☕'],
  tea:      ['茶饮',   '🍵'],
  dessert:  ['甜点',   '🍰'],
  food:     ['轻食',   '🥪'],
  ice:      ['冰沙',   '🧊']
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING:   '待制作',
  PREPARING:  '制作中',
  COMPLETED:  '已完成',
  CANCELED:   '已取消'
}

// ============================================================
// 店铺 / 商家模块
// ============================================================

export type StoreStatus = 'OPEN' | 'CLOSED'

export interface StoreResponse {
  storeId: number
  code: string
  name: string
  address: string | null
  phone: string | null
  businessHours: string | null
  status: StoreStatus
  merchantId: number | null
}

export interface StoreRequest {
  code?: string
  name?: string
  address?: string
  phone?: string
  businessHours?: string
  status?: StoreStatus
  merchantId?: number
}

export type MerchantStatus = 'ACTIVE' | 'DISABLED'

export interface MerchantResponse {
  success: boolean
  message: string
  id: number
  /** 商家编号 sj-开头（登录账号） */
  merchantNo: string
  nickname: string | null
  phone: string | null
  status: MerchantStatus
}

export interface MerchantRegisterRequest {
  password: string
  nickname?: string
  phone?: string
}

export interface MerchantLoginRequest {
  merchantNo: string
  password: string
}
