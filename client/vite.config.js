import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // This is CRUCIAL for Cloud Run to access the server
    port: 3000,      // Ensure it listens on port 3000
    strictPort: true, // Optional: Exit if port is already in use
    // If you're using HMR (Hot Module Replacement) and it's causing issues,
    // you might need to configure it for Cloud Run's external URL.
    // However, for a simple dev server on Cloud Run, host: '0.0.0.0' is usually enough.
    // hmr: {
    //   host: 'solelink-786465269102.europe-west1.run.app', // Your Cloud Run URL
    //   protocol: 'ws', // or 'wss' if you have SSL configured for HMR
    // },
    // allowedHosts: [
    //   'solelink-786465269102.europe-west1.run.app', // Add your Cloud Run domain here
    //   // You might also need to add 'localhost' for local development
    //   'localhost',
    //   '127.0.0.1'
    // ]
  },
  // ... other Vite configurations
});
