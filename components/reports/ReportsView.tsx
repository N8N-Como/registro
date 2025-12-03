
import React, { useState, useEffect } from 'react';
import { getEmployees, getTimeEntriesForEmployee, getActivityLogsForTimeEntry, getLocations } from '../../services/mockApi';
import { Employee, Location } from '../../types';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import BarChart from './BarChart';
import { formatDuration } from '../../utils/helpers';
import MonthlyWorkLogReport from './MonthlyWorkLogReport';
import ProductivityReport from './ProductivityReport';
import { DashboardIcon, CarIcon, BookOpenIcon } from '../icons';

interface ReportData {
    kpis: {
        totalHours: number;
        totalEmployees: number;
        avgWorkday: number;
    };
    hoursByEmployee: { name: string; hours: number }[];
    hoursByLocation: { name: string; hours: number }[];
}

type ReportTab = 'general' | 'monthly_log' | 'productivity';

const ReportsView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ReportTab>('general');
    
    // General Report State
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [allLocations, setAllLocations] = useState<Location[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [emps, locs] = await Promise.all([getEmployees(), getLocations()]);
                setAllEmployees(emps);
                setAllLocations(locs);

                const today = new Date();
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);

            } catch (error) {
                console.error("Failed to load initial report data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            alert("Por favor, selecciona un rango de fechas.");
            return;
        }
        setIsGenerating(true);
        setReportData(null);

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            let totalHoursMs = 0;
            const hoursByEmployee: { [id: string]: number } = {};
            const hoursByLocation: { [id: string]: number } = {};
            const employeesInReport = new Set<string>();

            for (const employee of allEmployees) {
                const timeEntries = await getTimeEntriesForEmployee(employee.employee_id);
                const relevantEntries = timeEntries.filter(entry => {
                    const entryDate = new Date(entry.clock_in_time);
                    return entry.status === 'completed' && entry.clock_out_time && entryDate >= start && entryDate <= end;
                });

                if (relevantEntries.length > 0) {
                    employeesInReport.add(employee.employee_id);
                }

                for (const entry of relevantEntries) {
                    const durationMs = new Date(entry.clock_out_time!).getTime() - new Date(entry.clock_in_time).getTime();
                    totalHoursMs += durationMs;
                    hoursByEmployee[employee.employee_id] = (hoursByEmployee[employee.employee_id] || 0) + durationMs;

                    const activityLogs = await getActivityLogsForTimeEntry(entry.entry_id);
                    for (const log of activityLogs) {
                        if (log.check_out_time) {
                            const activityDurationMs = new Date(log.check_out_time).getTime() - new Date(log.check_in_time).getTime();
                            hoursByLocation[log.location_id] = (hoursByLocation[log.location_id] || 0) + activityDurationMs;
                        }
                    }
                }
            }

            const totalEmployees = employeesInReport.size;
            const avgWorkday = totalEmployees > 0 ? totalHoursMs / totalEmployees : 0;
            
            const formattedHoursByEmployee = Object.entries(hoursByEmployee).map(([id, ms]) => ({
                name: allEmployees.find(e => e.employee_id === id)?.first_name || 'Unknown',
                hours: ms / (1000 * 60 * 60),
            })).sort((a,b) => b.hours - a.hours);

            const formattedHoursByLocation = Object.entries(hoursByLocation).map(([id, ms]) => ({
                name: allLocations.find(l => l.location_id === id)?.name || 'Unknown',
                hours: ms / (1000 * 60 * 60),
            })).sort((a,b) => b.hours - a.hours);


            setReportData({
                kpis: {
                    totalHours: totalHoursMs,
                    totalEmployees,
                    avgWorkday,
                },
                hoursByEmployee: formattedHoursByEmployee,
                hoursByLocation: formattedHoursByLocation
            });
        } catch (error) {
            console.error("Error generating report", error);
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Auto-generate report on initial load if tab is general
    useEffect(() => {
        if (!isLoading && activeTab === 'general') {
            handleGenerateReport();
        }
    }, [isLoading, activeTab]);

    if (isLoading) return <Spinner />;

    const tabClasses = (tabName: ReportTab) => 
        `px-4 py-2 font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
          activeTab === tabName 
            ? 'bg-white border-b-0 border-gray-200 text-primary' 
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`;

    return (
        <div className="space-y-6">
             <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-2" aria-label="Report Tabs">
                    <button onClick={() => setActiveTab('general')} className={tabClasses('general')}>
                        <DashboardIcon className="w-5 h-5" />
                        <span>KPIs Generales</span>
                    </button>
                    <button onClick={() => setActiveTab('productivity')} className={tabClasses('productivity')}>
                        <CarIcon className="w-5 h-5" />
                        <span>Desplazamientos y Eficiencia</span>
                    </button>
                    <button onClick={() => setActiveTab('monthly_log')} className={tabClasses('monthly_log')}>
                        <BookOpenIcon className="w-5 h-5" />
                        <span>Registro Oficial Mensual</span>
                    </button>
                </nav>
            </div>

            {activeTab === 'general' && (
                <>
                    <Card>
                        <div className="flex flex-col sm:flex-row items-end gap-4 p-4 bg-gray-50 border rounded-md">
                            <div className="flex-grow w-full sm:w-auto">
                                <label className="block text-sm font-medium text-gray-700">Desde</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div className="flex-grow w-full sm:w-auto">
                                <label className="block text-sm font-medium text-gray-700">Hasta</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <Button onClick={handleGenerateReport} isLoading={isGenerating} className="w-full sm:w-auto">
                                Actualizar Informe
                            </Button>
                        </div>
                    </Card>

                    {isGenerating && <div className="text-center p-8"><Spinner /></div>}
                    
                    {reportData && (
                        <>
                            <Card title="Resumen del Periodo">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                    <div>
                                        <h4 className="text-gray-500 uppercase text-sm font-semibold">Total Horas Registradas</h4>
                                        <p className="text-3xl font-bold text-primary">{formatDuration(reportData.kpis.totalHours)}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-gray-500 uppercase text-sm font-semibold">Empleados con Actividad</h4>
                                        <p className="text-3xl font-bold text-primary">{reportData.kpis.totalEmployees}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-gray-500 uppercase text-sm font-semibold">Promedio Horas / Empleado</h4>
                                        <p className="text-3xl font-bold text-primary">{formatDuration(reportData.kpis.avgWorkday)}</p>
                                    </div>
                                </div>
                            </Card>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card title="Horas Totales por Empleado">
                                {reportData.hoursByEmployee.length > 0 ? <BarChart data={reportData.hoursByEmployee} /> : <p className="text-center text-gray-500 py-8">Sin datos</p>}
                                </Card>
                                <Card title="Ocupación de Establecimientos">
                                {reportData.hoursByLocation.length > 0 ? <BarChart data={reportData.hoursByLocation} /> : <p className="text-center text-gray-500 py-8">Sin datos</p>}
                                </Card>
                            </div>
                        </>
                    )}
                </>
            )}

            {activeTab === 'productivity' && (
                <ProductivityReport />
            )}

            {activeTab === 'monthly_log' && (
                <MonthlyWorkLogReport />
            )}
        </div>
    );
};

export default ReportsView;
