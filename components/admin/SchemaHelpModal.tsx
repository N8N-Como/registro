
import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface SchemaHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SchemaHelpModal: React.FC<SchemaHelpModalProps> = ({ isOpen, onClose }) => {
    const [copied, setCopied] = useState(false);

    const sqlScript = `
-- 1. TABLA DE CONFIGURACIÓN DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb,
    updated_at timestamptz DEFAULT now()
);

-- 2. ACTUALIZACIÓN CRÍTICA DE INCIDENCIAS (Sin borrar datos)
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS type text DEFAULT 'corrective';
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS photo_url text;

-- 3. TABLA REGISTRO DE TURNO (Si falta)
CREATE TABLE IF NOT EXISTS public.shift_log (
  log_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.employees(employee_id),
  created_at timestamptz DEFAULT now(),
  message text NOT NULL,
  target_role_id text DEFAULT 'all',
  status text DEFAULT 'pending'
);

-- 4. TABLA DE INVENTARIO Y STOCK (Si no existiera)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    item_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    category text,
    quantity integer DEFAULT 0,
    unit text DEFAULT 'unidades',
    min_threshold integer DEFAULT 5,
    location_id uuid REFERENCES public.locations(location_id),
    last_updated timestamptz DEFAULT now()
);

-- 5. TABLA DE MOVIMIENTOS DE STOCK (Para auditoría de consumos)
CREATE TABLE IF NOT EXISTS public.stock_logs (
    log_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id uuid REFERENCES public.inventory_items(item_id),
    change_amount integer NOT NULL,
    reason text,
    employee_id uuid REFERENCES public.employees(employee_id),
    created_at timestamptz DEFAULT now()
);

-- 6. TURNOS POR DEFECTO (SEMILLA PARA IA)
ALTER TABLE public.shift_configs ADD CONSTRAINT IF NOT EXISTS shift_configs_code_key UNIQUE (code);

INSERT INTO public.shift_configs (code, name, start_time, end_time, color)
VALUES 
('V25', 'Vacaciones', '00:00', '00:00', '#10b981'),
('V', 'Vacaciones', '00:00', '00:00', '#10b981'),
('L', 'Libre', '00:00', '00:00', '#9ca3af'),
('D', 'Descanso', '00:00', '00:00', '#9ca3af'),
('MM', 'Media Mañana', '10:00', '14:00', '#3b82f6'),
('T', 'Tarde', '15:00', '23:00', '#6366f1'),
('AD', 'Asuntos Propios', '09:00', '17:00', '#ec4899'),
('P', 'Partido', '09:00', '21:00', '#f59e0b'),
('B', 'Baja Médica', '00:00', '00:00', '#ef4444')
ON CONFLICT (code) DO NOTHING;

-- 7. TABLA DE PLANES DE MANTENIMIENTO PREVENTIVO
CREATE TABLE IF NOT EXISTS public.maintenance_plans (
    plan_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    location_id uuid REFERENCES public.locations(location_id),
    frequency text DEFAULT 'monthly',
    next_due_date date,
    created_by uuid REFERENCES public.employees(employee_id),
    active boolean DEFAULT true
);

-- IMPORTANTE: Después de ejecutar esto, ve a Supabase -> Settings -> API y pulsa el botón "RELOAD SCHEMA CACHE".
`.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Mantenimiento Base de Datos (SQL)">
            <div className="space-y-4">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 font-bold">
                    <p className="uppercase tracking-tight">⚠️ ACTUALIZACIÓN DEFINITIVA:</p>
                    <p className="mt-1 font-normal">Este script soluciona los problemas de las tablas de Incidencias, Turnos e Inventario sin tocar tus datos actuales.</p>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 text-[10px] text-blue-700 uppercase font-black tracking-widest">
                    <p>Tras ejecutar el SQL, ve a Settings → API → Reload Schema Cache.</p>
                </div>
                
                <div className="relative">
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-[10px] overflow-x-auto whitespace-pre-wrap font-mono h-64 border-2 border-gray-900 shadow-inner">
                        {sqlScript}
                    </pre>
                    <button 
                        onClick={handleCopy}
                        className="absolute top-2 right-2 bg-white text-gray-800 px-3 py-1.5 rounded-md text-xs font-black hover:bg-gray-200 shadow-xl border border-gray-300 transition-all"
                    >
                        {copied ? '¡COPIADO!' : 'COPIAR SQL'}
                    </button>
                </div>

                <div className="pt-2 flex justify-end">
                    <Button onClick={onClose} className="w-full sm:w-auto">Cerrar Ayuda</Button>
                </div>
            </div>
        </Modal>
    );
};

export default SchemaHelpModal;
