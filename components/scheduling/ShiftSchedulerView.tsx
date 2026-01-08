
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../App';
import { 
    getEmployees, getLocations, getWorkShifts, createWorkShift, updateWorkShift, deleteWorkShift, getShiftConfigs, createBulkWorkShifts, getTimeOffRequests
} from '../../services/mockApi';
import { Employee, Location, WorkShift, ShiftConfig, TimeOffRequest } from '../../types';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import Button from '../shared/Button';
import ShiftFormModal from './ShiftFormModal';
import ImageImportModal from './ImageImportModal';
import { CalendarIcon, SparklesIcon } from '../icons';

const ShiftSchedulerView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); 
    const [shifts, setShifts] = useState<WorkShift[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>([]);
    const [absences, setAbsences] = useState<TimeOffRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);
    const [modalContext, setModalContext] = useState<{ employeeId: string, date: Date } | null>(null);

    const canManage = useMemo(() => ['admin', 'gobernanta', 'administracion'].includes(auth?.role?.role_id || ''), [auth?.role]);

    const viewDays = useMemo(() => {
        const days = [];
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) days.push(new Date(year, month, i));
        return days;
    }, [currentMonth]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [emps, locs, configs, reqs] = await Promise.all([
                getEmployees(), getLocations(), getShiftConfigs(), getTimeOffRequests()
            ]);
            let staff = emps.filter(e => e.employee_id !== 'emp_admin');
            if (!canManage && auth?.employee) staff = staff.filter(e => e.employee_id === auth.employee!.employee_id);
            setEmployees(staff.sort((a,b) => a.first_name.localeCompare(b.first_name)));
            setLocations(locs);
            setShiftConfigs(configs);
            setAbsences(reqs.filter(r => r.status === 'approved'));

            const startStr = viewDays[0].toISOString();
            const endStr = viewDays[viewDays.length - 1].toISOString().replace(/T.*/, 'T23:59:59');
            const monthShifts = await getWorkShifts(startStr, endStr);
            setShifts(monthShifts);
        } catch (err) { console.error(err); } 
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, [currentMonth, auth?.employee]);

    const getShiftDisplay = (empId: string, date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const absence = absences.find(a => a.employee_id === empId && dateStr >= a.start_date && dateStr <= a.end_date);
        if (absence) return { code: 'LIB', color: '#9ca3af', type: 'absence' };
        const shift = shifts.find(s => s.employee_id === empId && new Date(s.start_time).toISOString().split('T')[0] === dateStr);
        if (shift) return { code: shift.notes?.substring(0,3) || 'T', color: shift.color, type: shift.type, original: shift };
        return null;
    };

    const calculateMonthlyHours = (employeeId: string) => {
        let totalMs = 0;
        shifts.filter(s => s.employee_id === employeeId && s.type === 'work').forEach(s => {
            totalMs += (new Date(s.end_time).getTime() - new Date(s.start_time).getTime());
        });
        return Math.round(totalMs / (1000 * 60 * 60));
    };

    if (isLoading && employees.length === 0) return <Spinner />;

    return (
        <div className="space-y-4">
            <Card className="flex flex-col lg:flex-row justify-between items-center p-4 gap-4 bg-white border-b-4 border-primary">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6 text-primary"/>
                    <h2 className="text-xl font-bold uppercase">{currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); }}>&lt;</Button>
                    <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>ESTE MES</Button>
                    <Button variant="secondary" size="sm" onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); }}>&gt;</Button>
                    {canManage && (
                        <Button variant="success" size="sm" onClick={() => setIsImportModalOpen(true)}><SparklesIcon className="w-4 h-4 mr-1"/> IA Import</Button>
                    )}
                </div>
            </Card>

            <Card className="overflow-hidden p-0 shadow-lg border-none">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse text-[10px]">
                        <thead>
                            <tr className="bg-gray-100 text-gray-500 font-black uppercase tracking-widest border-b">
                                <th className="p-3 text-left sticky left-0 bg-gray-100 z-20 w-36 border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Personal</th>
                                {viewDays.map(day => (
                                    <th key={day.toISOString()} className={`p-1 text-center border-r w-9 h-12 ${day.toDateString() === new Date().toDateString() ? 'bg-primary text-white' : 'bg-gray-50/50'}`}>
                                        <div className="opacity-70 text-[8px]">{day.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                                        <div className="text-sm font-black">{day.getDate()}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.employee_id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                                    <td className="p-2 border-r border-gray-200 font-bold sticky left-0 bg-white z-10 shadow-sm">
                                        <div className="truncate text-gray-800">{emp.first_name} {emp.last_name.charAt(0)}.</div>
                                        <span className="text-[8px] text-gray-400 font-black">{calculateMonthlyHours(emp.employee_id)}h registrados</span>
                                    </td>
                                    {viewDays.map(day => {
                                        const display = getShiftDisplay(emp.employee_id, day);
                                        return (
                                            <td key={day.toISOString()} onClick={() => {
                                                if (!canManage) return;
                                                setModalContext({ employeeId: emp.employee_id, date: day });
                                                setSelectedShift(display?.original || null);
                                                setIsModalOpen(true);
                                            }} className="p-0 border-r border-gray-100 h-12 text-center cursor-pointer group relative">
                                                {display ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-white font-black shadow-sm" style={{ backgroundColor: display.color }}>
                                                        <span className="text-[11px]">{display.code}</span>
                                                    </div>
                                                ) : (
                                                    <span className="opacity-0 group-hover:opacity-100 text-primary font-black text-xl">+</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
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
                    onDelete={async (id) => { if(window.confirm("¿Eliminar turno?")) { await deleteWorkShift(id); fetchData(); setIsModalOpen(false); } }}
                    shift={selectedShift} employeeId={modalContext.employeeId} date={modalContext.date}
                    locations={locations} employees={employees}
                />
            )}
            {isImportModalOpen && <ImageImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={async (s) => { await createBulkWorkShifts(s); fetchData(); }} employees={employees} locations={locations} shiftConfigs={shiftConfigs} currentMonth={currentMonth.getMonth()} currentYear={currentMonth.getFullYear()} />}
        </div>
    );
};

export default ShiftSchedulerView;
