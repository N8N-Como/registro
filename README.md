
# Como en Casa - Sistema de Gestión de Personal

Aplicación web para la gestión integral de horarios, tareas de limpieza, incidencias y comunicados internos de **Como en Casa Alojamientos Turísticos SL**.

## 🚀 Características Principales

*   **Control Horario (Fichajes):** Registro de entrada/salida con geolocalización y PIN.
*   **Gestión de Limpieza:** Planificador semanal y estado de habitaciones.
*   **Mantenimiento:** Reporte y seguimiento de incidencias.
*   **Comunicación:** Libro de turno digital y tablón de anuncios.

## 📦 Guía de Despliegue

Este proyecto está configurado para ser desplegado en **Vercel** o **Netlify** usando **Vite**.

### 1. Base de Datos (Supabase) - ¡IMPORTANTE!
Para que la aplicación funcione, necesitas crear las tablas en Supabase:

1.  Ve a tu proyecto en [Supabase](https://supabase.com).
2.  Entra en el **SQL Editor** (icono de terminal en la barra lateral).
3.  Abre el archivo `supabase_schema.sql` incluido en este proyecto.
4.  Copia todo su contenido y pégalo en el editor de Supabase.
5.  Pulsa **Run**.
6.  ¡Listo! Ya tienes el usuario administrador creado.
    *   **PIN Admin:** `1234`

### 2. Subida del Código
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

### 3. Configuración de Dominio
Para añadir tu dominio (ej: `app.comoencasa.com`):
1. Ve a tu proyecto en Vercel -> Settings -> Domains.
2. Añade tu dominio.
3. Configura los DNS en tu proveedor de dominio según las instrucciones que te dé Vercel.

## 🛠️ Tecnologías
*   React 18 + TypeScript
*   Vite (Build Tool)
*   Tailwind CSS (vía CDN para simplicidad)
*   Supabase (Base de datos)
