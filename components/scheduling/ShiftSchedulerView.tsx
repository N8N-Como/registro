
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
    addShiftConfig,
    updateShiftConfig,
    deleteShiftConfig,
    createBulkWorkShifts
} from '../../services/mockApi';
import { Employee, Location, WorkShift, ShiftConfig } from '../../types';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import Button from '../shared/Button';
import ShiftFormModal from './ShiftFormModal';
import ShiftConfigFormModal from '../admin/ShiftConfigFormModal';
import ExcelImportModal from './ExcelImportModal';
import ImageImportModal from './ImageImportModal';
import { CalendarIcon, DocumentIcon, SparklesIcon } from '../icons';
import AIAssistant, { InputMode } from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';

// ORDEN EXACTO SOLICITADO
const NAME_SORT_ORDER = [
    'NOELIA',
    'LYDIA',
    'BEGOÑA',
    'MAUREEN',
    'MARISA',
    'ANXO',
    'OSCAR',
    'ISABEL',
    'STEPHANY',
    'YESSICA',
    'NISLEY',
    'MARI',
    'DIANA',
    'ANDRES',
    'ITAGU'
];

const ShiftSchedulerView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date(2025, 0, 1)); 
    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [yearShifts, setYearShifts] = useState<WorkShift[]>([]); 
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isImageImportModalOpen, setIsImageImportModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);
    const [modalContext, setModalContext] = useState<{ employeeId: string, date: Date } | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<ShiftConfig | null>(null);

    const canManage = useMemo(() => {
        const role = auth?.role?.role_id || '';
        return ['admin', 'receptionist', 'gobernanta', 'revenue', 'administracion'].includes(role);
    }, [auth?.role]);

    const viewDays = useMemo(() => {
        const days = [];
        const start = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1);
        const lastDay = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() + 1, 0).getDate();
        for (let i = 0; i < lastDay; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, [currentWeekStart]);

    // Función de ordenación con normalización de acentos
    const getSortIndex = (employee: Employee) => {
        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const firstName = normalize(employee.first_name);
        for (let i = 0; i < NAME_SORT_ORDER.length; i++) {
            const target = normalize(NAME_SORT_ORDER[i]);
            if (firstName.includes(target) || target.includes(firstName)) return i;
        }
        return 999; 
    };

    const fetchSchedulerData = async () => {
        setIsLoading(true);
        try {
            const [emps, locs] = await Promise.all([getEmployees(), getLocations()]);
            let operationalStaff = emps.filter(e => e.employee_id !== 'emp_admin');
            if (!canManage && auth?.employee) {
                operationalStaff = operationalStaff.filter(e => e.employee_id === auth.employee!.employee_id);
            }
            operationalStaff.sort((a, b) => getSortIndex(a) - getSortIndex(b));
            setEmployees(operationalStaff);
            setLocations(locs);

            const configs = await getShiftConfigs();
            setShiftConfigs(configs);
            
            if (viewDays.length > 0) {
                const startStr = viewDays[0].toISOString();
                const endStr = viewDays[viewDays.length - 1].toISOString().replace(/T.*/, 'T23:59:59');
                const monthShifts = await getWorkShifts(startStr, endStr);
                setShifts(monthShifts);
            }

            const yearStart = new Date(currentWeekStart.getFullYear(), 0, 1).toISOString();
            const yearEnd = new Date(currentWeekStart.getFullYear(), 11, 31).toISOString();
            const allShifts = await getWorkShifts(yearStart, yearEnd);
            setYearShifts(allShifts);

        } catch (err: any) {
            setError("Error cargando cuadrante.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedulerData();
    }, [currentWeekStart, canManage]);

    const handleToday = () => {
        const now = new Date();
        setCurrentWeekStart(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    const calculateAnnualHours = (employeeId: string) => {
        // CORRECCIÓN: Solo sumamos turnos de tipo 'work'. Libranzas (off), Vacaciones, etc son 0h.
        const empShifts = yearShifts.filter(s => s.employee_id === employeeId && s.type === 'work');
        let totalMs = 0;
        empShifts.forEach(s => {
            totalMs += new Date(s.end_time).getTime() - new Date(s.start_time).getTime();
        });
        return totalMs / (1000 * 60 * 60);
    };

    const allowedInputs: InputMode[] | null = canManage ? ['text', 'voice', 'image'] : null;

    if (isLoading && employees.length === 0) return <Spinner />;

    const monthName = currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    return (
        <div className="space-y-4 relative">
            <div className="flex flex-col xl:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-gray-800">Cuadrante {monthName}</h2>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => {
                        const d = new Date(currentWeekStart); d.setMonth(d.getMonth() - 1); setCurrentWeekStart(d);
                    }}>&lt;</Button>
                    <Button variant="secondary" size="sm" onClick={handleToday}>Hoy</Button>
                    <Button variant="secondary" size="sm" onClick={() => {
                        const d = new Date(currentWeekStart); d.setMonth(d.getMonth() + 1); setCurrentWeekStart(d);
                    }}>&gt;</Button>
                </div>

                {canManage && (
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setIsImportModalOpen(true)}>
                            <DocumentIcon className="w-4 h-4 mr-2" /> Excel
                        </Button>
                        <Button size="sm" variant="success" onClick={() => setIsImageImportModalOpen(true)}>
                            <SparklesIcon className="w-4 h-4 mr-2" /> Importar Foto IA
                        </Button>
                    </div>
                )}
            </div>

            <Card className="overflow-hidden p-0 border-0 shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-primary text-white border-b border-primary-dark">
                                <th className="p-2 text-left font-bold w-40 sticky left-0 bg-primary z-20 border-r border-primary-light shadow-md text-[10px] uppercase">
                                    Empleado
                                </th>
                                {viewDays.map(day => (
                                    <th key={day.toISOString()} className={`p-0 text-center border-r border-primary-light w-6 min-w-[24px] ${day.toDateString() === new Date().toDateString() ? 'bg-primary-dark' : ''}`}>
                                        <div className="text-[10px] font-bold py-1">{day.getDate()}</div>
                                        <div className="text-[8px] opacity-75 pb-1">{day.toLocaleDateString('es-ES', { weekday: 'narrow' })}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, idx) => {
                                const annualHours = calculateAnnualHours(emp.employee_id);
                                const limit = emp.annual_hours_contract || 1784;
                                const isRowEven = idx % 2 === 0;

                                return (
                                <tr key={emp.employee_id} className={`border-b border-gray-200 ${isRowEven ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                                    <td className={`p-1 border-r border-gray-200 font-medium text-gray-800 sticky left-0 z-10 shadow-sm text-xs ${isRowEven ? 'bg-white' : 'bg-gray-50'}`}>
                                        <div className="flex flex-col justify-center h-full">
                                            <span className="truncate font-bold text-[10px] uppercase">{emp.first_name} {emp.last_name.charAt(0)}.</span>
                                            {canManage && (
                                                <span className={`text-[8px] font-bold ${annualHours > limit ? 'text-red-500' : 'text-green-600'}`}>{Math.round(annualHours)}h / {limit}h</span>
                                            )}
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
                                                className={`p-0 border-r border-gray-200 h-8 text-center align-middle relative ${canManage ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                                                onClick={() => {
                                                    if (!canManage) return;
                                                    setModalContext({ employeeId: emp.employee_id, date: day });
                                                    setSelectedShift(null);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                {dayShifts.map((shift, i) => {
                                                    if (i > 0) return null; // Solo mostrar el primero visualmente
                                                    
                                                    // DETERMINACIÓN DE LETRA CÓDIGO
                                                    let displayCode = '';
                                                    if (shift.notes && shift.notes.length <= 4) {
                                                        displayCode = shift.notes; // Usar código de importación (M, T, V25...)
                                                    } else if (shift.shift_config_id) {
                                                        const cfg = shiftConfigs.find(c => c.config_id === shift.shift_config_id);
                                                        displayCode = cfg?.code || '?';
                                                    } else {
                                                        // Heurística si no hay datos
                                                        if (shift.type === 'off') displayCode = 'L';
                                                        else if (shift.type === 'vacation') displayCode = 'V';
                                                        else displayCode = 'W';
                                                    }

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
                                                            className="w-full h-full flex items-center justify-center text-white font-bold text-[10px] shadow-inner"
                                                            style={{ backgroundColor: shift.color || '#9ca3af' }}
                                                            title={`${shift.notes || 'Turno'} (${new Date(shift.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`}
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

            {isModalOpen && modalContext && canManage && (
                <ShiftFormModal 
                    isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                    onSave={async (data) => {
                        if ('shift_id' in data) await updateWorkShift(data);
                        else await createWorkShift(data);
                        fetchSchedulerData(); setIsModalOpen(false);
                    }}
                    onDelete={async (id) => { await deleteWorkShift(id); fetchSchedulerData(); setIsModalOpen(false); }}
                    shift={selectedShift} employeeId={modalContext.employeeId} date={modalContext.date}
                    locations={locations} employees={employees}
                />
            )}

            {isImageImportModalOpen && canManage && (
                <ImageImportModal
                    isOpen={isImageImportModalOpen} onClose={() => setIsImageImportModalOpen(false)}
                    onImport={async (newShifts) => { await createBulkWorkShifts(newShifts); fetchSchedulerData(); }}
                    employees={employees} locations={locations} shiftConfigs={shiftConfigs}
                    currentMonth={currentWeekStart.getMonth()} currentYear={currentWeekStart.getFullYear()}
                />
            )}

            {allowedInputs && (
                <AIAssistant 
                    context={{ employees, locations, currentUser: auth?.employee || undefined }} 
                    onAction={(res) => { if (res.action === 'createShift') fetchSchedulerData(); }}
                    allowedInputs={allowedInputs}
                />
            )}
        </div>
    );
};

export default ShiftSchedulerView;
