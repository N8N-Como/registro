
# Como en Casa - Sistema de Gestión de Personal

Aplicación web progresiva (PWA) para la gestión integral de horarios, tareas de limpieza, incidencias y comunicados internos de **Como en Casa Alojamientos Turísticos SL**.

Esta aplicación ha sido diseñada para cumplir con la **Normativa de Control Horario**, la **Ley de Protección de Datos (LOPD)** y las necesidades operativas de la hostelería.

## 🚀 Características Implementadas

### 1. Control Horario y Normativa (Fase 1)
*   **Fichaje Legal:** Registro de entrada/salida con geolocalización (GPS) y verificación de identidad mediante **Selfie**.
*   **Gestión de Pausas:** Registro de descansos (café, comida) para cálculo de tiempo efectivo de trabajo.
*   **Firma Digital:** Los empleados pueden firmar sus informes mensuales directamente en pantalla (dedo o ratón).
*   **Auditoría:** Registro inmutable de cambios para inspecciones laborales.

### 2. Gestión de Ausencias (Fase 2)
*   **Solicitudes:** Los empleados pueden solicitar vacaciones, bajas o días de asuntos propios.
*   **Aprobación:** Flujo de aprobación para administradores y gobernanta.

### 3. Planificador de Turnos (Fase 3)
*   **Cuadrante Visual:** Calendario semanal para asignar turnos a empleados por ubicación.
*   **Gestión de Horarios:** Define hora de entrada, salida y ubicación prevista.

### 4. Robustez y Modo Offline (Fase 4)
*   **Funcionamiento sin Internet:** La App permite fichar, completar tareas y reportar incidencias incluso en sótanos o ascensores sin cobertura.
*   **Sincronización Automática:** Los datos se guardan localmente y se envían al servidor en cuanto se recupera la conexión.

### 5. Operaciones Diarias
*   **Limpieza:** Planificador de tareas por habitación y establecimiento.
*   **Mantenimiento:** Reporte de incidencias con fotos.
*   **Comunicación:** Libro de turno digital y tablón de anuncios.
*   **Objetos Perdidos:** Registro fotográfico de objetos encontrados.

## 📦 Guía de Instalación y Despliegue

### 1. Requisitos Previos
*   Node.js (versión 18 o superior)
*   Cuenta en Supabase (Base de datos gratuita)

### 2. Configuración de Base de Datos (Supabase)
Es necesario ejecutar el script SQL proporcionado en la documentación del proyecto para crear las tablas:
*   `employees` (Empleados)
*   `time_entries`, `break_logs` (Fichajes)
*   `tasks`, `incidents` (Operaciones)
*   `work_shifts` (Turnos)
*   `monthly_signatures` (Firmas)

### 3. Instalación Local
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev
```

### 4. Compilación para Producción
Para subir a un hosting (Vercel, Netlify, cPanel):
```bash
npm run build
```
Esto generará una carpeta `dist` con los archivos optimizados listos para subir.

## 🔑 Credenciales por Defecto
Al iniciar la base de datos, se crea un usuario administrador:
*   **Usuario:** Admin Sistema
*   **PIN:** `1234`

## 🛠️ Tecnologías
*   React 18 + TypeScript
*   Vite (Build Tool)
*   Tailwind CSS (Estilos)
*   Supabase (Base de datos & Auth)
*   Google Gemini AI (Asistente inteligente)
