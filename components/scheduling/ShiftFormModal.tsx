
import React, { useState, useEffect } from 'react';
import { WorkShift, Employee, Location, ShiftConfig, ShiftType } from '../../types';
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
        const loadConfigs = async () => {
            try {
                const configs = await getShiftConfigs();
                setShiftConfigs(configs);
            } catch (e) {
                setShiftConfigs([]);
            }
        };
        loadConfigs();
    }, []);

    useEffect(() => {
        if (shift) {
            setFormData(shift);
            setSelectedConfigId(shift.shift_config_id || '');
            
            // INFERIR MODO PARA EL MODAL
            const rawNotes = (shift.notes || '').toUpperCase();
            const match = rawNotes.match(/\((.*?)\)/);
            const code = match ? match[1] : (rawNotes.length <= 3 ? rawNotes : '');
            
            const isActuallyWork = shift.type === 'work' || WORK_CODES.includes(code);
            setMode(isActuallyWork ? 'work' : 'absence');
            
        } else {
            const employee = employees.find(e => e.employee_id === employeeId);
            let startHour = 9, startMin = 0, endHour = 17, endMin = 0;

            if (employee?.default_start_time) [startHour, startMin] = employee.default_start_time.split(':').map(Number);
            if (employee?.default_end_time) [endHour, endMin] = employee.default_end_time.split(':').map(Number);

            const start = new Date(date); start.setHours(startHour, startMin, 0, 0);
            const end = new Date(date); end.setHours(endHour, endMin, 0, 0);

            setFormData({
                employee_id: employeeId,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                color: '#3b82f6',
                location_id: employee?.default_location_id || locations[0]?.location_id || '',
                type: 'work',
                notes: ''
            });
            setSelectedConfigId('');
            setMode('work');
        }
    }, [shift, employeeId, date, locations, isOpen, employees]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

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
                notes: config.code,
                type: 'work'
            }));
        }
    };
    
    const handleModeChange = (newMode: 'work' | 'absence') => {
        setMode(newMode);
        setFormData(prev => ({ ...prev, type: newMode === 'work' ? 'work' : 'off' }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as WorkShift);
    };

    const getTimeString = (isoString?: string) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={shift ? 'Editar Turno' : 'Asignar Turno'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex border-b mb-4">
                    <button type="button" onClick={() => handleModeChange('work')} className={`flex-1 py-2 text-sm font-medium ${mode === 'work' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Trabajo / Turno</button>
                    <button type="button" onClick={() => handleModeChange('absence')} className={`flex-1 py-2 text-sm font-medium ${mode === 'absence' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Ausencia / Libre</button>
                </div>

                {mode === 'work' ? (
                    <>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Tipo de Turno</label>
                            <select value={selectedConfigId} onChange={handleConfigChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                <option value="">-- Personalizado --</option>
                                {shiftConfigs.map(c => <option key={c.config_id} value={c.config_id}>{c.code} - {c.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="time" name="startTimeOnly" value={getTimeString(formData.start_time)} onChange={handleTimeChange} className="block w-full rounded-md border-gray-300" />
                            <input type="time" name="endTimeOnly" value={getTimeString(formData.end_time)} onChange={handleTimeChange} className="block w-full rounded-md border-gray-300" />
                        </div>
                    </>
                ) : (
                    <select name="type" value={formData.type} onChange={handleChange} className="block w-full rounded-md border-gray-300">
                        <option value="off">Libre / Descanso</option>
                        <option value="vacation">Vacaciones</option>
                        <option value="sick">Baja Médica</option>
                    </select>
                )}

                <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Notas o código de turno..." />

                <div className="pt-4 flex justify-between">
                    {shift && <Button type="button" variant="danger" onClick={() => onDelete?.(shift.shift_id)}>Eliminar</Button>}
                    <div className="flex space-x-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default ShiftFormModal;
