<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useMerchantStore } from '@/stores/merchant'
import { storeApi } from '@/api'

const mstore = useMerchantStore()

/** ============ 店铺资料（保存到后端） ============ */
const storeForm = reactive({
  name: mstore.joinedStore?.name ?? '',
  address: mstore.joinedStore?.address ?? '',
  phone: mstore.joinedStore?.phone ?? '',
  businessHours: mstore.joinedStore?.businessHours ?? '09:00 - 21:00'
})

async function saveStore() {
  if (!mstore.joinedStore) return
  try {
    const updated = await storeApi.update(mstore.joinedStore.storeId, {
      ...storeForm,
      status: mstore.joinedStore.status
    })
    mstore.setJoinedStore(updated)
    storeForm.name = updated.name ?? ''
    storeForm.address = updated.address ?? ''
    storeForm.phone = updated.phone ?? ''
    storeForm.businessHours = updated.businessHours ?? ''
    ElMessage.success('店铺资料已保存')
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  }
}

/** ============ 营业状态（实时生效） ============ */
async function toggleStatus() {
  if (!mstore.joinedStore) return
  const next = mstore.joinedStore.status === 'OPEN' ? 'CLOSED' : 'OPEN'
  try {
    const updated = await storeApi.update(mstore.joinedStore.storeId, {
      name: mstore.joinedStore.name ?? '',
      status: next
    })
    mstore.setJoinedStore(updated)
    ElMessage.success(next === 'OPEN' ? '已开始营业' : '已打烊')
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

/** ============ 商家账号（示例，暂无修改接口） ============ */
const merchantForm = reactive({
  nickname: mstore.merchant?.nickname ?? '',
  phone: mstore.merchant?.phone ?? ''
})

function saveMerchant() {
  ElMessage.info('账号资料修改暂未开通，敬请期待')
}

const pwdForm = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' })

function savePwd() {
  if (!pwdForm.oldPwd || !pwdForm.newPwd) {
    ElMessage.warning('请填写完整密码信息')
    return
  }
  if (pwdForm.newPwd !== pwdForm.confirmPwd) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  ElMessage.info('密码修改暂未开通，敬请期待')
  pwdForm.oldPwd = ''
  pwdForm.newPwd = ''
  pwdForm.confirmPwd = ''
}
</script>

<template>
  <div class="m-settings">
    <div class="settings-grid">
      <!-- 营业状态 -->
      <section class="panel">
        <div class="panel-title">营业状态</div>
        <div class="status-row">
          <div class="status-info">
            <div class="status-name" :class="mstore.joinedStore?.status === 'OPEN' ? 'on' : 'off'">
              {{ mstore.joinedStore?.status === 'OPEN' ? '营业中' : '已打烊' }}
            </div>
            <p class="status-desc">打烊后用户端将无法下单（示例说明）</p>
          </div>
          <el-switch
            :model-value="mstore.joinedStore?.status === 'OPEN'"
            size="large"
            @change="toggleStatus"
          />
        </div>
      </section>

      <!-- 店铺资料 -->
      <section class="panel">
        <div class="panel-title">店铺资料</div>
        <div class="form-rows">
          <div class="f-row">
            <label>店铺编号</label>
            <div class="f-value mono">{{ mstore.joinedStore?.code }}</div>
          </div>
          <div class="f-row">
            <label>店铺名称</label>
            <el-input v-model="storeForm.name" />
          </div>
          <div class="f-row">
            <label>地址</label>
            <el-input v-model="storeForm.address" placeholder="店铺地址" />
          </div>
          <div class="f-row">
            <label>联系电话</label>
            <el-input v-model="storeForm.phone" placeholder="联系电话" />
          </div>
          <div class="f-row">
            <label>营业时间</label>
            <el-input v-model="storeForm.businessHours" placeholder="如 09:00 - 21:00" />
          </div>
        </div>
        <button class="save-btn" @click="saveStore">保存店铺资料</button>
      </section>

      <!-- 商家账号 -->
      <section class="panel">
        <div class="panel-title">商家账号</div>
        <div class="form-rows">
          <div class="f-row">
            <label>商家编号</label>
            <div class="f-value mono">{{ mstore.merchant?.merchantNo }}</div>
          </div>
          <div class="f-row">
            <label>昵称</label>
            <el-input v-model="merchantForm.nickname" placeholder="商家昵称" />
          </div>
          <div class="f-row">
            <label>手机号</label>
            <el-input v-model="merchantForm.phone" placeholder="手机号" />
          </div>
        </div>
        <button class="save-btn" @click="saveMerchant">保存账号资料</button>
      </section>

      <!-- 修改密码 -->
      <section class="panel">
        <div class="panel-title">修改密码</div>
        <div class="form-rows">
          <div class="f-row">
            <label>当前密码</label>
            <el-input v-model="pwdForm.oldPwd" type="password" show-password placeholder="当前密码" />
          </div>
          <div class="f-row">
            <label>新密码</label>
            <el-input v-model="pwdForm.newPwd" type="password" show-password placeholder="新密码" />
          </div>
          <div class="f-row">
            <label>确认新密码</label>
            <el-input v-model="pwdForm.confirmPwd" type="password" show-password placeholder="再次输入新密码" />
          </div>
        </div>
        <button class="save-btn" @click="savePwd">修改密码</button>
      </section>
    </div>

    <p class="mock-tip">* 当前页面为示例功能，用于确认界面设计，后续接入真实接口</p>
  </div>
</template>

<style scoped>
.m-settings { display: flex; flex-direction: column; gap: 18px; }

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
  align-items: start;
}

.panel {
  background: var(--paper);
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: var(--shadow);
  border: 1px solid rgba(222, 219, 210, .4);
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--pine);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

/* 营业状态 */
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.status-name {
  font-size: 17px;
  font-weight: 700;

  &.on { color: #2e7d32; }
  &.off { color: #c0392b; }
}

.status-desc { margin-top: 6px; font-size: 12px; color: var(--muted); }

/* 表单 */
.form-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.f-row {
  display: flex;
  align-items: center;
  gap: 12px;

  label {
    width: 78px;
    flex-shrink: 0;
    font-size: 13px;
    color: var(--muted);
  }
  .el-input { flex: 1; }
}

.f-value {
  flex: 1;
  font-size: 14px;
  color: var(--ink);
  font-weight: 600;
}

.mono { font-family: "SF Mono", Menlo, monospace; }

.save-btn {
  border: none;
  background: var(--orange);
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  padding: 10px 26px;
  border-radius: 10px;
  letter-spacing: .04em;
  transition: opacity .18s;
  &:hover { opacity: .88; }
}

.mock-tip { text-align: center; font-size: 11.5px; color: #b0a89a; }
</style>
