import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
  server: {
    proxy: {
      // Optional: for local dev only
      '/api': 'http://localhost:3000'
    }
  }
})
=======
  define: {
    // These allow the environment to inject Firebase config at build time
    __firebase_config: JSON.stringify(process.env.VITE_FIREBASE_CONFIG || '{}'),
    __app_id: JSON.stringify(process.env.VITE_APP_ID || 'aura-gold-enterprise'),
    __initial_auth_token: JSON.stringify(process.env.VITE_AUTH_TOKEN || '')
  }
});
>>>>>>> 566532e24debdef21f5b0c48b5b31a9a1e41c94f
