
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
                console.warn("Could not load shift configs", e);
                setShiftConfigs([]);
            }
        };
        loadConfigs();
    }, []);

    useEffect(() => {
        if (shift) {
            setFormData(shift);
            setSelectedConfigId(shift.shift_config_id || '');
            setMode(shift.type === 'work' ? 'work' : 'absence');
        } else {
            // New Shift Default Logic
            const employee = employees.find(e => e.employee_id === employeeId);
            
            // Check for default hours on employee
            let startHour = 9;
            let startMin = 0;
            let endHour = 17;
            let endMin = 0;

            if (employee?.default_start_time) {
                 [startHour, startMin] = employee.default_start_time.split(':').map(Number);
            }
            if (employee?.default_end_time) {
                 [endHour, endMin] = employee.default_end_time.split(':').map(Number);
            }

            const start = new Date(date);
            start.setHours(startHour, startMin, 0, 0);
            
            const end = new Date(date);
            end.setHours(endHour, endMin, 0, 0);

            setFormData({
                employee_id: employeeId,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                color: '#3b82f6', // Blue default
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
            const baseDate = new Date(formData.start_time); // Keep the day
            const [hours, minutes] = value.split(':').map(Number);
            baseDate.setHours(hours, minutes);
            setFormData(prev => ({ ...prev, [name === 'startTimeOnly' ? 'start_time' : 'end_time']: baseDate.toISOString() }));
        }
    };

    // Apply Shift Config (Predefined Turno M, T, etc.)
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
                notes: config.name // Optional: auto-fill notes with config name
            }));
        } else if (configId === '') {
             setFormData(prev => ({ ...prev, shift_config_id: undefined }));
        }
    };
    
    // Change between Work and Absence mode
    const handleModeChange = (newMode: 'work' | 'absence') => {
        setMode(newMode);
        if (newMode === 'work') {
             setFormData(prev => ({ ...prev, type: 'work' }));
        } else {
             // Default to 'off' when switching to absence
             if (formData.type === 'work') {
                 setFormData(prev => ({ ...prev, type: 'off', color: '#9ca3af' })); // Gray for Off
             }
        }
    };
    
    // Handle specific absence type change
    const handleAbsenceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as ShiftType;
        let newColor = '#9ca3af'; // off default
        
        switch(newType) {
            case 'vacation': newColor = '#10b981'; break; // Green
            case 'sick': newColor = '#ef4444'; break; // Red
            case 'permission': newColor = '#f59e0b'; break; // Orange
        }

        setFormData(prev => ({
            ...prev,
            type: newType,
            color: newColor
        }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation for Permission
        if (formData.type === 'permission' && (!formData.notes || formData.notes.trim() === '')) {
            alert("Para un permiso, es obligatorio indicar el motivo en las notas.");
            return;
        }

        onSave(formData as WorkShift);
    };

    const handleDelete = () => {
        if (shift && onDelete) {
            if (window.confirm('¿Estás seguro de eliminar este turno?')) {
                onDelete(shift.shift_id);
            }
        }
    }

    const getTimeString = (isoString?: string) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    const employeeName = employees.find(e => e.employee_id === (formData.employee_id || employeeId))?.first_name || 'Empleado';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={shift ? 'Editar Turno' : 'Asignar Turno'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 p-3 rounded mb-4">
                    <p className="text-sm text-gray-500">Empleado: <span className="font-bold text-gray-800">{employeeName}</span></p>
                    <p className="text-sm text-gray-500">Fecha: <span className="font-bold text-gray-800">{date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long'})}</span></p>
                </div>

                {/* Mode Switcher */}
                <div className="flex border-b mb-4">
                    <button 
                        type="button"
                        onClick={() => handleModeChange('work')}
                        className={`flex-1 py-2 text-sm font-medium ${mode === 'work' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Trabajo / Turno
                    </button>
                    <button 
                         type="button"
                         onClick={() => handleModeChange('absence')}
                         className={`flex-1 py-2 text-sm font-medium ${mode === 'absence' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Ausencia / Libre
                    </button>
                </div>

                {mode === 'work' && (
                    <>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Turno Predefinido</label>
                            <select 
                                value={selectedConfigId}
                                onChange={handleConfigChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            >
                                <option value="">-- Personalizado --</option>
                                {shiftConfigs.map(c => (
                                    <option key={c.config_id} value={c.config_id}>{c.code} - {c.name} ({c.start_time}-{c.end_time})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hora Inicio</label>
                                <input 
                                    type="time" 
                                    name="startTimeOnly"
                                    value={getTimeString(formData.start_time)}
                                    onChange={handleTimeChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hora Fin</label>
                                <input 
                                    type="time" 
                                    name="endTimeOnly"
                                    value={getTimeString(formData.end_time)}
                                    onChange={handleTimeChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ubicación</label>
                            <select 
                                name="location_id" 
                                value={formData.location_id || ''} 
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            >
                                <option value="">Sin ubicación específica</option>
                                {locations.map(loc => (
                                    <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700">Color (Etiqueta)</label>
                            <div className="flex space-x-2 mt-1">
                                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormData(prev => ({...prev, color}))}
                                        className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {mode === 'absence' && (
                    <div>
                         <label className="block text-sm font-medium text-gray-700">Tipo de Ausencia</label>
                         <select 
                            name="type" 
                            value={formData.type} 
                            onChange={handleAbsenceTypeChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                         >
                            <option value="off">Libre / Descanso</option>
                            <option value="vacation">Vacaciones</option>
                            <option value="sick">Baja Médica</option>
                            <option value="permission">Permiso Retribuido</option>
                         </select>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        {mode === 'absence' && formData.type === 'permission' ? 'Motivo (Obligatorio)' : 'Notas'}
                    </label>
                    <textarea 
                        name="notes"
                        value={formData.notes || ''}
                        onChange={handleChange}
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder={mode === 'absence' ? "Ej: Médico, Mudanza..." : "Ej: Turno de refuerzo..."}
                        required={mode === 'absence' && formData.type === 'permission'}
                    />
                </div>

                <div className="pt-4 flex justify-between">
                    {shift && onDelete ? (
                        <Button type="button" variant="danger" onClick={handleDelete}>Eliminar</Button>
                    ) : <div></div>}
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
