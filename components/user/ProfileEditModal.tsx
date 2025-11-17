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

  useEffect(() => {
    if (!isOpen) {
        setSelectedFile(null);
        setPreviewUrl(null);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Perfil">
      <div className="space-y-4">
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
        </div>
        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!selectedFile || isSaving} isLoading={isSaving}>
                Guardar Cambios
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProfileEditModal;
