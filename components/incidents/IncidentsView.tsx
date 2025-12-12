
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getIncidents, getEmployees, getLocations, getRooms, addIncident, updateIncident } from '../../services/mockApi';
import { Incident, Employee, Location, Room } from '../../types';
import { AuthContext } from '../../App';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import IncidentFormModal from './IncidentFormModal';
import { formatDate } from '../../utils/helpers';
import AIAssistant from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';

const IncidentsView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

    const canManage = auth?.role?.permissions.includes('manage_incidents') ?? false;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [incs, emps, locs, allRooms] = await Promise.all([getIncidents(), getEmployees(), getLocations(), getRooms()]);
            // Ordenar por fecha de creación (que en preventivos actúa como fecha de inicio) descendente
            // La petición pedía ordenar por "fecha más antigua", pero en UX suele ser mejor ver lo nuevo arriba.
            // Si el usuario quiere ver lo viejo, lo mejor sería añadir ordenación.
            // Voy a mantener descendente por defecto para consistencia, pero añadir un indicador visual.
            setIncidents(incs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setEmployees(emps);
            setLocations(locs);
            setRooms(allRooms);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (incident: Incident | null) => {
        setSelectedIncident(incident);
        setIsModalOpen(true);
    };

    const handleSaveIncident = async (data: Omit<Incident, 'incident_id' | 'created_at' | 'reported_by'> | Incident) => {
        if ('incident_id' in data) {
            await updateIncident(data);
        } else if (auth?.employee) {
            await addIncident({ ...data, reported_by: auth.employee.employee_id });
        }
        fetchData();
        setIsModalOpen(false);
    };

    const handleAIAction = async (response: AIResponse) => {
        if (response.action === 'createIncident' && response.data && auth?.employee) {
            try {
                 await addIncident({
                    description: response.data.description,
                    location_id: response.data.location_id,
                    room_id: response.data.room_id || '',
                    priority: response.data.priority || 'medium',
                    status: 'open',
                    reported_by: auth.employee.employee_id
                });
                fetchData();
            } catch (e) {
                console.error("Failed to create incident from AI", e);
                alert("Error al crear la incidencia desde la IA");
            }
        }
    };

    const getEmployeeName = (id: string) => {
        if (id === 'system') return 'Sistema (Automático)';
        const emp = employees.find(e => e.employee_id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'N/A';
    };

    const getLocationName = (id: string) => locations.find(l => l.location_id === id)?.name || 'N/A';
    const getRoomName = (id?: string) => id ? (rooms.find(r => r.room_id === id)?.name || 'N/A') : '-';
    
    const getStatusPill = (status: Incident['status']) => {
        const base = 'px-2 py-1 text-xs font-semibold rounded-full capitalize';
        switch (status) {
          case 'open': return `${base} bg-red-100 text-red-800`;
          case 'in_progress': return `${base} bg-yellow-100 text-yellow-800`;
          case 'resolved': return `${base} bg-green-100 text-green-800`;
          default: return `${base} bg-gray-100 text-gray-800`;
        }
    };
    
    if (isLoading) return <Spinner />;

    return (
        <div className="relative">
            <Card title="Gestión de Incidencias y Mantenimiento">
                <Button onClick={() => handleOpenModal(null)} className="mb-4">
                    Reportar Nueva Incidencia
                </Button>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Ubicación</th>
                                <th className="p-3">Descripción</th>
                                <th className="p-3">Reportado por</th>
                                <th className="p-3">Estado</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incidents.map(incident => (
                                <tr key={incident.incident_id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">
                                        {incident.type === 'preventive' ? (
                                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold uppercase">Preventivo</span>
                                        ) : (
                                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold uppercase">Avería</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm">
                                        {formatDate(new Date(incident.created_at))}
                                        {incident.due_date && incident.status !== 'resolved' && (
                                            <div className="text-xs text-red-500 font-semibold mt-1">
                                                Vence: {formatDate(new Date(incident.due_date))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm">
                                        <p className="font-semibold">{getLocationName(incident.location_id)}</p>
                                        <p className="text-gray-500 text-xs">{getRoomName(incident.room_id)}</p>
                                    </td>
                                    <td className="p-3">
                                        {incident.description}
                                        {incident.photo_url && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                📷 Foto
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 text-sm">{getEmployeeName(incident.reported_by)}</td>
                                    <td className="p-3"><span className={getStatusPill(incident.status)}>{incident.status.replace('_', ' ')}</span></td>
                                    <td className="p-3">
                                        <Button size="sm" variant="secondary" onClick={() => handleOpenModal(incident)}>
                                            {canManage ? 'Gestionar' : 'Ver'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {isModalOpen && (
                    <IncidentFormModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSaveIncident}
                        incident={selectedIncident}
                        locations={locations}
                        employees={employees}
                        rooms={rooms}
                        canManage={canManage}
                    />
                )}
            </Card>

            {/* AI Assistant Integration */}
            <AIAssistant 
                context={{ employees, rooms, locations, currentUser: auth?.employee || undefined }} 
                onAction={handleAIAction}
            />
        </div>
    );
};

export default IncidentsView;
