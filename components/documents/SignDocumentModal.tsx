
import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { CompanyDocument, DocumentSignature } from '../../types';
import SignaturePad from '../shared/SignaturePad';
import Spinner from '../shared/Spinner';

interface SignDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    document: CompanyDocument;
    signatureEntry: DocumentSignature;
    onSign: (signatureId: string, signatureUrl?: string) => Promise<void>;
}

const SignDocumentModal: React.FC<SignDocumentModalProps> = ({ isOpen, onClose, document, signatureEntry, onSign }) => {
    const [isSigning, setIsSigning] = useState(false);
    const [viewMode, setViewMode] = useState<'read' | 'sign'>('read');

    const handleAction = async (signatureDataUrl?: string) => {
        setIsSigning(true);
        try {
            await onSign(signatureEntry.id, signatureDataUrl);
            onClose();
        } catch (e) {
            alert("Error al firmar el documento.");
        } finally {
            setIsSigning(false);
        }
    };

    const isLink = document.type === 'link';
    const isPDF = document.type === 'file' && document.content_url.startsWith('data:application/pdf');
    const isImage = document.type === 'file' && document.content_url.startsWith('data:image');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={document.title}>
            <div className="space-y-4">
                <p className="text-gray-600 text-sm">{document.description}</p>

                {/* Content Viewer */}
                <div className="bg-gray-100 p-4 rounded-lg border min-h-[150px] flex flex-col items-center justify-center">
                    {isLink ? (
                        <div className="text-center">
                            <p className="mb-2 font-semibold">Este documento es un enlace externo:</p>
                            <a href={document.content_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
                                {document.content_url}
                            </a>
                            <p className="text-xs text-gray-500 mt-2">Por favor, haz clic para abrir y leer el contenido.</p>
                        </div>
                    ) : isImage ? (
                        <img src={document.content_url} alt="Documento" className="max-w-full max-h-96 object-contain" />
                    ) : (
                        <div className="text-center">
                            <p className="mb-4">Este documento es un archivo (PDF u otro).</p>
                            <a 
                                href={document.content_url} 
                                download={`documento_${document.document_id}`}
                                className="bg-white border border-gray-300 px-4 py-2 rounded shadow-sm hover:bg-gray-50 inline-flex items-center"
                            >
                                📥 Descargar Archivo
                            </a>
                        </div>
                    )}
                </div>

                {/* Action Area */}
                <div className="pt-4 border-t">
                    {document.requires_signature ? (
                        viewMode === 'read' ? (
                            <div className="text-center">
                                <p className="text-sm font-bold text-red-600 mb-2">⚠ Este documento requiere tu firma.</p>
                                <p className="text-xs text-gray-500 mb-4">Al firmar, confirmas que has leído y comprendido el documento.</p>
                                <Button onClick={() => setViewMode('sign')} className="w-full sm:w-auto">
                                    Firmar Documento
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm font-semibold">Firma aquí:</p>
                                {isSigning ? <Spinner /> : (
                                    <SignaturePad 
                                        onSave={(url) => handleAction(url)}
                                        onClear={() => {}}
                                    />
                                )}
                                <button onClick={() => setViewMode('read')} className="text-xs text-gray-500 underline text-center w-full block mt-2">Cancelar firma</button>
                            </div>
                        )
                    ) : (
                        <div className="text-center">
                            <p className="text-sm mb-4">Por favor, confirma que has recibido y leído esta documentación.</p>
                            <Button onClick={() => handleAction()} isLoading={isSigning} variant="success" className="w-full sm:w-auto">
                                ✅ Marcar como Leído
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default SignDocumentModal;
