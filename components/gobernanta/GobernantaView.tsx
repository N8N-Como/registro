
import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { getTasks, getRooms, getEmployees, addTask, getLocations, updateTask, deleteTask } from '../../services/mockApi';
import { Task, Room, Employee, Location } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import TaskFormModal from './TaskFormModal';
import { CheckIcon, TrashIcon } from '../icons';
import AIAssistant from '../shared/AIAssistant';
import { AuthContext } from '../../App';
import { AIResponse } from '../../services/geminiService';

const GobernantaView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    
    const cleaningStaff = useMemo(() => employees.filter(e => e.role_id === 'cleaner'), [employees]);

    const canManage = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'gobernanta';

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
        // Fix unused variable error by using object spread deletion
        const dataToSave = { ...taskData } as any;
        delete dataToSave.location_id;

        if ('task_id' in dataToSave) {
            await updateTask(dataToSave);
        } else {
            await addTask({...dataToSave, status: 'pending'});
        }
        fetchData();
        setIsModalOpen(false);
        setEditingTask(null);
    }

    const handleDeleteTask = async (taskId: string) => {
        if (window.confirm("¿Estás seguro de querer eliminar esta tarea?")) {
            try {
                await deleteTask(taskId);
                fetchData();
            } catch (e) {
                console.error(e);
                alert("Error al eliminar la tarea.");
            }
        }
    };
    
    const handleAIAction = async (response: AIResponse) => {
        if (response.action === 'createTask' && response.data) {
            try {
                // Ensure room_id defaults to something valid if AI missed it but gave location
                // If location_id is missing, try to find it from room_id
                let finalRoomId = response.data.room_id || 'all_rooms';
                
                await addTask({
                    description: response.data.description,
                    room_id: finalRoomId,
                    assigned_to: response.data.assigned_to,
                    due_date: response.data.due_date || new Date().toISOString().split('T')[0],
                    status: 'pending',
                    // Note: MockApi addTask doesn't strictly need location_id if room is valid, 
                    // but usually we pass it. For now, assume room link is enough.
                } as any);
                fetchData();
            } catch (e) {
                console.error("Failed to create task from AI", e);
                alert("Error al crear la tarea desde la IA");
            }
        }
    };

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
        if (roomId === 'all_rooms') return 'Todas';
        return rooms.find(r => r.room_id === roomId)?.name || 'N/A';
    };

    // --- Lógica de Estilos Mejorada ---

    // Paleta de colores para establecimientos (pastel e intenso para texto)
    const locationPalettes = [
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-800' },
        { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-800' },
        { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-800' },
        { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' },
        { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', badge: 'bg-rose-100 text-rose-800' },
        { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800', badge: 'bg-cyan-100 text-cyan-800' },
        { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-800', badge: 'bg-fuchsia-100 text-fuchsia-800' },
        { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-800', badge: 'bg-lime-100 text-lime-800' },
    ];

    const getLocationStyle = (locationId: string | undefined) => {
        if (!locationId) return locationPalettes[0];
        const index = locations.findIndex(l => l.location_id === locationId);
        // Si no encuentra, usa el 0. Si encuentra, usa el modulo para ciclar colores.
        return locationPalettes[Math.max(0, index) % locationPalettes.length];
    };


    if(isLoading) return <Spinner/>;

    return (
        <div className="space-y-6 relative">
            <Card>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold">Planificador Semanal de Limpieza</h2>
                    <div className="flex items-center gap-2">
                        {/* Pequeña leyenda de colores */}
                        <div className="hidden lg:flex gap-2 text-xs mr-4">
                            {locations.map(loc => {
                                const style = getLocationStyle(loc.location_id);
                                return (
                                    <span key={loc.location_id} className={`px-2 py-1 rounded-full ${style.badge}`}>
                                        {loc.name}
                                    </span>
                                )
                            })}
                        </div>
                        <Button onClick={handleOpenCreateModal}>
                            + Nueva Tarea
                        </Button>
                    </div>
                </div>
                 
                 <div className="overflow-x-auto border rounded-lg shadow-inner bg-gray-50">
                    <table className="w-full text-left table-fixed border-collapse">
                        <thead className="bg-white sticky top-0 z-10 shadow-sm">
                            <tr>
                                {/* Columna Empleados: Más estrecha */}
                                <th className="p-2 w-28 sm:w-32 border-b border-r bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Empleado
                                </th>
                                {nextSevenDays.map(date => {
                                    const isToday = new Date().toDateString() === date.toDateString();
                                    return (
                                        <th key={date.toISOString()} className={`p-2 min-w-[160px] border-b border-r last:border-r-0 text-center ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
                                            <div className={`text-xs uppercase font-bold ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                                            </div>
                                            <div className={`text-sm font-bold ${isToday ? 'text-blue-800' : 'text-gray-800'}`}>
                                                {date.getDate()} {date.toLocaleDateString('es-ES', { month: 'short' })}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {displayStaff.map(employee => (
                                <tr key={employee.employee_id}>
                                    {/* Celda Nombre Empleado: Pequeña y compacta */}
                                    <td className="p-2 border-r bg-gray-50 align-middle">
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 mb-1">
                                                {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                                            </div>
                                            <p className="text-xs font-bold text-gray-700 leading-tight">
                                                {employee.first_name}
                                            </p>
                                            <p className="text-[10px] text-gray-500 truncate w-full">
                                                {employee.last_name}
                                            </p>
                                        </div>
                                    </td>
                                    
                                    {/* Celdas de Días */}
                                    {nextSevenDays.map(date => {
                                        const dateKey = date.toISOString().split('T')[0];
                                        const employeeTasksForDay = groupedTasks[dateKey]?.[employee.employee_id] || [];
                                        const isToday = new Date().toDateString() === date.toDateString();

                                        return (
                                            <td key={date.toISOString()} className={`p-1.5 border-r last:border-r-0 align-top h-32 hover:bg-gray-50 transition-colors ${isToday ? 'bg-blue-50/30' : ''}`}>
                                                <div className="space-y-1.5 h-full overflow-y-auto max-h-60 custom-scrollbar">
                                                    {employeeTasksForDay.map(task => {
                                                        const room = rooms.find(r => r.room_id === task.room_id);
                                                        const location = room ? locations.find(l => l.location_id === room.location_id) : null;
                                                        const styles = getLocationStyle(location?.location_id);
                                                        const isCompleted = task.status === 'completed';

                                                        return (
                                                        <div key={task.task_id} className="relative group">
                                                            <button 
                                                                onClick={() => handleOpenEditModal(task)}
                                                                className={`
                                                                    w-full text-left rounded-md border shadow-sm transition-all relative
                                                                    ${styles.bg} ${styles.border} ${isCompleted ? 'opacity-50 grayscale' : 'hover:scale-[1.02] hover:shadow-md'}
                                                                `}
                                                            >
                                                                {/* Barra lateral de color intenso */}
                                                                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${styles.text.replace('text-', 'bg-').replace('800', '400')}`}></div>
                                                                
                                                                <div className="pl-2.5 pr-1 py-1.5">
                                                                    {/* Cabecera: Ubicación */}
                                                                    <div className="flex justify-between items-start mb-0.5">
                                                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1 rounded-sm ${styles.badge}`}>
                                                                            {location?.name || 'S/E'}
                                                                        </span>
                                                                        {isCompleted && <CheckIcon className="w-3 h-3 text-green-600" />}
                                                                    </div>
                                                                    
                                                                    {/* Cuerpo: Habitación y Descripción */}
                                                                    <div className={`${styles.text}`}>
                                                                        <p className={`text-xs font-bold leading-tight ${isCompleted ? 'line-through decoration-gray-500' : ''}`}>
                                                                            {getRoomName(task.room_id)}
                                                                        </p>
                                                                        <p className="text-[10px] mt-0.5 opacity-80 truncate leading-snug">
                                                                            {task.description}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                            {canManage && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.task_id); }}
                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                                                                    title="Eliminar tarea"
                                                                >
                                                                    <TrashIcon className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
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

            {/* AI Assistant Integration */}
            <AIAssistant 
                context={{ employees, rooms, locations, currentUser: auth?.employee || undefined }} 
                onAction={handleAIAction}
            />
        </div>
    );
};

export default GobernantaView;
