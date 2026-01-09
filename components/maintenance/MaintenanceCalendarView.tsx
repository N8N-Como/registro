
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { getMaintenancePlans, getLocations, addMaintenancePlan, updateMaintenancePlan, deleteMaintenancePlan } from '../../services/mockApi';
import { MaintenancePlan, Location } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import MaintenancePlanFormModal from './MaintenancePlanFormModal';
import { WrenchIcon, CalendarIcon } from '../icons';
import AIAssistant, { InputMode } from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';

const MaintenanceCalendarView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [plans, setPlans] = useState<MaintenancePlan[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<MaintenancePlan | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [p, l] = await Promise.all([getMaintenancePlans(), getLocations()]);
            setPlans(p.sort((a,b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()));
            setLocations(l);
        } catch (e) { console.error(e); } 
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleOpenModal = (plan: MaintenancePlan | null) => {
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    const handleSave = async (data: any) => {
        setIsSubmitting(true);
        try {
            if ('plan_id' in data) await updateMaintenancePlan(data);
            else await addMaintenancePlan(data);
            setIsModalOpen(false);
            await fetchData();
        } catch (e) { alert("Error al guardar plan."); }
        finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteMaintenancePlan(id);
            setIsModalOpen(false);
            fetchData();
        } catch (e) { alert("Error al borrar."); }
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

    if (isLoading && plans.length === 0) return <Spinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2 text-primary uppercase tracking-tight"><WrenchIcon /> Mantenimiento Preventivo</h2>
                <Button onClick={() => handleOpenModal(null)}>+ Nuevo Plan</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => {
                    const isOverdue = new Date(plan.next_due_date) < new Date();
                    return (
                        <div key={plan.plan_id} className={`bg-white rounded-2xl shadow-sm border-2 ${plan.active ? (isOverdue ? 'border-red-200 bg-red-50/10' : 'border-gray-100') : 'border-gray-50 opacity-60'} p-5 relative group hover:shadow-lg transition-all`}>
                            {!plan.active && <span className="absolute top-4 right-4 px-2 py-0.5 text-[8px] font-black bg-gray-200 text-gray-600 rounded uppercase">Inactivo</span>}
                            <h3 className="font-black text-gray-800 uppercase text-sm tracking-tight leading-none mb-1">{plan.title}</h3>
                            <p className="text-xs text-gray-500 mb-4 line-clamp-2">{plan.description}</p>
                            <div className="space-y-2 mb-6">
                                <p className="flex items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">📍 {getLocationName(plan.location_id)}</p>
                                <p className={`flex items-center font-black text-xs uppercase ${isOverdue ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>📅 {new Date(plan.next_due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}</p>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => handleOpenModal(plan)} className="w-full rounded-xl">Gestionar Plan</Button>
                        </div>
                    );
                })}
                {plans.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed rounded-2xl font-bold uppercase text-xs tracking-widest">Sin planes configurados</div>}
            </div>

            {isModalOpen && auth?.employee && (
                <MaintenancePlanFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSave} onDelete={handleDelete} plan={selectedPlan} locations={locations} employeeId={auth.employee.employee_id} />
            )}
            <AIAssistant context={{ employees: [], locations, maintenancePlans: plans, currentUser: auth?.employee || undefined }} onAction={handleAIAction} allowedInputs={['text', 'voice']} />
        </div>
    );
};

export default MaintenanceCalendarView;
