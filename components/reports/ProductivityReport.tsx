
import React, { useState, useEffect } from 'react';
import { getEmployees, getLocations, getTimeEntriesForEmployee, getActivityLogsForTimeEntry } from '../../services/mockApi';
import { Employee, Location, TimeEntry, ActivityLog } from '../../types';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import { formatDuration } from '../../utils/helpers';
import { CarIcon, BuildingIcon } from '../icons';
import Button from '../shared/Button';

interface ProductivityData {
    employeeId: string;
    employeeName: string;
    date: string;
    totalWorkTime: number; // ms
    locationTime: number; // ms
    travelTime: number; // ms (Total - Location)
    visits: {
        locationName: string;
        duration: number;
        startTime: string;
        endTime: string;
    }[];
}

const ProductivityReport: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState<ProductivityData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const [emps, locs] = await Promise.all([getEmployees(), getLocations()]);
                setEmployees(emps);
                setLocations(locs);
                
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(firstDay.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const generateReport = async () => {
        if (!startDate || !endDate) return;
        setIsGenerating(true);
        setReportData([]);

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            const results: ProductivityData[] = [];

            for (const emp of employees) {
                // Get Workdays (Time Entries)
                const entries = await getTimeEntriesForEmployee(emp.employee_id);
                const relevantEntries = entries.filter(e => {
                    const d = new Date(e.clock_in_time);
                    return d >= start && d <= end && e.status === 'completed' && e.clock_out_time;
                });

                for (const entry of relevantEntries) {
                    const totalWorkTime = new Date(entry.clock_out_time!).getTime() - new Date(entry.clock_in_time).getTime();
                    
                    // Get Locations (Activity Logs) within this workday
                    const logs = await getActivityLogsForTimeEntry(entry.entry_id);
                    const completedLogs = logs.filter(l => l.check_out_time);
                    
                    let locationTime = 0;
                    const visits = completedLogs.map(log => {
                        const duration = new Date(log.check_out_time!).getTime() - new Date(log.check_in_time).getTime();
                        locationTime += duration;
                        const locName = locations.find(l => l.location_id === log.location_id)?.name || 'Desconocido';
                        return {
                            locationName: locName,
                            duration,
                            startTime: log.check_in_time,
                            endTime: log.check_out_time!
                        };
                    });

                    // Logic: Travel Time is the gap. 
                    // However, sometimes Travel Time can be negative if logs overlap (shouldn't happen) or 0 if data is perfect.
                    // We ensure it's not negative.
                    const travelTime = Math.max(0, totalWorkTime - locationTime);

                    results.push({
                        employeeId: emp.employee_id,
                        employeeName: `${emp.first_name} ${emp.last_name}`,
                        date: new Date(entry.clock_in_time).toLocaleDateString('es-ES'),
                        totalWorkTime,
                        locationTime,
                        travelTime,
                        visits
                    });
                }
            }
            
            // Sort by date desc, then employee
            results.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setReportData(results);

        } catch (error) {
            console.error("Error generating productivity report", error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
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
                    <Button onClick={generateReport} isLoading={isGenerating} className="w-full sm:w-auto">
                        Analizar Trayectos
                    </Button>
                </div>
            </Card>

            {reportData.length > 0 && (
                <div className="space-y-4">
                    {reportData.map((row, idx) => (
                        <Card key={idx} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between md:items-center border-b pb-4 mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{row.employeeName}</h3>
                                    <p className="text-sm text-gray-500">{row.date}</p>
                                </div>
                                <div className="mt-2 md:mt-0 flex space-x-6 text-sm">
                                    <div className="text-center">
                                        <p className="text-gray-500 uppercase text-xs">Jornada Total</p>
                                        <p className="font-bold text-lg">{formatDuration(row.totalWorkTime)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-blue-600 uppercase text-xs">En Establecimientos</p>
                                        <p className="font-bold text-lg text-blue-700">{formatDuration(row.locationTime)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-orange-600 uppercase text-xs">En Trayecto</p>
                                        <p className="font-bold text-lg text-orange-700">{formatDuration(row.travelTime)}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Visual Bar */}
                            <div className="w-full h-4 bg-gray-200 rounded-full flex overflow-hidden mb-4">
                                <div 
                                    className="bg-blue-500 h-full" 
                                    style={{ width: `${(row.locationTime / row.totalWorkTime) * 100}%` }}
                                    title="Tiempo en Establecimientos"
                                ></div>
                                <div 
                                    className="bg-orange-400 h-full" 
                                    style={{ width: `${(row.travelTime / row.totalWorkTime) * 100}%` }}
                                    title="Tiempo en Trayecto"
                                ></div>
                            </div>

                            {/* Details */}
                            <div className="bg-gray-50 p-3 rounded-md">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Detalle de Visitas</h4>
                                {row.visits.length > 0 ? (
                                    <ul className="space-y-2">
                                        {row.visits.map((visit, vIdx) => (
                                            <li key={vIdx} className="flex justify-between items-center text-sm border-b border-gray-200 pb-1 last:border-0">
                                                <div className="flex items-center">
                                                    <BuildingIcon className="w-4 h-4 text-blue-500 mr-2" />
                                                    <span>{visit.locationName}</span>
                                                    <span className="text-gray-400 text-xs ml-2">
                                                        ({new Date(visit.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                                                         {new Date(visit.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                                                    </span>
                                                </div>
                                                <span className="font-medium">{formatDuration(visit.duration)}</span>
                                            </li>
                                        ))}
                                        <li className="flex justify-between items-center text-sm pt-1 text-orange-700">
                                            <div className="flex items-center">
                                                <CarIcon className="w-4 h-4 mr-2" />
                                                <span>Tiempo total en desplazamientos</span>
                                            </div>
                                            <span className="font-medium">{formatDuration(row.travelTime)}</span>
                                        </li>
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Sin visitas registradas (Todo el tiempo consta como trayecto o base).</p>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            
            {isGenerating && !reportData.length && (
                <div className="flex justify-center p-8">
                    <Spinner />
                </div>
            )}
        </div>
    );
};

export default ProductivityReport;
