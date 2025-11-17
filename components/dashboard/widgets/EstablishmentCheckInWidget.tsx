
import React, { useState, useEffect } from 'react';
import { getTimeEntriesForEmployee, getEmployees, getLocations } from '../../../services/mockApi';
import { Employee, Location } from '../../../types';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';

interface ClockedInEmployee extends Employee {
    locationName: string;
    location?: Location;
    clockInCoords?: {
        lat: number;
        lon: number;
    }
}

const EstablishmentCheckInWidget: React.FC = () => {
    const [checkedIn, setCheckedIn] = useState<ClockedInEmployee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCheckIns = async () => {
            try {
                const [employees, locations] = await Promise.all([
                    getEmployees(),
                    getLocations(),
                ]);
                const allTimeEntries = (await Promise.all(
                    employees.map(e => getTimeEntriesForEmployee(e.employee_id))
                )).flat();

                const runningEntries = allTimeEntries.filter(e => e.status === 'running');
                
                const checkedInMap = new Map<string, ClockedInEmployee>();

                for (const entry of runningEntries) {
                    if (checkedInMap.has(entry.employee_id)) continue;

                    const employee = employees.find(e => e.employee_id === entry.employee_id);
                    if (!employee) continue;

                    const location = locations.find(l => l.location_id === entry.clock_in_location_id);
                    
                    const clockInCoords = entry.clock_in_latitude && entry.clock_in_longitude
                        ? { lat: entry.clock_in_latitude, lon: entry.clock_in_longitude }
                        : undefined;

                    checkedInMap.set(employee.employee_id, {
                        ...employee,
                        locationName: location?.name || 'Ubicación desconocida',
                        location: location,
                        clockInCoords: clockInCoords,
                    });
                }
                
                setCheckedIn(Array.from(checkedInMap.values()));

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

    if (isLoading) return <Card><Spinner size="sm" /></Card>;

    return (
        <Card title="Personal Fichado Actualmente">
            {checkedIn.length > 0 ? (
                <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                    {checkedIn.map(emp => {
                        let mapsUrl: string | undefined;

                        if (emp.clockInCoords?.lat && emp.clockInCoords?.lon) {
                            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${emp.clockInCoords.lat},${emp.clockInCoords.lon}`;
                        } else if (emp.location) {
                            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${emp.location.latitude},${emp.location.longitude}`;
                        }
                        
                        const content = (
                           <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold flex-shrink-0">
                                   {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                               </div>
                               <div>
                                <p className="font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                                <p className="text-sm text-gray-500">{emp.locationName}</p>
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
                                    <div className="p-3">{content}</div>
                               )}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-gray-500">No hay nadie fichado en este momento.</p>
            )}
        </Card>
    );
};

export default EstablishmentCheckInWidget;
