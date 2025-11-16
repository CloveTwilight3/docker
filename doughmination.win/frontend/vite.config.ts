import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Configuration for the Doughmination System® Server frontend
export default defineConfig(({ mode }) => {
  // Load environment variables from the parent directory (where the main .env is)
  const parentDir = path.resolve(__dirname, '..');
  const env = loadEnv(mode, parentDir, '');
  
  return {
    server: {
      host: '0.0.0.0',  // Listen on all network interfaces
      port: 8001,       // The port the UI runs on
      // Add this line to allow your domain
      allowedHosts: ['localhost', '127.0.0.1', 'doughmination.win', 'www.doughmination.win', '.loca.lt' ],
      proxy: {
        // Proxy API requests to backend during development
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        // Proxy avatar requests 
        '/avatars': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [react()],
    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      minify: true,
      sourcemap: false,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react-router-dom']
    },
    // Add path resolution for @ alias
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Define environment variables that will be available in the app
    define: {
      'import.meta.env.VITE_DOUGH_SITE_KEY': JSON.stringify(env.VITE_DOUGH_SITE_KEY)
    },
  };
});