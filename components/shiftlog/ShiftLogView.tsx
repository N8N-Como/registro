
import React, { useState, useEffect, useContext, useCallback } from 'react';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { AuthContext } from '../../App';
import { getShiftLog, addShiftLogEntry, getEmployees, getRoles, updateShiftLogEntry } from '../../services/mockApi';
import { ShiftLogEntry, Employee, Role } from '../../types';
import AIAssistant from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';

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
                    case 'administracion': relevantLogs = logs; break;
                    case 'gobernanta': relevantLogs = logs.filter(log => log.target_role_id === 'all' || log.target_role_id === 'gobernanta' || log.target_role_id === 'cleaner'); break;
                    default: relevantLogs = logs.filter(log => log.target_role_id === 'all' || log.target_role_id === auth.role?.role_id); break;
                }
            }
            setLogEntries(relevantLogs);
            setEmployees(emps);
            setRoles(rols);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    }, [auth?.role]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAIAction = async (response: AIResponse) => {
        if (response.action === 'addToShiftLog' && response.data && auth?.employee) {
            await addShiftLogEntry({ employee_id: auth.employee.employee_id, message: response.data.message, target_role_id: response.data.target_role || 'all' });
            fetchData();
        }
    };

    const handleCycleStatus = async (logEntry: ShiftLogEntry) => {
        const next: ShiftLogEntry['status'] = logEntry.status === 'pending' ? 'in_progress' : (logEntry.status === 'in_progress' ? 'resolved' : 'pending');
        await updateShiftLogEntry({ ...logEntry, status: next });
        fetchData();
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Añadir Nota">
                <form onSubmit={async (e) => { e.preventDefault(); if (auth?.employee) { setIsSubmitting(true); await addShiftLogEntry({ employee_id: auth.employee.employee_id, message: newMessage, target_role_id: targetRole }); setNewMessage(''); fetchData(); setIsSubmitting(false); } }} className="space-y-4">
                    <textarea rows={5} className="w-full border rounded p-2" value={newMessage} onChange={e => setNewMessage(e.target.value)} required />
                    <select className="w-full border rounded p-2" value={targetRole} onChange={e => setTargetRole(e.target.value)}>
                        <option value="all">Todos</option>
                        {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.name}</option>)}
                    </select>
                    <Button type="submit" isLoading={isSubmitting} className="w-full">Publicar</Button>
                </form>
            </Card>
            <div className="md:col-span-2">
                <Card title="Registro">
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                        {logEntries.map(log => (
                            <div key={log.log_id} className="p-3 border rounded">
                                <div className="flex justify-between font-bold text-sm">
                                    <span>{employees.find(e=>e.employee_id===log.employee_id)?.first_name}</span>
                                    <button onClick={() => handleCycleStatus(log)} className="text-xs px-2 py-1 bg-gray-100 rounded capitalize">{log.status}</button>
                                </div>
                                <p className="mt-2 text-sm">{log.message}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            <AIAssistant context={{ employees, locations: [], currentUser: auth?.employee || undefined }} onAction={handleAIAction} allowedInputs={['voice', 'text']} />
        </div>
    );
};

export default ShiftLogView;
