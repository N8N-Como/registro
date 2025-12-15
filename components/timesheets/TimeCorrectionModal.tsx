
import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { createTimeCorrectionRequest } from '../../services/mockApi';

interface TimeCorrectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    existingEntryId?: string;
    defaultDate?: string;
}

const TimeCorrectionModal: React.FC<TimeCorrectionModalProps> = ({ isOpen, onClose, employeeId, existingEntryId, defaultDate }) => {
    const [type, setType] = useState<'create_entry' | 'fix_time'>(existingEntryId ? 'fix_time' : 'create_entry');
    const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
    const [clockIn, setClockIn] = useState('');
    const [clockOut, setClockOut] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || !clockIn) {
            alert("Debes indicar al menos la hora de entrada y el motivo.");
            return;
        }

        setIsSubmitting(true);
        try {
            await createTimeCorrectionRequest({
                employee_id: employeeId,
                original_entry_id: existingEntryId,
                correction_type: type,
                requested_date: date,
                requested_clock_in: clockIn,
                requested_clock_out: clockOut || undefined,
                reason: reason
            });
            alert("Solicitud enviada al administrador.");
            onClose();
        } catch (error) {
            alert("Error al enviar la solicitud.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Solicitar Corrección de Horario">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                    <p>Las correcciones deben ser aprobadas por un administrador. Los cambios aparecerán marcados en rojo en los informes oficiales.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Incidencia</label>
                    <select 
                        value={type} 
                        onChange={(e) => setType(e.target.value as any)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        disabled={!!existingEntryId}
                    >
                        <option value="create_entry">Olvidé fichar (Crear entrada)</option>
                        <option value="fix_time">Hora incorrecta (Modificar existente)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha</label>
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hora Entrada Real</label>
                        <input 
                            type="time" 
                            value={clockIn} 
                            onChange={(e) => setClockIn(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hora Salida Real</label>
                        <input 
                            type="time" 
                            value={clockOut} 
                            onChange={(e) => setClockOut(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo del Error (Obligatorio)</label>
                    <textarea 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        rows={3}
                        placeholder="Ej: Se me olvidó el móvil en el coche, fichaje tardío..."
                        required
                    />
                </div>

                <div className="pt-4 flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" isLoading={isSubmitting}>Enviar Solicitud</Button>
                </div>
            </form>
        </Modal>
    );
};

export default TimeCorrectionModal;
