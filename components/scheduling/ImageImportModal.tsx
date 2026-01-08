
import React, { useState } from 'react';
import { Employee, Location, WorkShift, ShiftConfig } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { CalendarIcon } from '../icons';
import { blobToBase64 } from '../../utils/helpers';
import { parseScheduleImage } from '../../services/geminiService';

interface ImageImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (shifts: Omit<WorkShift, 'shift_id'>[]) => Promise<void>;
    employees: Employee[];
    locations: Location[];
    shiftConfigs: ShiftConfig[];
    currentMonth: number;
    currentYear: number;
}

const ImageImportModal: React.FC<ImageImportModalProps> = ({ 
    isOpen, onClose, onImport, employees, locations, shiftConfigs, currentMonth, currentYear 
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [parsedShifts, setParsedShifts] = useState<Omit<WorkShift, 'shift_id'>[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        const base64 = await blobToBase64(selectedFile, 3000, 0.9); 
        setPreviewUrl(base64);
    };

    const handleAnalyze = async () => {
        if (!previewUrl) return;
        setIsAnalyzing(true);
        try {
            const rawData = await parseScheduleImage(previewUrl, employees, shiftConfigs, currentMonth + 1, currentYear);
            
            const shifts: Omit<WorkShift, 'shift_id'>[] = rawData.map(item => {
                const day = item.day;
                const dateISO = new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
                const code = item.shift_code.trim().toUpperCase();
                const config = shiftConfigs.find(c => c.code.toUpperCase() === code);
                
                let startT = config?.start_time || '08:00';
                let endT = config?.end_time || '16:00';
                let color = config?.color || '#3b82f6';
                let type: any = 'work';

                if (['L', 'V', 'B'].includes(code)) {
                    type = code === 'L' ? 'off' : (code === 'V' ? 'vacation' : 'sick');
                    startT = '00:00'; endT = '00:00'; color = '#9ca3af';
                }

                return {
                    employee_id: item.employee_id,
                    start_time: new Date(`${dateISO}T${startT}:00`).toISOString(),
                    end_time: new Date(`${dateISO}T${endT}:00`).toISOString(),
                    type,
                    color,
                    shift_config_id: config?.config_id,
                    notes: code
                };
            });

            setParsedShifts(shifts);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importador de Cuadrantes (PDF / Foto)">
            <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center border-primary bg-blue-50">
                    {previewUrl ? (
                        <div className="space-y-2">
                             <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded shadow" />
                        </div>
                    ) : (
                        <label className="cursor-pointer block">
                            <CalendarIcon className="w-12 h-12 text-primary mx-auto mb-2" />
                            <span className="text-primary font-bold block">Seleccionar PDF o Foto</span>
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
                        </label>
                    )}
                </div>

                {file && !isAnalyzing && parsedShifts.length === 0 && (
                    <Button onClick={handleAnalyze} className="w-full" size="lg">Analizar con IA</Button>
                )}

                {isAnalyzing && <div className="text-center py-4"><Spinner /><p className="text-xs mt-2 font-bold animate-pulse">Detectando turnos...</p></div>}

                {parsedShifts.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-sm font-bold text-green-700 bg-green-50 p-2 rounded border border-green-200 text-center">
                            ✓ {parsedShifts.length} días detectados.
                        </p>
                        <Button onClick={async () => { await onImport(parsedShifts); onClose(); }} variant="success" className="w-full" size="lg">
                            Confirmar Importación
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImageImportModal;
