
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
    onConfirm: (mappings: PayrollMapping[], fileData: string) => Promise<void>;
}

const PayrollSplitterModal: React.FC<PayrollSplitterModalProps> = ({ isOpen, onClose, employees, onConfirm }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mappings, setMappings] = useState<PayrollMapping[]>([]);
    const [pdfData, setPdfData] = useState<string | null>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            const base64 = await blobToBase64(selected);
            setPdfData(base64);
        }
    };

    const handleAnalyze = async () => {
        if (!pdfData) return;
        setIsAnalyzing(true);
        try {
            const results = await identifyPayrollPages(pdfData, employees);
            setMappings(results);
        } catch (e) {
            alert("Error al analizar el PDF.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirm = async () => {
        if (!pdfData) return;
        setIsSaving(true);
        try {
            await onConfirm(mappings, pdfData);
            onClose();
        } catch (e) {
            alert("Error al guardar las nóminas.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="IA Splitter: Gestión de Nóminas">
            <div className="space-y-4">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-indigo-800">
                    <p className="font-bold">¿Cómo funciona?</p>
                    <p>Sube el PDF único que contiene todas las nóminas del mes. La IA detectará automáticamente a quién pertenece cada página y creará registros individuales privados.</p>
                </div>

                {!file ? (
                    <label className="border-2 border-dashed border-indigo-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition-colors">
                        <DocumentIcon className="w-12 h-12 text-indigo-400 mb-2" />
                        <span className="font-bold text-indigo-600">Seleccionar PDF de Nóminas</span>
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />
                    </label>
                ) : (
                    <div className="p-4 border rounded-lg bg-white flex items-center justify-between">
                        <div className="flex items-center">
                            <DocumentIcon className="w-8 h-8 text-red-500 mr-3" />
                            <div>
                                <p className="font-bold text-sm truncate max-w-[200px]">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        {mappings.length === 0 && (
                            <Button size="sm" onClick={handleAnalyze} isLoading={isAnalyzing}>Analizar</Button>
                        )}
                    </div>
                )}

                {isAnalyzing && (
                    <div className="text-center py-6">
                        <Spinner />
                        <p className="text-xs font-bold text-indigo-600 mt-2 animate-pulse">La IA está leyendo el documento...</p>
                    </div>
                )}

                {mappings.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 p-2 text-xs font-bold border-b">Páginas Identificadas ({mappings.length})</div>
                        <div className="max-h-48 overflow-y-auto">
                            {mappings.map((m, i) => (
                                <div key={i} className="flex items-center justify-between p-2 border-b last:border-0 text-xs">
                                    <span>Pág. {m.page_number}</span>
                                    <span className="font-bold text-indigo-700">{m.employee_name}</span>
                                    <CheckIcon className="w-4 h-4 text-green-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="pt-4 flex justify-end space-x-2 border-t">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    {mappings.length > 0 && (
                        <Button onClick={handleConfirm} isLoading={isSaving} variant="success">Confirmar y Enviar</Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PayrollSplitterModal;
