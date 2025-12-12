
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../App';
import { updateEmployee } from '../../services/mockApi';
import { blobToBase64 } from '../../utils/helpers';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';

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
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !auth?.employee || !auth.updateCurrentUser) return;

    setIsSaving(true);
    try {
      const base64Photo = await blobToBase64(selectedFile);
      const updatedEmployeeData = { ...auth.employee, photo_url: base64Photo };
      
      await updateEmployee(updatedEmployeeData);
      auth.updateCurrentUser({ photo_url: base64Photo });
      
      onClose();
    } catch (error) {
      console.error("Failed to save profile picture", error);
      alert("Hubo un error al guardar la imagen.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadData = () => {
      const data = JSON.stringify(auth?.employee, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mis_datos_${auth?.employee?.employee_id}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleShowTutorial = () => {
      onClose();
      if (auth?.showOnboarding) {
          auth.showOnboarding();
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mi Perfil">
      <div className="space-y-4">
        
        <div className="flex border-b mb-4">
            <button 
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2 text-sm font-medium ${activeTab === 'profile' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
            >
                Foto y Datos
            </button>
            <button 
                onClick={() => setActiveTab('privacy')}
                className={`flex-1 py-2 text-sm font-medium ${activeTab === 'privacy' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
            >
                Privacidad y Derechos
            </button>
        </div>

        {activeTab === 'profile' && (
            <div className="flex flex-col items-center space-y-4">
            <img 
                src={previewUrl || auth?.employee?.photo_url} 
                alt="Profile Preview" 
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
            />
            <input 
                id="photo-upload"
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="hidden"
            />
            <label htmlFor="photo-upload" className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg border">
                Seleccionar Imagen
            </label>
            <p className="text-xs text-gray-500 text-center">
                Esta foto se utiliza para la identificación interna en los cuadrantes y registros de jornada.
            </p>
            </div>
        )}

        {activeTab === 'privacy' && (
            <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2 border">
                    <h4 className="font-bold text-gray-900">Derechos ARCO-POL</h4>
                    <p>Como empleado, tienes derecho a acceder, rectificar y suprimir tus datos personales, así como a la portabilidad de los mismos.</p>
                    <p>Responsable del Tratamiento: <strong>Como en Casa Alojamientos Turísticos SL</strong></p>
                </div>
                
                <div className="space-y-2">
                    <button 
                        onClick={handleShowTutorial}
                        className="w-full text-left px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex justify-between items-center text-blue-800"
                    >
                        <span>🎓 Ver Tutorial de Bienvenida de nuevo</span>
                    </button>

                    <button 
                        onClick={handleDownloadData}
                        className="w-full text-left px-4 py-3 bg-white border rounded-lg hover:bg-gray-50 flex justify-between items-center"
                    >
                        <span>📥 Descargar mis datos (Portabilidad)</span>
                    </button>
                    <button 
                        onClick={() => alert("Para ejercer el derecho de supresión u olvido, por favor contacta con Recursos Humanos o el DPO en: privacidad@comoencasa.com. Ten en cuenta que ciertos datos laborales deben conservarse por ley durante 4 años.")}
                        className="w-full text-left px-4 py-3 bg-white border rounded-lg hover:bg-gray-50 flex justify-between items-center text-red-600"
                    >
                        <span>🗑️ Solicitar supresión de datos</span>
                    </button>
                </div>
            </div>
        )}

        <div className="pt-4 flex justify-end space-x-2 border-t mt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                Cerrar
            </Button>
            {activeTab === 'profile' && (
                <Button onClick={handleSave} disabled={!selectedFile || isSaving} isLoading={isSaving}>
                    Guardar Foto
                </Button>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default ProfileEditModal;
