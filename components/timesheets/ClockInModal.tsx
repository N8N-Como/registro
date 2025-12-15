
import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { WorkType, WorkMode } from '../../types';
import { getOrCreateDeviceId, getBrowserInfo } from '../../utils/helpers';

interface ClockInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { workType: WorkType; workMode: WorkMode; photoUrl: string; deviceData?: { deviceId: string, deviceInfo: string } }) => void;
    isLoading: boolean;
}

const ClockInModal: React.FC<ClockInModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [workType, setWorkType] = useState<WorkType>('ordinaria');
    const [workMode, setWorkMode] = useState<WorkMode>('presencial');
    
    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setWorkType('ordinaria');
            setWorkMode('presencial');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        const deviceId = getOrCreateDeviceId();
        const deviceInfo = getBrowserInfo();
        
        onConfirm({ 
            workType, 
            workMode, 
            photoUrl: '', // Photo is no longer used, passing empty string to satisfy strict typing for now if kept in interface
            deviceData: { deviceId, deviceInfo }
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Iniciar Jornada Laboral">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Jornada</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setWorkType('ordinaria')}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${workType === 'ordinaria' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Ordinaria
                        </button>
                        <button
                            onClick={() => setWorkType('extra')}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${workType === 'extra' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Horas Extra
                        </button>
                            <button
                            onClick={() => setWorkType('guardia')}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${workType === 'guardia' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Guardia
                        </button>
                            <button
                            onClick={() => setWorkType('formacion')}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${workType === 'formacion' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            Formación
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modalidad de Trabajo</label>
                    <div className="grid grid-cols-2 gap-3">
                            <button
                            onClick={() => setWorkMode('presencial')}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${workMode === 'presencial' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            🏢 Presencial
                        </button>
                            <button
                            onClick={() => setWorkMode('teletrabajo')}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${workMode === 'teletrabajo' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            🏠 Teletrabajo
                        </button>
                    </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs text-gray-600">
                    <p><strong>Seguridad:</strong> Se registrará este dispositivo para verificar tu identidad.</p>
                </div>

                <div className="pt-4 border-t flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleConfirm} isLoading={isLoading}>Confirmar Fichaje</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ClockInModal;
