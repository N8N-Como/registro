import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../../App';
import { getShiftLog, getEmployees, getRoles } from '../../../services/mockApi';
import { ShiftLogEntry, Employee, Role } from '../../../types';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';

const ShiftLogWidget: React.FC = () => {
    const auth = useContext(AuthContext);
    const [latestEntries, setLatestEntries] = useState<ShiftLogEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!auth?.role) return;
        setIsLoading(true);
        try {
            const [logs, emps, rols] = await Promise.all([getShiftLog(), getEmployees(), getRoles()]);
            
            let relevantLogs: ShiftLogEntry[] = [];
            if (auth.role) {
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
            
            const latestRelevantEntries = relevantLogs.slice(0, 3); // Get the 3 most recent entries

            setLatestEntries(latestRelevantEntries);
            setEmployees(emps);
            setRoles(rols);
        } catch (error) {
            console.error("Failed to fetch shift log data for widget", error);
        } finally {
            setIsLoading(false);
        }
    }, [auth?.role]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [fetchData]);

    const getEmployeeInfo = (employeeId: string) => {
        const emp = employees.find(e => e.employee_id === employeeId);
        if (!emp) return { name: 'Desconocido', role: '' };
        const role = roles.find(r => r.role_id === emp.role_id);
        return { name: `${emp.first_name} ${emp.last_name}`, role: role?.name || '' };
    };
    
    const getRoleName = (roleId: string) => {
        if (roleId === 'all') return 'General';
        return roles.find(r => r.role_id === roleId)?.name || 'Desconocido';
    }

    if (isLoading) {
        return (
            <Card title="Novedades del Turno">
                <Spinner size="sm" />
            </Card>
        );
    }
    
    if (latestEntries.length === 0) {
        return null; // Don't show the widget if there are no relevant messages
    }

    return (
        <Card title="Novedades del Turno">
            <div className="space-y-4">
                {latestEntries.map(log => {
                    const author = getEmployeeInfo(log.employee_id);
                    return (
                        <div key={log.log_id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start text-sm">
                                <div>
                                    <p className="font-semibold">{author.name}</p>
                                    <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 flex-shrink-0">
                                    Para: {getRoleName(log.target_role_id)}
                                </span>
                            </div>
                            <p className="mt-2 text-gray-800 text-sm whitespace-pre-wrap">{log.message}</p>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default ShiftLogWidget;