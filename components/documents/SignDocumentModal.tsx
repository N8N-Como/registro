
import React, { useState, useEffect } from 'react';
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

    // AUDITORÍA: En cuanto el modal se abre, si el estado es 'pending', marcamos como 'viewed' (VISTO)
    useEffect(() => {
        if (isOpen && signatureEntry.status === 'pending') {
            onSign(signatureEntry.id); // Llama a markDocumentAsViewed internamente
        }
    }, [isOpen]);

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
                <div className="bg-blue-50 p-3 rounded text-[10px] font-bold text-blue-800 uppercase tracking-tighter border border-blue-100">
                    ℹ️ Tu acceso a este documento está siendo registrado para fines de auditoría.
                </div>
                
                <p className="text-gray-600 text-sm">{document.description}</p>

                {/* Content Viewer */}
                <div className="bg-gray-100 p-4 rounded-lg border min-h-[150px] flex flex-col items-center justify-center">
                    {isLink ? (
                        <div className="text-center">
                            <p className="mb-2 font-semibold">Este documento es un enlace externo:</p>
                            <a href={document.content_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold break-all">
                                {document.content_url}
                            </a>
                            <p className="text-xs text-gray-500 mt-2 italic">Haz clic arriba para leer. El sistema registrará que lo has abierto.</p>
                        </div>
                    ) : isImage ? (
                        <img src={document.content_url} alt="Documento" className="max-w-full max-h-96 object-contain shadow-sm rounded" />
                    ) : (
                        <div className="text-center">
                            <p className="mb-4 font-medium">Contenido listo para visualizar o descargar.</p>
                            <a 
                                href={document.content_url} 
                                download={`${document.title.replace(/\s+/g, '_')}.pdf`}
                                className="bg-primary text-white px-6 py-3 rounded-xl shadow-lg hover:bg-primary-dark transition-all flex items-center font-bold"
                                onClick={() => signatureEntry.status === 'pending' && onSign(signatureEntry.id)}
                            >
                                <span className="mr-2 text-xl">📥</span> Descargar Documento Privado
                            </a>
                        </div>
                    )}
                </div>

                {/* Action Area */}
                <div className="pt-4 border-t">
                    {document.requires_signature ? (
                        signatureEntry.status === 'signed' ? (
                            <div className="bg-green-50 p-4 rounded-lg text-center">
                                <p className="text-green-800 font-bold">✓ Has firmado este documento correctamente.</p>
                                <p className="text-xs text-green-600 mt-1">Fecha de firma: {new Date(signatureEntry.signed_at!).toLocaleString()}</p>
                            </div>
                        ) : (
                            viewMode === 'read' ? (
                                <div className="text-center">
                                    <p className="text-sm font-bold text-red-600 mb-2">⚠ REQUIERE FIRMA DIGITAL</p>
                                    <p className="text-xs text-gray-500 mb-4">Confirmas que has descargado/leído la información.</p>
                                    <Button onClick={() => setViewMode('sign')} className="w-full shadow-md">
                                        Firmar Ahora
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-sm font-black text-gray-800 uppercase text-center mb-2 tracking-widest">Firma Digital</p>
                                    {isSigning ? <Spinner /> : (
                                        <SignaturePad 
                                            onSave={(url) => handleAction(url)}
                                            onClear={() => {}}
                                        />
                                    )}
                                    <button onClick={() => setViewMode('read')} className="text-xs text-gray-500 underline text-center w-full block mt-2">Cerrar firma</button>
                                </div>
                            )
                        )
                    ) : (
                        <div className="text-center">
                            <p className="text-sm mb-4">No requiere firma. Al cerrar este mensaje el administrador verá que lo has leído.</p>
                            <Button onClick={onClose} variant="success" className="w-full">
                                ✅ Entendido y Leído
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default SignDocumentModal;
