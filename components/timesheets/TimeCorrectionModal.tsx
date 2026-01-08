
import React, { useState, useEffect } from 'react';
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
    defaultTime?: string;
    defaultType?: 'entry' | 'exit' | 'break';
}

const TimeCorrectionModal: React.FC<TimeCorrectionModalProps> = ({ 
    isOpen, onClose, employeeId, existingEntryId, defaultDate, defaultTime, defaultType 
}) => {
    const [errorType, setErrorType] = useState<'entry' | 'exit' | 'break'>(defaultType || 'entry');
    const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(defaultTime && defaultTime !== 'En curso' ? defaultTime : '');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (defaultType) setErrorType(defaultType);
            if (defaultDate) setDate(defaultDate);
            if (defaultTime && defaultTime !== 'En curso') setTime(defaultTime);
        }
    }, [isOpen, defaultType, defaultDate, defaultTime]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || !time) {
            alert("Debes indicar la hora correcta y el motivo.");
            return;
        }

        setIsSubmitting(true);
        const formattedTime = time.length === 5 ? `${time}:00` : time;

        const payload: any = {
            request_id: crypto.randomUUID(),
            employee_id: employeeId,
            original_entry_id: existingEntryId || null,
            correction_type: 'fix_time',
            requested_date: date,
            reason: `[${errorType.toUpperCase()}] ${reason}`,
            status: 'pending',
            created_at: new Date().toISOString(),
            requested_clock_in: errorType === 'entry' ? formattedTime : '00:00:00',
            requested_clock_out: errorType === 'exit' ? formattedTime : '00:00:00'
        };

        try {
            await createTimeCorrectionRequest(payload);
            alert("Solicitud enviada correctamente.");
            onClose();
        } catch (error: any) {
            if (error.message === "Offline") {
                addToQueue('ADD_CORRECTION', payload);
                alert("Guardado localmente. Se enviará cuando recuperes la conexión.");
                onClose();
            } else {
                alert(`Error al procesar: ${error.message || 'Datos inválidos'}.`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Solicitar Corrección de Horario">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200 mb-2">
                    Indica la hora que debería aparecer correctamente en el informe.
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">¿Qué quieres corregir?</label>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                        {['entry', 'exit', 'break'].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setErrorType(t as any)}
                                className={`py-2 px-1 text-xs sm:text-sm font-medium rounded border ${errorType === t ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            >
                                {t === 'entry' ? 'Entrada' : t === 'exit' ? 'Salida' : 'Pausa'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hora Correcta</label>
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo del cambio</label>
                    <textarea 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        rows={2}
                        placeholder="Ej: Olvidé fichar, error de red, etc."
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
