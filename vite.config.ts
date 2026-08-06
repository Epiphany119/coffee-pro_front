import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// 支持多 IP 自动切换：
//   1. 优先从 .env.development.local 读 VITE_API_TARGET
//   2. 默认用当前主机 IP（auto-detect），保证同网段一定能用
//   3. 切换 WiFi 后无需改代码，重启 Vite 即可（Mac 自己的 IP 会变）
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || `http://${getLocalIp()}:8088`

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 10000,
          proxyTimeout: 10000,
          ws: false
        },
        // 商品图片静态资源（后端 {user.home}/coffee-uploads/ 映射 /uploads/**）
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 10000,
          proxyTimeout: 10000,
          ws: false
        }
      }
    }
  }
})

/**
 * 自动获取本机在当前网络下的 IPv4 地址（取第一个非 127.0.0.1 的 en0/en1）
 * 失败时回退 127.0.0.1
 */
function getLocalIp(): string {
  try {
    const { networkInterfaces } = require('os')
    const nets = networkInterfaces()
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address
        }
      }
    }
  } catch {}
  return '127.0.0.1'
}
