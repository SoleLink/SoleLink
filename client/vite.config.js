// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    // SPA fallback middleware to handle client-side routing
    {
      name: 'spa-fallback',
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            // Only handle GET requests
            if (req.method !== 'GET') {
              return next()
            }
            
            const url = req.url.split('?')[0]
            
            // Skip Vite internal routes and HMR
            if (url.startsWith('/@') || url.startsWith('/node_modules/') || url.startsWith('/src/')) {
              return next()
            }
            
            // Check if it's a file request (has an extension after the last slash)
            const pathname = url.split('?')[0]
            const hasExtension = /\.\w+$/.test(pathname)
            
            // If it's a file request (like .js, .css, .png, etc.), let it through
            if (hasExtension) {
              return next()
            }
            
            // For all other routes (like /vendors, /profile, etc.), serve index.html
            // This allows React Router BrowserRouter to handle the routing
            if (pathname !== '/' && !hasExtension) {
              req.url = '/index.html'
            }
            
            next()
          })
        }
      },
    },
  ],
  resolve: {
    alias: {
      '/components': resolve(__dirname, 'components'),
      '/pages': resolve(__dirname, 'pages'),
      '/src': resolve(__dirname, 'src'),
      '/firebase-auth-ui': resolve(__dirname, 'firebase-auth-ui'),
    },
  },
  server: {
    // Add the blocked host to the array
    allowedHosts: [
      'solelink-786465269102.europe-west1.run.app'
      // You might also see 'localhost' or '127.0.0.1' here by default
    ],
    // You might also need this if running in an ephemeral container
    host: true,
    // Handle SPA routing - serve index.html for all routes
    fs: {
      strict: false,
    },
  },
  preview: {
    host: true,
  },
  // Ensure proper handling of client-side routing
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
})