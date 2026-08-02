<script setup lang="ts">

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { authApi } from '@/api'
import type { AuthRequest } from '@/api/types'

const store = useAppStore()

const activeTab =
    ref<'login'|'register'>('login')

const loginForm =
    ref<AuthRequest>({
      username:'',
      password:''
    })

const registerForm =
    ref<AuthRequest>({
      username:'',
      password:'',
      nickname:''
    })

const loginHint = ref('')
const registerHint = ref('')

const emit = defineEmits([
  'login-success',
  'enter-main'
])

function switchTab(tab:any){

  activeTab.value=tab

  loginHint.value=''
  registerHint.value=''

}

async function doLogin(){

  if(
      !loginForm.value.username ||
      !loginForm.value.password
  ){

    loginHint.value='请输入账号和密码'

    return

  }

  try{

    const data =
        await authApi.login(loginForm.value)

    if(!data.success){

      loginHint.value=data.message

      return

    }

    store.setUser(data)

    ElMessage.success(
        '登录成功，欢迎回来'
    )

    emit('login-success')

  }catch(e:any){

    loginHint.value=e.message

  }

}

async function doRegister(){

  if(
      !registerForm.value.username ||
      !registerForm.value.password
  ){

    registerHint.value='请填写完整信息'

    return

  }

  try{

    const data =
        await authApi.register(
            registerForm.value
        )

    if(!data.success){

      registerHint.value=data.message

      return

    }

    store.setUser(data)

    ElMessage.success(
        '注册成功'
    )

    emit('login-success')

  }catch(e:any){

    registerHint.value=e.message

  }

}

</script>

<template>
  <div class="auth-page">

    <!-- 左侧品牌区域 -->
    <div class="brand-side">
      <div class="big-logo">
        <span>F</span>
        FIKA
      </div>

      <h2>
        慢下来，
        <br>
        享受每一杯咖啡。
      </h2>

      <p>
        Fresh Coffee
        <br>
        Daily Bakery
        <br>
        Slow Moments
      </p>

      <div class="coffee-icon">
        ☕
      </div>
    </div>

    <!-- 右侧登录区域 -->
    <div class="auth-right">

      <div class="login-card">
        <!-- 卡片内 Logo -->
        <div class="card-brand">
          <div class="card-logo">F</div>
          <span>FIKA</span>
        </div>

        <div class="tabs">
          <button
              :class="{active:activeTab==='login'}"
              @click="switchTab('login')"
          >
            登录
          </button>
          <button
              :class="{active:activeTab==='register'}"
              @click="switchTab('register')"
          >
            注册
          </button>
        </div>

        <form
            v-if="activeTab==='login'"
            @submit.prevent="doLogin"
        >
          <label>
            账号
            <input
                v-model="loginForm.username"
                placeholder="输入用户名"
            />
          </label>

          <label>
            密码
            <input
                v-model="loginForm.password"
                type="password"
                placeholder="输入密码"
            />
          </label>

          <button class="submit">
            登录并开始点单
          </button>

          <p class="hint">
            {{loginHint}}
          </p>
        </form>

        <form
            v-else
            @submit.prevent="doRegister"
        >
          <label>
            账号
            <input
                v-model="registerForm.username"
                placeholder="用户名"
            />
          </label>

          <label>
            密码
            <input
                v-model="registerForm.password"
                type="password"
                placeholder="密码"
            />
          </label>

          <label>
            昵称
            <input
                v-model="registerForm.nickname"
                placeholder="怎么称呼你"
            />
          </label>

          <button class="submit">
            创建会员账户
          </button>

          <p class="hint">
            {{registerHint}}
          </p>
        </form>

        <div class="divider">
          <span>-------------------或-------------------</span>
        </div>

        <button
            class="guest"
            @click="$emit('enter-main')"
        >
          以游客身份进入点单
        </button>

        <p class="foot">
          注册成为 FIKA 会员 ·
          享受积分和等级权益
        </p>
      </div>

      <!-- 浮动机器人 -->
      <div class="floating-robot">
        <div class="robot-avatar">
<!--          <img src="@/assets/images/codex-robot-3.png" alt="FIKA AI Assistant" />-->
        </div>
<!--        <p class="robot-label">FIKA AI Assistant</p>-->
<!--        <p class="robot-sublabel">智能推荐你的咖啡</p>-->
      </div>

    </div>

  </div>
</template>

<style scoped lang="scss">

.auth-page {
  position: fixed;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 120px;

  background:
    radial-gradient(
      circle at 20% 30%,
      rgba(220, 160, 90, 0.18),
      transparent 30%
    ),
    radial-gradient(
      circle at 80% 70%,
      rgba(60, 120, 90, 0.25),
      transparent 35%
    ),
    linear-gradient(135deg, #10251e, #19362c);

  overflow: hidden;
}

/* 左侧品牌区域 */
.brand-side {
  width: 360px;
  color: white;
}

.big-logo {
  font-family: "DM Serif Display", "Noto Serif SC", serif;
  font-size: 46px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.big-logo span {
  background: #df7438;
  width: 55px;
  height: 55px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "DM Serif Display", serif;
  font-size: 36px;
  color: white;
}

.brand-side h2 {
  font-family: "DM Serif Display", "Noto Serif SC", serif;
  font-size: 42px;
  font-weight: 400;
  line-height: 1.3;
  margin-top: 50px;
}

.brand-side p {
  margin-top: 25px;
  font-size: 16px;
  line-height: 2;
  color: #c7d4ce;
  letter-spacing: 0.08em;
}

.coffee-icon {
  font-size: 180px;
  opacity: 0.12;
  margin-top: 40px;
}

/* 右侧区域 */
.auth-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}

.login-card {
  width: 390px;
  padding: 32px;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 30px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
  text-align: left;
}

/* 卡片内 Logo */
.card-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 28px;
  font-family: "DM Serif Display", serif;
  font-size: 20px;
  letter-spacing: 0.08em;
  color: #19342b;
}

.card-logo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #df7438;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "DM Serif Display", serif;
  font-size: 18px;
}

.tabs {
  display: flex;
  gap: 25px;
  border-bottom: 1px solid #eee;
  margin-bottom: 25px;
}

.tabs button {
  background: none;
  border: none;
  padding: 10px 5px;
  font-size: 15px;
  color: #999;
  font-family: "Inter", "Noto Sans SC", sans-serif;
  cursor: pointer;
}

.tabs .active {
  color: #222;
  border-bottom: 2px solid #df7438;
  font-weight: 600;
}

label {
  display: block;
  font-size: 13px;
  margin-bottom: 15px;
  font-family: "Inter", "Noto Sans SC", sans-serif;
}

input {
  width: 100%;
  height: 48px;
  margin-top: 8px;
  border-radius: 14px;
  border: 1px solid #ddd;
  padding: 0 15px;
  font-size: 14px;
  background: #faf9f6;
  font-family: "Inter", "Noto Sans SC", sans-serif;
}

input:focus {
  outline: none;
  border-color: #df7438;
  box-shadow: 0 0 0 4px rgba(223, 116, 56, 0.15);
}

.submit {
  width: 100%;
  height: 50px;
  margin-top: 10px;
  border: none;
  border-radius: 14px;
  background: #19342b;
  color: white;
  font-weight: 600;
  font-size: 15px;
  font-family: "Inter", "Noto Sans SC", sans-serif;
  cursor: pointer;
  transition: transform 0.15s;
}

.submit:hover {
  transform: translateY(-2px);
}

.guest {
  width: 100%;
  height: 48px;
  border-radius: 14px;
  background: white;
  border: 1px solid #ddd;
  font-family: "Inter", "Noto Sans SC", sans-serif;
  font-size: 14px;
  cursor: pointer;
}

.divider {
  margin: 25px 0;
  text-align: center;
  color: #999;
}

.divider span {
  font-size: 12px;
}

.hint {
  height: 18px;
  font-size: 12px;
  color: #d9534f;
  text-align: center;
  font-family: "Inter", "Noto Sans SC", sans-serif;
}

.foot {
  margin-top: 20px;
  font-size: 11px;
  color: #999;
  text-align: center;
  font-family: "Inter", "Noto Sans SC", sans-serif;
}

/* 浮动机器人 */
.floating-robot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.robot-avatar {
  font-size: 100px;
  line-height: 1;
}

.robot-label {
  font-size: 20px;
  font-weight: 600;
  color: white;
  font-family: "DM Serif Display", serif;
  margin: 0;
}

.robot-sublabel {
  font-size: 18px;
  color: #c7d4ce;
  margin: 0;
  font-family: "Inter", "Noto Sans SC", sans-serif;
}

@media (max-width: 900px) {
  .brand-side {
    display: none;
  }

  .auth-page {
    gap: 0;
  }
}

@media (max-width: 500px) {
  .login-card {
    width: 90%;
    padding: 24px;
  }
}

</style>
