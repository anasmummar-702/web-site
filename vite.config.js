import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        cancellations: resolve(__dirname, 'cancellations.html'),
        cart: resolve(__dirname, 'cart.html'),
        contact: resolve(__dirname, 'contact.html'),
        cosmetics: resolve(__dirname, 'cosmetics.html'),
        innerwears: resolve(__dirname, 'innerwears.html'),
        kids: resolve(__dirname, 'kids.html'),
        ladies: resolve(__dirname, 'ladies.html'),
        login: resolve(__dirname, 'login.html'),
        notifications: resolve(__dirname, 'notifications.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        product: resolve(__dirname, 'product.html'),
        profile: resolve(__dirname, 'profile.html'),
        register: resolve(__dirname, 'register.html'),
        resetPassword: resolve(__dirname, 'reset-password.html'),
        returns: resolve(__dirname, 'returns.html'),
        shipping: resolve(__dirname, 'shipping.html'),
        shoes: resolve(__dirname, 'shoes.html'),
        terms: resolve(__dirname, 'terms.html'),
        thankyou: resolve(__dirname, 'thankyou.html'),
        wishlist: resolve(__dirname, 'wishlist.html'),
        script: resolve(__dirname, 'script.js'),
        style: resolve(__dirname, 'style.css')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'style.css';
          }
          return 'assets/[name]-[hash].[ext]';
        }
      }
    }
  }
});
