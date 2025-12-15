
import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { InventoryItem, StockLog, Employee } from '../../types';
import { getStockLogs, getEmployees } from '../../services/mockApi';

interface StockHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: InventoryItem;
}

const StockHistoryModal: React.FC<StockHistoryModalProps> = ({ isOpen, onClose, item }) => {
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            try {
                const [l, e] = await Promise.all([
                    getStockLogs(item.item_id),
                    getEmployees()
                ]);
                setLogs(l);
                setEmployees(e);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        if (isOpen) loadHistory();
    }, [isOpen, item]);

    const getEmployeeName = (id: string) => {
        const emp = employees.find(e => e.employee_id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : 'Desconocido';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Historial: ${item.name}`}>
            <div className="space-y-4">
                {isLoading ? <Spinner /> : (
                    <div className="overflow-y-auto max-h-[60vh]">
                        {logs.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No hay movimientos registrados.</p>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-2">Fecha</th>
                                        <th className="p-2">Cambio</th>
                                        <th className="p-2">Motivo</th>
                                        <th className="p-2">Usuario</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.log_id} className="border-b">
                                            <td className="p-2 text-xs text-gray-500">
                                                {new Date(log.created_at).toLocaleDateString()} <br/>
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </td>
                                            <td className={`p-2 font-bold ${log.change_amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                                            </td>
                                            <td className="p-2">{log.reason}</td>
                                            <td className="p-2 text-xs text-gray-500">{getEmployeeName(log.employee_id)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
                <div className="flex justify-end pt-2">
                    <Button onClick={onClose} variant="secondary">Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default StockHistoryModal;
