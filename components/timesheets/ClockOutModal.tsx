
import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { getOrCreateDeviceId, getBrowserInfo } from '../../utils/helpers';

interface ClockOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (customTime?: string, deviceData?: { deviceId: string, deviceInfo: string }) => void;
    isLoading: boolean;
    defaultTime?: Date;
    isForgotten: boolean;
}

const ClockOutModal: React.FC<ClockOutModalProps> = ({ isOpen, onClose, onConfirm, isLoading, defaultTime, isForgotten }) => {
    const [useNow, setUseNow] = useState(!isForgotten);
    
    const getLocalISOString = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    };

    const [customTime, setCustomTime] = useState<string>(() => {
        const d = defaultTime || new Date();
        return getLocalISOString(d);
    });

    const maxTimeStr = getLocalISOString(new Date());

    const handleConfirm = () => {
        const deviceData = {
            deviceId: getOrCreateDeviceId(),
            deviceInfo: getBrowserInfo()
        };

        if (!useNow) {
            if (new Date(customTime) > new Date()) {
                alert("La hora no puede ser futura.");
                return;
            }
        }
        onConfirm(useNow ? undefined : new Date(customTime).toISOString(), deviceData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isForgotten ? "⚠ Olvido de Fichaje" : "Finalizar Jornada"}>
            <div className="space-y-4">
                {isForgotten && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-sm text-orange-800 font-bold">
                        Detectado turno activo prolongado. Indica la hora real en la que terminaste de trabajar.
                    </div>
                )}
                <div className="space-y-3">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={useNow} onChange={() => setUseNow(true)} className="text-primary focus:ring-primary h-4 w-4" />
                        <span className="text-sm font-medium">Finalizar ahora ({new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={!useNow} onChange={() => setUseNow(false)} className="text-primary focus:ring-primary h-4 w-4" />
                        <span className="text-sm font-medium">Indicar hora manual</span>
                    </label>
                    {!useNow && (
                        <input type="datetime-local" value={customTime} onChange={(e) => setCustomTime(e.target.value)} max={maxTimeStr} className="block w-full rounded-md border-gray-300 shadow-sm animate-in fade-in" />
                    )}
                </div>
                <div className="pt-4 flex flex-col gap-3">
                    <Button onClick={handleConfirm} variant="danger" isLoading={isLoading} className="w-full py-4 text-lg">REGISTRAR SALIDA</Button>
                    <p className="text-[9px] text-center text-gray-400 uppercase font-bold tracking-widest italic">Auditoría de dispositivo activa • {getBrowserInfo()}</p>
                </div>
            </div>
        </Modal>
    );
};

export default ClockOutModal;
