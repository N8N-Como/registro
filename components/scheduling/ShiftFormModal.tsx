
import React, { useState, useEffect } from 'react';
import { WorkShift, Employee, Location, ShiftConfig } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { getShiftConfigs } from '../../services/mockApi';

interface ShiftFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shift: Omit<WorkShift, 'shift_id'> | WorkShift) => void;
    onDelete?: (shiftId: string) => void;
    shift: WorkShift | null;
    employeeId: string; 
    date: Date;
    locations: Location[];
    employees: Employee[];
}

const ShiftFormModal: React.FC<ShiftFormModalProps> = ({ 
    isOpen, onClose, onSave, onDelete, shift, employeeId, date, locations, employees 
}) => {
    const [formData, setFormData] = useState<Partial<WorkShift>>({});
    const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>([]);
    const [selectedConfigId, setSelectedConfigId] = useState<string>('');
    const [mode, setMode] = useState<'work' | 'absence'>('work');

    useEffect(() => {
        getShiftConfigs().then(setShiftConfigs);
    }, []);

    useEffect(() => {
        if (shift) {
            setFormData(shift);
            setSelectedConfigId(shift.shift_config_id || '');
            setMode(shift.type === 'work' ? 'work' : 'absence');
        } else {
            const employee = employees.find(e => e.employee_id === employeeId);
            const start = new Date(date); start.setHours(9, 0, 0, 0);
            const end = new Date(date); end.setHours(17, 0, 0, 0);
            setFormData({
                employee_id: employeeId,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                color: '#3b82f6',
                location_id: employee?.default_location_id || locations[0]?.location_id || '',
                type: 'work',
                notes: ''
            });
            setMode('work');
        }
    }, [shift, employeeId, date, locations, isOpen]);

    const handleConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const configId = e.target.value;
        setSelectedConfigId(configId);
        const config = shiftConfigs.find(c => c.config_id === configId);
        if (config && formData.start_time) {
            const baseDate = new Date(formData.start_time);
            const [startH, startM] = config.start_time.split(':').map(Number);
            const [endH, endM] = config.end_time.split(':').map(Number);
            const newStart = new Date(baseDate); newStart.setHours(startH, startM);
            const newEnd = new Date(baseDate); newEnd.setHours(endH, endM);
            setFormData(prev => ({
                ...prev,
                start_time: newStart.toISOString(),
                end_time: newEnd.toISOString(),
                color: config.color,
                location_id: config.location_id || prev.location_id,
                shift_config_id: config.config_id,
                notes: config.code
            }));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={shift ? 'Editar Turno' : 'Asignar Turno'}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData as WorkShift); }} className="space-y-4">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button type="button" onClick={() => setMode('work')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${mode === 'work' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>Trabajo</button>
                    <button type="button" onClick={() => setMode('absence')} className={`flex-1 py-1.5 text-xs font-bold rounded-md ${mode === 'absence' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>Libre</button>
                </div>

                {mode === 'work' && (
                     <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase">Plantilla</label>
                        <select value={selectedConfigId} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm">
                            <option value="">-- Personalizado --</option>
                            {shiftConfigs.map(c => <option key={c.config_id} value={c.config_id}>{c.code} - {c.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <input type="time" value={new Date(formData.start_time || '').toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} onChange={(e) => {
                         const [h, m] = e.target.value.split(':').map(Number);
                         const d = new Date(formData.start_time!); d.setHours(h, m);
                         setFormData(p => ({...p, start_time: d.toISOString()}));
                    }} className="block w-full rounded-md border-gray-300 text-sm font-bold" />
                    <input type="time" value={new Date(formData.end_time || '').toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} onChange={(e) => {
                         const [h, m] = e.target.value.split(':').map(Number);
                         const d = new Date(formData.end_time!); d.setHours(h, m);
                         setFormData(p => ({...p, end_time: d.toISOString()}));
                    }} className="block w-full rounded-md border-gray-300 text-sm font-bold" />
                </div>

                <div className="pt-4 flex justify-between gap-2">
                    {shift && <Button type="button" variant="danger" size="sm" onClick={() => onDelete?.(shift.shift_id)}>Borrar</Button>}
                    <div className="flex-1 flex justify-end gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" size="sm" className="flex-1">Guardar</Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default ShiftFormModal;
