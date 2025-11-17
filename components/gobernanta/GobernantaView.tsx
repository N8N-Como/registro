import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getTasks, getRooms, getEmployees, addTask, getLocations, updateTask } from '../../services/mockApi';
import { Task, Room, Employee, Location } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import TaskFormModal from './TaskFormModal';

const GobernantaView: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    
    const cleaningStaff = useMemo(() => employees.filter(e => e.role_id === 'cleaner'), [employees]);

    const displayStaff = useMemo(() => {
        const allCleanersPseudoEmployee: Employee = { 
            employee_id: 'all_cleaners', 
            first_name: 'Todos', 
            last_name: '', 
            pin: '', 
            role_id: 'cleaner', 
            status: 'active', 
            policy_accepted: true, 
            photo_url: '' 
        };
        return [allCleanersPseudoEmployee, ...cleaningStaff];
    }, [cleaningStaff]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [t, r, e, l] = await Promise.all([getTasks(), getRooms(), getEmployees(), getLocations()]);
            setTasks(t);
            setRooms(r);
            setEmployees(e);
            setLocations(l);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenCreateModal = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    }
    
    const handleOpenEditModal = (task: Task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    }

    const handleSaveTask = async (taskData: Omit<Task, 'task_id' | 'created_at' | 'completed_at'> | Task) => {
        // The form data includes location_id for the UI, but we don't store it on the Task model.
        // We strip it here before saving.
        const { location_id, ...dataToSave } = taskData as any;

        if ('task_id' in dataToSave) {
            await updateTask(dataToSave);
        } else {
            await addTask({...dataToSave, status: 'pending'});
        }
        fetchData();
        setIsModalOpen(false);
        setEditingTask(null);
    }
    
    const nextSevenDays = useMemo(() => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            dates.push(date);
        }
        return dates;
    }, []);

    const groupedTasks = useMemo(() => {
        const groups: { [key: string]: { [key: string]: Task[] } } = {};
        tasks.forEach(task => {
            const dateKey = task.due_date;
            if (!groups[dateKey]) {
                groups[dateKey] = {};
            }
            if (!groups[dateKey][task.assigned_to]) {
                groups[dateKey][task.assigned_to] = [];
            }
            groups[dateKey][task.assigned_to].push(task);
        });
        return groups;
    }, [tasks]);
    
    const getRoomName = (roomId: string) => {
        if (roomId === 'all_rooms') return 'Todas las habitaciones';
        return rooms.find(r => r.room_id === roomId)?.name || 'N/A';
    };
    
    const getStatusColor = (status: Task['status']) => {
        switch (status) {
            case 'completed': return 'bg-green-100 border-green-300 text-green-800';
            case 'in_progress': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
            case 'pending':
            default:
                return 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200';
        }
    }


    if(isLoading) return <Spinner/>;

    return (
        <div className="space-y-6">
            <Card>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold">Planificador Semanal de Limpieza</h2>
                    <Button onClick={handleOpenCreateModal}>
                        Crear Nueva Tarea
                    </Button>
                </div>
                 <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-left table-fixed">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-3 w-40 sm:w-48 font-semibold text-sm text-gray-600">Empleado</th>
                                {nextSevenDays.map(date => (
                                    <th key={date.toISOString()} className="p-3 min-w-[120px] sm:min-w-[150px] font-semibold text-sm text-gray-600 text-center border-l">
                                        {date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {displayStaff.map(employee => (
                                <tr key={employee.employee_id}>
                                    <td className="p-2 sm:p-3 font-medium border-r align-top bg-gray-50">
                                        {employee.first_name} {employee.last_name}
                                    </td>
                                    {nextSevenDays.map(date => {
                                        const dateKey = date.toISOString().split('T')[0];
                                        const employeeTasksForDay = groupedTasks[dateKey]?.[employee.employee_id] || [];
                                        return (
                                            <td key={date.toISOString()} className="p-2 border-l align-top h-40">
                                                <div className="space-y-1 h-full overflow-y-auto">
                                                    {employeeTasksForDay.map(task => {
                                                        const room = rooms.find(r => r.room_id === task.room_id);
                                                        const locationName = room ? locations.find(l => l.location_id === room.location_id)?.name || 'N/A' : 'N/A';
                                                        return (
                                                        <button 
                                                            key={task.task_id} 
                                                            onClick={() => handleOpenEditModal(task)}
                                                            className={`w-full text-left p-1.5 rounded-md text-xs border transition-all ${getStatusColor(task.status)}`}
                                                        >
                                                            <p className={`font-semibold truncate ${task.status === 'completed' ? 'line-through' : ''}`}>{task.description}</p>
                                                            <p className="truncate">{locationName} - {getRoomName(task.room_id)}</p>
                                                        </button>
                                                    )})}
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <TaskFormModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveTask}
                    locations={locations}
                    rooms={rooms}
                    employees={cleaningStaff}
                    task={editingTask}
                />
            )}
        </div>
    );
};

export default GobernantaView;