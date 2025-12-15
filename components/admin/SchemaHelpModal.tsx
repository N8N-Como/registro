
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
-- Ejecuta este script en el Editor SQL de Supabase para actualizar tu base de datos.
-- No perderás datos: solo se añadirán las columnas nuevas si no existen.

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS annual_hours_contract numeric DEFAULT 1784,
ADD COLUMN IF NOT EXISTS default_location_id uuid REFERENCES locations(location_id),
ADD COLUMN IF NOT EXISTS default_start_time text DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS default_end_time text DEFAULT '17:00';

-- También asegúrate de que existan las tablas nuevas si aún no las tienes:
CREATE TABLE IF NOT EXISTS shift_configs (
  config_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text,
  name text,
  start_time text,
  end_time text,
  color text,
  location_id uuid REFERENCES locations(location_id)
);

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
`.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Actualizar Base de Datos">
            <div className="space-y-4">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm text-blue-700">
                    <p className="font-bold">¿Por qué veo esto?</p>
                    <p>La aplicación ha detectado que faltan campos en tu base de datos para guardar la información nueva (horarios, convenios, etc.).</p>
                </div>
                
                <p className="text-gray-600 text-sm">
                    Para solucionarlo sin perder datos, copia el siguiente código SQL y ejecútalo en el <strong>Editor SQL</strong> de tu panel de Supabase:
                </p>

                <div className="relative">
                    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono h-48">
                        {sqlScript}
                    </pre>
                    <button 
                        onClick={handleCopy}
                        className="absolute top-2 right-2 bg-white text-gray-800 px-2 py-1 rounded text-xs font-bold hover:bg-gray-200 shadow"
                    >
                        {copied ? '¡Copiado!' : 'Copiar SQL'}
                    </button>
                </div>

                <div className="pt-4 flex justify-end">
                    <Button onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default SchemaHelpModal;
