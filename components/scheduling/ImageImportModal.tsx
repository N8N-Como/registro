
import React, { useState, useRef } from 'react';
import { Employee, Location, WorkShift, ShiftConfig, ShiftType } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { CheckIcon, XMarkIcon, SparklesIcon, CalendarIcon } from '../icons';
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
    const [isImporting, setIsImporting] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        const base64 = await blobToBase64(selectedFile, 2500, 0.85); 
        setPreviewUrl(base64);
    };

    const handleAnalyze = async () => {
        if (!previewUrl) return;
        setIsAnalyzing(true);
        try {
            const rawData = await parseScheduleImage(previewUrl, employees, shiftConfigs, currentMonth + 1, currentYear);
            
            const shifts: Omit<WorkShift, 'shift_id'>[] = rawData.map(item => {
                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${item.day.toString().padStart(2, '0')}`;
                const code = item.shift_code.trim().toUpperCase();
                
                // BUSCAR COINCIDENCIA CON TIPOS DE TURNO CONFIGURADOS (M, T, P, etc.)
                const config = shiftConfigs.find(c => c.code.toUpperCase() === code);
                
                let type: ShiftType = 'work';
                let startISO = '';
                let endISO = '';
                let color = '#9ca3af';
                let configId = undefined;

                if (config) {
                    // SI COINCIDE CON UN TURNO DE TRABAJO
                    startISO = `${dateStr}T${config.start_time}:00`;
                    endISO = `${dateStr}T${config.end_time}:00`;
                    color = config.color;
                    configId = config.config_id;
                    type = 'work';
                } else {
                    // SI ES LIBRANZA O DESCONOCIDO (Duración 0 para cómputo)
                    type = code === 'L' ? 'off' : code === 'V' ? 'vacation' : 'off';
                    startISO = `${dateStr}T00:00:00`;
                    endISO = `${dateStr}T00:00:00`; // Salida = Entrada significa 0 horas
                    color = type === 'vacation' ? '#10b981' : '#9ca3af';
                    configId = undefined;
                }

                return {
                    employee_id: item.employee_id,
                    start_time: new Date(startISO).toISOString(),
                    end_time: new Date(endISO).toISOString(),
                    type,
                    color,
                    shift_config_id: configId,
                    notes: code // Guardamos solo la letra para que se vea en el cuadrante
                };
            });

            setParsedShifts(shifts);
        } catch (error: any) {
            alert("Error analizando imagen: " + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Cuadrante con IA">
            <div className="space-y-4">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${previewUrl ? 'border-primary' : 'border-gray-300'}`}>
                    {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded shadow" />
                    ) : (
                        <label className="cursor-pointer">
                            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <span className="text-gray-600 block">Sube una foto del cuadrante mensual</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                        </label>
                    )}
                </div>

                {file && !isAnalyzing && parsedShifts.length === 0 && (
                    <Button onClick={handleAnalyze} className="w-full">Analizar con IA</Button>
                )}

                {isAnalyzing && <div className="text-center py-4"><Spinner /><p className="text-xs mt-2">Interpretando códigos y horas...</p></div>}

                {parsedShifts.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-sm font-bold text-green-700">✓ {parsedShifts.length} días detectados.</p>
                        <div className="max-h-40 overflow-y-auto border rounded text-xs">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr><th className="p-1">Emp.</th><th className="p-1">Día</th><th className="p-1">Cod.</th><th className="p-1">Tipo</th></tr>
                                </thead>
                                <tbody>
                                    {parsedShifts.slice(0, 20).map((s, i) => (
                                        <tr key={i} className="border-t">
                                            <td className="p-1 truncate max-w-[60px]">{employees.find(e => e.employee_id === s.employee_id)?.first_name}</td>
                                            <td className="p-1">{new Date(s.start_time).getDate()}</td>
                                            <td className="p-1 font-bold">{s.notes}</td>
                                            <td className="p-1">{s.type === 'work' ? 'Trabajo' : 'Libranza'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button onClick={async () => { setIsImporting(true); await onImport(parsedShifts); onClose(); }} isLoading={isImporting} className="w-full">Confirmar e Importar</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImageImportModal;
