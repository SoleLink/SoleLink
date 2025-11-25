// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Add the blocked host to the array
    allowedHosts: [
      'solelink-786465269102.europe-west1.run.app'
      // You might also see 'localhost' or '127.0.0.1' here by default
    ],
    // You might also need this if running in an ephemeral container
    host: true 
  },
  // ... other config
})