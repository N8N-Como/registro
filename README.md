
# Como en Casa - Gestión de Personal v1.1

Sistema integral para **Como en Casa Alojamientos Turísticos SL**. Incluye control horario legal, cuadrantes con IA, gestión de limpieza y nóminas.

## 🚀 Cómo subirlo a GitHub y desplegarlo

1.  **Crea un Repositorio:** En tu GitHub, crea un nuevo repo llamado `como-en-casa-app`.
2.  **Sube los archivos:** Sube todo el contenido de esta carpeta (excepto `node_modules`).
3.  **Configura la API KEY (CRÍTICO):**
    *   Si usas **Vercel** o **Netlify**: Ve a *Settings > Environment Variables* y añade una llamada `API_KEY` con tu valor `AIzaSyB2VYdC...`.
    *   Si lo corres en **Local**: Crea un archivo `.env` en la raíz y pon: `API_KEY=AIzaSyB2VYdC...`.

## 🧠 Funcionalidades de Inteligencia Artificial
La aplicación utiliza **Google Gemini 3 Flash** para:
- **Lectura de Cuadrantes:** Sube un PDF o foto del horario y se autocompleta el calendario.
- **Splitter de Nóminas:** Identifica a quién pertenece cada página de un PDF masivo y lo envía al empleado correcto.
- **Asistente de Voz:** Permite a las camareras de pisos cambiar el estado de las habitaciones mediante comandos de voz.

## 🛠️ Tecnologías
- **Frontend:** React + TypeScript + Tailwind CSS.
- **Base de Datos:** Supabase (PostgreSQL).
- **IA:** Google Gemini SDK.
- **Mapas:** Leaflet.js para geolocalización de fichajes.

---
*Desarrollado para el cumplimiento de la Normativa Española de Control Horario.*
