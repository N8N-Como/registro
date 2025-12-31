
import React, { useState, useEffect } from 'react';
import { Room, RoomStatus, Location } from '../../types';
import { getRooms, updateRoomStatus, getLocations } from '../../services/mockApi';
import Card from './Card';
import Spinner from './Spinner';

const RoomFloorPlan: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string>('');

    const fetchData = async () => {
        try {
            const [rms, locs] = await Promise.all([getRooms(), getLocations()]);
            setRooms(rms);
            setLocations(locs);
            if (!selectedLocation && locs.length > 0) setSelectedLocation(locs[0].location_id);
        } catch (e) { 
            console.error("Error al cargar plano:", e); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => { 
        fetchData();
        // Polling para sincronización entre usuarios cada 15 segundos
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [selectedLocation]);

    const handleToggleStatus = async (room: Room) => {
        if (isUpdating) return;
        
        // Definición exacta del ciclo solicitado:
        // Limpia (clean) -> Ocupada (occupied) -> Sucia (dirty) -> En progreso (in_progress) -> Limpia
        const cycle: RoomStatus[] = ['clean', 'occupied', 'dirty', 'in_progress'];
        
        // Normalización para evitar bloqueos con estados extra
        let currentStatus = room.status;
        if (currentStatus === 'pending' || currentStatus === 'priority_out') currentStatus = 'dirty';
        if (currentStatus === 'out_of_order') currentStatus = 'dirty';

        const currentIdx = cycle.indexOf(currentStatus as RoomStatus);
        const nextStatus = cycle[(currentIdx + 1) % cycle.length];
        
        setIsUpdating(room.room_id);
        try {
            // Actualización optimista en la UI
            setRooms(prev => prev.map(r => r.room_id === room.room_id ? { ...r, status: nextStatus } : r));
            
            // Persistencia en DB
            await updateRoomStatus(room.room_id, nextStatus);
            
            // Recarga final para confirmar datos de DB
            await fetchData();
        } catch (e) { 
            alert("Error al actualizar el estado de la habitación"); 
            fetchData(); // Revertir a estado real
        } finally {
            setIsUpdating(null);
        }
    };

    const getStatusColor = (status: RoomStatus, isPriority?: boolean) => {
        if (isPriority && status !== 'clean') return 'bg-purple-600 text-white animate-pulse';
        switch (status) {
            case 'clean': return 'bg-green-500 text-white';
            case 'dirty': return 'bg-red-500 text-white';
            case 'in_progress': return 'bg-yellow-400 text-gray-900';
            case 'occupied': return 'bg-blue-600 text-white';
            case 'priority_out': return 'bg-purple-500 text-white';
            case 'out_of_order': return 'bg-gray-800 text-white';
            default: return 'bg-gray-200 text-gray-600';
        }
    };

    const floors = Array.from(new Set(rooms.filter(r => r.location_id === selectedLocation).map(r => r.floor || '1'))).sort();

    if (isLoading) return <Card><Spinner /></Card>;

    return (
        <Card title="Plano de Estado de Habitaciones" className="overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4 border-b pb-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Establecimiento</label>
                    <select 
                        value={selectedLocation} 
                        onChange={e => setSelectedLocation(e.target.value)}
                        className="border p-2 rounded-md text-sm font-bold bg-white focus:ring-2 focus:ring-primary outline-none"
                    >
                        {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-500 rounded-sm"></span> Limpia</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-600 rounded-sm"></span> Ocupada</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-sm"></span> Sucia</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-400 rounded-sm shadow-sm"></span> En Proceso</div>
                </div>
            </div>

            <div className="space-y-8 mt-4">
                {floors.length > 0 ? floors.map(floor => (
                    <div key={floor} className="animate-in fade-in slide-in-from-left-2 duration-500">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                            <span className="bg-gray-200 h-px flex-1 mr-3"></span>
                            Planta {floor}
                            <span className="bg-gray-200 h-px flex-1 ml-3"></span>
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                            {rooms.filter(r => r.location_id === selectedLocation && (r.floor || '1') === floor).map(room => (
                                <button
                                    key={room.room_id}
                                    onClick={() => handleToggleStatus(room)}
                                    disabled={isUpdating !== null}
                                    className={`
                                        h-16 rounded-xl shadow-sm flex flex-col items-center justify-center transition-all 
                                        active:scale-90 border-2 border-transparent hover:brightness-110
                                        ${getStatusColor(room.status, room.is_priority)}
                                        ${isUpdating === room.room_id ? 'opacity-50 animate-pulse' : ''}
                                    `}
                                >
                                    <span className="text-sm font-black drop-shadow-sm">{room.name.split(' ').pop()}</span>
                                    <span className="text-[7px] uppercase font-bold opacity-90 mt-0.5 tracking-tighter">
                                        {room.is_priority && room.status !== 'clean' ? '🔥 Prioridad' : room.status.replace('_', ' ')}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 text-gray-400 italic">
                        No hay habitaciones registradas en este establecimiento.
                    </div>
                )}
            </div>
            
            <div className="mt-6 pt-4 border-t text-[10px] text-gray-400 flex justify-between items-center">
                <p>💡 Haz clic en una habitación para cambiar su estado.</p>
                <p>Sincronizado con Camareras de Piso</p>
            </div>
        </Card>
    );
};

export default RoomFloorPlan;
