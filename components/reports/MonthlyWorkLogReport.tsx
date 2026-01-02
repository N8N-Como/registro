
import React, { useState, useEffect, useContext } from 'react';
import { getEmployees, getTimeEntriesForEmployee, getMonthlySignature, saveMonthlySignature, getBreaksForTimeEntries, updateTimeEntry } from '../../services/mockApi';
import { Employee, MonthlySignature, TimeEntry } from '../../types';
import { AuthContext } from '../../App';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import Modal from '../shared/Modal';
import { formatTime, getDaysInMonth, formatDuration } from '../../utils/helpers';
import PrintableMonthlyLog from './PrintableMonthlyLog';
import SignaturePad from '../shared/SignaturePad';
import * as XLSX from 'xlsx';
import { PencilIcon } from '../icons';

// Fixed DailyLog interface to include originalEntry property
interface DailyLog {
    day: number;
    date: string;
    entries: { 
        entry_id: string;
        clockIn: string; 
        clockOut: string; 
        duration: number; 
        isManual: boolean;
        type: string;
        status: string;
        originalEntry: TimeEntry;
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
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(auth?.employee?.employee_id || '');
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [reportData, setReportData] = useState<EmployeeReportData[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<any>(null);
    const [isSavingSignature, setIsSavingSignature] = useState(false);

    const isAdmin = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'administracion';

    useEffect(() => {
        const fetchData = async () => {
            try {
                const emps = await getEmployees();
                setEmployees(emps);
                if (!selectedEmployeeId && auth?.employee) setSelectedEmployeeId(auth.employee.employee_id);
            } catch (error) {
                console.error("Failed to load employees", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [auth?.employee]);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setReportData(null);
        try {
            const month = parseInt(selectedMonth, 10);
            const year = parseInt(selectedYear, 10);

            const allEmployeeReports: EmployeeReportData[] = [];
            // Si es admin, puede generar de todos o del seleccionado. Para visualización, procesamos el seleccionado.
            const targetEmployees = isAdmin 
                ? (selectedEmployeeId === 'all' ? employees : employees.filter(e => e.employee_id === selectedEmployeeId))
                : employees.filter(e => e.employee_id === auth?.employee?.employee_id);

            for (const employee of targetEmployees) {
                const [timeEntries, signature] = await Promise.all([
                    getTimeEntriesForEmployee(employee.employee_id),
                    getMonthlySignature(employee.employee_id, month, year)
                ]);
                
                const filteredEntries = timeEntries.filter(entry => {
                    const entryDate = new Date(entry.clock_in_time);
                    return entryDate.getFullYear() === year && 
                           entryDate.getMonth() === month - 1 && 
                           (entry.status === 'completed' || entry.status === 'pending_employee_approval') && 
                           entry.clock_out_time;
                });

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
                        const end = new Date(e.clock_out_time!).getTime();
                        
                        const entryBreaks = allBreaks.filter(b => b.time_entry_id === e.entry_id);
                        const breakDuration = entryBreaks.reduce((acc, b) => {
                            const bStart = new Date(b.start_time).getTime();
                            const bEnd = b.end_time ? new Date(b.end_time).getTime() : bStart;
                            return acc + (bEnd - bStart);
                        }, 0);

                        const effectiveDuration = (end - start) - breakDuration;
                        dailyTotalMs += effectiveDuration;
                        
                        return {
                            entry_id: e.entry_id,
                            clockIn: formatTime(new Date(e.clock_in_time)),
                            clockOut: formatTime(new Date(e.clock_out_time!)),
                            duration: effectiveDuration,
                            isManual: e.is_manual === true,
                            type: e.work_type || 'ordinaria',
                            status: e.status,
                            originalEntry: e
                        };
                    });

                    monthlyTotalMs += dailyTotalMs;

                    return {
                        day,
                        date: dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        entries: formattedEntries,
                        totalDuration: dailyTotalMs,
                    } as DailyLog;
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
    
    const handleEditEntry = (entry: any) => {
        setEditingEntry({
            ...entry.originalEntry,
            clock_in_time: new Date(entry.originalEntry.clock_in_time).toISOString().slice(0, 16),
            clock_out_time: new Date(entry.originalEntry.clock_out_time).toISOString().slice(0, 16)
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingEntry) return;
        try {
            const updated = {
                ...editingEntry,
                clock_in_time: new Date(editingEntry.clock_in_time).toISOString(),
                clock_out_time: new Date(editingEntry.clock_out_time).toISOString(),
                status: 'pending_employee_approval', // El empleado debe aceptarlo
                is_manual: true
            };
            await updateTimeEntry(updated);
            setIsEditModalOpen(false);
            handleGenerateReport();
        } catch (e) { alert("Error al actualizar"); }
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
        if (!reportData) return;
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
    
    const years = [2026, 2025, 2024];
    const months = Array.from({length: 12}, (_, i) => ({
        value: (i + 1).toString(),
        name: new Date(0, i).toLocaleString('es-ES', { month: 'long' })
    }));

    const myReport = reportData?.find(r => r.employee.employee_id === auth?.employee?.employee_id);
    const needsSignature = myReport && !myReport.signature;

    return (
        <Card title="Generar Registro Mensual de Jornada">
            <div className="p-4 bg-gray-50 border rounded-md mb-6 flex items-end space-x-4 flex-wrap no-print">
                {isAdmin && (
                    <div className="flex-grow min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700">Empleado</label>
                        <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="all">-- Todos los empleados --</option>
                            {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.first_name} {e.last_name}</option>)}
                        </select>
                    </div>
                )}
                <div className="flex-grow min-w-[120px]">
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
                <div className="space-y-8">
                    <div className="flex justify-end no-print">
                        <Button variant="success" onClick={handleExportExcel} size="sm">📥 Exportar Excel</Button>
                    </div>
                    {reportData.map((data, idx) => (
                        <div key={idx} className="relative">
                            {isAdmin && (
                                <div className="absolute top-4 right-4 no-print text-xs font-bold text-gray-400">VISTA ADMINISTRADOR</div>
                            )}
                            <PrintableMonthlyLog data={[data]} month={parseInt(selectedMonth)} year={parseInt(selectedYear)} />
                            
                            {/* Overlay de Edición para Admin */}
                            {isAdmin && (
                                <div className="mt-4 p-4 border rounded bg-blue-50 no-print">
                                    <h4 className="font-bold text-blue-800 mb-2">Herramientas Admin</h4>
                                    <p className="text-xs text-blue-600 mb-4">Puedes modificar las horas de cualquier tramo. El empleado recibirá un aviso para aceptar el cambio.</p>
                                    <div className="space-y-2">
                                        {data.dailyLogs.flatMap(dl => dl.entries).map(e => (
                                            <div key={e.entry_id} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                                <span>Día {new Date(e.originalEntry.clock_in_time).getDate()}: {e.clockIn} - {e.clockOut} ({e.status})</span>
                                                <button onClick={() => handleEditEntry(e)} className="text-blue-600 hover:text-blue-800"><PencilIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isEditModalOpen && (
                <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modificar Tramo Horario">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Entrada</label>
                            <input type="datetime-local" value={editingEntry.clock_in_time} onChange={e => setEditingEntry({...editingEntry, clock_in_time: e.target.value})} className="w-full border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Salida</label>
                            <input type="datetime-local" value={editingEntry.clock_out_time} onChange={e => setEditingEntry({...editingEntry, clock_out_time: e.target.value})} className="w-full border rounded p-2" />
                        </div>
                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveEdit}>Proponer Cambio</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {isSigningModalOpen && (
                <Modal isOpen={isSigningModalOpen} onClose={() => setIsSigningModalOpen(false)} title="Firma de Registro Mensual">
                    {isSavingSignature ? <Spinner/> : (
                        <SignaturePad onSave={handleSaveSignature} onClear={() => {}} />
                    )}
                </Modal>
            )}
        </Card>
    );
};

export default MonthlyWorkLogReport;
