# FIKA 咖啡点单系统 - 前端

基于 Vue 3 + Vite 4 + TypeScript + Element Plus 的咖啡店点单系统前端。

## 技术栈

- Vue 3.4 + Composition API
- Vite 5（开发服务器 + 构建）
- TypeScript
- Pinia（状态管理）
- Element Plus（UI 组件库）
- Axios（HTTP 客户端）
- SCSS（样式）

## 项目结构

```
src/
├── api/               # API 调用层
│   ├── index.ts       # axios 实例 + 各模块 API
│   └── types.ts      # TypeScript 类型定义
├── components/        # Vue 组件
│   ├── AuthPage.vue      # 登录/注册页
│   ├── SiteHeader.vue    # 顶部导航
│   ├── HeroSection.vue   # Hero 横幅
│   ├── MenuSection.vue   # 菜单区域
│   ├── ProductCard.vue   # 商品卡片
│   ├── ProductModal.vue  # 商品定制弹窗
│   ├── CartPanel.vue     # 购物车面板
│   ├── OrderHistory.vue  # 订单历史
│   └── MemberModal.vue   # 会员中心弹窗
├── views/
│   └── HomeView.vue   # 主页面
├── stores/
│   └── app.ts        # Pinia 全局状态
├── router/
│   └── index.ts      # Vue Router 配置
├── styles/
│   └── global.scss   # 全局样式
├── App.vue           # 根组件
└── main.ts          # 入口文件
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
# 访问 http://localhost:5173
```

> 前端会自动代理 `/api` 请求到 `http://localhost:8088`（后端服务）。
> 请确保后端服务（coffee-order-system-pro_back）已在 8088 端口启动。

### 3. 生产构建

```bash
npm run build
```

输出在 `dist/` 目录。

## 功能说明

- **登录/注册**：支持用户名密码注册登录
- **游客点单**：无需登录即可浏览菜单和下单
- **菜单浏览**：分类筛选、搜索、收藏、快速精选
- **商品定制**：选择规格（小/中/大杯）、添加配料
- **购物车**：增删改数量、优惠券、会员折扣自动计算
- **订单提交**：支持到店自取/店内用餐、备注
- **会员中心**：成长进度、积分、优惠券、折扣等级
- **订单历史**：状态筛选、取消订单

## 设计说明

- **前后端分离**：前端纯静态，API 通过 Vite 代理连接后端
- **TypeScript 类型安全**：所有 API 请求/响应有完整类型约束
- **Pinia 状态管理**：用户状态、购物车、菜单数据集中管理
- **Element Plus**：统一的 UI 交互体验
- **原生样式 + SCSS**：保留原项目视觉风格，渐进增强

## 配套后端

配套后端项目：`../coffee-order-system-pro_back`

需先启动后端，再启动前端。
