import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../../App';
import { getTasks, getRooms, getLocations, startTask, finishTask, getActiveTaskLogForEmployee } from '../../services/mockApi';
import { Task, Room, Location, TaskTimeLog } from '../../types';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getDistanceFromLatLonInMeters, formatDate } from '../../utils/helpers';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { CheckIcon } from '../icons';

const CleaningView: React.FC = () => {
    const auth = useContext(AuthContext);
    const { position, getLocation, loading: geoLoading } = useGeolocation();
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTaskLog, setActiveTaskLog] = useState<TaskTimeLog | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<string | false>(false); // task_id or false

    const fetchData = useCallback(async () => {
        if (!auth?.employee) return;
        setIsLoading(true);
        try {
            const [allTasks, allRooms, allLocations, activeLog] = await Promise.all([
                getTasks(), 
                getRooms(), 
                getLocations(),
                getActiveTaskLogForEmployee(auth.employee.employee_id)
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
            }).sort((a,b) => a.status === 'completed' ? 1 : -1);
            
            setTasks(myTasks);
            setRooms(allRooms);
setLocations(allLocations);
            setActiveTaskLog(activeLog);
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
        if (isSubmitting && position && auth?.employee && !activeTaskLog) {
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
    }, [position, isSubmitting, locations, auth?.employee, fetchData, activeTaskLog]);

    const handleStartTask = (taskId: string) => {
        setIsSubmitting(taskId);
        getLocation();
    };
    
    const handleFinishTask = async () => {
        if (!activeTaskLog) return;
        setIsSubmitting(activeTaskLog.task_id);
        try {
            await finishTask(activeTaskLog.log_id, activeTaskLog.task_id);
            fetchData();
        } catch(error) {
            console.error("Failed to finish task", error);
        } finally {
            setIsSubmitting(false);
        }
    }

    const getRoomName = (roomId: string) => {
        if (roomId === 'all_rooms') return 'Todas las habitaciones';
        return rooms.find(r => r.room_id === roomId)?.name || 'N/A';
    }
    
    const isTaskActive = (taskId: string) => activeTaskLog?.task_id === taskId;

    const groupedTasks = useMemo(() => {
        const groups = tasks.reduce((acc, task) => {
            const dateKey = task.due_date;
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push(task);
            return acc;
        }, {} as Record<string, Task[]>);
        return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    }, [tasks]);


    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <Card title="Mis Tareas (Próximos 7 días)">
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
                                        const room = rooms.find(r => r.room_id === task.room_id);
                                        const locationName = room ? locations.find(l => l.location_id === room.location_id)?.name : 'N/A';
                                        return (
                                        <div key={task.task_id} className={`p-3 border rounded-lg flex justify-between items-center transition-colors ${
                                            isTaskActive(task.task_id) ? 'bg-blue-50 border-blue-300' 
                                            : isCompleted ? 'bg-green-50 border-green-200'
                                            : 'bg-white'
                                            }`}>
                                            <div className={`${isCompleted ? 'opacity-60' : ''}`}>
                                                <p className={`font-semibold ${isCompleted ? 'line-through' : ''}`}>{task.description}</p>
                                                <p className="text-sm text-gray-500">
                                                    {locationName} - {getRoomName(task.room_id)}
                                                </p>
                                            </div>
                                            <div className="flex-shrink-0 ml-2">
                                                {isCompleted ? (
                                                     <div className="flex items-center space-x-2 text-green-600">
                                                        <CheckIcon className="w-5 h-5"/>
                                                        <span className="text-sm font-semibold">Completada</span>
                                                    </div>
                                                ) : isTaskActive(task.task_id) ? (
                                                    <Button size="sm" variant="danger" onClick={handleFinishTask} isLoading={isSubmitting === task.task_id}>
                                                        Completar Tarea
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" onClick={() => handleStartTask(task.task_id)} disabled={!!activeTaskLog || !!isSubmitting || task.status === 'in_progress'} isLoading={isSubmitting === task.task_id || geoLoading}>
                                                        Empezar
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>¡No tienes tareas programadas! Buen trabajo.</p>
                )}
            </Card>
        </div>
    );
};

export default CleaningView;