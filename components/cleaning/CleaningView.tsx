
import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../../App';
import { getTasks, getRooms, getLocations, startTask, finishTask, getActiveTaskLogForEmployee, getInventoryItems } from '../../services/mockApi';
import { Task, Room, Location, TaskTimeLog, InventoryItem } from '../../types';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getDistanceFromLatLonInMeters, formatDate } from '../../utils/helpers';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { CheckIcon, BoxIcon } from '../icons';

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
    
    // UI State for Amenities usage
    const [usageMap, setUsageMap] = useState<Record<string, number>>({});
    const [showAmenitiesPanel, setShowAmenitiesPanel] = useState(false);

    const fetchData = useCallback(async () => {
        if (!auth?.employee) return;
        setIsLoading(true);
        try {
            const [allTasks, allRooms, allLocations, activeLog, inv] = await Promise.all([
                getTasks(), 
                getRooms(), 
                getLocations(),
                getActiveTaskLogForEmployee(auth.employee.employee_id),
                getInventoryItems()
            ]);
            
            const today = new Date();
            today.setHours(0,0,0,0);
            const sevenDaysFromNow = new Date(today);
            sevenDaysFromNow.setDate(today.getDate() + 7);

            const myTasks = allTasks.filter(t => {
                 const dueDate = new Date(t.due_date);
                 return (t.assigned_to === auth.employee?.employee_id || t.assigned_to === 'all_cleaners') && 
                        dueDate >= today && 
                        dueDate < sevenDaysFromNow;
            }).sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1;
                if (a.status !== 'completed' && b.status === 'completed') return -1;
                return 0;
            });
            
            setTasks(myTasks);
            setRooms(allRooms);
            setLocations(allLocations);
            setActiveTaskLog(activeLog);
            setAmenities(inv.filter(i => i.category === 'amenities' || i.category === 'cleaning'));
            setUsageMap({});
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        } finally {
            setIsLoading(false);
        }
    }, [auth?.employee]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        if (isSubmitting && position && auth?.employee && !activeTaskLog && !showAmenitiesPanel) {
            const nearbyLocation = locations.find(loc => 
                getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, loc.latitude, loc.longitude) <= loc.radius_meters
            );

            if (nearbyLocation) {
                 startTask(isSubmitting as string, auth.employee.employee_id, nearbyLocation.location_id).then(() => {
                    fetchData();
                    setIsSubmitting(false);
                 });
            } else {
                alert("No te encuentras en una ubicación de trabajo válida para iniciar la tarea.");
                setIsSubmitting(false);
            }
        }
    }, [position, isSubmitting, locations, auth?.employee, fetchData, activeTaskLog, showAmenitiesPanel]);

    const handleStartTask = (taskId: string) => {
        setIsSubmitting(taskId);
        getLocation();
    };
    
    const handleFinishTask = async () => {
        if (!activeTaskLog || !auth?.employee) return;
        setIsSubmitting(activeTaskLog.task_id);
        
        const inventoryUsage = Object.entries(usageMap)
            .filter(([_, qty]) => (qty as number) > 0)
            .map(([itemId, qty]) => ({ item_id: itemId, amount: qty as number }));

        try {
            await finishTask(activeTaskLog.log_id, activeTaskLog.task_id, inventoryUsage, auth.employee.employee_id);
            setShowAmenitiesPanel(false);
            fetchData();
        } catch(error) {
            console.error("Failed to finish task", error);
        } finally {
            setIsSubmitting(false);
        }
    }

    const updateUsage = (itemId: string, delta: number) => {
        setUsageMap(prev => ({
            ...prev,
            [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
        }));
    };

    const groupedTasks = useMemo(() => {
        const groups = tasks.reduce((acc, task) => {
            const dateKey = task.due_date;
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(task);
            return acc;
        }, {} as Record<string, Task[]>);
        return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    }, [tasks]);

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <Card title="Mis Tareas de Limpieza">
                {tasks.length > 0 ? (
                    <div className="space-y-6">
                        {groupedTasks.map(([dateStr, tasksForDay]) => (
                            <div key={dateStr}>
                                <h3 className="text-lg font-semibold text-primary mb-2 border-b pb-1">
                                    {formatDate(new Date(dateStr))}
                                </h3>
                                <div className="space-y-3">
                                    {tasksForDay.map(task => {
                                        const isCompleted = task.status === 'completed';
                                        const isActive = activeTaskLog?.task_id === task.task_id;
                                        const room = rooms.find(r => r.room_id === task.room_id);
                                        const locationName = room ? locations.find(l => l.location_id === room.location_id)?.name : 'N/A';

                                        return (
                                        <div key={task.task_id} className={`p-4 border rounded-xl shadow-sm transition-all ${isActive ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-100' : isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                                            <div className="flex justify-between items-start">
                                                <div className={`${isCompleted ? 'opacity-60' : ''}`}>
                                                    <p className={`font-bold text-lg ${isCompleted ? 'line-through' : 'text-gray-800'}`}>{task.description}</p>
                                                    <p className="text-sm text-gray-500 font-medium">
                                                        📍 {locationName} - {room?.name || 'Habitación General'}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    {isCompleted ? (
                                                         <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                                            <CheckIcon className="w-3 h-3 mr-1"/> Completada
                                                        </div>
                                                    ) : isActive ? (
                                                        <div className="flex flex-col gap-2">
                                                            <Button size="sm" variant="success" onClick={() => setShowAmenitiesPanel(true)}>
                                                                <BoxIcon className="w-4 h-4 mr-2" /> Finalizar y Amenities
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button size="md" onClick={() => handleStartTask(task.task_id)} disabled={!!activeTaskLog || !!isSubmitting} isLoading={isSubmitting === task.task_id || geoLoading}>
                                                            ▶ Iniciar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Quick Amenities Panel when active */}
                                            {isActive && showAmenitiesPanel && (
                                                <div className="mt-6 pt-4 border-t border-blue-200 animate-in slide-in-from-top-4 duration-300">
                                                    <h4 className="text-sm font-bold text-blue-800 mb-4 flex items-center">
                                                        <BoxIcon className="w-4 h-4 mr-2" /> Amenities Repuestos
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                                        {amenities.map(item => (
                                                            <div key={item.item_id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                                                                <span className="text-sm font-medium text-gray-700">{item.name}</span>
                                                                <div className="flex items-center space-x-3">
                                                                    <button onClick={() => updateUsage(item.item_id, -1)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xl">-</button>
                                                                    <span className="font-bold w-4 text-center">{usageMap[item.item_id] || 0}</span>
                                                                    <button onClick={() => updateUsage(item.item_id, 1)} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">+</button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="secondary" onClick={() => setShowAmenitiesPanel(false)} className="flex-1">Atrás</Button>
                                                        <Button variant="danger" onClick={handleFinishTask} isLoading={isSubmitting === task.task_id} className="flex-2">
                                                            Confirmar y Cerrar Tarea
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <CheckIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">¡No tienes tareas pendientes!</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default CleaningView;
