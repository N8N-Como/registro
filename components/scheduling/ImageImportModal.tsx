
import React, { useState } from 'react';
import { Employee, Location, WorkShift, ShiftConfig, ShiftType } from '../../types';
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
                
                // MAPEO ESTRICTO PARA HOSTELERÍA (BASADO EN PDF)
                const workCodes = ['M', 'T', 'P', 'MM', 'R', 'A', 'D', 'TH', 'BH', 'BM', 'AD', 'S', 'D'];
                const absenceCodes = ['L', 'V', 'V25', 'B'];

                const isWork = workCodes.includes(code) || workCodes.some(wc => code.startsWith(wc));
                const isOff = absenceCodes.includes(code) || code.startsWith('V');

                const config = shiftConfigs.find(c => c.code.toUpperCase() === code);
                
                let type: ShiftType = 'work';
                let startT = '09:00';
                let endT = '17:00';
                let color = '#3b82f6';
                let configId = config?.config_id;

                if (config) {
                    // Turno configurado con horario exacto
                    startT = config.start_time;
                    endT = config.end_time;
                    color = config.color;
                    type = 'work';
                } else if (isOff) {
                    // Es libre, vacaciones o baja (0 horas)
                    type = code === 'B' ? 'sick' : (code.startsWith('V') ? 'vacation' : 'off');
                    startT = '00:00';
                    endT = '00:00';
                    color = type === 'vacation' ? '#10b981' : (type === 'sick' ? '#ef4444' : '#9ca3af');
                } else {
                    // Turno de trabajo sin configurar horario (Asumimos 8h para cómputo)
                    type = 'work';
                    startT = '08:00';
                    endT = '16:00';
                    color = '#6366f1'; 
                }

                return {
                    employee_id: item.employee_id,
                    start_time: new Date(`${dateISO}T${startT}:00`).toISOString(),
                    end_time: new Date(`${dateISO}T${endT}:00`).toISOString(),
                    type,
                    color,
                    shift_config_id: configId,
                    notes: code // Guardamos SOLO la letra para evitar interrogantes
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
                             <p className="text-xs text-primary font-bold">Archivo cargado</p>
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

                {isAnalyzing && <div className="text-center py-4"><Spinner /><p className="text-xs mt-2 font-bold animate-pulse">Detectando turnos y horas...</p></div>}

                {parsedShifts.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-sm font-bold text-green-700 bg-green-50 p-2 rounded border border-green-200 text-center">
                            ✓ {parsedShifts.length} días detectados correctamente.
                        </p>
                        <Button onClick={async () => { await onImport(parsedShifts); onClose(); }} variant="success" className="w-full" size="lg">
                            Confirmar e Importar
                        </Button>
                        <Button variant="secondary" onClick={() => { setParsedShifts([]); setFile(null); setPreviewUrl(null); }} className="w-full">
                            Cancelar
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImageImportModal;
