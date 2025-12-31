
import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { WorkType, WorkMode } from '../../types';
import { getOrCreateDeviceId, getBrowserInfo } from '../../utils/helpers';

interface ClockInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { workType: WorkType; workMode: WorkMode; photoUrl: string; deviceData?: { deviceId: string, deviceInfo: string }; customTime?: string }) => void;
    isLoading: boolean;
}

const ClockInModal: React.FC<ClockInModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [workType, setWorkType] = useState<WorkType>('ordinaria');
    const [workMode, setWorkMode] = useState<WorkMode>('presencial');
    const [useNow, setUseNow] = useState(true);
    
    // Calcular el string actual para el input datetime-local
    const getLocalISOString = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    const [customTime, setCustomTime] = useState<string>(() => getLocalISOString(new Date()));
    const maxTimeStr = getLocalISOString(new Date());

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setWorkType('ordinaria');
            setWorkMode('presencial');
            setUseNow(true);
            setCustomTime(getLocalISOString(new Date()));
        }
    }, [isOpen]);

    const handleConfirm = () => {
        const deviceId = getOrCreateDeviceId();
        const deviceInfo = getBrowserInfo();
        
        let finalTime: string | undefined = undefined;
        if (!useNow) {
            const date = new Date(customTime);
            if (date > new Date()) {
                alert("La hora de inicio no puede ser futura.");
                return;
            }
            finalTime = date.toISOString();
        }

        onConfirm({ 
            workType, 
            workMode, 
            photoUrl: '', 
            deviceData: { deviceId, deviceInfo },
            customTime: finalTime
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

                <div className="pt-2 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hora de Inicio</label>
                    <div className="space-y-3">
                        <label className="flex items-center space-x-2">
                            <input 
                                type="radio" 
                                checked={useNow} 
                                onChange={() => setUseNow(true)}
                                className="text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-sm">Iniciar ahora mismo ({new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})})</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input 
                                type="radio" 
                                checked={!useNow} 
                                onChange={() => setUseNow(false)}
                                className="text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-sm">Indicar hora manualmente (Retroactivo)</span>
                        </label>
                        
                        {!useNow && (
                            <div className="pl-6 animate-in slide-in-from-top-2 duration-200">
                                <input 
                                    type="datetime-local" 
                                    value={customTime}
                                    onChange={(e) => setCustomTime(e.target.value)}
                                    max={maxTimeStr}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                                />
                                <p className="text-[10px] text-red-600 font-bold mt-1 uppercase">⚠️ Se marcará como entrada manual en el informe.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 p-3 rounded text-xs text-gray-600">
                    <p><strong>Seguridad:</strong> Se registrará este dispositivo para verificar tu identidad y se aplicará geocerca al entrar en establecimientos.</p>
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
