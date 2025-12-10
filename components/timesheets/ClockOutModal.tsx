
import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface ClockOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (customTime?: string) => void;
    isLoading: boolean;
    defaultTime?: Date;
    isForgotten: boolean;
}

const ClockOutModal: React.FC<ClockOutModalProps> = ({ isOpen, onClose, onConfirm, isLoading, defaultTime, isForgotten }) => {
    const [useNow, setUseNow] = useState(!isForgotten);
    const [customTime, setCustomTime] = useState<string>(() => {
        // Default custom time to expected end time or now
        const d = defaultTime || new Date();
        // Adjust for local timezone for input[type="datetime-local"]
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    });

    const handleConfirm = () => {
        if (useNow) {
            onConfirm(undefined);
        } else {
            // Convert back to ISO
            const date = new Date(customTime);
            onConfirm(date.toISOString());
        }
    };

    const title = isForgotten ? "⚠️ ¿Olvidaste fichar la salida?" : "Finalizar Jornada";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                {isForgotten && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-sm text-orange-800">
                        <p>Hemos detectado que tu turno terminó hace más de 30 minutos.</p>
                        <p className="mt-1 font-bold">Por favor, indica la hora real a la que saliste.</p>
                    </div>
                )}

                <div>
                    <label className="flex items-center space-x-2 mb-4">
                        <input 
                            type="radio" 
                            checked={useNow} 
                            onChange={() => setUseNow(true)}
                            className="text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>Salir ahora mismo ({new Date().toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})})</span>
                    </label>

                    <label className="flex items-center space-x-2">
                        <input 
                            type="radio" 
                            checked={!useNow} 
                            onChange={() => setUseNow(false)}
                            className="text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>Poner hora manualmente</span>
                    </label>
                </div>

                {!useNow && (
                    <div className="pl-6 mt-2">
                        <input 
                            type="datetime-local" 
                            value={customTime}
                            onChange={(e) => setCustomTime(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                        />
                         <p className="text-xs text-gray-500 mt-1">Indica fecha y hora exacta de tu salida.</p>
                    </div>
                )}

                <div className="pt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button onClick={handleConfirm} isLoading={isLoading} variant="danger">
                        Registrar Salida
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ClockOutModal;
