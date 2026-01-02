
import React, { useState, useEffect, useRef, useContext } from 'react';
import { LostItem, Location, Room } from '../../types';
import { AuthContext } from '../../App';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { blobToBase64 } from '../../utils/helpers';

interface LostItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<LostItem, 'item_id' | 'found_date' | 'status'> | LostItem) => void;
  item: LostItem | null;
  locations: Location[];
  rooms: Room[];
}

const LostItemFormModal: React.FC<LostItemFormModalProps> = ({ isOpen, onClose, onSave, item, locations, rooms }) => {
  const auth = useContext(AuthContext);
  const [formData, setFormData] = useState<Partial<LostItem>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (item) {
      setFormData(item);
      setPreviewUrl(item.photo_url || null);
      setSelectedFile(null);
    } else {
      setFormData({
        found_at_location_id: locations[0]?.location_id,
        found_at_room_id: '',
        found_by_employee_id: auth?.employee?.employee_id
      });
      setPreviewUrl(null);
      setSelectedFile(null);
    }
    
    return () => {
        stopCamera();
    };
  }, [item, isOpen, locations, auth?.employee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("No se pudo acceder a la cámara.");
        setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    setIsCameraOpen(false);
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
            setSelectedFile(null);
            stopCamera();
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        let photoBase64 = formData.photo_url;
        if (selectedFile) {
            photoBase64 = await blobToBase64(selectedFile);
        }

        // Logic for returning an item
        if (item && formData.status === 'returned' && item.status !== 'returned') {
             const returnData = {
                 ...formData,
                 photo_url: photoBase64,
                 returned_date: new Date().toISOString(),
                 returned_by_employee_id: auth?.employee?.employee_id
             } as LostItem;
             onSave(returnData);
        } else {
            onSave({
                ...formData,
                photo_url: photoBase64
            } as LostItem);
        }
    } catch (error) {
        console.error("Error processing form", error);
        alert("Error al guardar.");
    } finally {
        setIsSaving(false);
    }
  };

  const title = item ? 'Gestionar Objeto' : 'Registrar Objeto Olvidado';
  const filteredRooms = rooms.filter(r => r.location_id === formData.found_at_location_id);
  const isAlreadyReturned = item?.status === 'returned';

  return (
    <Modal isOpen={isOpen} onClose={() => { stopCamera(); onClose(); }} title={title}>
      {isCameraOpen ? (
          <div className="flex flex-col items-center space-y-4">
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"/>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex space-x-4 w-full">
                  <Button variant="secondary" onClick={stopCamera} className="flex-1">Cancelar</Button>
                  <Button variant="primary" onClick={capturePhoto} className="flex-1">Capturar</Button>
              </div>
          </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Section */}
        <div className="flex justify-center mb-4">
             {previewUrl ? (
                 <div className="relative">
                     <img src={previewUrl} alt="Objeto" className="w-full h-48 object-cover rounded-md border" />
                     {!isAlreadyReturned && (
                        <button type="button" onClick={() => { setPreviewUrl(null); setFormData(prev => ({...prev, photo_url: undefined})); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md" title="Eliminar foto">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                     )}
                 </div>
             ) : (
                 !isAlreadyReturned && (
                    <div className="flex space-x-2 w-full">
                        <Button type="button" onClick={startCamera} className="flex-1">📸 Cámara</Button>
                        <label className="flex-1 cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg border text-center flex items-center justify-center">
                            📁 Galería
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>
                 )
             )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={3}
            required
            disabled={isAlreadyReturned}
            placeholder="Ej: Cargador iPhone blanco..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-medium text-gray-700">Establecimiento</label>
            <select 
                name="found_at_location_id" 
                value={formData.found_at_location_id || ''} 
                onChange={e => { handleChange(e); setFormData(prev => ({...prev, found_at_room_id: ''})); }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
                required
                disabled={isAlreadyReturned}
            >
                {locations.map(loc => <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>)}
            </select>
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-700">Habitación (Opcional)</label>
            <select 
                name="found_at_room_id" 
                value={formData.found_at_room_id || ''} 
                onChange={handleChange} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                disabled={isAlreadyReturned || !formData.found_at_location_id}
            >
                <option value="">Zona Común / Recepción</option>
                {filteredRooms.map(room => <option key={room.room_id} value={room.room_id}>{room.name}</option>)}
            </select>
            </div>
        </div>

        {/* Return Section */}
        {item && (
            <div className="pt-4 border-t mt-4">
                <h4 className="font-semibold mb-2 text-gray-800">Estado del Objeto</h4>
                {isAlreadyReturned ? (
                    <div className="bg-green-50 p-3 rounded border border-green-200 text-sm">
                        <p className="font-bold text-green-800">✅ Devuelto</p>
                        <p>A: {formData.returned_to}</p>
                        <p>Fecha: {formData.returned_date ? new Date(formData.returned_date).toLocaleString() : ''}</p>
                    </div>
                ) : (
                    <div className="space-y-3 bg-gray-50 p-3 rounded border">
                        <label className="flex items-center space-x-2">
                            <input 
                                type="checkbox" 
                                checked={formData.status === 'returned'} 
                                onChange={(e) => setFormData(prev => ({...prev, status: e.target.checked ? 'returned' : 'pending'}))}
                                className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <span className="font-medium text-gray-700">Marcar como Devuelto</span>
                        </label>
                        
                        {formData.status === 'returned' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Entregado a (Nombre):</label>
                                <input 
                                    type="text" 
                                    name="returned_to"
                                    value={formData.returned_to || ''} 
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required
                                    placeholder="Nombre del huésped o propietario"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cerrar</Button>
            {!isAlreadyReturned && <Button type="submit" isLoading={isSaving}>Guardar</Button>}
        </div>
      </form>
      )}
    </Modal>
  );
};

export default LostItemFormModal;
