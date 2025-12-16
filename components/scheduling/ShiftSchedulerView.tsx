
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
    deleteShiftConfig
} from '../../services/mockApi';
import { Employee, Location, WorkShift, ShiftConfig } from '../../types';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import Button from '../shared/Button';
import ShiftFormModal from './ShiftFormModal';
import ShiftConfigFormModal from '../admin/ShiftConfigFormModal';
import ExcelImportModal from './ExcelImportModal';
import { CalendarIcon, DocumentIcon } from '../icons';
import AIAssistant, { InputMode } from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';

// Orden específico solicitado para el cuadrante
const NAME_SORT_ORDER = [
    'noelia', 'lydia', 'begoña', 'begona', 'maureen', 'marisa', 
    'anxo', 'oscar', 'isabel', 'stephany', 'yessica', 
    'nisley', 'mari', 'dolores varela', 'diana', 'andres', 'itagu',
    'doris', 'dolores escalante', 'silvia', 'laura', 'yurima'
];

const ShiftSchedulerView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [currentWeekStart, setCurrentWeekStart] = useState(new Date(2025, 0, 1)); // Enero 2025 por defecto
    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [yearShifts, setYearShifts] = useState<WorkShift[]>([]); 
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Estados de Modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);
    const [modalContext, setModalContext] = useState<{ employeeId: string, date: Date } | null>(null);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<ShiftConfig | null>(null);

    const daysInView = 31; // Vista mensual
    
    // --- LÓGICA DE PERMISOS ---
    // Roles que pueden ver TODO y editar: Admin, Recepción, Gobernanta, Revenue, Administración
    const canManage = useMemo(() => {
        const role = auth?.role?.role_id || '';
        return ['admin', 'receptionist', 'gobernanta', 'revenue', 'administracion'].includes(role);
    }, [auth?.role]);

    const viewDays = useMemo(() => {
        const days = [];
        const start = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1);
        
        for (let i = 0; i < daysInView; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            if (d.getMonth() === start.getMonth()) {
                days.push(d);
            }
        }
        return days;
    }, [currentWeekStart]);

    // Función auxiliar para ordenar empleados según la lista
    const getSortIndex = (employee: Employee) => {
        const fullName = `${employee.first_name} ${employee.last_name}`.toLowerCase();
        
        // Mapeos específicos para nombres compuestos o confusos
        if (fullName.includes('dolores') && fullName.includes('varela')) return NAME_SORT_ORDER.indexOf('dolores varela');
        if (fullName.includes('dolores') && fullName.includes('escalante')) return NAME_SORT_ORDER.indexOf('dolores escalante');
        
        // Búsqueda general
        const index = NAME_SORT_ORDER.findIndex(key => fullName.includes(key));
        return index !== -1 ? index : 999; 
    };

    const fetchSchedulerData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // 1. Cargar Empleados y Ubicaciones
            const [emps, locs] = await Promise.all([getEmployees(), getLocations()]);
            
            // 2. Filtrar Empleados
            let operationalStaff = emps.filter(e => 
                e.role_id !== 'admin' && 
                !e.first_name.toLowerCase().includes('admin')
            );

            // --- APLICAR RESTRICCIÓN DE VISTA ---
            // Si NO es manager, filtrar la lista para que solo contenga al usuario actual
            if (!canManage && auth?.employee) {
                operationalStaff = operationalStaff.filter(e => e.employee_id === auth.employee!.employee_id);
            }
            // ------------------------------------

            operationalStaff.sort((a, b) => getSortIndex(a) - getSortIndex(b));
            setEmployees(operationalStaff);
            setLocations(locs);

            // 3. Cargar Configuraciones de Turno
            try {
                const configs = await getShiftConfigs();
                setShiftConfigs(configs);
            } catch (e) {
                setShiftConfigs([]);
            }
            
            // 4. Cargar Turnos del Mes
            if (viewDays.length > 0) {
                const startStr = viewDays[0].toISOString();
                const endStr = viewDays[viewDays.length - 1].toISOString().replace(/T.*/, 'T23:59:59');
                const weekShifts = await getWorkShifts(startStr, endStr);
                setShifts(weekShifts);
            }

            // 5. Cargar Turnos del Año (para cálculo de horas)
            const yearStart = new Date(currentWeekStart.getFullYear(), 0, 1).toISOString();
            const yearEnd = new Date(currentWeekStart.getFullYear(), 11, 31).toISOString();
            const allShifts = await getWorkShifts(yearStart, yearEnd);
            setYearShifts(allShifts);

        } catch (err: any) {
            console.error("Error cargando cuadrante:", err);
            setError("No se pudieron cargar los datos. Verifica tu conexión.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedulerData();
    }, [currentWeekStart, canManage]);

    const handlePreviousMonth = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentWeekStart(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentWeekStart(newDate);
    };
    
    const handleToday = () => {
        const now = new Date();
        setCurrentWeekStart(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    // Acciones de Celda
    const handleCellClick = (employeeId: string, date: Date) => {
        if (!canManage) return; // Bloquear edición a no-managers
        setModalContext({ employeeId, date });
        setSelectedShift(null);
        setIsModalOpen(true);
    };

    const handleShiftClick = (e: React.MouseEvent, shift: WorkShift) => {
        e.stopPropagation();
        if (!canManage) return; // Bloquear edición a no-managers
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
            fetchSchedulerData(); 
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
    
    const handleBulkImport = async (newShifts: Omit<WorkShift, 'shift_id'>[]) => {
        for (const shift of newShifts) {
            await createWorkShift(shift);
        }
        fetchSchedulerData();
    };

    // Acciones de Configuración (Leyenda)
    const handleEditConfig = (config: ShiftConfig | null) => {
        if (!canManage) return;
        setSelectedConfig(config);
        setIsConfigModalOpen(true);
    };

    const handleSaveConfig = async (data: any) => {
        try {
            if ('config_id' in data) {
                await updateShiftConfig(data);
            } else {
                await addShiftConfig(data);
            }
            fetchSchedulerData();
            setIsConfigModalOpen(false);
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const handleDeleteConfig = async (id: string) => {
        try {
            await deleteShiftConfig(id);
            fetchSchedulerData();
            setIsConfigModalOpen(false);
        } catch (e) {
            alert("Error al eliminar configuración.");
        }
    };
    
    // Integración IA
    const handleAIAction = async (response: AIResponse) => {
        if (response.action === 'createShift' && response.data) {
            try {
                await createWorkShift({
                    employee_id: response.data.employee_id,
                    start_time: response.data.start_time,
                    end_time: response.data.end_time,
                    type: response.data.type || 'work',
                    location_id: response.data.location_id
                });
                fetchSchedulerData();
            } catch (e) {
                console.error("AI Create Shift Error", e);
            }
        }
    };

    const role = auth?.role?.role_id;
    let allowedAIInputs: InputMode[] | null = null;
    if (['admin', 'receptionist', 'gobernanta', 'revenue', 'administracion'].includes(role || '')) {
        allowedAIInputs = ['text', 'voice', 'image'];
    }

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
                <p>{error}</p>
                <Button onClick={() => window.location.reload()} className="mt-4" variant="secondary">Recargar</Button>
            </div>
        );
    }

    const monthName = currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

    return (
        <div className="space-y-4 relative">
            <div className="flex flex-col xl:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200 gap-4">
                <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-gray-800">Cuadrante {monthName}</h2>
                </div>
                
                <div className="flex items-center space-x-2">
                    <Button variant="secondary" size="sm" onClick={handlePreviousMonth}>&lt;</Button>
                    <Button variant="secondary" size="sm" onClick={handleToday}>Hoy</Button>
                    <Button variant="secondary" size="sm" onClick={handleNextMonth}>&gt;</Button>
                </div>

                {canManage && (
                    <div className="flex gap-2">
                        <Button 
                            size="sm" 
                            variant="success" 
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center justify-center gap-2"
                        >
                            <DocumentIcon className="w-4 h-4" />
                            Importar Excel
                        </Button>
                    </div>
                )}
            </div>

            <Card className="overflow-hidden p-0 border-0 shadow-lg">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-blue-600 text-white border-b border-blue-700">
                                <th className="p-2 text-left font-bold w-48 sticky left-0 bg-blue-600 z-20 border-r border-blue-500 shadow-md text-xs uppercase">
                                    Empleado
                                </th>
                                {viewDays.map(day => {
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    return (
                                        <th key={day.toISOString()} className={`p-1 text-center border-r border-blue-500 min-w-[30px] ${isToday ? 'bg-blue-800' : ''}`}>
                                            <div className="text-[10px] font-bold">{day.getDate()}</div>
                                            <div className="text-[9px] opacity-75">{day.toLocaleDateString('es-ES', { weekday: 'narrow' })}</div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((emp, idx) => {
                                const annualHours = calculateAnnualHours(emp.employee_id);
                                const limit = emp.annual_hours_contract || 1784;
                                const isRowEven = idx % 2 === 0;

                                return (
                                <tr key={emp.employee_id} className={`border-b border-gray-200 ${isRowEven ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                                    <td className={`p-2 border-r border-gray-200 font-medium text-gray-800 sticky left-0 z-10 shadow-sm text-xs ${isRowEven ? 'bg-white' : 'bg-gray-50'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="truncate max-w-[120px]" title={`${emp.first_name} ${emp.last_name}`}>{emp.first_name}</span>
                                            {canManage && (
                                                <span className={`text-[9px] ${annualHours > limit ? 'text-red-500' : 'text-green-600'}`}>{Math.round(annualHours)}h</span>
                                            )}
                                        </div>
                                    </td>
                                    {viewDays.map(day => {
                                        const dayShifts = shifts.filter(s => 
                                            s.employee_id === emp.employee_id && 
                                            new Date(s.start_time).toDateString() === day.toDateString()
                                        );
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                                        return (
                                            <td 
                                                key={day.toISOString()} 
                                                className={`p-0 border-r border-gray-200 h-10 w-8 text-center align-middle relative ${canManage ? 'cursor-pointer' : ''} ${isWeekend ? 'bg-gray-100/50' : ''}`}
                                                onClick={() => handleCellClick(emp.employee_id, day)}
                                            >
                                                {dayShifts.map((shift, i) => {
                                                    let displayCode = '';
                                                    if (shift.shift_config_id) {
                                                        const cfg = shiftConfigs.find(c => c.config_id === shift.shift_config_id);
                                                        displayCode = cfg?.code || shift.notes || '?';
                                                    } else if (shift.notes && shift.notes.length <= 4) {
                                                        displayCode = shift.notes;
                                                    } else if (shift.type === 'off') displayCode = 'L';
                                                    else if (shift.type === 'vacation') displayCode = 'V';
                                                    else if (shift.type === 'sick') displayCode = 'B';
                                                    else displayCode = new Date(shift.start_time).getHours().toString();

                                                    if (i > 0) return null; 

                                                    return (
                                                        <div 
                                                            key={shift.shift_id}
                                                            onClick={(e) => handleShiftClick(e, shift)}
                                                            className="w-full h-full flex items-center justify-center text-white font-bold text-xs shadow-inner"
                                                            style={{ backgroundColor: shift.color || '#9ca3af' }}
                                                            title={`${shift.notes || 'Turno'} (${new Date(shift.start_time).toLocaleTimeString()} - ${new Date(shift.end_time).toLocaleTimeString()})`}
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
                
                <div className="p-2 bg-gray-50 border-t flex flex-wrap gap-4 text-[10px] text-gray-600 justify-center items-center">
                    <p className="mr-2 font-bold text-gray-400 uppercase">Leyenda:</p>
                    {shiftConfigs.map(cfg => (
                        <div 
                            key={cfg.config_id} 
                            className={`flex items-center space-x-1 p-1 rounded transition-colors ${canManage ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                            onClick={() => handleEditConfig(cfg)}
                        >
                            <div className="w-3 h-3 rounded-sm" style={{backgroundColor: cfg.color}}></div>
                            <span>{cfg.code}: {cfg.name}</span>
                        </div>
                    ))}
                    {canManage && (
                        <div 
                            className="flex items-center space-x-1 cursor-pointer hover:bg-blue-100 p-1 rounded transition-colors text-blue-600 font-bold border border-dashed border-blue-300"
                            onClick={() => handleEditConfig(null)}
                        >
                            <span>+ Nuevo Turno</span>
                        </div>
                    )}
                </div>
            </Card>

            {isModalOpen && modalContext && canManage && (
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

            {isConfigModalOpen && canManage && (
                <ShiftConfigFormModal 
                    isOpen={isConfigModalOpen}
                    onClose={() => setIsConfigModalOpen(false)}
                    onSave={handleSaveConfig}
                    onDelete={handleDeleteConfig}
                    config={selectedConfig}
                    locations={locations}
                />
            )}

            {isImportModalOpen && canManage && (
                <ExcelImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleBulkImport}
                    employees={employees}
                    locations={locations}
                />
            )}

            {allowedAIInputs && (
                <AIAssistant 
                    context={{ employees, locations, currentUser: auth?.employee || undefined }} 
                    onAction={handleAIAction}
                    allowedInputs={allowedAIInputs}
                />
            )}
        </div>
    );
};

export default ShiftSchedulerView;
