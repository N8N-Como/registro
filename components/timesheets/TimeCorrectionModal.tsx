
import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { createTimeCorrectionRequest } from '../../services/mockApi';
import { addToQueue } from '../../services/offlineManager';

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
        return 'fix_time'; 
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || !time) {
            alert("Debes indicar la hora correcta y el motivo.");
            return;
        }

        setIsSubmitting(true);
        
        // El mockApi se encargará de convertir estas horas simples en ISO correctos
        const payload: any = {
            request_id: crypto.randomUUID(),
            employee_id: employeeId,
            original_entry_id: existingEntryId || null,
            correction_type: getCorrectionType(),
            requested_date: date,
            reason: `[${errorType.toUpperCase()}] ${reason}`,
            status: 'pending',
            created_at: new Date().toISOString(),
            requested_clock_in: errorType === 'entry' ? time : '00:00:00',
            requested_clock_out: errorType === 'exit' ? time : '00:00:00'
        };

        if (errorType === 'break') {
            payload.correction_type = 'fix_time'; 
            payload.requested_clock_in = '00:00:00';
            payload.requested_clock_out = '00:00:00';
            payload.reason = `[PAUSA] Hora: ${time}. ${reason}`;
        }

        try {
            await createTimeCorrectionRequest(payload);
            alert("Solicitud enviada correctamente.");
            onClose();
        } catch (error: any) {
            // Si el error es específicamente "Offline" (lanzado por mockApi tras fallo de red)
            if (error.message === "Offline") {
                addToQueue('ADD_CORRECTION', payload);
                alert("Guardado localmente. Se enviará cuando recuperes la conexión.");
                onClose();
            } else {
                console.error("Error de validación o servidor:", error);
                alert(`Error al procesar: ${error.message || 'Datos inválidos'}. Verifica el formato.`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Solicitar Corrección de Horario">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                    <p>Indica la hora que falta o que es incorrecta.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">¿Qué quieres corregir?</label>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setErrorType('entry')}
                            className={`py-2 px-1 text-xs sm:text-sm font-medium rounded border ${errorType === 'entry' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Hora Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setErrorType('exit')}
                            className={`py-2 px-1 text-xs sm:text-sm font-medium rounded border ${errorType === 'exit' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Hora Salida
                        </button>
                        <button
                            type="button"
                            onClick={() => setErrorType('break')}
                            className={`py-2 px-1 text-xs sm:text-sm font-medium rounded border ${errorType === 'break' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Pausa
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha del Error</label>
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
                        Hora Real de {errorType === 'entry' ? 'Entrada' : errorType === 'exit' ? 'Salida' : 'Pausa'}
                    </label>
                    <input 
                        type="time" 
                        value={time} 
                        onChange={(e) => setTime(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Explicación breve</label>
                    <textarea 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        rows={2}
                        placeholder="Ej: Olvidé fichar al entrar..."
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
