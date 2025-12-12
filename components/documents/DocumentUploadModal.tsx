
import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { Employee, DocumentType } from '../../types';
import { blobToBase64 } from '../../utils/helpers';

interface DocumentUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (docData: { title: string; description: string; type: DocumentType; content_url: string; requires_signature: boolean; target_employee_ids: string[] }) => void;
    employees: Employee[];
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ isOpen, onClose, onSave, employees }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<DocumentType>('file');
    const [requiresSignature, setRequiresSignature] = useState(true);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all');
    
    // File/Link State
    const [linkUrl, setLinkUrl] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            let finalContentUrl = '';

            if (type === 'link') {
                if (!linkUrl) throw new Error("Debes introducir un enlace.");
                finalContentUrl = linkUrl;
            } else {
                if (!selectedFile) throw new Error("Debes seleccionar un archivo.");
                // NOTE: In a real app, upload to storage bucket here. For demo, using Base64.
                // Warning: This is heavy for the DB.
                if (selectedFile.size > 2 * 1024 * 1024) { // 2MB limit warning
                    alert("Aviso: El archivo es grande. En una aplicación real esto se subiría a un Storage.");
                }
                finalContentUrl = await blobToBase64(selectedFile);
            }

            const targets = targetMode === 'all' 
                ? employees.map(e => e.employee_id) 
                : selectedEmployees;

            if (targets.length === 0) {
                throw new Error("Debes seleccionar al menos un empleado.");
            }

            onSave({
                title,
                description,
                type,
                content_url: finalContentUrl,
                requires_signature: requiresSignature,
                target_employee_ids: targets
            });
            onClose();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleEmployee = (id: string) => {
        setSelectedEmployees(prev => 
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Enviar Documento / Comunicación">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Título del Documento</label>
                    <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Manual PRL, Nuevo Contrato..." />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                    <textarea className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo</label>
                        <select className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={type} onChange={e => setType(e.target.value as DocumentType)}>
                            <option value="file">Archivo (PDF, Imagen)</option>
                            <option value="link">Enlace Web</option>
                        </select>
                    </div>
                    <div className="flex items-center pt-6">
                        <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded text-primary focus:ring-primary" checked={requiresSignature} onChange={e => setRequiresSignature(e.target.checked)} />
                            <span className="text-sm font-medium text-gray-700">Requiere Firma</span>
                        </label>
                    </div>
                </div>

                {type === 'link' ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Enlace (URL)</label>
                        <input type="url" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Archivo</label>
                        <input type="file" required onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                )}

                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destinatarios</label>
                    <div className="flex space-x-4 mb-2">
                        <label className="flex items-center">
                            <input type="radio" name="target" value="all" checked={targetMode === 'all'} onChange={() => setTargetMode('all')} className="mr-2" />
                            Todos
                        </label>
                        <label className="flex items-center">
                            <input type="radio" name="target" value="specific" checked={targetMode === 'specific'} onChange={() => setTargetMode('specific')} className="mr-2" />
                            Seleccionar
                        </label>
                    </div>
                    
                    {targetMode === 'specific' && (
                        <div className="max-h-40 overflow-y-auto border rounded-md p-2 bg-gray-50 grid grid-cols-2 gap-2">
                            {employees.map(emp => (
                                <label key={emp.employee_id} className="flex items-center space-x-2 text-sm">
                                    <input type="checkbox" checked={selectedEmployees.includes(emp.employee_id)} onChange={() => toggleEmployee(emp.employee_id)} className="rounded text-primary" />
                                    <span>{emp.first_name} {emp.last_name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
                    <Button type="submit" isLoading={isProcessing}>Enviar Documento</Button>
                </div>
            </form>
        </Modal>
    );
};

export default DocumentUploadModal;
