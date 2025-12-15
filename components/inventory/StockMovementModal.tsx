
import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { InventoryItem } from '../../types';

interface StockMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (amount: number, reason: string) => void;
    item: InventoryItem;
}

const StockMovementModal: React.FC<StockMovementModalProps> = ({ isOpen, onClose, onSave, item }) => {
    const [type, setType] = useState<'add' | 'remove'>('remove');
    const [amount, setAmount] = useState(1);
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalAmount = type === 'add' ? amount : -amount;
        // Default reasons
        const finalReason = reason || (type === 'add' ? 'Compra / Reposición' : 'Consumo Diario');
        onSave(finalAmount, finalReason);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Movimiento de Stock: ${item.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setType('remove')}
                        className={`flex-1 py-2 rounded-md font-medium text-sm transition-all ${type === 'remove' ? 'bg-white text-red-600 shadow' : 'text-gray-500'}`}
                    >
                        ➖ Salida (Consumo)
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('add')}
                        className={`flex-1 py-2 rounded-md font-medium text-sm transition-all ${type === 'add' ? 'bg-white text-green-600 shadow' : 'text-gray-500'}`}
                    >
                        ➕ Entrada (Compra)
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Cantidad ({item.unit})</label>
                    <input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value)))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-lg font-bold"
                        min="1"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Stock actual: {item.quantity}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Motivo (Opcional)</label>
                    <input 
                        type="text" 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder={type === 'add' ? "Ej: Compra Makro" : "Ej: Limpieza Planta 1"}
                    />
                </div>

                <div className="pt-4 flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant={type === 'add' ? 'success' : 'danger'}>
                        Confirmar
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default StockMovementModal;
