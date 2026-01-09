
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
-- 1. TURNOS POR DEFECTO (SEMILLA PARA IA)
INSERT INTO public.shift_configs (code, name, start_time, end_time, color)
VALUES 
('V25', 'Vacaciones', '00:00', '00:00', '#10b981'),
('V', 'Vacaciones', '00:00', '00:00', '#10b981'),
('L', 'Libre', '00:00', '00:00', '#9ca3af'),
('D', 'Descanso', '00:00', '00:00', '#9ca3af'),
('MM', 'Media Mañana', '10:00', '14:00', '#3b82f6'),
('T', 'Tarde', '15:00', '23:00', '#6366f1'),
('TH', 'Tarde Hospital', '15:00', '23:00', '#8b5cf6'),
('P', 'Partida', '10:00', '20:00', '#f59e0b'),
('BM', 'Baja Médica', '00:00', '00:00', '#ef4444'),
('BH', 'Baja Hospital', '00:00', '00:00', '#ef4444'),
('B', 'Baja', '00:00', '00:00', '#ef4444'),
('AD', 'Asuntos Propios', '09:00', '17:00', '#ec4899'),
('R', 'Refuerzo', '10:00', '16:00', '#3b82f6'),
('S', 'Saliente/Especial', '08:00', '16:00', '#14b8a6')
ON CONFLICT DO NOTHING;

-- 2. TABLA DE CONFIGURACIÓN DE TURNOS (Si no existe)
CREATE TABLE IF NOT EXISTS public.shift_configs (
  config_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE,
  name text,
  start_time text,
  end_time text,
  color text,
  location_id uuid REFERENCES public.locations(location_id)
);

-- 3. TABLA DE CUADRANTE DE TURNOS
CREATE TABLE IF NOT EXISTS public.work_shifts (
  shift_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.employees(employee_id),
  start_time timestamptz,
  end_time timestamptz,
  type text, -- 'work', 'off', 'vacation', etc.
  location_id uuid REFERENCES public.locations(location_id),
  shift_config_id uuid REFERENCES public.shift_configs(config_id),
  color text,
  notes text
);

-- RECUERDA: Reload PostgREST Schema en Supabase después de ejecutar.
`.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Actualizar Base de Datos (SQL)">
            <div className="space-y-4">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 font-bold">
                    <p className="uppercase tracking-tight">⚠️ SEMILLA DE TURNOS:</p>
                    <p className="mt-1">Este script inserta los códigos V25, MM, T, L, etc., para que la IA pueda mapear la imagen que subiste.</p>
                </div>
                
                <div className="relative">
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono h-64 border-2 border-gray-900 shadow-inner">
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
