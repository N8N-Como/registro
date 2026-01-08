
import React, { useState, useEffect } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { WorkType, WorkMode } from '../../types';
import { getOrCreateDeviceId, getBrowserInfo } from '../../utils/helpers';

interface ClockInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { workType: WorkType; workMode: WorkMode; deviceData: { deviceId: string, deviceInfo: string }; customTime?: string }) => void;
    isLoading: boolean;
}

const ClockInModal: React.FC<ClockInModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [workType, setWorkType] = useState<WorkType>('ordinaria');
    const [workMode, setWorkMode] = useState<WorkMode>('presencial');
    const [useNow, setUseNow] = useState(true);
    
    const getLocalISOString = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    const [customTime, setCustomTime] = useState<string>(() => getLocalISOString(new Date()));
    const maxTimeStr = getLocalISOString(new Date());

    useEffect(() => {
        if (isOpen) {
            setWorkType('ordinaria');
            setWorkMode('presencial');
            setUseNow(true);
            setCustomTime(getLocalISOString(new Date()));
        }
    }, [isOpen]);

    const handleConfirm = () => {
        // CAPTURA AUTOMÁTICA DE IDENTIDAD DEL TELÉFONO (Firma Digital Técnica)
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
            deviceData: { deviceId, deviceInfo },
            customTime: finalTime
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Iniciar Jornada Laboral">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-bold uppercase text-[10px]">Tipo de Jornada</label>
                    <div className="grid grid-cols-2 gap-3">
                        {(['ordinaria', 'extra', 'guardia', 'formacion'] as WorkType[]).map(t => (
                            <button key={t} onClick={() => setWorkType(t)} className={`p-3 rounded-lg border text-sm font-bold transition-all ${workType === t ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-bold uppercase text-[10px]">Modalidad</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setWorkMode('presencial')} className={`p-3 rounded-lg border text-sm font-bold transition-all ${workMode === 'presencial' ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>🏢 Presencial</button>
                        <button onClick={() => setWorkMode('teletrabajo')} className={`p-3 rounded-lg border text-sm font-bold transition-all ${workMode === 'teletrabajo' ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>🏠 Teletrabajo</button>
                    </div>
                </div>

                <div className="pt-2 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-bold uppercase text-[10px]">Hora de Registro</label>
                    <div className="space-y-3">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" checked={useNow} onChange={() => setUseNow(true)} className="text-primary focus:ring-primary h-4 w-4" />
                            <span className="text-sm font-medium">Registrar ahora ({new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" checked={!useNow} onChange={() => setUseNow(false)} className="text-primary focus:ring-primary h-4 w-4" />
                            <span className="text-sm font-medium">Indicar hora manualmente</span>
                        </label>
                        {!useNow && (
                            <div className="pl-6 animate-in slide-in-from-top-1">
                                <input type="datetime-local" value={customTime} onChange={(e) => setCustomTime(e.target.value)} max={maxTimeStr} className="block w-full rounded-md border-gray-300 shadow-sm text-sm" />
                                <p className="text-[9px] text-red-600 font-bold mt-1 uppercase">⚠ Se auditará como entrada manual.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                    <Button onClick={handleConfirm} isLoading={isLoading} className="w-full py-4 text-lg">CONFIRMAR ENTRADA</Button>
                    <p className="text-[9px] text-center text-gray-400 uppercase font-bold tracking-widest">Se registrará la huella digital del dispositivo {getOrCreateDeviceId().slice(-6)}</p>
                </div>
            </div>
        </Modal>
    );
};

export default ClockInModal;
