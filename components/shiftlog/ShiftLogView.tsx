

import React, { useState, useEffect, useContext, useCallback } from 'react';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { AuthContext } from '../../App';
import { getShiftLog, addShiftLogEntry, getEmployees, getRoles, updateShiftLogEntry } from '../../services/mockApi';
import { ShiftLogEntry, Employee, Role } from '../../types';

const ShiftLogView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [logEntries, setLogEntries] = useState<ShiftLogEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [targetRole, setTargetRole] = useState('all');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [logs, emps, rols] = await Promise.all([getShiftLog(), getEmployees(), getRoles()]);
            
            let relevantLogs: ShiftLogEntry[] = [];
            if (auth?.role) {
                switch (auth.role.role_id) {
                    case 'admin':
                    case 'administracion':
                        // Admin y Administración ven todos los mensajes
                        relevantLogs = logs;
                        break;
                    case 'gobernanta':
                        // Gobernanta ve mensajes para 'all', 'gobernanta', y 'cleaner'
                        relevantLogs = logs.filter(log => 
                            log.target_role_id === 'all' || 
                            log.target_role_id === 'gobernanta' ||
                            log.target_role_id === 'cleaner'
                        );
                        break;
                    default:
                        // El resto ve los mensajes generales y los de su propio rol
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
    
    const handleStatusChange = async (logEntry: ShiftLogEntry, newStatus: ShiftLogEntry['status']) => {
        const updatedLog = { ...logEntry, status: newStatus };
        try {
            // Optimistically update UI
            setLogEntries(prev => prev.map(l => l.log_id === updatedLog.log_id ? updatedLog : l));
            await updateShiftLogEntry(updatedLog);
            // fetchData(); // Can refetch for consistency, but optimistic is faster
        } catch (error) {
            console.error("Failed to update status", error);
            // Rollback on error
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

    const getNextStatus = (currentStatus: ShiftLogEntry['status']): ShiftLogEntry['status'] => {
        if (currentStatus === 'pending') return 'in_progress';
        if (currentStatus === 'in_progress') return 'resolved';
        return 'pending'; // 'resolved' cycles back to 'pending'
    };

    const handleCycleStatus = (logEntry: ShiftLogEntry) => {
        const newStatus = getNextStatus(logEntry.status);
        handleStatusChange(logEntry, newStatus);
    };


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Card title="Añadir Nota de Turno">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">Mensaje</label>
                    <textarea 
                        id="message" 
                        rows={5}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-dark focus:ring-primary-dark"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe aquí cualquier información relevante para el siguiente turno..."
                        required
                    />
                </div>
                <div>
                    <label htmlFor="target_role" className="block text-sm font-medium text-gray-700">Dirigido a</label>
                    <select 
                        id="target_role"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-dark focus:ring-primary-dark"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                    >
                        <option value="all">Todos los departamentos</option>
                        {roles.map(role => (
                            <option key={role.role_id} value={role.role_id}>{role.name}</option>
                        ))}
                    </select>
                </div>
                <Button type="submit" isLoading={isSubmitting} className="w-full">
                    Añadir al Registro
                </Button>
            </form>
        </Card>
      </div>
      <div className="md:col-span-2">
        <Card title="Historial del Turno">
            {isLoading ? <Spinner/> : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {logEntries.length > 0 ? logEntries.map(log => {
                        const author = getEmployeeInfo(log.employee_id);
                        return (
                             <div key={log.log_id} className="p-4 bg-white rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{author.name} <span className="text-sm text-gray-500 font-normal">({author.role})</span></p>
                                        <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('es-ES')}</p>
                                    </div>
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            Para: {getRoleName(log.target_role_id)}
                                        </span>
                                        {canManageStatus ? (
                                            <button
                                                onClick={() => handleCycleStatus(log)}
                                                className={`${getStatusPillClasses(log.status)} transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary`}
                                                title="Click para cambiar estado"
                                            >
                                                {log.status.replace('_', ' ')}
                                            </button>
                                        ) : (
                                            <span className={getStatusPillClasses(log.status)}>{log.status.replace('_', ' ')}</span>
                                        )}
                                    </div>
                                </div>
                                <p className="mt-2 text-gray-700 whitespace-pre-wrap">{log.message}</p>
                            </div>
                        )
                    }) : <p>No hay entradas en el registro de turno.</p>}
                </div>
            )}
        </Card>
      </div>
    </div>
  );
};

export default ShiftLogView;