import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    {
      name: 'html-transform-fix',
      // This hook runs on the generated bundle chunks
      renderChunk(code) {
        // Escapes </script> to \x3C/script> to prevent the browser from 
        // interpreting it as the end of the script tag in the single-file HTML.
        return code.replace(/<\/script>/g, '\\x3C/script>');
      }
    }
  ],
  // Critical for assets to load in Streamlit's iframe environment
  base: './',
  define: {
    // Prevent Vite from replacing process.env with {} so our injected variables work
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // Force inline
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false, // Inline CSS
    rollupOptions: {
      output: {
        inlineDynamicImports: true, // Inline dynamic imports
        manualChunks: undefined,
      },
    },
  },
});
