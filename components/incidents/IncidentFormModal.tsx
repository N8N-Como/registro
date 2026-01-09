
import React, { useState, useEffect, useRef } from 'react';
import { Incident, Location, Employee, Room, InventoryItem } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { getInventoryItems } from '../../services/mockApi';
import { BoxIcon, BuildingIcon, DoorOpenIcon, XMarkIcon } from '../icons';
import { blobToBase64 } from '../../utils/helpers';

interface IncidentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incident: Omit<Incident, 'incident_id' | 'created_at' | 'reported_by'> | Incident, usage?: {item_id: string, amount: number}[]) => void;
  incident: Incident | null;
  locations: Location[];
  employees: Employee[];
  rooms: Room[];
  canManage: boolean;
}

const IncidentFormModal: React.FC<IncidentFormModalProps> = ({ isOpen, onClose, onSave, incident, locations, rooms, canManage }) => {
  const [formData, setFormData] = useState<Partial<Incident>>({});
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
        getInventoryItems().then(inv => setInventory(inv.filter(i => i.category === 'maintenance')));
        if (incident) {
            setFormData(incident);
            setPreviewUrl(incident.photo_url || null);
        } else {
            setFormData({ status: 'open', priority: 'medium', location_id: locations[0]?.location_id || '', type: 'corrective' });
            setPreviewUrl(null);
        }
        setUsageMap({});
    }
    return () => stopCamera();
  }, [incident, isOpen, locations]);

  const stopCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("Cámara no disponible."); setIsCameraOpen(false); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setPreviewUrl(dataUrl);
            setFormData(prev => ({ ...prev, photo_url: dataUrl }));
            stopCamera();
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_id) { alert("Debes seleccionar un establecimiento."); return; }
    
    setIsSaving(true);
    try {
        const usage = Object.entries(usageMap)
            .filter(([_, qty]) => (qty as number) > 0)
            .map(([itemId, qty]) => ({ item_id: itemId, amount: qty as number }));

        await onSave(formData as Incident, usage);
        onClose();
    } catch (error: any) {
        console.error(error);
        const msg = error?.message || "Error al procesar la incidencia";
        alert(msg);
    } finally {
        setIsSaving(false);
    }
  };

  const isResolved = formData.status === 'resolved';
  const isReadOnly = incident && !canManage;
  const filteredRooms = rooms.filter(r => r.location_id === formData.location_id);

  return (
    <Modal isOpen={isOpen} onClose={() => { stopCamera(); onClose(); }} title={incident ? 'Detalle de Incidencia' : 'Reportar Incidencia'}>
      {isCameraOpen ? (
          <div className="space-y-4">
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"/>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                  <Button variant="secondary" onClick={stopCamera} className="flex-1">Cancelar</Button>
                  <Button onClick={capturePhoto} className="flex-1">Capturar Foto</Button>
              </div>
          </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex justify-center mb-2">
             {previewUrl ? (
                 <div className="relative w-full">
                     <img src={previewUrl} alt="Foto" className="w-full h-48 object-cover rounded-xl border-2 border-primary/20 shadow-lg" />
                     {!isReadOnly && (
                        <button type="button" onClick={() => { setPreviewUrl(null); setFormData(p => ({...p, photo_url: undefined})); }} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-xl transition-all hover:scale-110"><XMarkIcon className="w-4 h-4"/></button>
                     )}
                 </div>
             ) : (
                 !isReadOnly && <Button type="button" onClick={startCamera} className="w-full h-24 border-2 border-dashed border-primary/30 bg-primary/5 text-primary rounded-xl font-black uppercase text-xs">📸 Tomar Foto de la Avería</Button>
             )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border">
            <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Establecimiento</label>
                <select name="location_id" value={formData.location_id || ''} onChange={(e) => setFormData(p => ({...p, location_id: e.target.value, room_id: ''}))} className="block w-full rounded-md border-gray-300 shadow-sm text-sm" required disabled={isReadOnly}>
                    <option value="">Seleccionar...</option>
                    {locations.map(loc => <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Zona / Habitación</label>
                <select name="room_id" value={formData.room_id || ''} onChange={(e) => setFormData(p => ({...p, room_id: e.target.value}))} className="block w-full rounded-md border-gray-300 shadow-sm text-sm" disabled={isReadOnly || !formData.location_id}>
                    <option value="">Zona General</option>
                    {filteredRooms.map(room => <option key={room.room_id} value={room.room_id}>{room.name}</option>)}
                </select>
            </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea name="description" value={formData.description || ''} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" rows={3} required readOnly={isReadOnly} placeholder="Ej: Fuga de agua en el baño, bombilla fundida..." />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700">Prioridad</label><select name="priority" value={formData.priority || 'medium'} onChange={(e) => setFormData(p => ({...p, priority: e.target.value as any}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required disabled={isReadOnly}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option></select></div>
          <div><label className="block text-sm font-medium text-gray-700">Estado</label><select name="status" value={formData.status || 'open'} onChange={(e) => setFormData(p => ({...p, status: e.target.value as any}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm font-bold" required disabled={!canManage}><option value="open">Abierta</option><option value="in_progress">En Curso</option><option value="resolved">Resuelta ✓</option></select></div>
        </div>

        {canManage && isResolved && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                <h4 className="text-xs font-black text-blue-800 mb-3 uppercase flex items-center"><BoxIcon className="w-4 h-4 mr-2" /> Repuestos Utilizados</h4>
                <div className="space-y-2">
                    {inventory.map(item => (
                        <div key={item.item_id} className="flex items-center justify-between bg-white p-2 rounded-lg border text-xs">
                            <div><p className="font-bold">{item.name}</p><p className="text-[10px] text-gray-400">Stock: {item.quantity}</p></div>
                            <div className="flex items-center space-x-2">
                                <button type="button" onClick={() => setUsageMap(p => ({...p, [item.item_id]: Math.max(0, (p[item.item_id]||0)-1)}))} className="w-6 h-6 bg-gray-100 rounded">-</button>
                                <span className="font-bold min-w-[20px] text-center">{usageMap[item.item_id] || 0}</span>
                                <button type="button" onClick={() => setUsageMap(p => ({...p, [item.item_id]: (p[item.item_id]||0)+1}))} className="w-6 h-6 bg-primary text-white rounded">+</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="pt-4 flex justify-end space-x-2 border-t mt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cerrar</Button>
            {!isReadOnly && <Button type="submit" isLoading={isSaving} className="px-10">Guardar Cambios</Button>}
        </div>
      </form>
      )}
    </Modal>
  );
};

export default IncidentFormModal;
