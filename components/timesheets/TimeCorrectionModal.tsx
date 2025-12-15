
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
    const [errorType, setErrorType] = useState<'entry' | 'exit' | 'break'>('entry');
    const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
    
    // Inputs
    const [time, setTime] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helpers to handle logic mapping
    const getCorrectionType = () => {
        if (errorType === 'entry') return existingEntryId ? 'fix_time' : 'create_entry';
        if (errorType === 'exit') return 'fix_time';
        return 'fix_time'; // Breaks are handled as generic fixes for now in mock
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || !time) {
            alert("Debes indicar la hora correcta y el motivo.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Construct payload based on type
            const payload: any = {
                employee_id: employeeId,
                original_entry_id: existingEntryId,
                correction_type: getCorrectionType(),
                requested_date: date,
                reason: `[${errorType.toUpperCase()}] ${reason}`
            };

            if (errorType === 'entry') {
                payload.requested_clock_in = time;
            } else if (errorType === 'exit') {
                payload.requested_clock_out = time;
                // Need to send existing clock_in if possible, but backend handles merge or we assume partial update.
                // For simplified mock, we send requested_clock_in as a dummy or handle in backend logic.
                // To keep it simple: we send the specific time in 'requested_clock_in' field but tag it in reason, 
                // or we use the flexible structure.
                // Let's use the 'reason' to carry the specific instruction for the Admin in this version.
            } else if (errorType === 'break') {
                // For breaks, we just send a request description
                payload.correction_type = 'fix_time'; 
                payload.requested_clock_in = '00:00'; // Dummy
                payload.reason = `[PAUSA INCORRECTA] Hora correcta: ${time}. Detalle: ${reason}`;
            }

            await createTimeCorrectionRequest(payload);
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
                    <p>Las correcciones deben ser aprobadas por un administrador. Indica claramente qué hora es la correcta.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Error</label>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setErrorType('entry')}
                            className={`py-2 px-1 text-xs sm:text-sm font-medium rounded border ${errorType === 'entry' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setErrorType('exit')}
                            className={`py-2 px-1 text-xs sm:text-sm font-medium rounded border ${errorType === 'exit' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Salida
                        </button>
                        <button
                            type="button"
                            onClick={() => setErrorType('break')}
                            className={`py-2 px-1 text-xs sm:text-sm font-medium rounded border ${errorType === 'break' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Pausa / Comida
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha del Incidente</label>
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        {errorType === 'break' ? 'Hora Inicio/Fin Real de la Pausa' : `Hora Real de ${errorType === 'entry' ? 'Entrada' : 'Salida'}`}
                    </label>
                    <input 
                        type="time" 
                        value={time} 
                        onChange={(e) => setTime(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                    />
                    {errorType === 'break' && <p className="text-xs text-gray-500 mt-1">Si hubo error en inicio y fin, indícalo en el motivo.</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo y Detalles (Obligatorio)</label>
                    <textarea 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        rows={3}
                        placeholder={errorType === 'break' ? "Ej: Fichada de comida marcada a las 14:00 pero salí a las 14:30." : "Ej: Se me olvidó el móvil en el coche..."}
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
