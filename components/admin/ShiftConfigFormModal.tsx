
import React, { useState, useEffect } from 'react';
import { ShiftConfig, Location } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface ShiftConfigFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: Omit<ShiftConfig, 'config_id'> | ShiftConfig) => void;
    onDelete?: (configId: string) => void;
    config: ShiftConfig | null;
    locations: Location[];
}

const ShiftConfigFormModal: React.FC<ShiftConfigFormModalProps> = ({ isOpen, onClose, onSave, onDelete, config, locations }) => {
    const [formData, setFormData] = useState<Partial<ShiftConfig>>({});

    useEffect(() => {
        if (config) {
            setFormData(config);
        } else {
            setFormData({
                code: '',
                name: '',
                start_time: '08:00',
                end_time: '16:00',
                color: '#3b82f6',
                location_id: ''
            });
        }
    }, [config, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as ShiftConfig);
    };

    const handleDelete = () => {
        if (config && onDelete) {
            if(window.confirm('¿Seguro que quieres borrar este tipo de turno?')) {
                onDelete(config.config_id);
            }
        }
    };

    const title = config ? 'Editar Tipo de Turno' : 'Crear Tipo de Turno';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                     <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Código</label>
                        <input 
                            type="text" 
                            name="code"
                            value={formData.code || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm uppercase font-bold"
                            maxLength={3}
                            placeholder="M"
                            required
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700">Nombre Descriptivo</label>
                        <input 
                            type="text" 
                            name="name"
                            value={formData.name || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            placeholder="Ej: Mañana FyF"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hora Inicio</label>
                        <input 
                            type="time" 
                            name="start_time"
                            value={formData.start_time || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Hora Fin</label>
                        <input 
                            type="time" 
                            name="end_time"
                            value={formData.end_time || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Ubicación por defecto</label>
                    <select 
                        name="location_id" 
                        value={formData.location_id || ''} 
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                        <option value="">-- Seleccionar --</option>
                        {locations.map(loc => (
                            <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
                
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Color Visual</label>
                    <div className="flex space-x-2 mt-1">
                        {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'].map(color => (
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

                <div className="pt-4 flex justify-between">
                     {config && onDelete ? (
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

export default ShiftConfigFormModal;
