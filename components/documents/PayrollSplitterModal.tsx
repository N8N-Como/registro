
import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { identifyPayrollPages, PayrollMapping } from '../../services/geminiService';
import { Employee } from '../../types';
import { blobToBase64 } from '../../utils/helpers';
import { DocumentIcon, CheckIcon, XMarkIcon } from '../icons';

interface PayrollSplitterModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: Employee[];
    onConfirm: (mappings: PayrollMapping[], fileData: string, onProgress: (current: number, total: number) => void) => Promise<void>;
}

const PayrollSplitterModal: React.FC<PayrollSplitterModalProps> = ({ isOpen, onClose, employees, onConfirm }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [mappings, setMappings] = useState<PayrollMapping[]>([]);
    const [pdfData, setPdfData] = useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (selected.size > 15 * 1024 * 1024) {
                alert("El archivo es demasiado grande (máx 15MB). Por favor, divide el PDF o comprímelo.");
                return;
            }
            setFile(selected);
            const base64 = await blobToBase64(selected);
            setPdfData(base64);
            setMappings([]);
        }
    };

    const handleAnalyze = async () => {
        if (!pdfData) return;
        setIsAnalyzing(true);
        try {
            const results = await identifyPayrollPages(pdfData, employees);
            if (!results || results.length === 0) {
                throw new Error("No se detectaron empleados en las páginas del PDF.");
            }
            setMappings(results);
        } catch (e: any) {
            alert("Error al analizar el PDF: " + (e.message || "La IA no pudo procesar el archivo."));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirm = async () => {
        if (!pdfData || mappings.length === 0) return;
        setIsSaving(true);
        setProgress({ current: 0, total: mappings.length });
        
        try {
            await onConfirm(mappings, pdfData, (current, total) => {
                setProgress({ current, total });
            });
            onClose();
        } catch (e: any) {
            console.error("Payroll Import Error:", e);
            alert(`Error al guardar las nóminas:\n${e.message || 'Fallo desconocido en la subida.'}\n\nSi el PDF es muy grande, intenta subirlo en grupos más pequeños.`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="IA Splitter: Gestión de Nóminas">
            <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-indigo-800">
                    <p className="font-bold text-indigo-900 mb-1">Paso 1: Subida de archivo único</p>
                    <p>Al confirmar, el sistema creará un documento privado para cada empleado detectado.</p>
                </div>

                {!file ? (
                    <label className="border-2 border-dashed border-indigo-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition-colors">
                        <DocumentIcon className="w-12 h-12 text-indigo-400 mb-2" />
                        <span className="font-bold text-indigo-600 text-center">Seleccionar PDF de Nóminas (Mes Completo)</span>
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />
                    </label>
                ) : (
                    <div className="p-4 border rounded-lg bg-white flex items-center justify-between shadow-sm">
                        <div className="flex items-center">
                            <DocumentIcon className="w-8 h-8 text-red-500 mr-3" />
                            <div className="min-w-0">
                                <p className="font-bold text-sm truncate max-w-[200px]">{file.name}</p>
                                <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        {mappings.length === 0 && !isAnalyzing && (
                            <Button size="sm" onClick={handleAnalyze}>Analizar Páginas</Button>
                        )}
                        {mappings.length > 0 && (
                            <button onClick={() => { setFile(null); setMappings([]); setPdfData(null); }} className="text-gray-400 hover:text-red-500">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {isAnalyzing && (
                    <div className="text-center py-6">
                        <Spinner />
                        <p className="text-xs font-bold text-indigo-600 mt-2 animate-pulse uppercase tracking-widest">La IA está identificando a los empleados...</p>
                    </div>
                )}

                {isSaving && (
                    <div className="bg-white border rounded-lg p-6 shadow-lg">
                        <p className="text-sm font-bold text-gray-700 mb-2">Creando documentos individuales (LOPD)...</p>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                            <div 
                                className="bg-green-500 h-3 rounded-full transition-all duration-300" 
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-center text-xs font-black text-primary">
                            PROCESANDO {progress.current} DE {progress.total}
                        </p>
                        <p className="text-[10px] text-gray-400 text-center mt-2 italic">Esto puede tardar unos segundos dependiendo del tamaño del PDF.</p>
                    </div>
                )}

                {mappings.length > 0 && !isSaving && (
                    <div className="border rounded-lg overflow-hidden border-indigo-100">
                        <div className="bg-indigo-50 p-2 text-[10px] font-black border-b text-indigo-700 uppercase tracking-wider">
                            Páginas Identificadas ({mappings.length})
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {mappings.map((m, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border-b last:border-0 text-sm hover:bg-gray-50">
                                    <div className="flex items-center">
                                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold mr-3 text-gray-500">{m.page_number}</span>
                                        <span className="font-semibold text-gray-700">{m.employee_name}</span>
                                    </div>
                                    <CheckIcon className="w-5 h-5 text-green-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-4 flex justify-end space-x-2 border-t">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving || isAnalyzing}>Cancelar</Button>
                    {mappings.length > 0 && !isSaving && (
                        <Button onClick={handleConfirm} variant="success">
                            Confirmar y Enviar {mappings.length} Nóminas
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PayrollSplitterModal;
