import React, { useState, useEffect, useContext } from 'react';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import { getIncidents, getShiftLog, getEmployees, getLocations, getRooms, getRoles } from '../../../services/mockApi';
import { AuthContext } from '../../../App';
import { Incident, ShiftLogEntry, Employee, Location, Room, Role } from '../../../types';
import { IncidentIcon, BookOpenIcon } from '../../icons';
import { formatDate } from '../../../utils/helpers';

const ReceptionistDashboard: React.FC = () => {
    const auth = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);
    const [openIncidents, setOpenIncidents] = useState<Incident[]>([]);
    const [shiftLogEntries, setShiftLogEntries] = useState<ShiftLogEntry[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!auth?.role) return;
            setIsLoading(true);
            try {
                const [
                    incidents,
                    logs,
                    emps,
                    locs,
                    allRooms,
                    rols
                ] = await Promise.all([
                    getIncidents(),
                    getShiftLog(),
                    getEmployees(),
                    getLocations(),
                    getRooms(),
                    getRoles()
                ]);

                // Filter incidents
                setOpenIncidents(incidents.filter(i => i.status === 'open'));

                // Filter shift logs
                const relevantLogs = logs.filter(log =>
                    log.target_role_id === 'all' || log.target_role_id === auth.role.role_id
                );
                setShiftLogEntries(relevantLogs.slice(0, 5)); // show latest 5

                // Set supporting data
                setEmployees(emps);
                setLocations(locs);
                setRooms(allRooms);
                setRoles(rols);

            } catch (error) {
                console.error("Failed to fetch receptionist dashboard data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [auth?.role]);

    // Helper functions
    const getLocationName = (id: string) => locations.find(l => l.location_id === id)?.name || 'N/A';
    const getRoomName = (id?: string) => id ? (rooms.find(r => r.room_id === id)?.name || '') : '';
    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.employee_id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'N/A';
    };
     const getRoleName = (roleId: string) => {
        if (roleId === 'all') return 'General';
        return roles.find(r => r.role_id === roleId)?.name || 'Desconocido';
    }
    const getPriorityPill = (priority: Incident['priority']) => {
        const base = 'px-2 py-0.5 text-xs font-semibold rounded-full capitalize';
        switch (priority) {
            case 'high': return `${base} bg-red-100 text-red-800`;
            case 'medium': return `${base} bg-yellow-100 text-yellow-800`;
            case 'low': return `${base} bg-blue-100 text-blue-800`;
            default: return `${base} bg-gray-100 text-gray-800`;
        }
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Incidencias Abiertas">
                {openIncidents.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {openIncidents.map(incident => {
                            const location = getLocationName(incident.location_id);
                            const room = getRoomName(incident.room_id);
                            return (
                                <div key={incident.incident_id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start text-sm">
                                        <p className="font-semibold text-gray-800">{location}{room && ` - ${room}`}</p>
                                        <span className={getPriorityPill(incident.priority)}>{incident.priority}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                                    <p className="text-xs text-gray-400 mt-2">Reportado por {getEmployeeName(incident.reported_by)} el {formatDate(new Date(incident.created_at))}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <IncidentIcon className="w-12 h-12 text-green-500 mx-auto" />
                        <p className="mt-2 text-gray-500">¡No hay incidencias abiertas!</p>
                    </div>
                )}
            </Card>

            <Card title="Novedades del Turno">
                 {shiftLogEntries.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {shiftLogEntries.map(log => (
                             <div key={log.log_id} className="p-3 bg-gray-50 rounded-lg border">
                                <div className="flex justify-between items-start text-sm">
                                    <p className="font-semibold">{getEmployeeName(log.employee_id)}</p>
                                    <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}</span>
                                </div>
                                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{log.message}</p>
                                <p className="text-right text-xs text-blue-600 mt-2">Para: {getRoleName(log.target_role_id)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto" />
                        <p className="mt-2 text-gray-500">No hay notas recientes en el registro.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ReceptionistDashboard;
