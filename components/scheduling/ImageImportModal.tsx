
import React, { useState } from 'react';
import { Employee, Location, WorkShift, ShiftConfig } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { CalendarIcon, CheckIcon } from '../icons';
import { blobToBase64 } from '../../utils/helpers';
import { parseScheduleImage } from '../../services/geminiService';
import { createBulkWorkShifts } from '../../services/mockApi';

interface ImageImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: () => Promise<void>;
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
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        const base64 = await blobToBase64(selectedFile, 3000, 0.9); 
        setPreviewUrl(base64);
        setParsedShifts([]);
    };

    const handleAnalyze = async () => {
        if (!previewUrl) return;
        setIsAnalyzing(true);
        try {
            const rawData = await parseScheduleImage(previewUrl, employees, shiftConfigs, currentMonth + 1, currentYear);
            
            const shifts: Omit<WorkShift, 'shift_id'>[] = rawData.map(item => {
                const day = item.day;
                // Formato YYYY-MM-DD manual para evitar desfase UTC
                const datePart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                const code = item.shift_code.trim().toUpperCase();
                const config = shiftConfigs.find(c => c.code.toUpperCase() === code);
                
                let startT = config?.start_time || '08:00';
                let endT = config?.end_time || '16:00';
                let color = config?.color || '#3b82f6';
                let type: any = 'work';

                // Mapeo Inteligente para códigos especiales
                if (['L', 'LIBRE', 'D', 'DESCANSO'].includes(code)) { 
                    type = 'off'; color = '#9ca3af'; startT = '00:00'; endT = '00:00'; 
                }
                else if (code.startsWith('V')) { 
                    type = 'vacation'; color = '#10b981'; startT = '00:00'; endT = '00:00'; 
                }
                else if (['B', 'BM', 'BH'].includes(code)) { 
                    type = 'sick'; color = '#ef4444'; startT = '00:00'; endT = '00:00'; 
                }
                else if (['P', 'MM', 'AD', 'R', 'TH'].includes(code) && !config) { 
                    color = '#f59e0b'; 
                }

                return {
                    employee_id: item.employee_id,
                    start_time: `${datePart}T${startT}:00`,
                    end_time: `${datePart}T${endT}:00`,
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

    const handleConfirmImport = async () => {
        if (parsedShifts.length === 0) return;
        setIsSaving(true);
        setSaveProgress({ current: 0, total: parsedShifts.length });

        try {
            // Guardar en bloques de 50 para no saturar y dar feedback visual
            const chunkSize = 50;
            for (let i = 0; i < parsedShifts.length; i += chunkSize) {
                const chunk = parsedShifts.slice(i, i + chunkSize);
                await createBulkWorkShifts(chunk);
                setSaveProgress(prev => ({ ...prev, current: Math.min(i + chunkSize, parsedShifts.length) }));
            }
            
            alert(`¡Importación exitosa! Se han guardado ${parsedShifts.length} turnos.`);
            await onImport();
            onClose();
        } catch (error) {
            alert("Error al guardar los turnos. Revisa tu conexión.");
        } finally {
            setIsSaving(false);
        }
    };

    const getEmpName = (id: string) => employees.find(e => e.employee_id === id)?.first_name || 'Desconocido';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="IA Import: Analizador de Imagen">
            <div className="space-y-4">
                {!parsedShifts.length && !isAnalyzing && (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center border-primary bg-blue-50">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded shadow" />
                        ) : (
                            <label className="cursor-pointer block">
                                <CalendarIcon className="w-12 h-12 text-primary mx-auto mb-2" />
                                <span className="text-primary font-bold block">Seleccionar Foto del Cuadrante</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                            </label>
                        )}
                    </div>
                )}

                {file && !isAnalyzing && !parsedShifts.length && (
                    <Button onClick={handleAnalyze} className="w-full" size="lg">Detectar Turnos con IA</Button>
                )}

                {isAnalyzing && (
                    <div className="text-center py-10 bg-white rounded-xl shadow-inner border">
                        <Spinner />
                        <p className="text-xs mt-4 font-black text-primary animate-pulse uppercase tracking-widest">Escaneando filas y columnas...</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase">Esto puede tardar hasta 30 segundos</p>
                    </div>
                )}

                {isSaving && (
                    <div className="text-center py-10 bg-white rounded-xl shadow-lg border-2 border-primary">
                        <p className="font-black text-primary uppercase text-sm mb-4">Guardando Cuadrante Progresivo...</p>
                        <div className="w-full bg-gray-200 rounded-full h-4 mb-2 max-w-xs mx-auto overflow-hidden border">
                            <div 
                                className="bg-primary h-full transition-all duration-300" 
                                style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-xs font-bold text-gray-500">{saveProgress.current} de {saveProgress.total} turnos procesados</p>
                    </div>
                )}

                {parsedShifts.length > 0 && !isSaving && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex justify-between items-center">
                            <span className="text-sm font-bold text-green-800 uppercase tracking-tighter">Turnos Detectados: {parsedShifts.length}</span>
                            <CheckIcon className="text-green-600"/>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto border rounded-xl bg-gray-50 p-2 text-[9px] uppercase font-bold">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-gray-100 border-b">
                                    <tr><th className="p-1">Empleado</th><th className="p-1">Día</th><th className="p-1">Código</th></tr>
                                </thead>
                                <tbody>
                                    {parsedShifts.slice(0, 50).map((s, idx) => (
                                        <tr key={idx} className="border-b last:border-0">
                                            <td className="p-1 truncate">{getEmpName(s.employee_id)}</td>
                                            <td className="p-1">{s.start_time.split('T')[0].split('-').pop()}</td>
                                            <td className="p-1"><span className="px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: s.color }}>{s.notes}</span></td>
                                        </tr>
                                    ))}
                                    {parsedShifts.length > 50 && <tr><td colSpan={3} className="p-2 text-center text-gray-400 italic">Previsualizando los primeros 50 registros...</td></tr>}
                                </tbody>
                            </table>
                        </div>

                        <Button onClick={handleConfirmImport} variant="success" className="w-full py-4 text-lg shadow-xl">
                            Confirmar Carga de {parsedShifts.length} Registros
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ImageImportModal;
