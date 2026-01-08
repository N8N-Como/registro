
import React, { useState, useEffect, useContext } from 'react';
import { getEmployees, getTimeEntriesForEmployee, getMonthlySignature, saveMonthlySignature, getBreaksForTimeEntries } from '../../services/mockApi';
import { Employee, MonthlySignature } from '../../types';
import { AuthContext } from '../../App';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import Modal from '../shared/Modal';
import { formatTime, getDaysInMonth, formatDuration } from '../../utils/helpers';
import PrintableMonthlyLog from './PrintableMonthlyLog';
import SignaturePad from '../shared/SignaturePad';
import TimeCorrectionModal from '../timesheets/TimeCorrectionModal';
import * as XLSX from 'xlsx';

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
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
    const [isSavingSignature, setIsSavingSignature] = useState(false);

    // Correction Context State
    const [correctionContext, setCorrectionContext] = useState<{
        isOpen: boolean,
        date: string,
        time: string,
        type: 'entry' | 'exit',
        entryId?: string
    }>({ isOpen: false, date: '', time: '', type: 'entry' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const emps = await getEmployees();
                setEmployees(emps);
            } catch (error) {
                console.error("Failed to load employees", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setReportData(null);
        try {
            const month = parseInt(selectedMonth, 10);
            const year = parseInt(selectedYear, 10);

            const hasFullAccess = auth?.role?.permissions.includes('view_reports') || auth?.role?.role_id === 'admin';
            const targetEmployees = hasFullAccess
                ? employees 
                : employees.filter(e => e.employee_id === auth?.employee?.employee_id);

            const allEmployeeReports: EmployeeReportData[] = [];

            for (const employee of targetEmployees) {
                const [timeEntries, signature] = await Promise.all([
                    getTimeEntriesForEmployee(employee.employee_id),
                    getMonthlySignature(employee.employee_id, month, year)
                ]);
                
                const filteredEntries = timeEntries.filter(entry => {
                    const entryDate = new Date(entry.clock_in_time);
                    return entryDate.getFullYear() === year && 
                           entryDate.getMonth() === month - 1;
                });

                if (filteredEntries.length === 0 && hasFullAccess) continue;

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
                        
                        const entryBreaks = allBreaks.filter(b => b.time_entry_id === e.entry_id);
                        const breakDuration = entryBreaks.reduce((acc, b) => {
                            const bStart = new Date(b.start_time).getTime();
                            const bEnd = b.end_time ? new Date(b.end_time).getTime() : bStart;
                            return acc + (bEnd - bStart);
                        }, 0);

                        const effectiveDuration = Math.max(0, (end - start) - breakDuration);
                        dailyTotalMs += effectiveDuration;
                        
                        return {
                            clockIn: formatTime(new Date(e.clock_in_time)),
                            clockOut: e.clock_out_time ? formatTime(new Date(e.clock_out_time)) : 'En curso',
                            duration: effectiveDuration,
                            isManual: e.is_manual === true,
                            type: e.work_type || 'ordinaria',
                            entryId: e.entry_id
                        };
                    });

                    monthlyTotalMs += dailyTotalMs;

                    return {
                        day,
                        date: dateObj.toISOString().split('T')[0],
                        entries: formattedEntries,
                        totalDuration: dailyTotalMs,
                    };
                });
                
                allEmployeeReports.push({ employee, dailyLogs, monthlyTotal: monthlyTotalMs, signature });
            }
            setReportData(allEmployeeReports);
        } catch (error) { console.error(error); } finally { setIsGenerating(false); }
    };
    
    const handleRequestCorrection = (date: string, time: string, type: 'entry' | 'exit', entryId?: string) => {
        if (time === 'En curso' && type === 'exit') return;
        setCorrectionContext({ isOpen: true, date, time, type, entryId });
    };

    const handleSaveSignature = async (signatureUrl: string) => {
        if (!auth?.employee) return;
        setIsSavingSignature(true);
        try {
            const month = parseInt(selectedMonth, 10);
            const year = parseInt(selectedYear, 10);
            await saveMonthlySignature(auth.employee.employee_id, month, year, signatureUrl);
            setIsSigningModalOpen(false);
            handleGenerateReport();
        } catch (error) { console.error(error); } finally { setIsSavingSignature(false); }
    };

    const years = [2025, 2024];
    const months = Array.from({length: 12}, (_, i) => ({
        value: (i + 1).toString(),
        name: new Date(0, i).toLocaleString('es-ES', { month: 'long' })
    }));

    const myReport = reportData?.find(r => r.employee.employee_id === auth?.employee?.employee_id);
    const needsSignature = myReport && !myReport.signature;

    if (isLoading) return <Spinner />;

    return (
        <Card title="Registro Mensual de Jornada">
            <div className="p-4 bg-gray-50 border rounded-md mb-6 flex items-end space-x-4 flex-wrap no-print">
                <div className="flex-grow min-w-[150px]">
                    <label className="block text-sm font-medium text-gray-700">Mes</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm capitalize">
                        {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                    </select>
                </div>
                 <div className="flex-grow min-w-[100px]">
                    <label className="block text-sm font-medium text-gray-700">Año</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
                    </select>
                </div>
                <Button onClick={handleGenerateReport} isLoading={isGenerating}>Generar Informe</Button>
            </div>
            
            {needsSignature && !isGenerating && (
                <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 flex justify-between items-center no-print animate-pulse">
                    <div>
                        <h3 className="text-lg font-bold text-orange-800">Firma Pendiente</h3>
                        <p className="text-sm text-orange-700">Debes firmar este registro para que sea legalmente válido.</p>
                    </div>
                    <Button onClick={() => setIsSigningModalOpen(true)} variant="primary">Firmar Ahora</Button>
                </div>
            )}
            
            {isGenerating && <div className="text-center py-10"><Spinner/></div>}

            {reportData && reportData.length > 0 && (
                <div className="space-y-4">
                    <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-2 no-print">
                        💡 <strong>Consejo:</strong> Si ves un error en alguna hora, haz clic sobre ella para solicitar una corrección.
                    </p>
                    {reportData.map((data, idx) => (
                        <div key={idx} className="border p-4 rounded-lg bg-white mb-8">
                            <h3 className="font-bold text-lg mb-4 border-b pb-2">{data.employee.first_name} {data.employee.last_name}</h3>
                            <table className="w-full text-xs sm:text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-2 text-left">Fecha</th>
                                        <th className="p-2 text-left">Entrada / Salida</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.dailyLogs.map(log => (
                                        <tr key={log.day} className="border-b hover:bg-gray-50">
                                            <td className="p-2 font-medium">{log.day}</td>
                                            <td className="p-2">
                                                {log.entries.map((e, i) => (
                                                    <div key={i} className="flex gap-2">
                                                        <span 
                                                            onClick={() => handleRequestCorrection(log.date, e.clockIn, 'entry', e.entryId)}
                                                            className="cursor-pointer hover:bg-yellow-200 hover:text-yellow-900 px-1 rounded transition-colors font-mono"
                                                            title="Clic para corregir entrada"
                                                        >
                                                            {e.clockIn}
                                                        </span>
                                                        <span>-</span>
                                                        <span 
                                                            onClick={() => handleRequestCorrection(log.date, e.clockOut, 'exit', e.entryId)}
                                                            className="cursor-pointer hover:bg-yellow-200 hover:text-yellow-900 px-1 rounded transition-colors font-mono"
                                                            title="Clic para corregir salida"
                                                        >
                                                            {e.clockOut}
                                                        </span>
                                                    </div>
                                                ))}
                                            </td>
                                            <td className="p-2 text-right font-bold">{log.totalDuration > 0 ? formatDuration(log.totalDuration) : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {isSigningModalOpen && (
                <Modal isOpen={isSigningModalOpen} onClose={() => setIsSigningModalOpen(false)} title="Firma de Registro Mensual">
                    {isSavingSignature ? <Spinner/> : <SignaturePad onSave={handleSaveSignature} onClear={() => {}} />}
                </Modal>
            )}

            {correctionContext.isOpen && auth?.employee && (
                <TimeCorrectionModal 
                    isOpen={correctionContext.isOpen}
                    onClose={() => setCorrectionContext(prev => ({...prev, isOpen: false}))}
                    employeeId={auth.employee.employee_id}
                    existingEntryId={correctionContext.entryId}
                    defaultDate={correctionContext.date}
                    defaultTime={correctionContext.time}
                    defaultType={correctionContext.type}
                />
            )}
        </Card>
    );
};

export default MonthlyWorkLogReport;
