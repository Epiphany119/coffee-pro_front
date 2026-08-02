<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

const nickname = computed(() => {
  const u = store.currentUser
  if (!u) return ''
  return u.nickname || u.username || ''
})

const firstChar = computed(() => nickname.value.slice(0, 1))
const memberLevel = computed(() => store.currentUser?.memberLevel || '普通会员')
const totalSpent = computed(() => store.currentUser?.totalSpent || 0)

function fmtMoney(v: number) {
  return `¥${Number(v || 0).toFixed(2)}`
}

const emit = defineEmits<{
  logout: []
  'go-member': []
  'open-login': []
  'open-register': []
}>()
</script>

<template>
  <header class="site-header">
    <div class="logo">
      <span class="brand-mark">F</span><span>FIKA</span>
    </div>
    <div class="header-location">
      <span>●</span>
      <div>
        <b>FIKA 静安店</b>
        <small>现在营业 · 约 12 分钟取餐</small>
      </div>
    </div>
    <div class="user-bar">
      <template v-if="!store.isLoggedIn">
        <a class="login-link" @click="$emit('open-login')">登录</a>
        <span style="color: var(--line); margin: 0 4px;">|</span>
        <a class="login-link" @click="$emit('open-register')">注册</a>
      </template>
      <template v-else>
        <div class="member-trigger" @click="$emit('go-member')">
          <div class="member-avatar">{{ firstChar }}</div>
          <div>
            {{ nickname }}
            <small>{{ memberLevel }} · {{ fmtMoney(totalSpent) }}</small>
          </div>
        </div>
      </template>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.site-header {
  width: min(1240px, calc(100% - 40px));
  height: 78px;
  margin: auto;
  display: flex;
  align-items: center;
  gap: 30px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: "DM Serif Display", serif;
  font-size: 25px;
  letter-spacing: .06em;
  color: var(--ink);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

.brand-mark {
  width: 31px;
  height: 31px;
  border-radius: 50%;
  background: var(--orange);
  color: white;
  display: grid;
  place-items: center;
  font-family: "DM Serif Display", serif;
  font-size: 21px;
}

.header-location {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--muted);
  border-left: 1px solid var(--line);
  padding-left: 26px;
  font-size: 12px;

  > span {
    color: var(--orange);
    font-size: 12px;
  }

  b, small { display: block; }
  b { color: var(--ink); font-size: 13px; }
}

.user-bar {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-link {
  border: 0;
  background: none;
  color: var(--pine);
  font-weight: bold;
  font-size: 15px;
  cursor: pointer;
  padding: 0;
}

.member-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid var(--line);
  background: var(--paper);
  border-radius: 100px;
  padding: 7px 12px 7px 7px;
  color: var(--ink);
  font-size: 13px;
  cursor: pointer;
  transition: box-shadow .18s;

  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

  small { display: block; color: var(--muted); font-size: 10px; }
}

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f1d1bb;
  color: #914821;
  display: grid;
  place-items: center;
  font-weight: bold;
}
</style>
