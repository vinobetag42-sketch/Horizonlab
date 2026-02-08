import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    react(), 
    viteSingleFile(),
    {
        name: 'escape-script-tags',
        // Transform JS code to escape </script> sequences in strings
        // This prevents the browser from prematurely closing the script tag in the single-file build
        transform(code, id) {
            if (/\.[jt]sx?$/.test(id)) {
                return code.replace(/<\/script>/g, '\\x3C/script>');
            }
        }
    }
  ],
  base: './',
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
  },
});
