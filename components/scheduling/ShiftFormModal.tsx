
import React, { useState, useEffect } from 'react';
import { WorkShift, Employee, Location } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface ShiftFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shift: Omit<WorkShift, 'shift_id'> | WorkShift) => void;
    onDelete?: (shiftId: string) => void;
    shift: WorkShift | null;
    employeeId: string; // The employee row we clicked on
    date: Date; // The day column we clicked on
    locations: Location[];
    employees: Employee[];
}

const ShiftFormModal: React.FC<ShiftFormModalProps> = ({ 
    isOpen, onClose, onSave, onDelete, shift, employeeId, date, locations, employees 
}) => {
    const [formData, setFormData] = useState<Partial<WorkShift>>({});

    useEffect(() => {
        if (shift) {
            setFormData(shift);
        } else {
            // New Shift Default Values
            const start = new Date(date);
            start.setHours(9, 0, 0, 0);
            
            const end = new Date(date);
            end.setHours(17, 0, 0, 0);

            setFormData({
                employee_id: employeeId,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                color: '#3b82f6', // Blue default
                location_id: locations[0]?.location_id || ''
            });
        }
    }, [shift, employeeId, date, locations, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Reconstruct full ISO string from time input
        if (formData.start_time) {
            const baseDate = new Date(formData.start_time); // Keep the day
            const [hours, minutes] = value.split(':').map(Number);
            baseDate.setHours(hours, minutes);
            setFormData(prev => ({ ...prev, [name === 'startTimeOnly' ? 'start_time' : 'end_time']: baseDate.toISOString() }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as WorkShift);
    };

    const handleDelete = () => {
        if (shift && onDelete) {
            if (window.confirm('¿Estás seguro de eliminar este turno?')) {
                onDelete(shift.shift_id);
            }
        }
    }

    // Helper to extract HH:MM for input type="time"
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

                <div>
                    <label className="block text-sm font-medium text-gray-700">Notas</label>
                    <textarea 
                        name="notes"
                        value={formData.notes || ''}
                        onChange={handleChange}
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="Ej: Turno de refuerzo..."
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
