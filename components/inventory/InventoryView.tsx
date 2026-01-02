
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { getInventoryItems, updateInventoryItem, logStockMovement, getLocations, getStockLogs } from '../../services/mockApi';
import { InventoryItem, Location, StockPrediction } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { ShoppingCartIcon, SparklesIcon } from '../icons';
import StockMovementModal from './StockMovementModal';
import StockHistoryModal from './StockHistoryModal';
import AIAssistant from '../shared/AIAssistant';
import { analyzeStockTrends } from '../../services/geminiService';

const InventoryView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [predictions, setPredictions] = useState<StockPrediction[]>([]);
    
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLocation, setFilterLocation] = useState('all');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [inv, locs] = await Promise.all([getInventoryItems(), getLocations()]);
            setItems(inv);
            setLocations(locs);
        } catch (e) { console.error(e); } 
        finally { setIsLoading(false); }
    };

    const handleRunAIAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const logs = await getStockLogs();
            const results = await analyzeStockTrends(items, logs);
            setPredictions(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleStockMovement = async (amount: number, reason: string) => {
        if (!selectedItem || !auth?.employee) return;
        try {
            const newQuantity = Math.max(0, selectedItem.quantity + amount);
            await updateInventoryItem({ ...selectedItem, quantity: newQuantity });
            await logStockMovement(selectedItem.item_id, amount, reason, auth.employee.employee_id);
            setSelectedItem(null);
            loadData();
        } catch(e) { alert("Error actualizando stock"); }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLocation = filterLocation === 'all' || 
            (filterLocation === 'central' ? !item.location_id : item.location_id === filterLocation);
        return matchesSearch && matchesLocation;
    });

    const getRiskColor = (level: string) => {
        if (level === 'high') return 'text-red-600 bg-red-50 border-red-200';
        if (level === 'medium') return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-green-600 bg-green-50 border-green-200';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <ShoppingCartIcon /> Inventario y Stock
                </h2>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleRunAIAnalysis} isLoading={isAnalyzing} disabled={items.length === 0}>
                        <SparklesIcon className="w-4 h-4 mr-2" /> Analizar con IA
                    </Button>
                    <Button onClick={() => alert("Función de creación manual en desarrollo")}>+ Producto</Button>
                </div>
            </div>

            {predictions.length > 0 && (
                <Card title="Previsión de Suministros (IA)" className="border-2 border-primary-light bg-blue-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {predictions.map((p, i) => (
                            <div key={i} className={`p-3 rounded-lg border shadow-sm flex flex-col ${getRiskColor(p.risk_level)}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-bold text-sm uppercase">{p.item_name}</p>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-current">
                                        {p.days_left} días restantes
                                    </span>
                                </div>
                                <p className="text-xs italic opacity-90">{p.recommendation}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <input type="text" placeholder="Buscar..." className="flex-1 border p-2 rounded-md" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <select className="md:w-64 border p-2 rounded-md" value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
                        <option value="all">Todo</option>
                        {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
                    </select>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map(item => {
                    const isLow = item.quantity <= item.min_threshold;
                    return (
                        <div key={item.item_id} className={`bg-white rounded-xl shadow-md border-2 p-5 flex flex-col justify-between ${isLow ? 'border-red-400 bg-red-50' : 'border-gray-100'}`}>
                            <div>
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-gray-800 text-lg leading-tight">{item.name}</h3>
                                    {isLow && <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse">AGOTÁNDOSE</span>}
                                </div>
                                <p className="text-3xl font-black mt-4 text-gray-900">{item.quantity} <span className="text-xs font-medium text-gray-500">{item.unit}</span></p>
                                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Mínimo: {item.min_threshold}</p>
                            </div>
                            <div className="flex gap-2 mt-6">
                                <button onClick={() => setHistoryItem(item)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors uppercase">Historial</button>
                                <Button size="sm" variant="secondary" className="flex-1 rounded-lg" onClick={() => setSelectedItem(item)}>Movimiento</Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedItem && (
                <StockMovementModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} onSave={handleStockMovement} item={selectedItem} />
            )}
            {historyItem && (
                <StockHistoryModal isOpen={!!historyItem} onClose={() => setHistoryItem(null)} item={historyItem} />
            )}
            <AIAssistant 
                context={{ employees: [], locations, inventory: items, currentUser: auth?.employee || undefined }} 
                onAction={() => loadData()}
                allowedInputs={['voice', 'text']}
            />
        </div>
    );
};

export default InventoryView;
