
import React from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { DocumentIcon } from '../icons';

interface PendingDocumentsNotificationProps {
    isOpen: boolean;
    count: number;
    onReviewNow: () => void;
    onRemindLater: () => void;
    onDontShowAgain: () => void;
}

const PendingDocumentsNotification: React.FC<PendingDocumentsNotificationProps> = ({ 
    isOpen, 
    count, 
    onReviewNow, 
    onRemindLater, 
    onDontShowAgain 
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onRemindLater} title="Documentación Pendiente">
            <div className="text-center space-y-4">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100">
                    <DocumentIcon className="h-8 w-8 text-orange-600" />
                </div>
                
                <div>
                    <h3 className="text-lg font-medium text-gray-900">
                        Tienes {count} documento{count > 1 ? 's' : ''} pendiente{count > 1 ? 's' : ''} de firma
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Es necesario que leas y firmes la documentación pendiente para cumplir con la normativa de la empresa.
                    </p>
                </div>

                <div className="flex flex-col space-y-3 pt-4">
                    <Button onClick={onReviewNow} size="lg" className="w-full justify-center">
                        🖊️ Revisar y Firmar Ahora
                    </Button>
                    
                    <div className="flex justify-between gap-2">
                        <Button variant="secondary" onClick={onRemindLater} className="flex-1 text-xs justify-center">
                            Recordar luego
                        </Button>
                        <button 
                            onClick={onDontShowAgain}
                            className="flex-1 text-xs text-gray-500 hover:text-gray-700 underline decoration-dotted"
                        >
                            No volver a mostrar para estos documentos
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PendingDocumentsNotification;
