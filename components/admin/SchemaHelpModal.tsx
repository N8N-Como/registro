
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
-- 1. ACTUALIZACIÓN DE TABLA EMPLEADOS
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS annual_hours_contract numeric DEFAULT 1784,
ADD COLUMN IF NOT EXISTS default_location_id uuid REFERENCES locations(location_id),
ADD COLUMN IF NOT EXISTS default_start_time text DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS default_end_time text DEFAULT '17:00';

-- 2. TABLA DE CONFIGURACIÓN DE TURNOS
CREATE TABLE IF NOT EXISTS shift_configs (
  config_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text,
  name text,
  start_time text,
  end_time text,
  color text,
  location_id uuid REFERENCES locations(location_id)
);

-- 3. TABLA DE CUADRANTE DE TURNOS
CREATE TABLE IF NOT EXISTS work_shifts (
  shift_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES employees(employee_id),
  start_time timestamptz,
  end_time timestamptz,
  type text, -- 'work', 'off', 'vacation', etc.
  location_id uuid REFERENCES locations(location_id),
  shift_config_id uuid REFERENCES shift_configs(config_id),
  color text,
  notes text
);

-- 4. TABLA DE SOLICITUDES DE CORRECCIÓN (CRÍTICA PARA ERRORES DE FICHAJE)
CREATE TABLE IF NOT EXISTS time_correction_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(employee_id),
  original_entry_id uuid REFERENCES time_entries(entry_id),
  correction_type text NOT NULL, -- 'create_entry' o 'fix_time'
  requested_date date NOT NULL,
  requested_clock_in text NOT NULL,
  requested_clock_out text,
  reason text NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES employees(employee_id),
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
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-blue-700">
                    <p className="font-bold">Acción Requerida</p>
                    <p>Para que las correcciones de fichajes funcionen, debes crear la tabla en Supabase. Copia el código de abajo y pégalo en el "SQL Editor" de tu proyecto.</p>
                </div>
                
                <div className="relative">
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono h-64">
                        {sqlScript}
                    </pre>
                    <button 
                        onClick={handleCopy}
                        className="absolute top-2 right-2 bg-white text-gray-800 px-2 py-1 rounded text-xs font-bold hover:bg-gray-200 shadow"
                    >
                        {copied ? '¡Copiado!' : 'Copiar SQL'}
                    </button>
                </div>

                <div className="pt-2 flex justify-end">
                    <Button onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default SchemaHelpModal;
