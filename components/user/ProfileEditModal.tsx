
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../App';
import { updateEmployee } from '../../services/mockApi';
import { blobToBase64 } from '../../utils/helpers';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

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
    if (!isOpen) { setSelectedFile(null); setPreviewUrl(null); setActiveTab('profile'); }
  }, [isOpen]);

  const handleSave = async () => {
    if (!selectedFile || !auth?.employee || !auth.updateCurrentUser) return;
    setIsSaving(true);
    try {
      const b64 = await blobToBase64(selectedFile);
      await updateEmployee({ ...auth.employee, photo_url: b64 });
      auth.updateCurrentUser({ photo_url: b64 });
      onClose();
    } catch (e) { alert("Error al guardar"); } finally { setIsSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mi Perfil">
      <div className="space-y-4">
        <div className="flex border-b mb-4">
            <button onClick={() => setActiveTab('profile')} className={`flex-1 py-2 text-sm ${activeTab === 'profile' ? 'border-b-2 border-primary' : ''}`}>Foto</button>
            <button onClick={() => setActiveTab('privacy')} className={`flex-1 py-2 text-sm ${activeTab === 'privacy' ? 'border-b-2 border-primary' : ''}`}>Privacidad</button>
        </div>
        {activeTab === 'profile' ? (
            <div className="flex flex-col items-center">
                <img src={previewUrl || auth?.employee?.photo_url} className="w-32 h-32 rounded-full object-cover border" alt="Perfil" />
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); const r = new FileReader(); r.onloadend = () => setPreviewUrl(r.result as string); r.readAsDataURL(f); } }} className="mt-4" />
            </div>
        ) : <p className="text-xs">Tus datos están protegidos por la LOPD.</p>}
        <div className="pt-4 flex justify-end space-x-2">
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            {activeTab === 'profile' && <Button onClick={handleSave} isLoading={isSaving}>Guardar</Button>}
        </div>
      </div>
    </Modal>
  );
};

export default ProfileEditModal;
