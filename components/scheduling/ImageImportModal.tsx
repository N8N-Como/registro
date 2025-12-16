
import React, { useState, useRef } from 'react';
import { Employee, Location, WorkShift, ShiftConfig, ShiftType } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { CheckIcon, XMarkIcon, SparklesIcon, CalendarIcon } from '../icons';
import { blobToBase64 } from '../../utils/helpers';
import { parseScheduleImage, ParsedShiftFromImage } from '../../services/geminiService';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        
        setFile(selectedFile);
        // INCREASED RESOLUTION: 2500px width ensures text is readable for full-month schedules
        const base64 = await blobToBase64(selectedFile, 2500, 0.85); 
        setPreviewUrl(base64);
        setParsedShifts([]); // Reset previous
    };

    const handleAnalyze = async () => {
        if (!previewUrl) return;
        setIsAnalyzing(true);
        try {
            const rawData = await parseScheduleImage(previewUrl, employees, shiftConfigs, currentMonth + 1, currentYear);
            
            // Transform raw AI data into App WorkShifts
            const shifts: Omit<WorkShift, 'shift_id'>[] = rawData.map(item => {
                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${item.day.toString().padStart(2, '0')}`;
                
                let startISO = '';
                let endISO = '';
                let type: ShiftType = 'work';
                let color = '#9ca3af'; // default grey
                let shiftConfigId = undefined;
                let locationId = undefined;
                
                // Clean code (remove whitespace)
                const code = item.shift_code.trim().toUpperCase();

                // Match with Shift Configs (M, T, MM, etc.)
                // Priority exact match
                const config = shiftConfigs.find(c => c.code.toUpperCase() === code);
                
                if (config) {
                    startISO = `${dateStr}T${config.start_time}:00`;
                    endISO = `${dateStr}T${config.end_time}:00`;
                    color = config.color;
                    shiftConfigId = config.config_id;
                    locationId = config.location_id; 
                } else {
                    // Handle Special Codes (L, V, etc.) if not in config
                    if (code.startsWith('L')) { // Libre
                        type = 'off';
                        startISO = `${dateStr}T00:00:00`;
                        endISO = `${dateStr}T23:59:59`;
                    } else if (code.startsWith('V') || code.startsWith('V25')) { // Vacaciones
                        type = 'vacation';
                        color = '#10b981';
                        startISO = `${dateStr}T00:00:00`;
                        endISO = `${dateStr}T23:59:59`;
                    } else if (code.startsWith('B')) { // Baja
                        type = 'sick';
                        color = '#ef4444';
                        startISO = `${dateStr}T00:00:00`;
                        endISO = `${dateStr}T23:59:59`;
                    } else if (code.startsWith('P')) { // Partido default
                         type = 'work';
                         startISO = `${dateStr}T09:00:00`; 
                         endISO = `${dateStr}T18:00:00`;
                         color = '#86efac';
                    } else {
                        // Fallback for unknown work codes
                        type = 'work';
                        startISO = `${dateStr}T09:00:00`; 
                        endISO = `${dateStr}T17:00:00`;
                    }
                }

                return {
                    employee_id: item.employee_id,
                    start_time: new Date(startISO).toISOString(),
                    end_time: new Date(endISO).toISOString(),
                    type,
                    color,
                    shift_config_id: shiftConfigId,
                    location_id: locationId || undefined, 
                    // CRITICAL FIX: Store the CODE in notes so it persists even if DB schema strips the config relation
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

    const handleConfirmImport = async () => {
        if (parsedShifts.length === 0) return;
        setIsImporting(true);
        try {
            await onImport(parsedShifts);
            onClose();
        } catch (error) {
            alert("Error al guardar los turnos.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Cuadrante con IA">
            <div className="space-y-6">
                
                {/* Step 1: Upload */}
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${previewUrl ? 'border-primary' : 'border-gray-300'}`}>
                    {previewUrl ? (
                        <div className="relative">
                            <img src={previewUrl} alt="Cuadrante" className="max-h-64 mx-auto rounded shadow" />
                            <button 
                                onClick={() => { setFile(null); setPreviewUrl(null); setParsedShifts([]); }}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <label className="cursor-pointer block">
                            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                            <span className="text-gray-600 block">Haz clic para subir una foto del cuadrante</span>
                            <span className="text-xs text-gray-400">Formatos: PNG, JPG</span>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileSelect} 
                            />
                        </label>
                    )}
                </div>

                {/* Step 2: Analyze */}
                {file && !isAnalyzing && parsedShifts.length === 0 && (
                    <div className="text-center">
                        <Button onClick={handleAnalyze} className="w-full sm:w-auto flex items-center justify-center gap-2">
                            <SparklesIcon className="w-5 h-5" />
                            Analizar Imagen con IA
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">La IA leerá los nombres y códigos de turno (M, T, V25...) automáticamente.</p>
                    </div>
                )}

                {isAnalyzing && (
                    <div className="text-center py-8">
                        <Spinner size="lg" />
                        <p className="text-sm text-gray-600 mt-4 animate-pulse">Interpretando cuadrante...</p>
                    </div>
                )}

                {/* Step 3: Review & Import */}
                {parsedShifts.length > 0 && (
                    <div className="space-y-4">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-green-800">¡Lectura Completada!</p>
                                <p className="text-sm text-green-700">Se han detectado {parsedShifts.length} turnos.</p>
                            </div>
                            <CheckIcon className="w-8 h-8 text-green-600" />
                        </div>

                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-2">Empleado</th>
                                        <th className="p-2">Día</th>
                                        <th className="p-2">Turno</th>
                                        <th className="p-2">Ubicación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedShifts.map((shift, idx) => {
                                        const emp = employees.find(e => e.employee_id === shift.employee_id);
                                        const loc = locations.find(l => l.location_id === shift.location_id);
                                        
                                        return (
                                            <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="p-2 font-medium">{emp?.first_name}</td>
                                                <td className="p-2">{new Date(shift.start_time).getDate()}</td>
                                                <td className="p-2 font-bold text-blue-600">
                                                    {shift.notes}
                                                </td>
                                                <td className="p-2 text-gray-500 italic">
                                                    {loc ? loc.name : 'Virtual / Teletrabajo'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={onClose} disabled={isImporting}>Cancelar</Button>
                            <Button onClick={handleConfirmImport} isLoading={isImporting}>
                                Confirmar e Importar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImageImportModal;
