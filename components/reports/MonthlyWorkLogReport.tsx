
import React, { useState, useEffect } from 'react';
import { getEmployees, getTimeEntriesForEmployee } from '../../services/mockApi';
import { Employee, TimeEntry } from '../../types';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import { formatDuration, formatTime, getDaysInMonth } from '../../utils/helpers';
import PrintableMonthlyLog from './PrintableMonthlyLog';

interface DailyLog {
    day: number;
    date: string;
    entries: { clockIn: string; clockOut: string; duration: number }[];
    totalDuration: number;
}

interface EmployeeReportData {
    employee: Employee;
    dailyLogs: DailyLog[];
    monthlyTotal: number;
}

const MonthlyWorkLogReport: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedMonth, setSelectedMonth] = useState('10');
    const [selectedYear, setSelectedYear] = useState('2025');
    const [reportData, setReportData] = useState<EmployeeReportData[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

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
            handleGenerateReport();
        }
    }, [isLoading]);

    const handleGenerateReport = async () => {
        setIsGenerating(true);
        setReportData(null);
        try {
            const month = parseInt(selectedMonth, 10);
            const year = parseInt(selectedYear, 10);

            const allEmployeeReports: EmployeeReportData[] = [];

            for (const employee of employees) {
                const timeEntries = await getTimeEntriesForEmployee(employee.employee_id);
                
                const filteredEntries = timeEntries.filter(entry => {
                    const entryDate = new Date(entry.clock_in_time);
                    return entryDate.getFullYear() === year && entryDate.getMonth() === month - 1 && entry.status === 'completed' && entry.clock_out_time;
                });

                if (filteredEntries.length === 0) continue;

                const daysOfMonth = getDaysInMonth(month, year);
                let monthlyTotalMs = 0;
                
                const dailyLogs = daysOfMonth.map(dateObj => {
                    const day = dateObj.getDate();
                    const entriesForDay = filteredEntries.filter(e => new Date(e.clock_in_time).getDate() === day);
                    
                    let dailyTotalMs = 0;
                    const formattedEntries = entriesForDay.map(e => {
                        const duration = new Date(e.clock_out_time!).getTime() - new Date(e.clock_in_time).getTime();
                        dailyTotalMs += duration;
                        return {
                            clockIn: formatTime(new Date(e.clock_in_time)),
                            clockOut: formatTime(new Date(e.clock_out_time!)),
                            duration,
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
                    monthlyTotal: monthlyTotalMs
                });
            }
            
            setReportData(allEmployeeReports);

        } catch (error) {
            console.error("Failed to generate report", error);
        } finally {
            setIsGenerating(false);
        }
    };
    
    if (isLoading) return <Spinner />;
    
    const years = [2025, 2024, 2023];
    const months = Array.from({length: 12}, (_, i) => ({
        value: (i + 1).toString(),
        name: new Date(0, i).toLocaleString('es-ES', { month: 'long' })
    }));

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
            
            {isGenerating && <Spinner/>}

            {reportData && (
                reportData.length > 0
                ? <PrintableMonthlyLog data={reportData} month={parseInt(selectedMonth)} year={parseInt(selectedYear)} />
                : <p className="text-center p-4">No se encontraron datos de fichaje para los criterios seleccionados.</p>
            )}
        </Card>
    );
};

export default MonthlyWorkLogReport;