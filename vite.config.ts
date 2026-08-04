import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' 로 두면 하나의 빌드 결과가 도메인 루트(Vercel)와
// 하위 경로(GitHub Pages: /branch-equipment-map/) 양쪽에서 모두 동작한다.
// 클라이언트 라우팅이 없는 단일 페이지라서 상대경로로 충분하다.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
