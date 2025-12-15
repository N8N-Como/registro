
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
    entries: { clockIn: string; clockOut: string; duration: number; isManual: boolean }[];
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
    const [selectedMonth, setSelectedMonth] = useState('10');
    const [selectedYear, setSelectedYear] = useState('2025');
    const [reportData, setReportData] = useState<EmployeeReportData[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Signature State
    const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
    const [isSavingSignature, setIsSavingSignature] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const emps = await getEmployees();
                setEmployees(emps);
            } catch (error) {
                console.error("Failed to load initial data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Auto-generate report on initial load with test data
    useEffect(() => {
        if (!isLoading) {
            const today = new Date();
            setSelectedMonth((today.getMonth() + 1).toString());
            setSelectedYear(today.getFullYear().toString());
        }
    }, [isLoading]);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setReportData(null);
        try {
            const month = parseInt(selectedMonth, 10);
            const year = parseInt(selectedYear, 10);

            const allEmployeeReports: EmployeeReportData[] = [];

            // If user is admin, generate for all. If employee, only for themselves.
            const targetEmployees = (auth?.role?.role_id === 'admin') 
                ? employees 
                : employees.filter(e => e.employee_id === auth?.employee?.employee_id);

            for (const employee of targetEmployees) {
                const [timeEntries, signature] = await Promise.all([
                    getTimeEntriesForEmployee(employee.employee_id),
                    getMonthlySignature(employee.employee_id, month, year)
                ]);
                
                const filteredEntries = timeEntries.filter(entry => {
                    const entryDate = new Date(entry.clock_in_time);
                    return entryDate.getFullYear() === year && entryDate.getMonth() === month - 1 && entry.status === 'completed' && entry.clock_out_time;
                });

                // Optimization: Fetch all breaks for these entries at once
                const entryIds = filteredEntries.map(e => e.entry_id);
                const allBreaks = await getBreaksForTimeEntries(entryIds);

                // If admin, skip empty reports. If employee, show even if empty (to sign zero hours?)
                if (filteredEntries.length === 0 && auth?.role?.role_id === 'admin') continue;

                const daysOfMonth = getDaysInMonth(month, year);
                let monthlyTotalMs = 0;
                
                const dailyLogs = daysOfMonth.map(dateObj => {
                    const day = dateObj.getDate();
                    const entriesForDay = filteredEntries.filter(e => new Date(e.clock_in_time).getDate() === day);
                    
                    let dailyTotalMs = 0;
                    const formattedEntries = entriesForDay.map(e => {
                        const start = new Date(e.clock_in_time).getTime();
                        const end = new Date(e.clock_out_time!).getTime();
                        
                        // Calculate Break Duration for this entry
                        const entryBreaks = allBreaks.filter(b => b.time_entry_id === e.entry_id);
                        const breakDuration = entryBreaks.reduce((acc, b) => {
                            const bStart = new Date(b.start_time).getTime();
                            const bEnd = b.end_time ? new Date(b.end_time).getTime() : bStart; // Ignore incomplete breaks in report calculation for safety
                            return acc + (bEnd - bStart);
                        }, 0);

                        const effectiveDuration = (end - start) - breakDuration;
                        dailyTotalMs += effectiveDuration;
                        
                        return {
                            clockIn: formatTime(new Date(e.clock_in_time)),
                            clockOut: formatTime(new Date(e.clock_out_time!)),
                            duration: effectiveDuration,
                            isManual: !!e.is_manual
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
            handleGenerateReport(); // Refresh data to show signature
        } catch (error) {
            console.error("Failed to save signature", error);
            alert("Error al guardar la firma.");
        } finally {
            setIsSavingSignature(false);
        }
    };

    // EXCEL EXPORT FUNCTION (Punto 3.B)
    const handleExportExcel = () => {
        if (!reportData || reportData.length === 0) return;

        // Flatten data for Excel
        const rows: any[] = [];

        reportData.forEach(rep => {
            rep.dailyLogs.forEach(dayLog => {
                // If multiple entries per day, join them or create multiple rows? 
                // For payroll, usually summary per day is enough, but detailed is safer.
                if (dayLog.entries.length > 0) {
                    dayLog.entries.forEach(entry => {
                        rows.push({
                            "Empleado": `${rep.employee.first_name} ${rep.employee.last_name}`,
                            "DNI/NIF": rep.employee.pin, // Assuming ID is not PII for this internal report
                            "Fecha": dayLog.date,
                            "Entrada": entry.clockIn,
                            "Salida": entry.clockOut,
                            "Horas Efectivas": (entry.duration / (1000 * 60 * 60)).toFixed(2),
                            "Incidencia": entry.isManual ? "Manual/Corregido" : ""
                        });
                    });
                } else {
                    // Empty row for days without work? Or skip? Let's skip to keep file clean.
                }
            });
        });

        if (rows.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Registro Horario");
        XLSX.writeFile(wb, `Registro_Horario_${selectedMonth}_${selectedYear}.xlsx`);
    };
    
    if (isLoading) return <Spinner />;
    
    const years = [2025, 2024, 2023];
    const months = Array.from({length: 12}, (_, i) => ({
        value: (i + 1).toString(),
        name: new Date(0, i).toLocaleString('es-ES', { month: 'long' })
    }));

    // Check if the current user needs to sign their report
    const myReport = reportData?.find(r => r.employee.employee_id === auth?.employee?.employee_id);
    const needsSignature = myReport && !myReport.signature;

    return (
        <Card title="Generar Registro Mensual de Jornada">
            <div className="p-4 bg-gray-50 border rounded-md mb-6 flex items-end space-x-4 flex-wrap no-print">
                <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-700">Mes</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm capitalize">
                        {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                    </select>
                </div>
                 <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-700">Año</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
                    </select>
                </div>
                <Button onClick={handleGenerateReport} isLoading={isGenerating}>Generar Informe</Button>
            </div>
            
            {/* Signature Call to Action */}
            {needsSignature && !isGenerating && (
                <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 flex justify-between items-center no-print">
                    <div>
                        <h3 className="text-lg font-bold text-orange-800">Acción Requerida</h3>
                        <p className="text-sm text-orange-700">Aún no has firmado digitalmente tu registro de jornada para este mes.</p>
                    </div>
                    <Button onClick={() => setIsSigningModalOpen(true)} variant="primary">Firmar Ahora</Button>
                </div>
            )}
            
            {isGenerating && <Spinner/>}

            {reportData && reportData.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-end no-print">
                        <Button variant="success" onClick={handleExportExcel} className="mr-2">
                            📥 Exportar Excel (.xlsx)
                        </Button>
                    </div>
                    <PrintableMonthlyLog data={reportData} month={parseInt(selectedMonth)} year={parseInt(selectedYear)} />
                </div>
            )}
            
            {reportData && reportData.length === 0 && (
                <p className="text-center p-4">No se encontraron datos de fichaje para los criterios seleccionados.</p>
            )}

            {isSigningModalOpen && (
                <Modal isOpen={isSigningModalOpen} onClose={() => setIsSigningModalOpen(false)} title="Firmar Registro de Jornada">
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
