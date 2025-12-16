
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { getInventoryItems, addInventoryItem, updateInventoryItem, logStockMovement, getLocations } from '../../services/mockApi';
import { InventoryItem, Location } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { BoxIcon, ShoppingCartIcon, BuildingIcon } from '../icons';
import StockMovementModal from './StockMovementModal';
import StockHistoryModal from './StockHistoryModal';
import AIAssistant, { InputMode } from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';

const InventoryView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLocation, setFilterLocation] = useState('all');

    // New Item Form
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('cleaning');
    const [newItemUnit, setNewItemUnit] = useState('units');
    const [newItemMin, setNewItemMin] = useState(5);
    const [newItemLocation, setNewItemLocation] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [inv, locs] = await Promise.all([getInventoryItems(), getLocations()]);
            setItems(inv);
            setLocations(locs);
        } catch (e) { console.error(e); } 
        finally { setIsLoading(false); }
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addInventoryItem({
                name: newItemName,
                category: newItemCategory,
                unit: newItemUnit,
                min_threshold: newItemMin,
                quantity: 0,
                location_id: newItemLocation || null
            });
            setIsCreateModalOpen(false);
            setNewItemName('');
            setNewItemLocation('');
            loadData();
        } catch(e) { alert("Error al crear item"); }
    };

    const handleStockMovement = async (amount: number, reason: string) => {
        if (!selectedItem || !auth?.employee) return;
        try {
            const newQuantity = selectedItem.quantity + amount;
            if (newQuantity < 0) {
                alert("No hay suficiente stock.");
                return;
            }
            
            await updateInventoryItem({ ...selectedItem, quantity: newQuantity });
            await logStockMovement(selectedItem.item_id, amount, reason, auth.employee.employee_id);
            
            setSelectedItem(null);
            loadData();
        } catch(e) { alert("Error actualizando stock"); }
    };

    const handleAIAction = async (response: AIResponse) => {
        if (response.action === 'updateInventory' && response.data && auth?.employee && response.data.item_id) {
            try {
                const item = items.find(i => i.item_id === response.data.item_id);
                if (item) {
                    const amount = response.data.quantity_change;
                    const newQty = item.quantity + amount;
                    if (newQty < 0) return; // Prevent negative
                    await updateInventoryItem({ ...item, quantity: newQty });
                    await logStockMovement(item.item_id, amount, response.data.reason || 'AI Update', auth.employee.employee_id);
                    loadData();
                }
            } catch (e) { console.error(e); }
        }
    };

    const categories = {
        cleaning: 'Limpieza',
        amenities: 'Amenities',
        linen: 'Lencería',
        maintenance: 'Mantenimiento',
        office: 'Oficina'
    };

    const getLocationName = (id?: string) => {
        if (!id) return "Almacén Central / General";
        return locations.find(l => l.location_id === id)?.name || "Ubicación Desconocida";
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLocation = filterLocation === 'all' || 
            (filterLocation === 'central' ? !item.location_id : item.location_id === filterLocation);
        return matchesSearch && matchesLocation;
    });

    // AI Config
    let allowedInputs: InputMode[] = ['voice']; // Default strict for cleaner/maintenance
    const role = auth?.role?.role_id || '';
    if (['admin', 'receptionist', 'gobernanta', 'revenue'].includes(role)) {
        allowedInputs = ['text', 'voice', 'image'];
    }

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShoppingCartIcon className="text-primary" />
                    Inventario y Stock
                </h2>
                <Button onClick={() => setIsCreateModalOpen(true)}>+ Nuevo Producto</Button>
            </div>

            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Producto</label>
                        <input 
                            type="text" 
                            placeholder="Ej: Bombilla, Gel..." 
                            className="w-full border p-2 rounded-md"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="md:w-64">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Ubicación</label>
                        <select 
                            className="w-full border p-2 rounded-md"
                            value={filterLocation}
                            onChange={e => setFilterLocation(e.target.value)}
                        >
                            <option value="all">Todas las ubicaciones</option>
                            <option value="central">Almacén Central / General</option>
                            {locations.map(l => (
                                <option key={l.location_id} value={l.location_id}>{l.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => {
                    const isLowStock = item.quantity <= item.min_threshold;
                    return (
                        <div key={item.item_id} className={`bg-white rounded-lg shadow border p-4 relative flex flex-col justify-between ${isLowStock ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{item.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="text-xs uppercase text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded border">
                                                {categories[item.category as keyof typeof categories]}
                                            </span>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center border ${item.location_id ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                                                <BuildingIcon className="w-3 h-3 mr-1"/>
                                                {getLocationName(item.location_id)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center my-3">
                                    <div>
                                        {isLowStock && <p className="text-xs text-red-600 font-bold">⚠ Stock Bajo (Mín: {item.min_threshold})</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-2xl font-bold ${isLowStock ? 'text-red-600' : 'text-gray-800'}`}>
                                            {item.quantity}
                                        </p>
                                        <p className="text-xs text-gray-500">{item.unit}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 pt-3 border-t flex gap-2">
                                <button 
                                    onClick={() => setHistoryItem(item)}
                                    className="px-3 py-2 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
                                >
                                    Historial
                                </button>
                                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setSelectedItem(item)}>
                                    Ajustar Stock
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Nuevo Producto</h3>
                        <form onSubmit={handleCreateItem} className="space-y-4">
                            <input type="text" placeholder="Nombre" className="w-full border p-2 rounded" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
                            <select className="w-full border p-2 rounded" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}>
                                {Object.entries(categories).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Ubicación</label>
                                <select className="w-full border p-2 rounded" value={newItemLocation} onChange={e => setNewItemLocation(e.target.value)}>
                                    <option value="">Almacén Central / General</option>
                                    {locations.map(l => (
                                        <option key={l.location_id} value={l.location_id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="Unidad" className="w-full border p-2 rounded" value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} required />
                                <input type="number" placeholder="Alerta Mínimo" className="w-full border p-2 rounded" value={newItemMin} onChange={e => setNewItemMin(parseInt(e.target.value))} required />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Crear</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedItem && (
                <StockMovementModal 
                    isOpen={!!selectedItem} 
                    onClose={() => setSelectedItem(null)} 
                    onSave={handleStockMovement}
                    item={selectedItem}
                />
            )}

            {historyItem && (
                <StockHistoryModal 
                    isOpen={!!historyItem}
                    onClose={() => setHistoryItem(null)}
                    item={historyItem}
                />
            )}

            <AIAssistant 
                context={{ employees: [], locations, inventory: items, currentUser: auth?.employee || undefined }} 
                onAction={handleAIAction}
                allowedInputs={allowedInputs}
            />
        </div>
    );
};

export default InventoryView;
