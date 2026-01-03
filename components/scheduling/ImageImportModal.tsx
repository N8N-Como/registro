
import React, { useState } from 'react';
import { Employee, WorkShift, ShiftConfig, ShiftType } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { blobToBase64 } from '../../utils/helpers';
import { parseScheduleImage } from '../../services/geminiService';

interface ImageImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (shifts: Omit<WorkShift, 'shift_id'>[]) => Promise<void>;
    employees: Employee[];
    locations: any[]; 
    shiftConfigs: ShiftConfig[];
    currentMonth: number;
    currentYear: number;
}

const ImageImportModal: React.FC<ImageImportModalProps> = ({ 
    isOpen, onClose, onImport, employees, shiftConfigs, currentMonth, currentYear 
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
                
                const absenceCodes = ['L', 'V', 'V25', 'B'];
                const isOff = absenceCodes.includes(code) || code.startsWith('V');

                const config = shiftConfigs.find(c => c.code.toUpperCase() === code);
                
                let type: ShiftType = 'work';
                let startT = '09:00';
                let endT = '17:00';
                let color = '#3b82f6';

                if (config) {
                    startT = config.start_time;
                    endT = config.end_time;
                    color = config.color;
                } else if (isOff) {
                    type = code === 'B' ? 'sick' : (code.startsWith('V') ? 'vacation' : 'off');
                    startT = '00:00';
                    endT = '00:00';
                    color = type === 'vacation' ? '#10b981' : (type === 'sick' ? '#ef4444' : '#9ca3af');
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
        } catch (error: any) { alert(error.message); } finally { setIsAnalyzing(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importador IA">
            <div className="space-y-4">
                <input type="file" accept="image/*,application/pdf" onChange={handleFileSelect} className="block w-full text-sm" />
                {file && !isAnalyzing && parsedShifts.length === 0 && <Button onClick={handleAnalyze} className="w-full">Analizar</Button>}
                {isAnalyzing && <Spinner />}
                {parsedShifts.length > 0 && <Button onClick={async () => { await onImport(parsedShifts); onClose(); }} variant="success" className="w-full">Importar {parsedShifts.length} días</Button>}
            </div>
        </Modal>
    );
};

export default ImageImportModal;
