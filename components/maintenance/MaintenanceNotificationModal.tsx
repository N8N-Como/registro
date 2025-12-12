
import React from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { MaintenancePlan, Location } from '../../types';
import { WrenchIcon } from '../icons';

interface MaintenanceNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    plans: MaintenancePlan[];
    locations: Location[];
}

const MaintenanceNotificationModal: React.FC<MaintenanceNotificationModalProps> = ({ isOpen, onClose, plans, locations }) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const dueToday = plans.filter(p => {
        const d = new Date(p.next_due_date); d.setHours(0,0,0,0);
        return d.getTime() <= today.getTime();
    });
    
    const dueSoon = plans.filter(p => {
        const d = new Date(p.next_due_date); d.setHours(0,0,0,0);
        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 7;
    });

    const getLocationName = (id: string) => locations.find(l => l.location_id === id)?.name || 'N/A';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Alertas de Mantenimiento">
            <div className="space-y-4">
                <div className="text-center mb-4">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100">
                        <WrenchIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">Tareas Programadas Pendientes</h3>
                </div>

                {dueToday.length > 0 && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <h4 className="font-bold text-red-700 text-sm uppercase mb-2">Vencen Hoy o Atrasadas</h4>
                        <ul className="space-y-2 text-sm text-red-800">
                            {dueToday.map(p => (
                                <li key={p.plan_id}>• {p.title} ({getLocationName(p.location_id)})</li>
                            ))}
                        </ul>
                    </div>
                )}

                {dueSoon.length > 0 && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <h4 className="font-bold text-yellow-700 text-sm uppercase mb-2">Próxima Semana</h4>
                        <ul className="space-y-2 text-sm text-yellow-800">
                            {dueSoon.map(p => (
                                <li key={p.plan_id}>
                                    • {new Date(p.next_due_date).toLocaleDateString().slice(0, 5)} - {p.title}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="pt-4">
                    <Button onClick={onClose} className="w-full justify-center">Entendido, ir al Dashboard</Button>
                </div>
            </div>
        </Modal>
    );
};

export default MaintenanceNotificationModal;
