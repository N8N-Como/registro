
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../App';
import { 
    getEmployees, 
    getLocations, 
    getWorkShifts, 
    createWorkShift, 
    updateWorkShift, 
    deleteWorkShift, 
    getShiftConfigs,
    createBulkWorkShifts
} from '../../services/mockApi';
import { Employee, Location, WorkShift, ShiftConfig, ShiftType } from '../../types';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import Button from '../shared/Button';
import ShiftFormModal from './ShiftFormModal';
import ImageImportModal from './ImageImportModal';
import { CalendarIcon, SparklesIcon } from '../icons';

const NAME_SORT_ORDER = [
    'NOELIA', 'LYDIA', 'BEGOÑA', 'MAUREEN', 'MARISA', 'ANXO', 'OSCAR', 
    'MARIA ISABEL', 'STEPHANY', 'YESSICA', 'NISLEY', 'DOLORES', 'DIANA', 'ANDRES', 'ITAGU'
];

// LISTA MAESTRA DE CÓDIGOS DE TRABAJO (PARA INFERENCIA)
const WORK_CODES = ['M', 'T', 'P', 'MM', 'R', 'A', 'D', 'TH', 'BH', 'BM', 'AD', 'S', 'D'];

const ShiftSchedulerView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [currentMonth, setCurrentMonth] = useState(new Date(2025, 0, 1)); 
    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);
    const [modalContext, setModalContext] = useState<{ employeeId: string, date: Date } | null>(null);

    const canManage = useMemo(() => {
        const role = auth?.role?.role_id || '';
        return ['admin', 'receptionist', 'gobernanta', 'revenue', 'administracion'].includes(role);
    }, [auth?.role]);

    const viewDays = useMemo(() => {
        const days = [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [currentMonth]);

    const getSortIndex = (employee: Employee) => {
        const normalize = (str: string) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const fullName = normalize(`${employee.first_name} ${employee.last_name}`);
        const firstName = normalize(employee.first_name);
        for (let i = 0; i < NAME_SORT_ORDER.length; i++) {
            const target = normalize(NAME_SORT_ORDER[i]);
            if (fullName.includes(target) || firstName.includes(target)) return i;
        }
        return 999;
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [emps, locs, configs] = await Promise.all([
                getEmployees(), getLocations(), getShiftConfigs()
            ]);
            let staff = emps.filter(e => e.employee_id !== 'emp_admin');
            if (!canManage && auth?.employee) {
                staff = staff.filter(e => e.employee_id === auth.employee!.employee_id);
            }
            staff.sort((a, b) => getSortIndex(a) - getSortIndex(b));
            setEmployees(staff);
            setLocations(locs);
            setShiftConfigs(configs);

            const startStr = viewDays[0].toISOString();
            const endStr = viewDays[viewDays.length - 1].toISOString().replace(/T.*/, 'T23:59:59');
            const monthShifts = await getWorkShifts(startStr, endStr);
            setShifts(monthShifts);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [currentMonth, canManage]);

    // LÓGICA DE DETECCIÓN DE CÓDIGO (LIMPIA NOTAS DE IA)
    const getShiftCode = (shift: WorkShift): string => {
        const rawNotes = shift.notes || '';
        const match = rawNotes.match(/\((.*?)\)/);
        if (match) return match[1].toUpperCase();
        if (rawNotes.length <= 3) return rawNotes.toUpperCase();
        if (shift.shift_config_id) {
            const cfg = shiftConfigs.find(c => c.config_id === shift.shift_config_id);
            if (cfg) return cfg.code.toUpperCase();
        }
        return '';
    };

    // INFERIR SI ES TRABAJO O NO
    const isWorkShift = (shift: WorkShift): boolean => {
        if (shift.type === 'work') return true;
        const code = getShiftCode(shift);
        return WORK_CODES.includes(code);
    };

    const calculateMonthlyHours = (employeeId: string) => {
        const empShifts = shifts.filter(s => s.employee_id === employeeId);
        let totalMs = 0;
        empShifts.forEach(s => {
            if (isWorkShift(s)) {
                const start = new Date(s.start_time).getTime();
                const end = new Date(s.end_time).getTime();
                // Si el horario es 00:00 (típico de importación IA sin config), sumamos 8h estándar
                if (start === end || (new Date(s.start_time).getHours() === 0 && new Date(s.end_time).getHours() === 0)) {
                    totalMs += (8 * 60 * 60 * 1000);
                } else {
                    totalMs += (end - start);
                }
            }
        });
        return totalMs / (1000 * 60 * 60);
    };

    if (isLoading && employees.length === 0) return <Spinner />;

    const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    return (
        <div className="space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-gray-800">Cuadrante: {monthName}</h2>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => {
                        const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d);
                    }}>&lt; Mes Anterior</Button>
                    <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(new Date(2025, 0, 1))}>Enero 2025</Button>
                    <Button variant="secondary" size="sm" onClick={() => {
                        const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d);
                    }}>Mes Siguiente &gt;</Button>
                </div>
                {canManage && (
                    <Button variant="success" size="sm" onClick={() => setIsImportModalOpen(true)}>
                        <SparklesIcon className="w-4 h-4 mr-2" /> Importar PDF / Foto IA
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden p-0 border-0 shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-primary text-white border-b border-primary-dark">
                                <th className="p-2 text-left font-bold w-44 sticky left-0 bg-primary z-20 border-r border-primary-light shadow-md text-[10px] uppercase">
                                    Empleado / Horas Mes
                                </th>
                                {viewDays.map(day => (
                                    <th key={day.toISOString()} className={`p-0 text-center border-r border-primary-light w-7 min-w-[28px] ${day.toDateString() === new Date().toDateString() ? 'bg-primary-dark' : ''}`}>
                                        <div className="text-[10px] font-bold py-1">{day.getDate()}</div>
                                        <div className="text-[8px] opacity-75 pb-1 uppercase">{day.toLocaleDateString('es-ES', { weekday: 'narrow' })}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, idx) => {
                                const monthlyHours = calculateMonthlyHours(emp.employee_id);
                                const isRowEven = idx % 2 === 0;

                                return (
                                <tr key={emp.employee_id} className={`border-b border-gray-200 ${isRowEven ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                    <td className={`p-2 border-r border-gray-200 font-medium text-gray-800 sticky left-0 z-10 shadow-sm ${isRowEven ? 'bg-white' : 'bg-gray-50'}`}>
                                        <div className="flex flex-col">
                                            <span className="truncate font-bold text-[10px] uppercase">{emp.first_name} {(emp.last_name || '').charAt(0)}.</span>
                                            <span className="text-[9px] font-bold text-primary">{monthlyHours.toFixed(1)}h trbj.</span>
                                        </div>
                                    </td>
                                    {viewDays.map(day => {
                                        const dayShifts = shifts.filter(s => 
                                            s.employee_id === emp.employee_id && 
                                            new Date(s.start_time).toDateString() === day.toDateString()
                                        );

                                        return (
                                            <td 
                                                key={day.toISOString()} 
                                                className={`p-0 border-r border-gray-100 h-10 text-center align-middle relative ${canManage ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                                                onClick={() => {
                                                    if (!canManage) return;
                                                    setModalContext({ employeeId: emp.employee_id, date: day });
                                                    setSelectedShift(null);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                {dayShifts.map((shift) => {
                                                    const displayCode = getShiftCode(shift) || (isWorkShift(shift) ? 'W' : 'L');

                                                    return (
                                                        <div 
                                                            key={shift.shift_id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!canManage) return;
                                                                setSelectedShift(shift);
                                                                setModalContext({ employeeId: shift.employee_id, date: new Date(shift.start_time) });
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="w-full h-full flex items-center justify-center text-white font-bold text-[10px] shadow-sm"
                                                            style={{ backgroundColor: shift.color || '#9ca3af' }}
                                                            title={`${shift.notes || 'Turno'}`}
                                                        >
                                                            {displayCode}
                                                        </div>
                                                    )
                                                })}
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
                    isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                    onSave={async (data) => {
                        if ('shift_id' in data) await updateWorkShift(data);
                        else await createWorkShift(data);
                        fetchData(); setIsModalOpen(false);
                    }}
                    onDelete={async (id) => { await deleteWorkShift(id); fetchData(); setIsModalOpen(false); }}
                    shift={selectedShift} employeeId={modalContext.employeeId} date={modalContext.date}
                    locations={locations} employees={employees}
                />
            )}

            {isImportModalOpen && (
                <ImageImportModal
                    isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}
                    onImport={async (newShifts) => { await createBulkWorkShifts(newShifts); fetchData(); }}
                    employees={employees} locations={locations} shiftConfigs={shiftConfigs}
                    currentMonth={currentMonth.getMonth()} currentYear={currentMonth.getFullYear()}
                />
            )}
        </div>
    );
};

export default ShiftSchedulerView;
