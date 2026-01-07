
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

            // SEGURIDAD: Determinar qué empleados puede ver este usuario
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

                // Si es un administrador y el empleado no tiene datos, saltamos.
                // Si es el propio empleado, mostramos aunque esté vacío para que vea su estado.
                if (filteredEntries.length === 0 && hasFullAccess) {
                    continue; 
                }

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
                            type: e.work_type || 'ordinaria'
                        };
                    });

                    monthlyTotalMs += dailyTotalMs;

                    return {
                        day,
                        date: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        entries: formattedEntries,
                        totalDuration: dailyTotalMs,
                    };
                });
                
                allEmployeeReports.push({
                    employee,
                    dailyLogs,
                    monthlyTotal: monthlyTotalMs,
                    signature
                });
            }
            
            setReportData(allEmployeeReports);

        } catch (error) {
            console.error("Failed to generate report", error);
        } finally {
            setIsGenerating(false);
        }
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
        } catch (error) {
            console.error("Failed to save signature", error);
        } finally {
            setIsSavingSignature(false);
        }
    };

    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0) return;
        const rows: any[] = [];
        reportData.forEach(rep => {
            rep.dailyLogs.forEach(dayLog => {
                dayLog.entries.forEach(entry => {
                    rows.push({
                        "Empleado": `${rep.employee.first_name} ${rep.employee.last_name}`,
                        "Fecha": dayLog.date,
                        "Entrada": entry.clockIn,
                        "Salida": entry.clockOut,
                        "Horas": (entry.duration / (1000 * 60 * 60)).toFixed(2),
                        "Validación": entry.isManual ? "MANUAL" : "DIGITAL",
                        "Tipo": entry.type.toUpperCase()
                    });
                });
            });
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Registro Oficial");
        XLSX.writeFile(wb, `Registro_Horario_${selectedMonth}_${selectedYear}.xlsx`);
    };
    
    if (isLoading) return <Spinner />;
    
    const years = [2025, 2024];
    const months = Array.from({length: 12}, (_, i) => ({
        value: (i + 1).toString(),
        name: new Date(0, i).toLocaleString('es-ES', { month: 'long' })
    }));

    const myReport = reportData?.find(r => r.employee.employee_id === auth?.employee?.employee_id);
    const needsSignature = myReport && !myReport.signature;

    return (
        <Card title="Generar Registro Mensual de Jornada">
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
                    <div className="flex justify-end no-print">
                        <Button variant="success" onClick={handleExportExcel} size="sm">
                            📥 Exportar Excel
                        </Button>
                    </div>
                    <PrintableMonthlyLog data={reportData} month={parseInt(selectedMonth)} year={parseInt(selectedYear)} />
                </div>
            )}

            {isSigningModalOpen && (
                <Modal isOpen={isSigningModalOpen} onClose={() => setIsSigningModalOpen(false)} title="Firma de Registro Mensual">
                    {isSavingSignature ? <Spinner/> : (
                        <SignaturePad 
                            onSave={handleSaveSignature}
                            onClear={() => {}} 
                        />
                    )}
                </Modal>
            )}
        </Card>
    );
};

export default MonthlyWorkLogReport;
