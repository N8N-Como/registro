
import React, { useState, useEffect } from 'react';
import Card from '../shared/Card';
import { LocationIcon, CarIcon } from '../icons';
import { getLocations, getAllRunningTimeEntries, getEmployees } from '../../services/mockApi';
import { Location, Employee, TimeEntry } from '../../types';

const LiveStaffMap: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [staffPositions, setStaffPositions] = useState<(TimeEntry & { employee?: Employee })[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [locs, entries, emps] = await Promise.all([
                    getLocations(),
                    getAllRunningTimeEntries(),
                    getEmployees()
                ]);
                setLocations(locs);
                setStaffPositions(entries.map(e => ({
                    ...e,
                    employee: emps.find(emp => emp.employee_id === e.employee_id)
                })));
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
        const interval = setInterval(load, 45000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) return <Card className="h-64 animate-pulse bg-gray-50 flex items-center justify-center">Cargando Mapa...</Card>;

    return (
        <Card title="Mapa de Personal en Vivo" className="overflow-hidden p-0">
            <div className="relative h-[400px] bg-blue-50 overflow-hidden flex flex-col items-center justify-center border-b">
                {/* Simulación visual de mapa para evitar dependencia externa de API Key en esta fase */}
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                
                {/* Marcadores de Establecimientos */}
                {locations.map(loc => (
                    <div 
                        key={loc.location_id}
                        className="absolute flex flex-col items-center animate-in fade-in zoom-in duration-500"
                        style={{ 
                            left: `${50 + (loc.longitude + 8.41) * 500}%`, 
                            top: `${50 - (loc.latitude - 43.36) * 500}%` 
                        }}
                    >
                        <div className="bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white">
                            <LocationIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold bg-white/90 px-1 rounded mt-1 shadow-sm border whitespace-nowrap">{loc.name}</span>
                    </div>
                ))}

                {/* Marcadores de Empleados */}
                {staffPositions.map(pos => {
                    const isAtBase = pos.clock_in_location_id;
                    const lat = pos.clock_in_latitude || 43.36;
                    const lon = pos.clock_in_longitude || -8.41;

                    return (
                        <div 
                            key={pos.entry_id}
                            className="absolute flex flex-col items-center z-10"
                            style={{ 
                                left: `${50 + (lon + 8.41) * 500 + 5}%`, 
                                top: `${50 - (lat - 43.36) * 500 - 5}%` 
                            }}
                        >
                            <div className="relative">
                                <img 
                                    src={pos.employee?.photo_url || `https://ui-avatars.com/api/?name=${pos.employee?.first_name}`} 
                                    className="w-8 h-8 rounded-full border-2 border-orange-500 shadow-md object-cover"
                                    alt="Staff"
                                />
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-orange-500">
                                    <CarIcon className="w-2 h-2 text-orange-600" />
                                </div>
                            </div>
                            <span className="text-[9px] font-bold bg-orange-600 text-white px-1 rounded mt-1 shadow-sm border border-white whitespace-nowrap">
                                {pos.employee?.first_name}
                            </span>
                        </div>
                    );
                })}

                <div className="absolute bottom-4 left-4 bg-white/90 p-2 rounded-lg border text-[10px] shadow-md z-20">
                    <p className="font-bold border-b mb-1">Leyenda</p>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 bg-primary rounded-full"></span> Establecimiento
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-orange-500 rounded-full"></span> Personal (Último Fichaje)
                    </div>
                </div>
            </div>
            <div className="p-3 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <p>📍 Los puntos representan la ubicación exacta reportada por el GPS al realizar el fichaje o actualización.</p>
                <button className="text-primary font-bold hover:underline">Pantalla Completa</button>
            </div>
        </Card>
    );
};

export default LiveStaffMap;
