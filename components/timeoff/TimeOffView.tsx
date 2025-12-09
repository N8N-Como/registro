
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../App';
import { TimeOffRequest, Employee } from '../../types';
import { getTimeOffRequests, updateTimeOffRequestStatus, getEmployees } from '../../services/mockApi';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { SunIcon, CheckIcon, XMarkIcon } from '../icons';
import TimeOffRequestModal from './TimeOffRequestModal';
import { formatDate } from '../../utils/helpers';

const TimeOffView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my_requests' | 'team_requests'>('my_requests');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const canManage = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'gobernanta' || auth?.role?.role_id === 'receptionist';

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [reqs, emps] = await Promise.all([getTimeOffRequests(), getEmployees()]);
            setRequests(reqs);
            setEmployees(emps);
        } catch (error) {
            console.error("Failed to fetch time off data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // If manager, default to team requests if they have pending ones? No, keep it simple.
    }, [fetchData]);

    const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
        if (!auth?.employee) return;
        try {
            await updateTimeOffRequestStatus(requestId, status, auth.employee.employee_id);
            fetchData();
        } catch (error) {
            alert("Error al actualizar la solicitud.");
        }
    };

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.employee_id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'Desconocido';
    };

    const getTypeLabel = (type: string) => {
        switch(type) {
            case 'vacation': return '🏖 Vacaciones';
            case 'sick_leave': return '🤒 Baja Médica';
            case 'personal': return '🏠 Personal';
            case 'compensatory': return '⚖️ Compensatorio';
            default: return type;
        }
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'approved': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Aprobado</span>;
            case 'rejected': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">Rechazado</span>;
            default: return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">Pendiente</span>;
        }
    };

    // Filter Logic
    const myRequests = requests.filter(r => r.employee_id === auth?.employee?.employee_id);
    const pendingRequests = requests.filter(r => r.status === 'pending');
    
    // Managers see all requests (or could filter by department in future)
    const teamRequests = requests; 

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <SunIcon className="text-orange-500" />
                    Gestión de Ausencias
                </h2>
                <Button onClick={() => setIsModalOpen(true)}>+ Solicitar Días</Button>
            </div>

            {/* Tabs for Managers */}
            {canManage && (
                <div className="flex space-x-4 border-b">
                    <button 
                        onClick={() => setActiveTab('my_requests')}
                        className={`pb-2 px-4 font-semibold ${activeTab === 'my_requests' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mis Solicitudes
                    </button>
                    <button 
                        onClick={() => setActiveTab('team_requests')}
                        className={`pb-2 px-4 font-semibold ${activeTab === 'team_requests' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Solicitudes del Equipo 
                        {pendingRequests.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{pendingRequests.length}</span>}
                    </button>
                </div>
            )}

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                {activeTab === 'team_requests' && <th className="p-3">Empleado</th>}
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Fechas</th>
                                <th className="p-3">Motivo</th>
                                <th className="p-3">Estado</th>
                                {activeTab === 'team_requests' && <th className="p-3 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {(activeTab === 'my_requests' ? myRequests : teamRequests).length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">No hay solicitudes registradas.</td>
                                </tr>
                            ) : (
                                (activeTab === 'my_requests' ? myRequests : teamRequests).map(req => (
                                    <tr key={req.request_id} className="border-b hover:bg-gray-50">
                                        {activeTab === 'team_requests' && (
                                            <td className="p-3 font-medium">{getEmployeeName(req.employee_id)}</td>
                                        )}
                                        <td className="p-3">{getTypeLabel(req.type)}</td>
                                        <td className="p-3 text-sm">
                                            {formatDate(new Date(req.start_date))} <br/>
                                            <span className="text-gray-500">hasta</span> <br/>
                                            {formatDate(new Date(req.end_date))}
                                        </td>
                                        <td className="p-3 text-sm text-gray-600 max-w-xs truncate">{req.reason || '-'}</td>
                                        <td className="p-3">{getStatusBadge(req.status)}</td>
                                        
                                        {activeTab === 'team_requests' && (
                                            <td className="p-3 text-right">
                                                {req.status === 'pending' && (
                                                    <div className="flex justify-end space-x-2">
                                                        <button 
                                                            onClick={() => handleUpdateStatus(req.request_id, 'approved')}
                                                            className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Aprobar"
                                                        >
                                                            <CheckIcon className="w-5 h-5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleUpdateStatus(req.request_id, 'rejected')}
                                                            className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Rechazar"
                                                        >
                                                            <XMarkIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                                {req.status !== 'pending' && (
                                                    <span className="text-xs text-gray-400">Revisado por {getEmployeeName(req.reviewed_by || '')}</span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <TimeOffRequestModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
};

export default TimeOffView;
