
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { getMaintenancePlans, getLocations, addMaintenancePlan, updateMaintenancePlan, deleteMaintenancePlan } from '../../services/mockApi';
import { MaintenancePlan, Location } from '../../types';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import MaintenancePlanFormModal from './MaintenancePlanFormModal';
import { WrenchIcon, CalendarIcon } from '../icons';
import AIAssistant from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';

const MaintenanceCalendarView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [plans, setPlans] = useState<MaintenancePlan[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [p, l] = await Promise.all([getMaintenancePlans(), getLocations()]);
            setPlans(p.sort((a,b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()));
            setLocations(l);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (plan: MaintenancePlan | null) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    const handleSave = async (data: any) => {
        if ('plan_id' in data) {
            await updateMaintenancePlan(data);
        } else {
            await addMaintenancePlan(data);
        }
        fetchData();
        setIsModalOpen(false);
    };

    const handleDelete = async (id: string) => {
        await deleteMaintenancePlan(id);
        fetchData();
        setIsModalOpen(false);
    };

    const handleAIAction = async (response: AIResponse) => {
        if (response.action === 'createMaintenancePlan' && response.data && auth?.employee) {
            try {
                await addMaintenancePlan({
                    title: response.data.title,
                    description: response.data.description || '',
                    location_id: response.data.location_id,
                    frequency: response.data.frequency,
                    next_due_date: response.data.first_due_date,
                    active: true,
                    created_by: auth.employee.employee_id
                });
                fetchData();
            } catch (e) { console.error(e); }
        }
    };

    const getLocationName = (id: string) => locations.find(l => l.location_id === id)?.name || 'N/A';

    const getFrequencyLabel = (freq: string) => {
        switch(freq) {
            case 'monthly': return 'Mensual';
            case 'quarterly': return 'Trimestral';
            case 'semestral': return 'Semestral';
            case 'annual': return 'Anual';
            default: return freq;
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <WrenchIcon className="text-primary" />
                    Calendario de Mantenimiento Preventivo
                </h2>
                <Button onClick={() => handleOpenModal(null)}>+ Nuevo Plan</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const isOverdue = new Date(plan.next_due_date) < new Date();
                    return (
                        <div key={plan.plan_id} className={`bg-white rounded-lg shadow border-l-4 ${plan.active ? 'border-l-blue-500' : 'border-l-gray-300'} p-4 relative`}>
                            {!plan.active && <span className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">Inactivo</span>}
                            
                            <h3 className="font-bold text-gray-800">{plan.title}</h3>
                            <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                            
                            <div className="text-sm space-y-1 mb-4">
                                <p className="flex items-center text-gray-500">
                                    <span className="font-semibold mr-2">📍</span> {getLocationName(plan.location_id)}
                                </p>
                                <p className="flex items-center text-gray-500">
                                    <span className="font-semibold mr-2">🔄</span> {getFrequencyLabel(plan.frequency)}
                                </p>
                                <p className={`flex items-center font-bold ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                                    <CalendarIcon className="w-4 h-4 mr-2" /> 
                                    Próxima: {new Date(plan.next_due_date).toLocaleDateString()}
                                </p>
                            </div>

                            <Button size="sm" variant="secondary" onClick={() => handleOpenModal(plan)} className="w-full">
                                Editar Plan
                            </Button>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && auth?.employee && (
                <MaintenancePlanFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    plan={selectedPlan}
                    locations={locations}
                    employeeId={auth.employee.employee_id}
                />
            )}

            <AIAssistant 
                context={{ employees: [], locations, maintenancePlans: plans, currentUser: auth?.employee || undefined }} 
                onAction={handleAIAction}
                allowedInputs={['voice']}
            />
        </div>
    );
};

export default MaintenanceCalendarView;
