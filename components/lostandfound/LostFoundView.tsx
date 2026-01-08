
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getLostItems, getEmployees, getLocations, getRooms, addLostItem, updateLostItem, deleteLostItem } from '../../services/mockApi';
import { LostItem, Employee, Location, Room } from '../../types';
import { AuthContext } from '../../App';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import LostItemFormModal from './LostItemFormModal';
import { ArchiveBoxIcon, TrashIcon } from '../icons';
import { formatDate } from '../../utils/helpers';
import AIAssistant, { InputMode } from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';

const LostFoundView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [items, setItems] = useState<LostItem[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'returned'>('pending');

    const isAdmin = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'administracion';

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [lostItems, emps, locs, allRooms] = await Promise.all([
                getLostItems(), 
                getEmployees(), 
                getLocations(), 
                getRooms()
            ]);
            setItems(lostItems);
            setEmployees(emps);
            setLocations(locs);
            setRooms(allRooms);
        } catch (error) {
            console.error("Failed to fetch lost items", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (item: LostItem | null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Eliminar registro?")) return;
        try {
            await deleteLostItem(id);
            fetchData();
        } catch (e) { alert("Error al borrar"); }
    };

    const handleSaveItem = async (data: Omit<LostItem, 'item_id' | 'found_date' | 'status'> | LostItem) => {
        if ('item_id' in data) {
            await updateLostItem(data);
        } else {
            await addLostItem({
                ...data,
                status: 'pending',
                found_date: new Date().toISOString(),
                found_by_employee_id: auth?.employee?.employee_id || ''
            });
        }
        fetchData();
        setIsModalOpen(false);
    };

    const handleAIAction = async (response: AIResponse) => {
        if (response.action === 'logLostItem' && response.data && auth?.employee) {
            try {
                await addLostItem({
                    description: response.data.description,
                    found_at_location_id: response.data.location_id,
                    found_at_room_id: response.data.room_id || '',
                    found_by_employee_id: auth.employee.employee_id,
                    found_date: new Date().toISOString(),
                    status: 'pending'
                });
                fetchData();
            } catch (e) { console.error(e); }
        }
    };

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.employee_id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'Desconocido';
    };

    const getLocationName = (id: string) => locations.find(l => l.location_id === id)?.name || 'N/A';
    const getRoomName = (id?: string) => id ? (rooms.find(r => r.room_id === id)?.name || 'Zona Común') : 'Zona Común';

    const filteredItems = items.filter(item => filter === 'all' ? true : item.status === filter);

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                        <ArchiveBoxIcon className="w-8 h-8 text-primary" />
                        <h2 className="text-xl font-bold text-gray-800">Objetos Olvidados</h2>
                    </div>
                    <Button onClick={() => handleOpenModal(null)}>Registrar Hallazgo</Button>
                </div>

                <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                    <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-colors ${filter === 'pending' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>En Custodia</button>
                    <button onClick={() => setFilter('returned')} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-colors ${filter === 'returned' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Devueltos</button>
                    <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-colors ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>Todos</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(item => (
                        <div key={item.item_id} className="border-2 border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all bg-white flex flex-col group">
                            <div className="h-48 bg-gray-100 relative">
                                {item.photo_url ? <img src={item.photo_url} alt={item.description} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
                                <div className={`absolute top-3 right-3 px-2 py-1 text-[9px] font-black rounded shadow-sm ${item.status === 'returned' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{item.status.toUpperCase()}</div>
                                {isAdmin && <button onClick={(e) => { e.stopPropagation(); handleDelete(item.item_id); }} className="absolute bottom-3 right-3 p-2 bg-white/90 text-red-600 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4"/></button>}
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-gray-800 truncate">{item.description}</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{formatDate(new Date(item.found_date))}</p>
                                <div className="mt-3 text-xs text-gray-500 space-y-1">
                                    <p>📍 {getLocationName(item.found_at_location_id)}</p>
                                    <p>👤 Por: {getEmployeeName(item.found_by_employee_id)}</p>
                                </div>
                                <Button variant="secondary" size="sm" className="mt-4 w-full rounded-lg" onClick={() => handleOpenModal(item)}>{item.status === 'returned' ? 'Ver Detalles' : 'Gestionar'}</Button>
                            </div>
                        </div>
                    ))}
                    {filteredItems.length === 0 && <div className="col-span-full py-12 text-center text-gray-400 italic">No hay objetos registrados.</div>}
                </div>
            </Card>
            {isModalOpen && <LostItemFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveItem} item={selectedItem} locations={locations} rooms={rooms} />}
            <AIAssistant context={{ employees: [], locations, rooms, currentUser: auth?.employee || undefined }} onAction={handleAIAction} allowedInputs={['text', 'voice']} />
        </div>
    );
};

export default LostFoundView;
