
import React, { useState, useEffect } from 'react';
import { MaintenancePlan, Location } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface MaintenancePlanFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (plan: Omit<MaintenancePlan, 'plan_id'> | MaintenancePlan) => void;
    onDelete?: (id: string) => void;
    plan: MaintenancePlan | null;
    locations: Location[];
    employeeId: string;
}

const MaintenancePlanFormModal: React.FC<MaintenancePlanFormModalProps> = ({ 
    isOpen, onClose, onSave, onDelete, plan, locations, employeeId 
}) => {
    const [formData, setFormData] = useState<Partial<MaintenancePlan>>({});

    useEffect(() => {
        if (plan) {
            setFormData(plan);
        } else {
            setFormData({
                title: '',
                description: '',
                location_id: locations[0]?.location_id || '',
                frequency: 'monthly',
                next_due_date: new Date().toISOString().split('T')[0],
                active: true,
                created_by: employeeId
            });
        }
    }, [plan, isOpen, locations, employeeId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, active: e.target.checked }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as MaintenancePlan);
    };

    const handleDelete = () => {
        if (plan && onDelete && window.confirm('¿Seguro que quieres borrar este plan?')) {
            onDelete(plan.plan_id);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={plan ? 'Editar Plan Mantenimiento' : 'Nuevo Plan Preventivo'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Título</label>
                    <input 
                        type="text" 
                        name="title" 
                        value={formData.title || ''} 
                        onChange={handleChange} 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="Ej: Limpieza de Canalones"
                        required
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                    <textarea 
                        name="description" 
                        value={formData.description || ''} 
                        onChange={handleChange} 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        rows={2}
                        placeholder="Detalles de la tarea..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Establecimiento</label>
                    <select 
                        name="location_id" 
                        value={formData.location_id || ''} 
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                    >
                        {locations.map(l => (
                            <option key={l.location_id} value={l.location_id}>{l.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Frecuencia</label>
                        <select 
                            name="frequency" 
                            value={formData.frequency} 
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm capitalize"
                        >
                            <option value="monthly">Mensual</option>
                            <option value="quarterly">Trimestral</option>
                            <option value="semestral">Semestral</option>
                            <option value="annual">Anual</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Próxima Fecha</label>
                        <input 
                            type="date" 
                            name="next_due_date" 
                            value={formData.next_due_date || ''} 
                            onChange={handleChange} 
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        />
                    </div>
                </div>

                <div className="flex items-center">
                    <input 
                        type="checkbox" 
                        id="active" 
                        checked={formData.active} 
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                        Plan Activo (Generar alertas automáticamente)
                    </label>
                </div>

                <div className="pt-4 flex justify-between">
                    {plan && onDelete ? (
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

export default MaintenancePlanFormModal;
