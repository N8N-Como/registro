
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
-- 1. CONFIGURACIÓN DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value jsonb,
    updated_at timestamptz DEFAULT now()
);

-- 2. TABLA DE CORRECCIONES HORARIAS
CREATE TABLE IF NOT EXISTS public.time_correction_requests (
    request_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id uuid REFERENCES public.employees(employee_id),
    original_entry_id uuid,
    correction_type text,
    requested_date date,
    requested_clock_in timestamptz,
    requested_clock_out timestamptz,
    reason text,
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    reviewed_by uuid REFERENCES public.employees(employee_id),
    reviewed_at timestamptz
);

-- 3. NOVEDADES Y LIBRO DE TURNO
CREATE TABLE IF NOT EXISTS public.shift_log (
  log_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.employees(employee_id),
  created_at timestamptz DEFAULT now(),
  message text NOT NULL,
  target_role_id text DEFAULT 'all',
  status text DEFAULT 'pending'
);

-- 4. INVENTARIO Y STOCK
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

-- 5. MOVIMIENTOS DE STOCK
CREATE TABLE IF NOT EXISTS public.stock_logs (
    log_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id uuid REFERENCES public.inventory_items(item_id),
    change_amount integer NOT NULL,
    reason text,
    employee_id uuid REFERENCES public.employees(employee_id),
    created_at timestamptz DEFAULT now()
);

-- 6. RESTRICCIÓN DE CÓDIGO ÚNICO (TURNOS)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_configs_code_key') THEN
        ALTER TABLE public.shift_configs ADD CONSTRAINT shift_configs_code_key UNIQUE (code);
    END IF;
END $$;

-- 7. PLANES DE MANTENIMIENTO
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

-- 8. REFRESCAR LA CACHÉ DE LA API
NOTIFY pgrst, 'reload schema';
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
                    <p className="mt-1 font-normal text-xs">Este script incluye la tabla de correcciones que faltaba.</p>
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
