
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../../App';
import { getTasks, getRooms, getLocations, startTask, finishTask, getActiveTaskLogForEmployee, getInventoryItems, updateRoomStatus } from '../../services/mockApi';
import { Task, Room, Location, TaskTimeLog, InventoryItem, RoomStatus } from '../../types';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getDistanceFromLatLonInMeters, formatDate } from '../../utils/helpers';
import { addToQueue } from '../../services/offlineManager';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { CheckIcon, BoxIcon, BroomIcon } from '../icons';

const CleaningView: React.FC = () => {
    const auth = useContext(AuthContext);
    const { position, getLocation, loading: geoLoading } = useGeolocation();
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [amenities, setAmenities] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTaskLog, setActiveTaskLog] = useState<TaskTimeLog | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<string | false>(false);
    
    const [usageMap, setUsageMap] = useState<Record<string, number>>({});
    const [showAmenitiesPanel, setShowAmenitiesPanel] = useState(false);

    const fetchData = useCallback(async () => {
        if (!auth?.employee) return;
        setIsLoading(true);
        try {
            const [allTasks, allRooms, allLocations, activeLog, inv] = await Promise.all([
                getTasks(), getRooms(), getLocations(), getActiveTaskLogForEmployee(auth.employee.employee_id), getInventoryItems()
            ]);
            const myTasks = allTasks.filter(t => (t.assigned_to === auth.employee?.employee_id || t.assigned_to === 'all_cleaners') && t.status !== 'completed');
            setTasks(myTasks);
            setRooms(allRooms);
            setLocations(allLocations);
            setActiveTaskLog(activeLog);
            setAmenities(inv.filter(i => i.category === 'amenities' || i.category === 'cleaning'));
        } catch (error) {
            console.error(error);
        } finally { setIsLoading(false); }
    }, [auth?.employee]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleStartTask = async (taskId: string) => {
        setIsSubmitting(taskId);
        getLocation();
    };
    
    useEffect(() => {
        const tryStart = async () => {
            if (isSubmitting && position && auth?.employee && !activeTaskLog) {
                const nearby = locations.find(loc => getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, loc.latitude, loc.longitude) <= 250);
                if (!nearby) {
                    alert("Debes estar en el establecimiento para iniciar la tarea.");
                    setIsSubmitting(false);
                    return;
                }

                try {
                    await startTask(isSubmitting as string, auth.employee.employee_id, nearby.location_id);
                    fetchData();
                    setIsSubmitting(false);
                } catch (e: any) {
                    if (e.message === "Offline") {
                        addToQueue('START_TASK', { taskId: isSubmitting, employeeId: auth.employee.employee_id, locationId: nearby.location_id });
                        alert("Trabajo iniciado (Modo Offline). Los datos se sincronizarán al recuperar la cobertura.");
                        fetchData();
                    }
                    setIsSubmitting(false);
                }
            }
        };
        tryStart();
    }, [position, isSubmitting]);

    const handleUpdateRoom = async (roomId: string, status: RoomStatus) => {
        try {
            await updateRoomStatus(roomId, status, auth?.employee?.employee_id);
            fetchData();
        } catch (e: any) { 
            if (e.message === "Offline") {
                addToQueue('UPDATE_ROOM_STATUS', { roomId, status, employeeId: auth?.employee?.employee_id });
                fetchData();
            }
        }
    };

    const handleFinishTask = async () => {
        if (!activeTaskLog || !auth?.employee) return;
        setIsSubmitting(activeTaskLog.task_id);
        const usage = Object.entries(usageMap).filter(([_, qty]) => (qty as number) > 0).map(([itemId, qty]) => ({ item_id: itemId, amount: qty as number }));
        
        try {
            await finishTask(activeTaskLog.log_id, activeTaskLog.task_id, usage, auth.employee.employee_id);
            setShowAmenitiesPanel(false);
            fetchData();
        } catch(e: any) { 
            if (e.message === "Offline") {
                addToQueue('FINISH_TASK', { logId: activeTaskLog.log_id, taskId: activeTaskLog.task_id, inventoryUsage: usage, employeeId: auth.employee.employee_id });
                alert("Tarea finalizada localmente. Pendiente de sincronización.");
                setShowAmenitiesPanel(false);
                fetchData();
            }
        } finally { setIsSubmitting(false); }
    }

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <Card title="Mis Tareas de Hoy">
                {tasks.length > 0 ? (
                    <div className="space-y-4">
                        {tasks.map(task => {
                            const isActive = activeTaskLog?.task_id === task.task_id;
                            const room = rooms.find(r => r.room_id === task.room_id);
                            const location = locations.find(l => l.location_id === room?.location_id);
                            return (
                                <div key={task.task_id} className={`p-4 border rounded-xl shadow-sm ${isActive ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' : 'bg-white'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-bold text-lg text-gray-800">{task.description}</p>
                                            <p className="text-xs text-gray-500 font-black uppercase">📍 {location?.name} • {room?.name}</p>
                                            
                                            {room && (
                                                <div className="mt-3 flex gap-1">
                                                    {(['clean', 'dirty', 'in_progress', 'occupied'] as RoomStatus[]).map(st => (
                                                        <button 
                                                            key={st} 
                                                            onClick={() => handleUpdateRoom(room.room_id, st)}
                                                            className={`text-[9px] px-2 py-1 rounded-full font-black border transition-all ${room.status === st ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                                                        >
                                                            {st.replace('_', ' ').toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            {isActive ? (
                                                <Button size="sm" variant="success" onClick={() => setShowAmenitiesPanel(true)}>FINALIZAR</Button>
                                            ) : (
                                                <Button size="sm" onClick={() => handleStartTask(task.task_id)} disabled={!!activeTaskLog} isLoading={isSubmitting === task.task_id}>INICIAR</Button>
                                            )}
                                        </div>
                                    </div>
                                    {isActive && showAmenitiesPanel && (
                                        <div className="mt-4 pt-4 border-t border-blue-200 animate-in slide-in-from-top-2">
                                            <p className="text-xs font-black text-blue-800 mb-3 flex items-center uppercase"><BoxIcon className="w-3 h-3 mr-1"/> Consumo de Amenities</p>
                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                {amenities.map(i => (
                                                    <div key={i.item_id} className="bg-white p-2 border rounded-lg flex justify-between items-center text-xs">
                                                        <span className="font-bold truncate mr-2">{i.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => setUsageMap(p => ({...p, [i.item_id]: Math.max(0, (p[i.item_id]||0)-1)}))} className="w-5 h-5 bg-gray-100 rounded">-</button>
                                                            <span className="font-black w-4 text-center">{usageMap[i.item_id]||0}</span>
                                                            <button onClick={() => setUsageMap(p => ({...p, [i.item_id]: (p[i.item_id]||0)+1}))} className="w-5 h-5 bg-primary text-white rounded">+</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="secondary" onClick={() => setShowAmenitiesPanel(false)} className="flex-1">CANCELAR</Button>
                                                <Button variant="danger" onClick={handleFinishTask} className="flex-1">CONFIRMAR CIERRE</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : <div className="py-12 text-center text-gray-400 italic">No tienes tareas hoy.</div>}
            </Card>
        </div>
    );
};

export default CleaningView;
