
import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { createTimeCorrectionRequest, isDateLocked } from '../../services/mockApi';
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
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (defaultType) setErrorType(defaultType);
            if (defaultDate) setDate(defaultDate);
            if (defaultTime && defaultTime !== 'En curso') setTime(defaultTime);
            isDateLocked(date || new Date().toISOString().split('T')[0]).then(setIsLocked);
        }
    }, [isOpen, defaultType, defaultDate, defaultTime]);

    useEffect(() => {
        isDateLocked(date).then(setIsLocked);
    }, [date]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isLocked) {
            alert("Este mes ya ha sido cerrado. No se admiten cambios.");
            return;
        }

        if (!reason || !time) {
            alert("Debes indicar la hora y el motivo.");
            return;
        }

        setIsSubmitting(true);
        
        // CORRECCIÓN DE HORA (Evitar desfase de 1h)
        // Al crear el objeto Date así, el navegador lo trata como hora LOCAL
        const localDateTime = new Date(`${date}T${time}`);
        const isoTimestamp = localDateTime.toISOString();

        const payload: any = {
            request_id: crypto.randomUUID(),
            employee_id: employeeId,
            original_entry_id: existingEntryId || null,
            correction_type: 'fix_time',
            requested_date: date,
            reason: `[${errorType.toUpperCase()}] ${reason}`,
            status: 'pending',
            created_at: new Date().toISOString(),
            // Enviamos a la columna correspondiente según el tipo
            requested_clock_in: (errorType === 'entry' || errorType === 'break') ? isoTimestamp : null,
            requested_clock_out: errorType === 'exit' ? isoTimestamp : null
        };

        try {
            await createTimeCorrectionRequest(payload);
            alert("Solicitud enviada correctamente.");
            onClose();
        } catch (error: any) {
            if (error.message === "Offline") {
                addToQueue('ADD_CORRECTION', payload);
                alert("Guardado localmente. Se enviará al recuperar conexión.");
                onClose();
            } else {
                console.error("Error submitting correction:", error);
                alert(`Error: ${error.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Solicitar Corrección">
            <form onSubmit={handleSubmit} className="space-y-4">
                {isLocked && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-800 text-xs font-bold text-center">
                        🔒 Mes Auditado y Cerrado.
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de corrección</label>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                        {['entry', 'exit', 'break'].map((t) => (
                            <button key={t} type="button" disabled={isLocked} onClick={() => setErrorType(t as any)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${errorType === t ? 'bg-primary text-white' : 'bg-white text-gray-400'}`}>
                                {t === 'entry' ? 'Entrada' : t === 'exit' ? 'Salida' : 'Pausa'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isLocked} className="mt-1 block w-full rounded-md border-gray-300" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hora Correcta</label>
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={isLocked} className="mt-1 block w-full rounded-md border-gray-300" required />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo</label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} disabled={isLocked} className="mt-1 block w-full rounded-md border-gray-300" rows={2} required />
                </div>

                <div className="pt-4 flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
                    {!isLocked && <Button type="submit" isLoading={isSubmitting}>Enviar Solicitud</Button>}
                </div>
            </form>
        </Modal>
    );
};

export default TimeCorrectionModal;
