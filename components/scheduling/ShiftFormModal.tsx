
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

const WORK_CODES = ['M', 'T', 'P', 'MM', 'R', 'A', 'D', 'TH', 'BH', 'BM', 'AD', 'S', 'D'];

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
            const rawNotes = (shift.notes || '').toUpperCase();
            const code = rawNotes.length <= 3 ? rawNotes : '';
            setMode(shift.type === 'work' || WORK_CODES.includes(code) ? 'work' : 'absence');
        } else {
            const employee = employees.find(e => e.employee_id === employeeId);
            const start = new Date(date); start.setHours(9, 0);
            const end = new Date(date); end.setHours(17, 0);
            setFormData({
                employee_id: employeeId,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                color: '#3b82f6',
                location_id: employee?.default_location_id || locations[0]?.location_id || '',
                type: 'work'
            });
            setMode('work');
        }
    }, [shift, employeeId, date, locations, isOpen, employees]);

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (formData.start_time) {
            const baseDate = new Date(formData.start_time);
            const [hours, minutes] = value.split(':').map(Number);
            baseDate.setHours(hours, minutes);
            setFormData(prev => ({ ...prev, [name === 'startTimeOnly' ? 'start_time' : 'end_time']: baseDate.toISOString() }));
        }
    };

    const handleConfigChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const configId = e.target.value;
        setSelectedConfigId(configId);
        const config = shiftConfigs.find(c => c.config_id === configId);
        if (config && formData.start_time) {
            const baseDate = new Date(formData.start_time);
            const [sh, sm] = config.start_time.split(':').map(Number);
            const [eh, em] = config.end_time.split(':').map(Number);
            const ns = new Date(baseDate); ns.setHours(sh, sm);
            const ne = new Date(baseDate); ne.setHours(eh, em);
            setFormData(prev => ({ ...prev, start_time: ns.toISOString(), end_time: ne.toISOString(), color: config.color, shift_config_id: config.config_id, notes: config.code, type: 'work' }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as WorkShift);
    };

    const getTimeStr = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Turno">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex border-b mb-4">
                    <button type="button" onClick={() => setMode('work')} className={`flex-1 py-2 text-sm font-medium ${mode === 'work' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Trabajo</button>
                    <button type="button" onClick={() => setMode('absence')} className={`flex-1 py-2 text-sm font-medium ${mode === 'absence' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Libre</button>
                </div>
                {mode === 'work' ? (
                    <>
                        <select value={selectedConfigId} onChange={handleConfigChange} className="block w-full rounded border-gray-300">
                            <option value="">Personalizado</option>
                            {shiftConfigs.map(c => <option key={c.config_id} value={c.config_id}>{c.code} - {c.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="time" name="startTimeOnly" value={getTimeStr(formData.start_time)} onChange={handleTimeChange} className="block w-full rounded border-gray-300" />
                            <input type="time" name="endTimeOnly" value={getTimeStr(formData.end_time)} onChange={handleTimeChange} className="block w-full rounded border-gray-300" />
                        </div>
                    </>
                ) : (
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="block w-full rounded border-gray-300">
                        <option value="off">Libre</option><option value="vacation">Vacaciones</option><option value="sick">Baja</option>
                    </select>
                )}
                <div className="pt-4 flex justify-between">
                    {shift && <Button variant="danger" onClick={() => onDelete?.(shift.shift_id)}>Borrar</Button>}
                    <Button type="submit">Guardar</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ShiftFormModal;
