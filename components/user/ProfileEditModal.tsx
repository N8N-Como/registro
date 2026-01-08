
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../App';
import { updateEmployee } from '../../services/mockApi';
import { blobToBase64 } from '../../utils/helpers';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { LockIcon, TrashIcon, DocumentIcon } from '../icons';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose }) => {
  const auth = useContext(AuthContext);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy'>('profile');

  useEffect(() => {
    if (!isOpen) {
        setSelectedFile(null);
        setPreviewUrl(null);
        setActiveTab('profile');
    }
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setPreviewUrl(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !auth?.employee || !auth.updateCurrentUser) return;
    setIsSaving(true);
    try {
      const base64Photo = await blobToBase64(selectedFile, 400, 0.6);
      const updatedEmployeeData = { ...auth.employee, photo_url: base64Photo };
      const savedUser = await updateEmployee(updatedEmployeeData);
      auth.updateCurrentUser(savedUser);
      alert("Perfil actualizado correctamente.");
      onClose();
    } catch (error) {
      console.error("Failed to save profile picture", error);
      alert("Error al guardar: La imagen es demasiado pesada.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadAllData = () => {
      // Derecho a la Portabilidad (Art. 20 RGPD)
      const data = {
          identidad: auth?.employee,
          rol: auth?.role,
          dispositivo_fichaje: localStorage.getItem('comoencasa_device_id'),
          timestamp_exportacion: new Date().toISOString(),
          descargo_legal: "Esta exportación contiene todos sus datos personales tratados por la plataforma según lo estipulado en el RGPD."
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portabilidad_datos_${auth?.employee?.first_name}_${new Date().getFullYear()}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleRequestDeletion = () => {
      if (window.confirm("¿Deseas solicitar la supresión de tus datos personales?\n\nEsta acción enviará una notificación a Recursos Humanos. Ten en cuenta que ciertos datos laborales (como los registros horarios) deben conservarse legalmente por 4 años antes de ser eliminados definitivamente.")) {
          alert("Solicitud enviada a Administración. Recibirás respuesta en el correo corporativo en un plazo máximo de 30 días.");
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Perfil y Privacidad">
      <div className="space-y-4">
        <div className="flex border-b mb-4">
            <button onClick={() => setActiveTab('profile')} className={`flex-1 py-2 text-sm font-bold ${activeTab === 'profile' ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}>Mi Perfil</button>
            <button onClick={() => setActiveTab('privacy')} className={`flex-1 py-2 text-sm font-bold ${activeTab === 'privacy' ? 'border-b-2 border-primary text-primary' : 'text-gray-400'}`}>🔒 Privacidad LOPD</button>
        </div>

        {activeTab === 'profile' && (
            <div className="space-y-6">
                <div className="flex flex-col items-center">
                    <div className="relative group">
                        <img src={previewUrl || auth?.employee?.photo_url} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 shadow-xl" />
                        <label htmlFor="photo-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold text-[10px] uppercase">Cambiar Foto</label>
                    </div>
                    <input id="photo-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl space-y-2 border">
                    <p className="text-xs text-gray-500 font-bold uppercase">Datos Identificativos</p>
                    <p className="font-bold text-gray-800">{auth?.employee?.first_name} {auth?.employee?.last_name}</p>
                    <p className="text-sm text-gray-600">{auth?.role?.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">ID: {auth?.employee?.employee_id}</p>
                </div>
            </div>
        )}

        {activeTab === 'privacy' && (
            <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-800 border border-blue-100 leading-relaxed">
                    <h4 className="font-black text-blue-900 uppercase mb-2 flex items-center">
                        <LockIcon className="w-3 h-3 mr-1"/> Sus Derechos RGPD / LOPD
                    </h4>
                    <p>Como empleado de Como en Casa, usted tiene pleno control sobre sus datos. Esta plataforma registra su ubicación solo en el momento del fichaje según el Art. 34.9 del Estatuto de los Trabajadores.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                    <button onClick={handleDownloadAllData} className="flex items-center justify-between p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-primary transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-primary/10"><DocumentIcon className="w-5 h-5 text-gray-600 group-hover:text-primary"/></div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-800">Derecho a Portabilidad</p>
                                <p className="text-[10px] text-gray-500">Descarga todos tus datos tratados</p>
                            </div>
                        </div>
                        <span className="text-primary font-black">📥</span>
                    </button>

                    <button onClick={handleRequestDeletion} className="flex items-center justify-between p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-red-200 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-red-50"><TrashIcon className="w-5 h-5 text-gray-600 group-hover:text-red-600"/></div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-gray-800">Derecho de Supresión</p>
                                <p className="text-[10px] text-gray-500">Solicita el borrado de tu cuenta</p>
                            </div>
                        </div>
                        <span className="text-red-600 font-black">⚠</span>
                    </button>
                    
                    <button onClick={() => auth?.showOnboarding?.()} className="w-full text-center py-3 text-xs font-bold text-primary underline">Volver a ver Tutorial de Uso</button>
                </div>
            </div>
        )}

        <div className="pt-4 flex justify-end space-x-2 border-t mt-4">
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cerrar</Button>
            {activeTab === 'profile' && selectedFile && (
                <Button onClick={handleSave} isLoading={isSaving}>Actualizar Foto</Button>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default ProfileEditModal;
