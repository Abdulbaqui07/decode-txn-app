import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: "jsx", // Ensures JSX is parsed in .js files
    include: /src\/.*\.js$/, // Apply only to .js files in src/
  },
})
