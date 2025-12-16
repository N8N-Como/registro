
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno (incluyendo las del sistema)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Inyectar explícitamente la API Key para que esté disponible como process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY),
      // Mantener esto para evitar errores de librerías que usan process.env, pero después de definir las keys específicas
      'process.env': {}
    },
    build: {
      rollupOptions: {
        external: ['xlsx'],
        output: {
          globals: {
            xlsx: 'XLSX'
          }
        }
      }
    }
  }
})
