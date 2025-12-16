
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno (incluyendo las del sistema)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Detectar la API Key
  const apiKey = process.env.API_KEY || env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Definir process.env como un objeto que contiene la API_KEY.
      // Esto previene "process is not defined" y asegura que process.env.API_KEY funcione.
      'process.env': {
        API_KEY: apiKey
      }
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
