
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../App';
import { getEmployees, getLocations, getWorkShifts, createWorkShift, updateWorkShift, deleteWorkShift, getShiftConfigs } from '../../services/mockApi';
import { Employee, Location, WorkShift, ShiftConfig } from '../../types';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import Button from '../shared/Button';
import ShiftFormModal from './ShiftFormModal';
import { CalendarIcon } from '../icons';

const ShiftSchedulerView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [yearShifts, setYearShifts] = useState<WorkShift[]>([]); // For annual calculation
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);
    const [modalContext, setModalContext] = useState<{ employeeId: string, date: Date } | null>(null);

    // Helpers to manage dates
    const getStartOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
        d.setDate(diff);
        d.setHours(0,0,0,0);
        return d;
    };

    const weekStart = useMemo(() => getStartOfWeek(currentWeekStart), [currentWeekStart]);
    
    const weekDays = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            days.push(d);
        }
        return days;
    }, [weekStart]);

    useEffect(() => {
        const fetchSchedulerData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch base data
                try {
                    const [emps, locs] = await Promise.all([getEmployees(), getLocations()]);
                    setEmployees(emps);
                    setLocations(locs);
                } catch (e: any) {
                    console.error("Critical error fetching employees/locations:", e);
                    setError(e.message || "Error cargando empleados o ubicaciones.");
                    return; // Stop if critical data fails
                }

                // Try fetching shift configs, default to empty if fails
                try {
                    const configs = await getShiftConfigs();
                    setShiftConfigs(configs);
                } catch (e) {
                    console.warn("Shift configs not available", e);
                    setShiftConfigs([]);
                }
                
                // Fetch shifts for the current week
                const startStr = weekDays[0].toISOString();
                const endStr = weekDays[6].toISOString().replace(/T.*/, 'T23:59:59');
                try {
                    const weekShifts = await getWorkShifts(startStr, endStr);
                    setShifts(weekShifts);
                } catch (e) {
                    console.warn("Week shifts not available", e);
                    setShifts([]);
                }

                // Fetch shifts for the whole year
                const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
                const yearEnd = new Date(new Date().getFullYear(), 11, 31).toISOString();
                try {
                    const allShifts = await getWorkShifts(yearStart, yearEnd);
                    setYearShifts(allShifts);
                } catch (e) {
                    setYearShifts([]);
                }

            } catch (err: any) {
                console.error("Unexpected error in scheduler", err);
                setError(err.message || "Error inesperado.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSchedulerData();
    }, [weekStart]); 

    const handlePreviousWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentWeekStart(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentWeekStart(newDate);
    };
    
    const handleToday = () => {
        setCurrentWeekStart(new Date());
    };

    const canEdit = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'gobernanta' || auth?.role?.role_id === 'receptionist';

    const handleCellClick = (employeeId: string, date: Date) => {
        if (!canEdit) return;
        setModalContext({ employeeId, date });
        setSelectedShift(null);
        setIsModalOpen(true);
    };

    const handleShiftClick = (e: React.MouseEvent, shift: WorkShift) => {
        e.stopPropagation();
        if (!canEdit) return;
        setSelectedShift(shift);
        setModalContext({ employeeId: shift.employee_id, date: new Date(shift.start_time) });
        setIsModalOpen(true);
    };

    const handleSaveShift = async (shiftData: WorkShift | Omit<WorkShift, 'shift_id'>) => {
        try {
            if ('shift_id' in shiftData) {
                await updateWorkShift(shiftData);
            } else {
                await createWorkShift(shiftData);
            }
            // Simple refresh logic
            const startStr = weekDays[0].toISOString();
            const endStr = weekDays[6].toISOString().replace(/T.*/, 'T23:59:59');
            const weekShifts = await getWorkShifts(startStr, endStr);
            setShifts(weekShifts);
            setIsModalOpen(false);
        } catch (error) {
            alert("Error al guardar el turno");
        }
    };

    const handleDeleteShift = async (shiftId: string) => {
        try {
            await deleteWorkShift(shiftId);
            setShifts(prev => prev.filter(s => s.shift_id !== shiftId));
            setIsModalOpen(false);
        } catch (error) {
            alert("Error al eliminar");
        }
    };
    
    // Logic to calculate hours (Only counting Work Shifts)
    const calculateAnnualHours = (employeeId: string) => {
        const empShifts = yearShifts.filter(s => s.employee_id === employeeId && (!s.type || s.type === 'work'));
        let totalMs = 0;
        empShifts.forEach(s => {
            totalMs += new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
        });
        return totalMs / (1000 * 60 * 60);
    };

    if (isLoading && employees.length === 0) return <Spinner />;
    
    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
                <p className="font-bold text-lg mb-2">Error al cargar el cuadrante</p>
                <p>{error}</p>
                <Button onClick={() => window.location.reload()} className="mt-4" variant="secondary">
                    Recargar Página
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                    <CalendarIcon className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-gray-800">Cuadrante de Turnos</h2>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Button variant="secondary" size="sm" onClick={handlePreviousWeek}>&lt;</Button>
                    <Button variant="secondary" size="sm" onClick={handleToday}>Hoy</Button>
                    <span className="font-semibold text-gray-700 w-36 text-center text-sm">
                        {weekDays[0].toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                    <Button variant="secondary" size="sm" onClick={handleNextWeek}>&gt;</Button>
                </div>
            </div>

            <Card className="overflow-hidden p-0 border-0 shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="p-4 text-left font-bold text-gray-600 w-64 sticky left-0 bg-gray-50 z-20 border-r shadow-sm">
                                    Empleado / Convenio
                                </th>
                                {weekDays.map(day => {
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    return (
                                        <th key={day.toISOString()} className={`p-2 text-center border-r min-w-[120px] ${isToday ? 'bg-blue-50' : ''}`}>
                                            <div className="text-xs font-bold text-gray-500 uppercase">{day.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                                            <div className={`font-bold text-lg ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                                                {day.getDate()}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => {
                                const annualHours = calculateAnnualHours(emp.employee_id);
                                const limit = emp.annual_hours_contract || 1784;
                                const percent = Math.min(100, (annualHours / limit) * 100);
                                const isOverLimit = annualHours > limit;

                                return (
                                <tr key={emp.employee_id} className="border-b hover:bg-gray-50 transition-colors group">
                                    <td className="p-3 border-r font-medium text-gray-800 sticky left-0 bg-white z-10 group-hover:bg-gray-50">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                                {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="leading-none">{emp.first_name} {emp.last_name}</p>
                                                <p className="text-[10px] text-gray-400 mt-1 uppercase">{emp.province || 'General'}</p>
                                            </div>
                                        </div>
                                        
                                        {/* Barra de Progreso Horas Anuales */}
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                            <div 
                                                className={`h-1.5 rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-green-500'}`} 
                                                style={{ width: `${percent}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                                            <span>{Math.round(annualHours)}h Planificadas</span>
                                            <span>Límite: {limit}h</span>
                                        </div>
                                    </td>
                                    {weekDays.map(day => {
                                        const dayShifts = shifts.filter(s => 
                                            s.employee_id === emp.employee_id && 
                                            new Date(s.start_time).toDateString() === day.toDateString()
                                        );

                                        return (
                                            <td 
                                                key={day.toISOString()} 
                                                className={`p-1 border-r align-top h-24 relative cursor-pointer hover:bg-gray-100 ${day.toDateString() === new Date().toDateString() ? 'bg-blue-50/30' : ''}`}
                                                onClick={() => handleCellClick(emp.employee_id, day)}
                                            >
                                                {dayShifts.map(shift => {
                                                    const startTime = new Date(shift.start_time).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
                                                    const endTime = new Date(shift.end_time).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});
                                                    
                                                    // Determine visual style based on type
                                                    let bgColor = shift.color;
                                                    let content = (
                                                        <>
                                                            <div className="font-bold">
                                                                {shift.shift_config_id 
                                                                    ? (shiftConfigs.find(c => c.config_id === shift.shift_config_id)?.code || startTime) 
                                                                    : `${startTime} - ${endTime}`}
                                                            </div>
                                                            {shift.location_id && (
                                                                <div className="truncate opacity-90 text-[10px] flex items-center mt-0.5">
                                                                    <span className="mr-1">📍</span>
                                                                    {locations.find(l => l.location_id === shift.location_id)?.name}
                                                                </div>
                                                            )}
                                                        </>
                                                    );

                                                    if (shift.type && shift.type !== 'work') {
                                                        if (shift.type === 'off') {
                                                            content = <div className="font-bold text-center">LIBRE</div>;
                                                        } else if (shift.type === 'vacation') {
                                                            content = <div className="font-bold text-center text-[10px]">VACACIONES</div>;
                                                        } else if (shift.type === 'sick') {
                                                            content = <div className="font-bold text-center text-[10px]">BAJA</div>;
                                                        } else if (shift.type === 'permission') {
                                                            content = <div className="font-bold text-center text-[10px]">PERMISO</div>;
                                                        }
                                                    }

                                                    return (
                                                        <div 
                                                            key={shift.shift_id}
                                                            onClick={(e) => handleShiftClick(e, shift)}
                                                            className="mb-1 p-1.5 rounded-md text-xs text-white shadow-md overflow-hidden transform hover:scale-105 transition-transform min-h-[40px] flex flex-col justify-center"
                                                            style={{ backgroundColor: bgColor }}
                                                            title={shift.notes}
                                                        >
                                                            {content}
                                                        </div>
                                                    )
                                                })}
                                                {dayShifts.length === 0 && canEdit && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 text-gray-300 text-3xl font-light">
                                                        +
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && modalContext && (
                <ShiftFormModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveShift}
                    onDelete={handleDeleteShift}
                    shift={selectedShift}
                    employeeId={modalContext.employeeId}
                    date={modalContext.date}
                    locations={locations}
                    employees={employees}
                />
            )}
        </div>
    );
};

export default ShiftSchedulerView;
