import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthResponse, Product, CartItem, Coupon, MemberDashboard, OrderRecord } from '@/api/types'

export const useAppStore = defineStore('app', () => {
  // --- Auth ---
  const currentUser = ref<AuthResponse | null>(null)

  const isLoggedIn = computed(() => currentUser.value?.success === true && currentUser.value?.id != null)

  function setUser(user: AuthResponse) {
    currentUser.value = user
  }

  function logout() {
    currentUser.value = null
    cart.value = []
    selectedCoupon.value = null
    memberDashboard.value = null
    favoriteProducts.value = []
  }

  // --- Guest ---
  function getGuestId(): string {
    let id = localStorage.getItem('fikaGuestId')
    if (!id) {
      id = `guest_${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('fikaGuestId', id)
    }
    return id
  }

  // --- Menu ---
  const products = ref<Product[]>([])
  const categories = ref<{ code: string; name: string; icon: string }[]>([])
  const activeCategory = ref('coffee')

  function setMenu(data: { products: Product[] }) {
    products.value = data.products || []
    const codes = [...new Set(data.products.map((p: Product) => p.categoryCode))]
    const CATEGORY_META: Record<string, [string, string]> = {
      coffee: ['咖啡', '☕'], tea: ['茶饮', '🍵'],
      dessert: ['甜点', '🍰'], food: ['轻食', '🥪'], ice: ['冰沙', '🧊']
    }
    categories.value = codes.map(code => ({
      code,
      name: (CATEGORY_META[code] || [code, '🍴'])[0],
      icon: (CATEGORY_META[code] || [code, '🍴'])[1]
    }))
    if (!codes.includes(activeCategory.value)) {
      activeCategory.value = codes[0]
    }
  }

  // --- Cart ---
  const cart = ref<CartItem[]>([])

  function addToCart(item: CartItem) {
    const exist = cart.value.find(
      c => c.productCode === item.productCode && c.size === item.size && c.condiments.join('|') === item.condiments.join('|')
    )
    if (exist) {
      exist.quantity += item.quantity
    } else {
      cart.value.push(item)
    }
  }

  function updateCartItem(index: number, delta: number) {
    cart.value[index].quantity += delta
    if (cart.value[index].quantity <= 0) {
      cart.value.splice(index, 1)
    }
  }

  function clearCart() {
    cart.value = []
    selectedCoupon.value = null
  }

  // --- Coupon ---
  const selectedCoupon = ref<Coupon | null>(null)

  // --- Member ---
  const memberDashboard = ref<MemberDashboard | null>(null)

  function updateMemberDashboard(dashboard: MemberDashboard) {
    memberDashboard.value = dashboard
  }

  function updateUserSpent(spent: number, level: string) {
    if (currentUser.value) {
      currentUser.value.totalSpent = spent
      currentUser.value.memberLevel = level
    }
  }

  // --- Orders ---
  const orders = ref<OrderRecord[]>([])
  const orderFilter = ref('all')

  function setOrders(data: OrderRecord[]) {
    orders.value = data
  }

  // --- Favorites ---
  const favoriteProducts = ref<Product[]>([])

  async function loadFavorites() {
    if (!isLoggedIn.value || !currentUser.value?.id) {
      favoriteProducts.value = []
      return
    }
    const { favoriteApi } = await import('@/api')
    try {
      const data = await favoriteApi.getFavorites(currentUser.value.id)
      favoriteProducts.value = data || []
    } catch (e) {
      console.warn('load favorites failed', e)
    }
  }

  async function toggleFavorite(product: Product) {
    if (!isLoggedIn.value || !currentUser.value?.id) return
    const { favoriteApi } = await import('@/api')
    const exists = favoriteProducts.value.some(p => p.code === product.code)
    try {
      if (exists) {
        await favoriteApi.removeFavorite(currentUser.value.id, product.code)
        favoriteProducts.value = favoriteProducts.value.filter(p => p.code !== product.code)
      } else {
        await favoriteApi.addFavorite(currentUser.value.id, product.code)
        favoriteProducts.value.unshift(product)
      }
    } catch (e) {
      console.warn('toggle favorite failed', e)
    }
  }

  function isFavorite(code: string): boolean {
    return favoriteProducts.value.some(p => p.code === code)
  }

  function identityKey() {
    return currentUser.value ? `u${currentUser.value.id}` : `g${getGuestId()}`
  }

  function getFavorites(): Set<string> {
    try {
      const raw = localStorage.getItem(`fikaFavorites_${identityKey()}`)
      return new Set(raw ? JSON.parse(raw) : [])
    } catch {
      return new Set()
    }
  }

  function saveFavorites(set: Set<string>) {
    localStorage.setItem(`fikaFavorites_${identityKey()}`, JSON.stringify([...set]))
  }

  // --- Member rate ---
  function memberRate(): number {
    const spent = currentUser.value?.totalSpent || 0
    if (spent >= 500) return 0.7
    if (spent >= 300) return 0.85
    return 1
  }

  return {
    currentUser, isLoggedIn, setUser, logout,
    getGuestId,
    products, categories, activeCategory, setMenu,
    cart, addToCart, updateCartItem, clearCart,
    selectedCoupon,
    memberDashboard, updateMemberDashboard, updateUserSpent,
    orders, orderFilter, setOrders,
    favoriteProducts, loadFavorites, toggleFavorite, isFavorite,
    getFavorites, saveFavorites,
    memberRate
  }
})
