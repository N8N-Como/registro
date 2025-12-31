
import React, { useState, useEffect } from 'react';
import { Room, RoomStatus, Location } from '../../types';
import { getRooms, updateRoomStatus, getLocations } from '../../services/mockApi';
import Card from './Card';
import Spinner from './Spinner';

const RoomFloorPlan: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLocation, setSelectedLocation] = useState<string>('');

    const fetchData = async () => {
        try {
            const [rms, locs] = await Promise.all([getRooms(), getLocations()]);
            setRooms(rms);
            setLocations(locs);
            if (!selectedLocation && locs.length > 0) setSelectedLocation(locs[0].location_id);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleToggleStatus = async (room: Room) => {
        // Ciclo de estados rápido: dirty -> in_progress -> clean -> occupied -> dirty
        const states: RoomStatus[] = ['dirty', 'in_progress', 'clean', 'occupied'];
        const currentIdx = states.indexOf(room.status === 'priority_out' ? 'dirty' : room.status as any);
        const nextStatus = states[(currentIdx + 1) % states.length];
        
        try {
            await updateRoomStatus(room.room_id, nextStatus);
            fetchData();
        } catch (e) { alert("Error al actualizar"); }
    };

    const getStatusColor = (status: RoomStatus, isPriority?: boolean) => {
        if (isPriority) return 'bg-purple-600 text-white animate-pulse';
        switch (status) {
            case 'clean': return 'bg-green-500 text-white';
            case 'dirty': return 'bg-red-500 text-white';
            case 'in_progress': return 'bg-yellow-400 text-gray-900';
            case 'priority_out': return 'bg-purple-500 text-white';
            case 'occupied': return 'bg-blue-600 text-white';
            case 'out_of_order': return 'bg-gray-800 text-white';
            default: return 'bg-gray-200 text-gray-600';
        }
    };

    const floors = Array.from(new Set(rooms.filter(r => r.location_id === selectedLocation).map(r => r.floor || '1'))).sort();

    if (isLoading) return <Card><Spinner /></Card>;

    return (
        <Card title="Plano de Estado de Habitaciones" className="overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
                <select 
                    value={selectedLocation} 
                    onChange={e => setSelectedLocation(e.target.value)}
                    className="border p-2 rounded-md text-sm font-bold bg-white"
                >
                    {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
                </select>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Limpia</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Sucia</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full"></span> En Proceso</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-600 rounded-full"></span> Ocupada</span>
                </div>
            </div>

            <div className="space-y-6">
                {floors.map(floor => (
                    <div key={floor}>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b pb-1">Planta {floor}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {rooms.filter(r => r.location_id === selectedLocation && (r.floor || '1') === floor).map(room => (
                                <button
                                    key={room.room_id}
                                    onClick={() => handleToggleStatus(room)}
                                    className={`
                                        h-16 rounded-lg shadow-sm flex flex-col items-center justify-center transition-all active:scale-95
                                        ${getStatusColor(room.status, room.is_priority)}
                                    `}
                                >
                                    <span className="text-sm font-bold">{room.name.split(' ').pop()}</span>
                                    <span className="text-[8px] uppercase opacity-80 mt-1">
                                        {room.is_priority ? '🔥 Prioridad' : room.status.replace('_', ' ')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default RoomFloorPlan;
