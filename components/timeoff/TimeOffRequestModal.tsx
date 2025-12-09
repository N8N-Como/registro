
import React, { useState, useContext } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { TimeOffRequest, TimeOffType } from '../../types';
import { AuthContext } from '../../App';
import { createTimeOffRequest } from '../../services/mockApi';

interface TimeOffRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TimeOffRequestModal: React.FC<TimeOffRequestModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const auth = useContext(AuthContext);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [type, setType] = useState<TimeOffType>('vacation');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.employee) return;
        
        if (new Date(startDate) > new Date(endDate)) {
            alert("La fecha de inicio no puede ser posterior a la fecha de fin.");
            return;
        }

        setIsSubmitting(true);
        try {
            await createTimeOffRequest({
                employee_id: auth.employee.employee_id,
                start_date: startDate,
                end_date: endDate,
                type: type,
                reason: reason
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to request time off", error);
            alert("Error al solicitar vacaciones.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Solicitar Ausencia / Vacaciones">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Desde</label>
                        <input 
                            type="date" 
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hasta</label>
                        <input 
                            type="date" 
                            required
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            min={startDate || new Date().toISOString().split('T')[0]}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipo de Ausencia</label>
                    <select 
                        value={type}
                        onChange={(e) => setType(e.target.value as TimeOffType)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                        <option value="vacation">🏖 Vacaciones</option>
                        <option value="sick_leave">🤒 Baja Médica</option>
                        <option value="personal">🏠 Asuntos Personales</option>
                        <option value="compensatory">⚖️ Día Compensatorio</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo (Opcional)</label>
                    <textarea 
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        rows={3}
                        placeholder="Comentarios adicionales..."
                    />
                </div>

                <div className="pt-4 flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" isLoading={isSubmitting}>Enviar Solicitud</Button>
                </div>
            </form>
        </Modal>
    );
};

export default TimeOffRequestModal;
