
import React, { useState, useEffect } from 'react';
import { getAllRunningTimeEntries, getEmployees, getLocations, getCurrentEstablishmentStatus } from '../../../services/mockApi';
import { Employee, Location } from '../../../types';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import { LocationIcon, CarIcon } from '../../icons';

interface ClockedInEmployee extends Employee {
    locationName: string;
    location?: Location;
    statusType: 'establishment' | 'travel';
    startTime: string; // New field for start time
}

const EstablishmentCheckInWidget: React.FC = () => {
    const [checkedIn, setCheckedIn] = useState<ClockedInEmployee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCheckIns = async () => {
            try {
                // Optimized fetching: Get all running entries in 1 call instead of N calls
                const [employees, locations, activeActivities, runningEntries] = await Promise.all([
                    getEmployees(),
                    getLocations(),
                    getCurrentEstablishmentStatus(),
                    getAllRunningTimeEntries()
                ]);
                
                const checkedInMap = new Map<string, ClockedInEmployee>();

                for (const entry of runningEntries) {
                    if (checkedInMap.has(entry.employee_id)) continue;

                    const employee = employees.find(e => e.employee_id === entry.employee_id);
                    if (!employee) continue;

                    // 1. Check if they are actively inside a location (Activity Log)
                    const activeActivity = activeActivities.find(a => a.employee_id === entry.employee_id && !a.check_out_time);
                    
                    if (activeActivity) {
                        const loc = locations.find(l => l.location_id === activeActivity.location_id);
                        checkedInMap.set(employee.employee_id, {
                            ...employee,
                            locationName: loc?.name || 'Ubicación Desconocida',
                            location: loc,
                            statusType: 'establishment',
                            startTime: entry.clock_in_time
                        });
                    } else {
                        // 2. If not in a specific location log, they are in "Travel" / "General" mode
                        // We can check the clock_in location as a fallback, but usually this means 'En tránsito'
                        const initialLoc = locations.find(l => l.location_id === entry.clock_in_location_id);
                        
                        checkedInMap.set(employee.employee_id, {
                            ...employee,
                            locationName: initialLoc ? `${initialLoc.name} (Entrada)` : 'En Desplazamiento / Teletrabajo',
                            location: initialLoc,
                            statusType: 'travel',
                            startTime: entry.clock_in_time
                        });
                    }
                }
                
                // Sort by name
                const sorted = Array.from(checkedInMap.values()).sort((a,b) => a.first_name.localeCompare(b.first_name));
                setCheckedIn(sorted);

            } catch (error) {
                console.error("Failed to fetch check-in data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCheckIns();
        const interval = setInterval(fetchCheckIns, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    if (isLoading) return <Card><Spinner size="sm" /></Card>;

    return (
        <Card title="Personal Fichado Actualmente">
            {checkedIn.length > 0 ? (
                <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                    {checkedIn.map(emp => {
                        let mapsUrl: string | undefined;
                        if (emp.location) {
                            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${emp.location.latitude},${emp.location.longitude}`;
                        }
                        
                        const content = (
                           <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0 ${emp.statusType === 'establishment' ? 'bg-primary' : 'bg-orange-400'}`}>
                                   {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                               </div>
                               <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <p className="font-medium text-gray-800 truncate">{emp.first_name} {emp.last_name}</p>
                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                        Desde {formatTime(emp.startTime)}
                                    </span>
                                </div>
                                <div className="flex items-center text-sm text-gray-500 mt-0.5">
                                    {emp.statusType === 'establishment' ? <LocationIcon className="w-3 h-3 mr-1"/> : <CarIcon className="w-3 h-3 mr-1"/>}
                                    <span className="truncate">{emp.locationName}</span>
                                </div>
                               </div>
                           </div>
                        );

                        return (
                            <li key={emp.employee_id} className="py-3">
                               {mapsUrl ? (
                                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:bg-gray-50 -m-3 p-3 block rounded-lg transition-colors">
                                        {content}
                                    </a>
                               ) : (
                                    <div className="p-3 -m-3">{content}</div>
                               )}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="text-center py-6 text-gray-500">
                    <p>No hay nadie fichado en este momento.</p>
                </div>
            )}
        </Card>
    );
};

export default EstablishmentCheckInWidget;
