
import React, { useState, useRef, useEffect } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { WorkType, WorkMode } from '../../types';
import { blobToBase64 } from '../../utils/helpers';

interface ClockInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { workType: WorkType; workMode: WorkMode; photoUrl: string }) => void;
    isLoading: boolean;
}

const ClockInModal: React.FC<ClockInModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [step, setStep] = useState<'details' | 'camera'>('details');
    const [workType, setWorkType] = useState<WorkType>('ordinaria');
    const [workMode, setWorkMode] = useState<WorkMode>('presencial');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    
    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setStep('details');
            setPhotoUrl(null);
            stopCamera();
        }
    }, [isOpen]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' } // Selfie mode
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Necesitamos acceso a la cámara para verificar tu identidad al fichar.");
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                setPhotoUrl(dataUrl);
                stopCamera();
            }
        }
    };

    const handleNext = () => {
        setStep('camera');
        startCamera();
    };

    const handleConfirm = () => {
        if (photoUrl) {
            onConfirm({ workType, workMode, photoUrl });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={() => { stopCamera(); onClose(); }} title="Iniciar Jornada Laboral">
            {step === 'details' ? (
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

                    <div className="pt-4 border-t flex justify-end">
                        <Button onClick={handleNext}>Continuar</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 text-center">
                    <div className="bg-blue-50 border border-blue-200 p-2 rounded text-[10px] text-blue-800 text-left mb-2">
                        <strong>Información LOPD:</strong> De conformidad con el Art. 20.3 del Estatuto de los Trabajadores, se capturará su imagen y geolocalización únicamente para verificar la identidad y el lugar de inicio de la jornada laboral. Estos datos no se usarán para fines biométricos automatizados.
                    </div>

                    {!photoUrl ? (
                        <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-[4/3]">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    ) : (
                         <div className="relative w-full rounded-lg overflow-hidden aspect-[4/3]">
                            <img src={photoUrl} alt="Selfie" className="w-full h-full object-cover transform scale-x-[-1]" />
                        </div>
                    )}

                    <div className="flex justify-center space-x-3 pt-2">
                        {!photoUrl ? (
                            <>
                                <Button variant="secondary" onClick={() => setStep('details')}>Atrás</Button>
                                <Button onClick={capturePhoto}>📸 Fichar</Button>
                            </>
                        ) : (
                            <>
                                <Button variant="secondary" onClick={() => { setPhotoUrl(null); startCamera(); }}>Repetir</Button>
                                <Button onClick={handleConfirm} isLoading={isLoading} variant="success">Confirmar</Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ClockInModal;
