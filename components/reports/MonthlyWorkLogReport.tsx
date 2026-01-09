
import React, { useState, useEffect, useContext } from 'react';
import { getEmployees, getTimeEntriesForEmployee, getMonthlySignature, saveMonthlySignature, getBreaksForTimeEntries, getClosedMonths, closeMonth } from '../../services/mockApi';
import { Employee, MonthlySignature } from '../../types';
import { AuthContext } from '../../App';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import Modal from '../shared/Modal';
import { formatTime, getDaysInMonth, formatDuration, exportToExcel } from '../../utils/helpers';
import PrintableMonthlyLog from './PrintableMonthlyLog';
import SignaturePad from '../shared/SignaturePad';
import TimeCorrectionModal from '../timesheets/TimeCorrectionModal';
import { LockIcon, CheckIcon, BookOpenIcon } from '../icons';

interface DailyLog {
    day: number;
    date: string;
    entries: { 
        clockIn: string; 
        clockOut: string; 
        duration: number; 
        isManual: boolean;
        type: string;
        entryId?: string;
    }[];
    totalDuration: number;
}

interface EmployeeReportData {
    employee: Employee;
    dailyLogs: DailyLog[];
    monthlyTotal: number;
    signature?: MonthlySignature | null;
}

const MonthlyWorkLogReport: React.FC = () => {
    const auth = useContext(AuthContext);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [reportData, setReportData] = useState<EmployeeReportData[] | null>(null);
    const [closedMonths, setClosedMonths] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
    const [isSavingSignature, setIsSavingSignature] = useState(false);
    const [isPrintMode, setIsPrintMode] = useState(false);

    const [correctionContext, setCorrectionContext] = useState<{ isOpen: boolean, date: string, time: string, type: 'entry' | 'exit', entryId?: string }>({ isOpen: false, date: '', time: '', type: 'entry' });

    const isAdmin = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'administracion';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [emps, closed] = await Promise.all([getEmployees(), getClosedMonths()]);
                setEmployees(emps);
                setClosedMonths(closed);
            } catch (error) { console.error(error); } 
            finally { setIsLoading(false); }
        };
        fetchData();
    }, []);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setReportData(null);
        try {
            const month = parseInt(selectedMonth, 10);
            const year = parseInt(selectedYear, 10);
            const hasFullAccess = isAdmin || auth?.role?.permissions.includes('view_reports');
            
            const targetEmployees = hasFullAccess
                ? employees.filter(e => e.employee_id !== 'emp_admin')
                : employees.filter(e => e.employee_id === auth?.employee?.employee_id);

            const allEmployeeReports: EmployeeReportData[] = [];

            for (const employee of targetEmployees) {
                const [timeEntries, signature] = await Promise.all([
                    getTimeEntriesForEmployee(employee.employee_id),
                    getMonthlySignature(employee.employee_id, month, year)
                ]);
                
                const filteredEntries = timeEntries.filter(entry => {
                    const entryDate = new Date(entry.clock_in_time);
                    return entryDate.getFullYear() === year && entryDate.getMonth() === month - 1;
                });

                if (filteredEntries.length === 0 && targetEmployees.length > 1) continue;

                const entryIds = filteredEntries.map(e => e.entry_id);
                const allBreaks = await getBreaksForTimeEntries(entryIds);
                const daysOfMonth = getDaysInMonth(month, year);
                let monthlyTotalMs = 0;
                
                const dailyLogs = daysOfMonth.map(dateObj => {
                    const day = dateObj.getDate();
                    const entriesForDay = filteredEntries.filter(e => new Date(e.clock_in_time).getDate() === day)
                        .sort((a, b) => new Date(a.clock_in_time).getTime() - new Date(b.clock_in_time).getTime());
                    
                    let dailyTotalMs = 0;
                    const formattedEntries = entriesForDay.map(e => {
                        const start = new Date(e.clock_in_time).getTime();
                        const end = e.clock_out_time ? new Date(e.clock_out_time).getTime() : start;
                        
                        // REGLA OFICIAL: Solo restamos pausas de COMIDA del cómputo mensual
                        // Las pausas de DESCANSO (PRL) cuentan como tiempo trabajado
                        const entryBreaks = allBreaks.filter(b => b.time_entry_id === e.entry_id && b.break_type === 'comida');
                        const breakDuration = entryBreaks.reduce((acc, b) => acc + (new Date(b.end_time || b.start_time).getTime() - new Date(b.start_time).getTime()), 0);
                        
                        const effectiveDuration = Math.max(0, (end - start) - breakDuration);
                        dailyTotalMs += effectiveDuration;
                        
                        return { clockIn: formatTime(new Date(e.clock_in_time)), clockOut: e.clock_out_time ? formatTime(new Date(e.clock_out_time)) : 'En curso', duration: effectiveDuration, isManual: !!e.is_manual, type: e.work_type || 'ordinaria', entryId: e.entry_id };
                    });

                    monthlyTotalMs += dailyTotalMs;
                    return { day, date: dateObj.toISOString().split('T')[0], entries: formattedEntries, totalDuration: dailyTotalMs };
                });
                
                allEmployeeReports.push({ employee, dailyLogs, monthlyTotal: monthlyTotalMs, signature });
            }
            setReportData(allEmployeeReports);
        } catch (error) { console.error(error); } finally { setIsGenerating(false); }
    };
    
    if (isPrintMode && reportData) {
        return (
            <div>
                <div className="no-print p-4 bg-primary flex justify-between">
                    <Button variant="secondary" onClick={() => setIsPrintMode(false)}>← Volver al Panel</Button>
                    <Button onClick={() => window.print()}>🖨️ Generar PDF Final</Button>
                </div>
                <PrintableMonthlyLog data={reportData} month={parseInt(selectedMonth)} year={parseInt(selectedYear)} />
            </div>
        );
    }

    return (
        <Card className="border-t-4 border-primary">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 no-print">
                <div className="flex items-center gap-3">
                    <BookOpenIcon className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold uppercase tracking-tight">Registro de Jornada</h2>
                    {closedMonths.includes(`${selectedYear}-${selectedMonth.padStart(2, '0')}`) && <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 shadow-sm"><LockIcon className="w-3 h-3"/> Cerrado</span>}
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="text-sm font-bold border rounded-lg p-2 bg-white">
                        {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>)}
                    </select>
                    <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="text-sm font-bold border rounded-lg p-2 bg-white">
                        {[2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <Button onClick={handleGenerateReport} isLoading={isGenerating} size="sm">Actualizar</Button>
                </div>
            </div>

            {reportData && (
                <div className="space-y-6">
                    <div className="flex justify-end gap-2 no-print">
                        <Button variant="secondary" size="sm" onClick={() => setIsPrintMode(true)} className="bg-blue-50 border-blue-200 text-blue-700">📄 Generar PDF (Varios Empleados)</Button>
                    </div>
                    {reportData.map((data, idx) => (
                        <div key={idx} className={`border-2 rounded-2xl overflow-hidden bg-white shadow-sm transition-all ${data.signature ? 'border-green-100' : 'border-gray-100'}`}>
                            <div className={`p-4 border-b flex justify-between items-center ${data.signature ? 'bg-green-50/50' : 'bg-gray-50'}`}>
                                <div className="flex flex-col">
                                    <span className="font-black uppercase text-sm text-gray-700">{data.employee.first_name} {data.employee.last_name}</span>
                                    {data.signature ? <span className="text-[9px] font-bold text-green-600 flex items-center gap-1 mt-0.5"><CheckIcon className="w-3 h-3"/> Firmado</span> : <span className="text-[9px] font-bold text-orange-500 mt-0.5">⚠️ Pendiente</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => exportToExcel(data.dailyLogs.flatMap(l => l.entries), `Fichajes_${data.employee.first_name}`)} className="no-print p-2 bg-white border rounded-lg hover:bg-gray-50">📊</button>
                                    <span className="bg-primary text-white text-[11px] font-black px-3 py-1 rounded-full shadow-sm">TOTAL: {formatDuration(data.monthlyTotal)}</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-white text-gray-400 uppercase font-black border-b"><tr><th className="p-3 text-left w-16">Día</th><th className="p-3 text-left">Fichajes (Entrada - Salida)</th><th className="p-3 text-right">Duración</th></tr></thead>
                                    <tbody>
                                        {data.dailyLogs.map(log => (
                                            <tr key={log.day} className={`border-b hover:bg-gray-50 transition-colors ${log.totalDuration === 0 ? 'opacity-30' : ''}`}>
                                                <td className="p-3 font-bold">{log.day}</td>
                                                <td className="p-3">
                                                    {log.entries.map((e, i) => (
                                                        <div key={i} className="flex gap-2 items-center mb-1 last:mb-0">
                                                            <span onClick={() => setCorrectionContext({ isOpen: true, date: log.date, time: e.clockIn, type: 'entry', entryId: e.entryId })} className={`px-2 py-1 rounded font-mono cursor-pointer hover:bg-yellow-100 ${e.isManual ? 'text-red-600 font-bold' : ''}`}>{e.clockIn}</span>
                                                            <span className="text-gray-300">-</span>
                                                            <span onClick={() => e.clockOut !== 'En curso' && setCorrectionContext({ isOpen: true, date: log.date, time: e.clockOut, type: 'exit', entryId: e.entryId })} className={`px-2 py-1 rounded font-mono cursor-pointer hover:bg-yellow-100 ${e.isManual ? 'text-red-600 font-bold' : ''}`}>{e.clockOut}</span>
                                                            <span className="text-[9px] uppercase font-bold text-gray-400">({e.type})</span>
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="p-3 text-right font-black text-gray-900">{log.totalDuration > 0 ? formatDuration(log.totalDuration) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {correctionContext.isOpen && auth?.employee && <TimeCorrectionModal isOpen={correctionContext.isOpen} onClose={() => setCorrectionContext(prev => ({...prev, isOpen: false}))} employeeId={auth.employee.employee_id} existingEntryId={correctionContext.entryId} defaultDate={correctionContext.date} defaultTime={correctionContext.time} defaultType={correctionContext.type} />}
        </Card>
    );
};

export default MonthlyWorkLogReport;
