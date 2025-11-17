import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getAnnouncements, addAnnouncement, updateAnnouncement, getEmployees } from '../../services/mockApi';
import { Announcement, Employee } from '../../types';
import { AuthContext } from '../../App';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';

const AnnouncementsManager: React.FC = () => {
    const auth = useContext(AuthContext);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newMessage, setNewMessage] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const [anns, emps] = await Promise.all([getAnnouncements(), getEmployees()]);
            setAnnouncements(anns);
            setEmployees(emps);
        } catch (error) {
            console.error("Failed to fetch announcements", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.employee_id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'N/A';
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !auth?.employee) return;

        setIsSubmitting(true);
        try {
            await addAnnouncement({
                message: newMessage,
                created_by: auth.employee.employee_id,
                is_active: false
            });
            setNewMessage('');
            fetchData();
        } catch (error) {
            console.error("Failed to add announcement", error);
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleToggleActive = async (announcement: Announcement) => {
        const updatedAnnouncement = { ...announcement, is_active: !announcement.is_active };
        await updateAnnouncement(updatedAnnouncement);
        fetchData();
    }

    if (isLoading) return <Spinner />;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card title="Crear Nuevo Comunicado">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="announcement-message" className="block text-sm font-medium text-gray-700">Mensaje</label>
                            <textarea 
                                id="announcement-message" 
                                rows={6} 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                placeholder="Escribe aquí el comunicado para todo el equipo..."
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" isLoading={isSubmitting}>
                            Guardar Comunicado
                        </Button>
                    </form>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card title="Historial de Comunicados">
                     <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        {announcements.map(ann => (
                            <div key={ann.announcement_id} className="p-4 rounded-lg border">
                                <p className="text-gray-700">{ann.message}</p>
                                <div className="text-xs text-gray-500 mt-2 pt-2 border-t flex justify-between items-center">
                                    <span>Por: {getEmployeeName(ann.created_by)} - {new Date(ann.created_at).toLocaleDateString('es-ES')}</span>
                                    <Button size="sm" onClick={() => handleToggleActive(ann)} variant={ann.is_active ? 'danger' : 'success'}>
                                        {ann.is_active ? 'Desactivar' : 'Activar'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AnnouncementsManager;
