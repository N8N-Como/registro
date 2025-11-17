import React from 'react';
import { Announcement } from '../../types';
import Button from './Button';
import Card from './Card';
import { MegaphoneIcon } from '../icons';

interface AnnouncementModalProps {
  announcement: Announcement;
  onClose: () => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ announcement, onClose }) => {
  return (
    <div className="fixed inset-0 bg-primary bg-opacity-75 z-50 flex justify-center items-center backdrop-blur-sm" aria-modal="true" role="dialog">
      <Card className="w-full max-w-lg m-4 transform transition-all shadow-2xl border-4 border-secondary">
        <div className="text-center">
            <MegaphoneIcon className="w-16 h-16 text-primary mx-auto mb-4"/>
          <h2 className="text-2xl font-bold text-gray-800">Comunicado Importante</h2>
          <p className="mt-2 text-sm text-gray-500">
            Publicado el {new Date(announcement.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="mt-6 p-4 bg-gray-50 border rounded-md max-h-64 overflow-y-auto">
            <p className="text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
        </div>
        <div className="mt-6 flex justify-center">
          <Button onClick={onClose} size="lg">
            Entendido
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AnnouncementModal;
