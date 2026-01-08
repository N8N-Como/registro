
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../App';
import { TimeOffRequest, Employee } from '../../types';
import { getTimeOffRequests, updateTimeOffRequestStatus, getEmployees, deleteTimeOffRequest } from '../../services/mockApi';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { SunIcon, CheckIcon, XMarkIcon, TrashIcon } from '../icons';
import TimeOffRequestModal from './TimeOffRequestModal';
import { formatDate } from '../../utils/helpers';

const TimeOffView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my_requests' | 'team_requests'>('my_requests');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isAdmin = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'administracion';
    const canManage = isAdmin || auth?.role?.role_id === 'gobernanta' || auth?.role?.role_id === 'receptionist';

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

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
        if (!auth?.employee) return;
        try {
            await updateTimeOffRequestStatus(requestId, status, auth.employee.employee_id);
            fetchData();
        } catch (error) { alert("Error al actualizar"); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Borrar solicitud?")) return;
        try {
            await deleteTimeOffRequest(id);
            fetchData();
        } catch (e) { alert("Error al borrar"); }
    };

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.employee_id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'Desconocido';
    };

    const getStatusBadge = (status: string) => {
        const base = "px-2 py-0.5 rounded-full text-[10px] font-black uppercase";
        switch(status) {
            case 'approved': return <span className={`${base} bg-green-100 text-green-800`}>Aprobado</span>;
            case 'rejected': return <span className={`${base} bg-red-100 text-red-800`}>Rechazado</span>;
            default: return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pendiente</span>;
        }
    };

    const myRequests = requests.filter(r => r.employee_id === auth?.employee?.employee_id);
    const teamRequests = requests; 

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><SunIcon className="text-orange-500" /> Gestión de Ausencias</h2>
                <Button onClick={() => setIsModalOpen(true)}>+ Solicitar</Button>
            </div>

            {canManage && (
                <div className="flex space-x-4 border-b">
                    <button onClick={() => setActiveTab('my_requests')} className={`pb-2 px-4 text-xs font-black uppercase ${activeTab === 'my_requests' ? 'border-b-4 border-primary text-primary' : 'text-gray-400'}`}>Mis Solicitudes</button>
                    <button onClick={() => setActiveTab('team_requests')} className={`pb-2 px-4 text-xs font-black uppercase ${activeTab === 'team_requests' ? 'border-b-4 border-primary text-primary' : 'text-gray-400'}`}>Equipo</button>
                </div>
            )}

            <Card className="p-0 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase border-b">
                        <tr>
                            {activeTab === 'team_requests' && <th className="p-4">Empleado</th>}
                            <th className="p-4">Periodo</th>
                            <th className="p-4">Tipo</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {(activeTab === 'my_requests' ? myRequests : teamRequests).map(req => (
                            <tr key={req.request_id} className="border-b hover:bg-gray-50 transition-colors">
                                {activeTab === 'team_requests' && <td className="p-4 font-bold">{getEmployeeName(req.employee_id)}</td>}
                                <td className="p-4">
                                    <div className="font-bold">{new Date(req.start_date).toLocaleDateString()}</div>
                                    <div className="text-[10px] text-gray-400">{new Date(req.end_date).toLocaleDateString()}</div>
                                </td>
                                <td className="p-4 text-xs font-medium capitalize">{req.type.replace('_', ' ')}</td>
                                <td className="p-4">{getStatusBadge(req.status)}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {req.status === 'pending' && activeTab === 'team_requests' && (
                                            <>
                                                <button onClick={() => handleUpdateStatus(req.request_id, 'approved')} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><CheckIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleUpdateStatus(req.request_id, 'rejected')} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><XMarkIcon className="w-4 h-4"/></button>
                                            </>
                                        )}
                                        {isAdmin && <button onClick={() => handleDelete(req.request_id)} className="p-1.5 text-gray-300 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {isModalOpen && <TimeOffRequestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} />}
        </div>
    );
};

export default TimeOffView;
