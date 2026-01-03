
import React, { useState, useEffect } from 'react';
import { Incident, Location, Employee, InventoryItem } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { getInventoryItems } from '../../services/mockApi';
import { BoxIcon } from '../icons';

interface IncidentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incident: Omit<Incident, 'incident_id' | 'created_at' | 'reported_by'> | Incident, usage?: {item_id: string, amount: number}[]) => void;
  incident: Incident | null;
  locations: Location[];
  employees: Employee[];
  canManage: boolean;
}

const IncidentFormModal: React.FC<IncidentFormModalProps> = ({ isOpen, onClose, onSave, incident, locations, canManage }) => {
  const [formData, setFormData] = useState<Partial<Incident>>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
        getInventoryItems().then(inv => setInventory(inv.filter(i => i.category === 'maintenance')));
        if (incident) {
            setFormData(incident);
            setPreviewUrl(incident.photo_url || null);
        } else {
            setFormData({ status: 'open', priority: 'medium', location_id: locations[0]?.location_id });
            setPreviewUrl(null);
        }
        setUsageMap({});
    }
  }, [incident, isOpen, locations]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateUsage = (itemId: string, delta: number) => {
    setUsageMap(prev => ({
        ...prev,
        [itemId]: Math.max(0, (prev[itemId] || 0) + delta)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const usage = Object.entries(usageMap)
        .filter(([_, qty]) => (qty as number) > 0)
        .map(([itemId, qty]) => ({ item_id: itemId, amount: qty as number }));

    onSave(formData as Incident, usage);
    setIsSaving(false);
  };

  const isResolved = formData.status === 'resolved';
  const isReadOnly = !!(incident && !canManage);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={incident ? 'Detalle de Incidencia' : 'Reportar Incidencia'}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={3}
            required
            readOnly={isReadOnly}
          />
        </div>
        
        {previewUrl && (
             <div className="mt-2">
                 <img src={previewUrl} alt="Foto incidencia" className="w-full h-40 object-cover rounded-md border" />
             </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Prioridad</label>
            <select name="priority" value={formData.priority || 'medium'} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required disabled={isReadOnly}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select name="status" value={formData.status || 'open'} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required disabled={!canManage}>
              <option value="open">Abierta</option>
              <option value="in_progress">En Progreso</option>
              <option value="resolved">Resuelta ✅</option>
            </select>
          </div>
        </div>

        {canManage && isResolved && (
            <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 mt-4 animate-in fade-in duration-300">
                <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                    <BoxIcon className="w-4 h-4 mr-2" /> Repuestos Utilizados
                </h4>
                <div className="space-y-2">
                    {inventory.length > 0 ? inventory.map(item => (
                        <div key={item.item_id} className="flex items-center justify-between bg-white p-2 rounded border shadow-sm">
                            <div className="text-xs">
                                <p className="font-bold">{item.name}</p>
                                <p className="text-gray-400">Stock: {item.quantity}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button type="button" onClick={() => updateUsage(item.item_id, -1)} className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">-</button>
                                <span className="font-bold text-sm min-w-[15px] text-center">{usageMap[item.item_id] || 0}</span>
                                <button type="button" onClick={() => updateUsage(item.item_id, 1)} className="w-6 h-6 bg-primary text-white rounded flex items-center justify-center">+</button>
                            </div>
                        </div>
                    )) : <p className="text-xs text-gray-500 italic">No hay productos de mantenimiento configurados.</p>}
                </div>
            </div>
        )}

        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cerrar</Button>
            {!isReadOnly && <Button type="submit" isLoading={isSaving}>Guardar Cambios</Button>}
        </div>
      </form>
    </Modal>
  );
};

export default IncidentFormModal;
