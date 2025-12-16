
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno (incluyendo las del sistema)
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Detectar la API Key con prioridad al entorno del sistema, luego al archivo .env
  const apiKey = process.env.API_KEY || env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Inyectar la API Key explícitamente en el objeto process.env.API_KEY
      // Esto reemplaza cualquier ocurrencia de 'process.env.API_KEY' en el código cliente con el valor de la cadena.
      'process.env.API_KEY': JSON.stringify(apiKey),
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
