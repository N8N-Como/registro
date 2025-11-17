# Como en Casa - Sistema de Gestión de Personal

Aplicación web para la gestión integral de horarios, tareas de limpieza, incidencias y comunicados internos de **Como en Casa Alojamientos Turísticos SL**.

## 🚀 Características Principales

*   **Control Horario (Fichajes):** Registro de entrada/salida con geolocalización y PIN.
*   **Gestión de Limpieza:** Planificador semanal y estado de habitaciones.
*   **Mantenimiento:** Reporte y seguimiento de incidencias.
*   **Comunicación:** Libro de turno digital y tablón de anuncios.

## 📦 Guía de Despliegue

Este proyecto está configurado para ser desplegado en **Vercel** o **Netlify** usando **Vite**.

### Método Recomendado: Subida Manual
Si la sincronización automática falla, sigue estos pasos:

1.  **Descargar:** Descarga este proyecto como un archivo `.ZIP` y descomprímelo en tu ordenador.
2.  **GitHub:**
    *   Crea un nuevo repositorio en [GitHub.com](https://github.com/new).
    *   Selecciona la opción "uploading an existing file" (subir un archivo existente).
    *   Arrastra todos los archivos de la carpeta descomprimida a GitHub y guarda los cambios ("Commit changes").
3.  **Vercel:**
    *   Ve a [Vercel](https://vercel.com) e inicia sesión.
    *   Pulsa "Add New Project".
    *   Selecciona el repositorio que acabas de crear en GitHub.
    *   Pulsa **Deploy**.

Vercel detectará automáticamente la configuración (`package.json` y `vite.config.ts`) y publicará la aplicación.

## 🛠️ Tecnologías
*   React 18 + TypeScript
*   Vite (Build Tool)
*   Tailwind CSS (vía CDN para simplicidad)
*   Supabase (Base de datos)
