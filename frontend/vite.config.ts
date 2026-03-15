import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Plugin to copy Service Worker files to dist
    {
      name: 'copy-service-worker',
      writeBundle() {
        const publicDir = resolve(__dirname, 'public')
        const distDir = resolve(__dirname, 'dist')
        
        // Copy Service Worker files
        const swFiles = ['sw-auto-refresh.js', 'sw-auto-refresh-dev.js']
        
        swFiles.forEach(file => {
          const sourcePath = resolve(publicDir, file)
          const targetPath = resolve(distDir, file)
          
          if (existsSync(sourcePath)) {
            copyFileSync(sourcePath, targetPath)
            console.log(`✅ Copied ${file} to dist folder`)
          } else {
            console.warn(`⚠️ Service Worker file not found: ${sourcePath}`)
          }
        })
      }
    }
  ],
  base: '/', // Use root path for assets
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external connections
    open: false, // Disable auto-opening browser for server deployment
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    },
    // เพิ่มการรองรับ Service Worker
    middlewareMode: false,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Add hash to filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-visually-hidden'
          ],
          'fontawesome-vendor': [
            '@fortawesome/fontawesome-svg-core',
            '@fortawesome/free-solid-svg-icons',
            '@fortawesome/react-fontawesome'
          ],
          'utils-vendor': [
            'axios',
            'socket.io-client',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          'icons-vendor': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Force cache busting
    assetsInlineLimit: 0,
    // เพิ่มการบีบอัดและ optimize
    minify: 'terser',
    sourcemap: false, // ปิดใน production เพื่อลดขนาดไฟล์
    target: 'es2015',
    cssCodeSplit: true
  },
  // เพิ่มการ optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'socket.io-client',
      'lucide-react'
    ],
    // Force re-optimization on every dev server start if needed
    force: false // Set to true if you encounter "Outdated Optimize Dep" errors
  }
})