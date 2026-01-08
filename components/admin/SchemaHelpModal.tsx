
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
-- 1. TABLA DE DOCUMENTOS (Nóminas, PRL, Contratos)
CREATE TABLE IF NOT EXISTS public.company_documents (
  document_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  type text NOT NULL, -- 'file' o 'link'
  content_url text NOT NULL,
  requires_signature boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.employees(employee_id)
);

-- 2. TABLA DE FIRMAS Y ESTADO DE LECTURA
CREATE TABLE IF NOT EXISTS public.document_signatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES public.company_documents(document_id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(employee_id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- 'pending', 'signed', 'viewed'
  signed_at timestamptz,
  signature_url text,
  viewed_at timestamptz,
  UNIQUE(document_id, employee_id)
);

-- 3. HABILITAR ACCESO PÚBLICO (Políticas RLS básicas para Demo)
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON public.company_documents FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON public.document_signatures FOR ALL USING (true);

-- 4. ACTUALIZACIÓN DE TABLA EMPLEADOS (DATOS CONTRACTUALES)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS annual_hours_contract numeric DEFAULT 1784,
ADD COLUMN IF NOT EXISTS default_location_id uuid REFERENCES locations(location_id),
ADD COLUMN IF NOT EXISTS default_start_time text DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS default_end_time text DEFAULT '17:00';

-- 5. TABLA DE CONFIGURACIÓN DE TURNOS
CREATE TABLE IF NOT EXISTS public.shift_configs (
  config_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text,
  name text,
  start_time text,
  end_time text,
  color text,
  location_id uuid REFERENCES public.locations(location_id)
);

-- 6. TABLA DE CUADRANTE DE TURNOS
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

-- 7. TABLA DE SOLICITUDES DE CORRECCIÓN
CREATE TABLE IF NOT EXISTS public.time_correction_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(employee_id),
  original_entry_id uuid REFERENCES public.time_entries(entry_id),
  correction_type text NOT NULL,
  requested_date date NOT NULL,
  requested_clock_in text NOT NULL,
  requested_clock_out text,
  reason text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES public.employees(employee_id),
  reviewed_at timestamptz
);
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
                    <p className="uppercase tracking-tight">⚠️ PASO OBLIGATORIO POST-SQL:</p>
                    <p className="mt-1">Después de ejecutar este código en Supabase, DEBES ir a:</p>
                    <p className="mt-2 p-2 bg-white border border-red-100 rounded text-center">Settings {'->'} API {'->'} Reload PostgREST Schema</p>
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
