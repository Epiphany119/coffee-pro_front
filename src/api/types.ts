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
  /** 店铺 id（座位按店隔离，用户端当前店铺） */
  storeId?: number | null
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
  /** 店铺 id（校验座位归属店铺） */
  storeId: number
  storeName: string
  seatNo: string
  code: string
  capacity: number
  status: SeatStatus
  /** 占用者用户 ID（null=无），用于归属校验 */
  assignedUserId: number | null
  /** 占用者游客 ID（null=无），用于归属校验 */
  assignedGuestId: string | null
  /** 分配时间（商家端展示） */
  assignedAt?: string | number[] | null
  /** 占用时间（商家端展示） */
  occupiedAt?: string | number[] | null
  qrContent: string | null
  qrBase64: string | null
}

export interface Product {
  id: number
  /** 归属店铺 id（按店隔离后商家端需要） */
  storeId?: number
  code: string
  name: string
  /** 分类外键（menu_category.id，与 categoryCode 一致） */
  categoryId?: number | null
  categoryCode: string
  basePrice: number
  /** 三档规格定价（商家可编辑；缺省时回退 basePrice） */
  priceSmall?: number | null
  priceMedium?: number | null
  priceLarge?: number | null
  description: string
  imageUrl: string
  temperature: string
  /** 是否上架（商家端可下架，用户端只显示上架商品） */
  available?: boolean
  allowedCondiments: string[]
  /** 定制规格单位（coffee/tea/ice → ml，dessert/food → g） */
  customUnit?: string
}

export interface Category {
  /** 类目 id（menu_category.id） */
  id?: number
  code: string
  name: string
  icon: string
  /** 归属：0=共享类目，N=商家自定义类目 */
  storeId?: number
}

export interface MenuResponse {
  products: Product[]
  sizes: string[]
  observers: string[]
  /** 定制规格计价规则（基准量：饮品 ml / 甜点轻食 g） */
  customRule?: { baseMl: number; baseG: number }
  /** 店铺可见类目：共享类目 + 该店自定义类目 */
  categories?: Category[]
}

export interface CartItemRequest {
  productCode: string
  size: string
  /** 定制尺寸输入（如 "300"），size=CUSTOM 时有效 */
  customSize?: string
  condiments: string[]
  quantity: number
}

export interface OrderRequest {
  items: CartItemRequest[]
  userId: number | null
  guestId: string | null
  /** 下单店铺 id（用户端当前店铺） */
  storeId: number | null
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
  storeId?: number
  beverageName: string
  size: string
  /** 定制尺寸输入（如 "300"），size=CUSTOM 时有效 */
  customSize?: string
  condiments: string
  originalPrice: number
  finalPrice: number
  status: string
  createdAt: string | number[]
  categoryCode?: string
  /** user=用户订单 / guest=游客订单 */
  orderType?: string
  /** PICKUP 到店自取 / DINE_IN 店内用餐 */
  fulfillmentType?: string
  note?: string
  estimatedReadyTime?: string
}

export interface Coupon {
  code: string
  name: string
  minimum: number
  discount: number
  description: string
}

/** 卡券包里的券（积分兑换所得） */
export interface Voucher {
  id: number
  voucherNo: string
  name: string
  discount: number
  minimum: number
  status: number
  source: string
  createdAt: string
  expiresAt?: string | null
}

/** 积分兑换项（接口 /membership/redeem-items 下发） */
export interface RedeemItem {
  code: string
  name: string
  costPoints: number
  /** 拆分明细：兑换后按张发放 */
  grants?: { name: string; discount: number; count: number }[]
}

/** 积分兑换结果 */
export interface RedeemResult {
  itemCode: string
  itemName: string
  costPoints: number
  remainingPoints: number
  vouchers: Voucher[]
  message: string
}

export interface MemberDashboard {
  nickname: string
  totalSpent: number
  /** 累计已省金额（已完成订单 原价-实付 之和） */
  totalSaved: number
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
  /** 定制尺寸输入（如 "300"），size=CUSTOM 时有效 */
  customSize?: string
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
  LARGE: '大份',
  CUSTOM: '定制'
}

/** 定制规格单位：coffee/tea/ice → ml（毫升），dessert/food → g（克） */
export function customUnitOf(categoryCode?: string): string {
  return categoryCode === 'coffee' || categoryCode === 'tea' || categoryCode === 'ice' ? 'ml' : 'g'
}

/** 规格展示文本：定制显示为"定制 300ml"，其余按 SIZE_LABELS */
export function sizeText(o: { size?: string; customSize?: string; categoryCode?: string }): string {
  if (o.size === 'CUSTOM') {
    return o.customSize ? `定制 ${o.customSize}${customUnitOf(o.categoryCode)}` : '定制'
  }
  return SIZE_LABELS[o.size || 'MEDIUM'] || o.size || ''
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
  /** 绑定的店名（入驻后非空） */
  storeName?: string | null
  status: MerchantStatus
}

export interface MerchantRegisterRequest {
  /** 用户端账号（coffee_user.username），须已注册且未注册过商家 */
  username: string
  /** 与用户端登录密码一致 */
  password: string
  nickname?: string
  phone?: string
  /** 入驻现有店铺时必填（激活该店预分配的占位商家记录并绑定）；为空 = 开新店模式 */
  storeId?: number
}

export interface MerchantLoginRequest {
  merchantNo: string
  password: string
}

/** 商家端菜单新增/编辑请求（对应后端 MenuItemRequest） */
export interface StoreMenuRequest {
  code?: string
  name: string
  /** 分类外键（menu_category.id；新建类目后提交新类目 id） */
  categoryId?: number | null
  categoryCode: string
  basePrice: number
  /** 三档规格定价（缺省回退 basePrice） */
  priceSmall?: number | null
  priceMedium?: number | null
  priceLarge?: number | null
  description?: string
  imageUrl?: string
  temperature?: string
  available: boolean
}

/** 商家创建自定义类目请求（对应后端 MenuCategoryRequest） */
export interface CategoryRequest {
  name: string
  icon?: string
}

/** 商家端工作台数据（GET /api/merchant/{id}/dashboard） */
export interface MerchantDashboard {
  store: StoreResponse
  todayRevenue: number
  todayOrders: number
  pendingOrders: number
  weekSales: { day: string; amount: number }[]
  recentOrders: OrderRecord[]
}
