
import React, { useState, useEffect, useContext, useCallback } from 'react';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { AuthContext } from '../../App';
import { getShiftLog, addShiftLogEntry, getEmployees, getRoles, updateShiftLogEntry, deleteShiftLogEntry } from '../../services/mockApi';
import { ShiftLogEntry, Employee, Role } from '../../types';
import AIAssistant, { InputMode } from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';
import { TrashIcon } from '../icons';

const ShiftLogView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [logEntries, setLogEntries] = useState<ShiftLogEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [targetRole, setTargetRole] = useState('all');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isAdmin = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'administracion';

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [logs, emps, rols] = await Promise.all([getShiftLog(), getEmployees(), getRoles()]);
            
            let relevantLogs: ShiftLogEntry[] = [];
            if (auth?.role) {
                switch (auth.role.role_id) {
                    case 'admin':
                    case 'administracion':
                        relevantLogs = logs;
                        break;
                    case 'gobernanta':
                        relevantLogs = logs.filter(log => 
                            log.target_role_id === 'all' || 
                            log.target_role_id === 'gobernanta' ||
                            log.target_role_id === 'cleaner'
                        );
                        break;
                    default:
                        relevantLogs = logs.filter(log => log.target_role_id === 'all' || log.target_role_id === auth.role.role_id);
                        break;
                }
            }

            setLogEntries(relevantLogs);
            setEmployees(emps);
            setRoles(rols);
        } catch (error) {
            console.error("Failed to fetch shift log data", error);
        } finally {
            setIsLoading(false);
        }
    }, [auth?.role]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getEmployeeInfo = (employeeId: string) => {
        const emp = employees.find(e => e.employee_id === employeeId);
        if (!emp) return { name: 'Desconocido', role: '' };
        const role = roles.find(r => r.role_id === emp.role_id);
        return { name: `${emp.first_name} ${emp.last_name}`, role: role?.name || '' };
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !auth?.employee) return;
        
        setIsSubmitting(true);
        try {
            await addShiftLogEntry({
                employee_id: auth.employee.employee_id,
                message: newMessage,
                target_role_id: targetRole,
                status: 'pending',
                created_at: new Date().toISOString()
            });
            setNewMessage('');
            setTargetRole('all');
            fetchData();
        } catch (error) {
            console.error("Failed to add shift log entry", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Eliminar esta nota?")) return;
        try {
            await deleteShiftLogEntry(id);
            fetchData();
        } catch (e) { alert("Error al borrar"); }
    }

    const handleStatusChange = async (logEntry: ShiftLogEntry, newStatus: ShiftLogEntry['status']) => {
        const updatedLog = { ...logEntry, status: newStatus };
        try {
            setLogEntries(prev => prev.map(l => l.log_id === updatedLog.log_id ? updatedLog : l));
            await updateShiftLogEntry(updatedLog);
        } catch (error) {
            setLogEntries(prev => prev.map(l => l.log_id === logEntry.log_id ? logEntry : l));
        }
    };

    const getRoleName = (roleId: string) => {
        if (roleId === 'all') return 'General';
        return roles.find(r => r.role_id === roleId)?.name || 'Desconocido';
    }

    const getStatusPillClasses = (status: ShiftLogEntry['status']) => {
        const base = 'px-2 py-1 text-xs font-semibold rounded-full capitalize';
        switch (status) {
            case 'resolved': return `${base} bg-green-100 text-green-800`;
            case 'in_progress': return `${base} bg-yellow-100 text-yellow-800`;
            case 'pending':
            default: return `${base} bg-red-100 text-red-800`;
        }
    };

    const canManageStatus = ['admin', 'gobernanta', 'maintenance', 'receptionist', 'administracion'].includes(auth?.role?.role_id ?? '');

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
                <Card title="Añadir Nota de Turno">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 font-bold uppercase text-[10px]">Mensaje</label>
                            <textarea id="message" rows={5} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Información relevante..." required />
                        </div>
                        <div>
                            <label htmlFor="target_role" className="block text-sm font-medium text-gray-700 font-bold uppercase text-[10px]">Dirigido a</label>
                            <select id="target_role" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
                                <option value="all">Todos</option>
                                {roles.map(role => <option key={role.role_id} value={role.role_id}>{role.name}</option>)}
                            </select>
                        </div>
                        <Button type="submit" isLoading={isSubmitting} className="w-full">Publicar Nota</Button>
                    </form>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card title="Historial del Turno">
                    {isLoading ? <Spinner/> : (
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            {logEntries.map(log => {
                                const author = getEmployeeInfo(log.employee_id);
                                return (
                                    <div key={log.log_id} className="p-4 bg-white rounded-lg border border-gray-200 relative group">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-gray-800">{author.name} <span className="text-xs text-gray-400 font-normal uppercase">{author.role}</span></p>
                                                <p className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {canManageStatus ? (
                                                    <button onClick={() => handleStatusChange(log, log.status === 'pending' ? 'resolved' : 'pending')} className={getStatusPillClasses(log.status)}>{log.status}</button>
                                                ) : <span className={getStatusPillClasses(log.status)}>{log.status}</span>}
                                                {isAdmin && <button onClick={() => handleDelete(log.log_id)} className="text-gray-300 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4"/></button>}
                                            </div>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{log.message}</p>
                                        <p className="text-right text-[9px] font-black text-primary/40 uppercase mt-2">Destino: {getRoleName(log.target_role_id)}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ShiftLogView;
