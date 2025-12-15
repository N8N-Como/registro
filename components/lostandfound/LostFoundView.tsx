
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { getLostItems, getEmployees, getLocations, getRooms, addLostItem, updateLostItem } from '../../services/mockApi';
import { LostItem, Employee, Location, Room } from '../../types';
import { AuthContext } from '../../App';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import LostItemFormModal from './LostItemFormModal';
import { ArchiveBoxIcon } from '../icons';
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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (item: LostItem | null) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleSaveItem = async (data: Omit<LostItem, 'item_id' | 'found_date' | 'status'> | LostItem) => {
        if ('item_id' in data) {
            await updateLostItem(data);
        } else {
            await addLostItem({
                ...data,
                found_by_employee_id: auth?.employee?.employee_id || ''
            });
        }
        fetchData();
        setIsModalOpen(false);
    };

    const handleAIAction = async (response: AIResponse) => {
        if (response.action === 'addLostItem' && response.data && auth?.employee) {
            try {
                await addLostItem({
                    description: response.data.description,
                    found_at_location_id: response.data.location_id,
                    found_at_room_id: response.data.room_id || '',
                    found_by_employee_id: auth.employee.employee_id
                });
                fetchData();
            } catch (e) {
                console.error("AI Lost Item Error", e);
            }
        }
    };

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.employee_id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'Desconocido';
    };

    const getLocationName = (id: string) => locations.find(l => l.location_id === id)?.name || 'N/A';
    const getRoomName = (id?: string) => id ? (rooms.find(r => r.room_id === id)?.name || 'Zona Común') : 'Zona Común';

    const filteredItems = items.filter(item => {
        if (filter === 'all') return true;
        return item.status === filter;
    });

    // Determine AI Config based on Role
    const role = auth?.role?.role_id;
    let allowedAIInputs: InputMode[] | null = null;
    if (role === 'cleaner') {
        allowedAIInputs = ['voice'];
    }

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6 relative">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                        <ArchiveBoxIcon className="w-8 h-8 text-primary" />
                        <h2 className="text-xl font-bold text-gray-800">Objetos Olvidados</h2>
                    </div>
                    <Button onClick={() => handleOpenModal(null)}>Registrar Hallazgo</Button>
                </div>

                <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                    <button 
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === 'pending' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        En Custodia
                    </button>
                    <button 
                        onClick={() => setFilter('returned')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === 'returned' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Devueltos
                    </button>
                     <button 
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Todos
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                            <div key={item.item_id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white flex flex-col">
                                <div className="h-48 bg-gray-100 relative">
                                    {item.photo_url ? (
                                        <img src={item.photo_url} alt={item.description} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <span className="text-4xl">📷</span>
                                        </div>
                                    )}
                                    <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded shadow ${item.status === 'returned' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {item.status === 'returned' ? 'DEVUELTO' : 'EN CUSTODIA'}
                                    </div>
                                </div>
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-gray-800 mb-1">{item.description}</h3>
                                        <p className="text-sm text-gray-500 mb-2">
                                            {formatDate(new Date(item.found_date))}
                                        </p>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p>📍 {getLocationName(item.found_at_location_id)} - {getRoomName(item.found_at_room_id)}</p>
                                            <p>👤 Encontrado por: {getEmployeeName(item.found_by_employee_id)}</p>
                                        </div>
                                        {item.status === 'returned' && (
                                            <div className="mt-3 pt-3 border-t text-sm bg-green-50 p-2 rounded">
                                                <p className="font-semibold text-green-800">Entregado a: {item.returned_to}</p>
                                                <p className="text-xs text-green-600">{item.returned_date ? formatDate(new Date(item.returned_date)) : ''}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <Button variant="secondary" size="sm" className="w-full" onClick={() => handleOpenModal(item)}>
                                            {item.status === 'returned' ? 'Ver Detalles' : 'Gestionar / Devolver'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            No hay objetos en esta categoría.
                        </div>
                    )}
                </div>
            </Card>

            {isModalOpen && (
                <LostItemFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveItem}
                    item={selectedItem}
                    locations={locations}
                    rooms={rooms}
                />
            )}

            {allowedAIInputs && (
                <AIAssistant 
                    context={{ locations, rooms, currentUser: auth?.employee || undefined }} 
                    onAction={handleAIAction}
                    allowedInputs={allowedAIInputs}
                />
            )}
        </div>
    );
};

export default LostFoundView;
