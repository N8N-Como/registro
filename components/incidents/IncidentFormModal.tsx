
import React, { useState, useEffect, useRef } from 'react';
import { Incident, Location, Employee, Room } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { blobToBase64 } from '../../utils/helpers';

interface IncidentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incident: Omit<Incident, 'incident_id' | 'created_at' | 'reported_by'> | Incident) => void;
  incident: Incident | null;
  locations: Location[];
  employees: Employee[];
  rooms: Room[];
  canManage: boolean;
}

const IncidentFormModal: React.FC<IncidentFormModalProps> = ({ isOpen, onClose, onSave, incident, locations, employees, rooms, canManage }) => {
  const [formData, setFormData] = useState<Partial<Incident>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (incident) {
      setFormData(incident);
      setPreviewUrl(incident.photo_url || null);
      setSelectedFile(null);
    } else {
      setFormData({
        status: 'open',
        priority: 'medium',
        location_id: locations[0]?.location_id,
        room_id: '',
      });
      setPreviewUrl(null);
      setSelectedFile(null);
    }
    
    return () => {
        stopCamera();
    };
  }, [incident, isOpen, locations]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle File Upload (Gallery)
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

  // --- Camera Logic ---

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } // Prefer rear camera
        });
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
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
        
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Compress slightly
            setPreviewUrl(dataUrl);
            setFormData(prev => ({ ...prev, photo_url: dataUrl }));
            setSelectedFile(null); // Clear file if camera is used
            stopCamera();
        }
    }
  };

  // --------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        let photoBase64 = formData.photo_url;
        
        // If a file was selected from gallery, convert it
        if (selectedFile) {
            photoBase64 = await blobToBase64(selectedFile);
        }
        
        onSave({
            ...formData,
            photo_url: photoBase64
        } as Incident);
    } catch (error) {
        console.error("Error preparing incident data", error);
        alert("Hubo un error al procesar la imagen.");
    } finally {
        setIsSaving(false);
    }
  };

  const title = incident ? 'Detalle de Incidencia' : 'Reportar Incidencia';
  const maintenanceStaff = employees.filter(e => e.role_id === 'maintenance');
  const filteredRooms = rooms.filter(r => r.location_id === formData.location_id);
  const isReadOnly = incident && !canManage;

  return (
    <Modal isOpen={isOpen} onClose={() => { stopCamera(); onClose(); }} title={title}>
      
      {/* Camera Overlay */}
      {isCameraOpen ? (
          <div className="flex flex-col items-center space-y-4">
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex space-x-4 w-full">
                  <Button variant="secondary" onClick={stopCamera} className="flex-1">Cancelar</Button>
                  <Button variant="primary" onClick={capturePhoto} className="flex-1">Capturar</Button>
              </div>
          </div>
      ) : (
      /* Standard Form */
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={4}
            required
            readOnly={isReadOnly}
            placeholder="Describe el problema..."
          />
        </div>
        
        {/* Photo Section */}
        <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">Fotografía (Opcional)</label>
             
             {!isReadOnly && !previewUrl && (
                 <div className="flex space-x-2 mb-2">
                     <Button type="button" onClick={startCamera} size="sm" className="flex items-center justify-center flex-1">
                        <span className="mr-2">📸</span> Tomar Foto
                     </Button>
                     
                     <label className="flex-1">
                        <div className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg border text-center cursor-pointer text-sm h-full flex items-center justify-center">
                            <span className="mr-2">📁</span> Galería
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange}
                            className="hidden"
                        />
                     </label>
                 </div>
             )}
             
             {previewUrl && (
                 <div className="mt-4 relative">
                     <p className="text-xs text-gray-500 mb-1">Vista previa:</p>
                     <img src={previewUrl} alt="Evidencia incidencia" className="w-full max-h-64 object-cover rounded-md border" />
                     {!isReadOnly && (
                         <button 
                            type="button"
                            onClick={() => { setPreviewUrl(null); setFormData(prev => ({...prev, photo_url: undefined})); setSelectedFile(null); }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                            title="Eliminar foto"
                         >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                         </button>
                     )}
                 </div>
             )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Establecimiento</label>
          <select 
            name="location_id" 
            value={formData.location_id || ''} 
            onChange={e => {
                handleChange(e);
                setFormData(prev => ({...prev, room_id: ''})) // Reset room on location change
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
            required
            disabled={isReadOnly}
          >
            {locations.map(loc => <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Habitación/Zona</label>
          <select 
            name="room_id" 
            value={formData.room_id || ''} 
            onChange={handleChange} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            disabled={isReadOnly || !formData.location_id}
          >
            <option value="">(Opcional)</option>
            {filteredRooms.map(room => <option key={room.room_id} value={room.room_id}>{room.name}</option>)}
          </select>
        </div>
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
              <option value="resolved">Resuelta</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Asignado a (opcional)</label>
          <select name="assigned_to" value={formData.assigned_to || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled={!canManage}>
            <option value="">Sin asignar</option>
            {maintenanceStaff.map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</option>)}
          </select>
        </div>
        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cerrar</Button>
            {!isReadOnly && <Button type="submit" isLoading={isSaving}>Guardar</Button>}
        </div>
      </form>
      )}
    </Modal>
  );
};

export default IncidentFormModal;
