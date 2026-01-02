
import React, { useState, useContext } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { TimeOffType } from '../../types';
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
        if (new Date(startDate) > new Date(endDate)) { alert("Fecha inválida"); return; }
        setIsSubmitting(true);
        try {
            await createTimeOffRequest({ employee_id: auth.employee.employee_id, start_date: startDate, end_date: endDate, type: type, reason: reason });
            onSuccess(); onClose();
        } catch (error) { console.error(error); } finally { setIsSubmitting(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Solicitar Ausencia">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded p-2" />
                    <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded p-2" />
                </div>
                <select value={type} onChange={e => setType(e.target.value as TimeOffType)} className="w-full border rounded p-2">
                    <option value="vacation">🏖 Vacaciones</option><option value="sick_leave">🤒 Baja</option>
                </select>
                <textarea value={reason} onChange={e => setReason(e.target.value)} className="w-full border rounded p-2" rows={3} placeholder="Motivo..." />
                <div className="pt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" isLoading={isSubmitting}>Enviar</Button>
                </div>
            </form>
        </Modal>
    );
};

export default TimeOffRequestModal;
