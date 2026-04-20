import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build configuration for production
  build: {
    // Output directory
    outDir: 'dist',
    
    // Asset file size warning threshold (in KBs)
    chunkSizeWarningLimit: 1000,
    
    // Minify using esbuild (default and fastest)
    minify: 'esbuild',
    
    // Enable source maps in production for debugging
    sourcemap: false,
    
    // Rollup output options
    rollupOptions: {
      output: {
        // Manual chunking for better caching
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }
        }
      }
    }
  },
  
  // Development server configuration
  server: {
    // Port for dev server
    port: 5173,
    
    // Enable strict mode
    strictPort: false
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', 'react-router-dom']
  }
})

