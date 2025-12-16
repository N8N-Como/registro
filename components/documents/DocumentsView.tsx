
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { getDocuments, createDocument, getEmployeeDocuments, signDocument, markDocumentAsViewed, getEmployees, getDocumentSignatures } from '../../services/mockApi';
import { CompanyDocument, Employee, DocumentSignature } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { DocumentIcon, PaperClipIcon, CheckIcon, XMarkIcon } from '../icons';
import DocumentUploadModal from './DocumentUploadModal';
import SignDocumentModal from './SignDocumentModal';
import AIAssistant, { InputMode } from '../shared/AIAssistant';
import { AIResponse } from '../../services/geminiService';

const DocumentsView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdminMode, setIsAdminMode] = useState(false);
    
    // Data
    const [adminDocuments, setAdminDocuments] = useState<CompanyDocument[]>([]);
    const [myDocuments, setMyDocuments] = useState<(DocumentSignature & { document: CompanyDocument })[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [signaturesMap, setSignaturesMap] = useState<Record<string, DocumentSignature[]>>({});

    // UI
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [selectedDocToSign, setSelectedDocToSign] = useState<{ doc: CompanyDocument, sig: DocumentSignature } | null>(null);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            if (!auth?.employee) return;
            
            const hasAdminPerms = auth.role?.permissions.includes('manage_employees') || auth.role?.role_id === 'admin';
            setIsAdminMode(hasAdminPerms);

            try {
                if (hasAdminPerms) {
                    const [docs, emps] = await Promise.all([getDocuments(), getEmployees()]);
                    setAdminDocuments(docs);
                    setEmployees(emps);
                    
                    const sigs: Record<string, DocumentSignature[]> = {};
                    for (const doc of docs) {
                        sigs[doc.document_id] = await getDocumentSignatures(doc.document_id);
                    }
                    setSignaturesMap(sigs);

                } else {
                    const myDocs = await getEmployeeDocuments(auth.employee.employee_id);
                    setMyDocuments(myDocs.sort((a,b) => new Date(b.document.created_at).getTime() - new Date(a.document.created_at).getTime()));
                }
            } catch (e) {
                console.error("Error loading documents", e);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [auth?.employee]);

    const handleCreateDocument = async (data: any) => {
        if (!auth?.employee) return;
        try {
            await createDocument({
                ...data,
                created_by: auth.employee.employee_id
            }, data.target_employee_ids);
            
            const docs = await getDocuments();
            setAdminDocuments(docs);
            const newSigs = await getDocumentSignatures(docs[0].document_id);
            setSignaturesMap(prev => ({...prev, [docs[0].document_id]: newSigs}));

        } catch (e) {
            console.error(e);
            alert("Error al crear documento");
        }
    };

    const handleAIAction = async (response: AIResponse) => {
        if (response.action === 'createDocument' && response.data && auth?.employee) {
            try {
                // Default target: all employees
                const allIds = employees.map(e => e.employee_id);
                await createDocument({
                    title: response.data.title,
                    description: response.data.description || '',
                    type: response.data.type || 'link',
                    content_url: response.data.url || '#',
                    requires_signature: response.data.requires_signature || false,
                    created_by: auth.employee.employee_id
                }, allIds);
                
                // Refresh
                const docs = await getDocuments();
                setAdminDocuments(docs);
            } catch (e) { console.error(e); }
        }
    };

    const handleSignDocument = async (sigId: string, url?: string) => {
        if (url) {
            await signDocument(sigId, url);
        } else {
            await markDocumentAsViewed(sigId);
        }
        if (auth?.employee) {
            const myDocs = await getEmployeeDocuments(auth.employee.employee_id);
            setMyDocuments(myDocs.sort((a,b) => new Date(b.document.created_at).getTime() - new Date(a.document.created_at).getTime()));
        }
    };

    const openSignModal = (item: DocumentSignature & { document: CompanyDocument }) => {
        setSelectedDocToSign({ doc: item.document, sig: item });
        setIsSignModalOpen(true);
    };

    // Role Logic
    let allowedInputs: InputMode[] = ['voice'];
    const role = auth?.role?.role_id || '';
    if (['admin', 'receptionist', 'gobernanta', 'revenue'].includes(role)) {
        allowedInputs = ['text', 'voice', 'image'];
    }

    if (isLoading) return <Spinner />;

    // --- RENDER ADMIN VIEW ---
    if (isAdminMode) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <DocumentIcon className="text-primary" />
                        Gestión Documental
                    </h2>
                    <Button onClick={() => setIsUploadModalOpen(true)}>+ Nuevo Documento</Button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {adminDocuments.map(doc => {
                        const sigs = signaturesMap[doc.document_id] || [];
                        const total = sigs.length;
                        const signed = sigs.filter(s => s.status !== 'pending').length;
                        const percentage = total > 0 ? Math.round((signed / total) * 100) : 0;

                        return (
                            <Card key={doc.document_id} className="overflow-hidden">
                                <div className="flex flex-col md:flex-row justify-between p-4 bg-gray-50 border-b">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{doc.title}</h3>
                                        <p className="text-sm text-gray-500">{doc.description}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                            <span className="uppercase bg-white border px-1 rounded">{doc.type}</span>
                                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                            {doc.requires_signature && <span className="text-red-500 font-semibold">• Requiere Firma</span>}
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0 flex flex-col items-end justify-center min-w-[200px]">
                                        <div className="text-sm font-semibold mb-1 text-gray-600">Estado de Firmas</div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-300">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${percentage}%`}}></div>
                                        </div>
                                        <div className="text-xs text-right mt-1">{signed} de {total} ({percentage}%)</div>
                                    </div>
                                </div>
                                <div className="p-4 max-h-40 overflow-y-auto bg-white">
                                    <table className="w-full text-sm text-left">
                                        <thead>
                                            <tr className="text-xs text-gray-500 border-b">
                                                <th className="pb-2">Empleado</th>
                                                <th className="pb-2 text-right">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sigs.map(sig => {
                                                const emp = employees.find(e => e.employee_id === sig.employee_id);
                                                return (
                                                    <tr key={sig.id} className="border-b last:border-0 hover:bg-gray-50">
                                                        <td className="py-2">{emp?.first_name} {emp?.last_name}</td>
                                                        <td className="py-2 text-right">
                                                            {sig.status === 'pending' ? (
                                                                <span className="text-red-500 font-semibold text-xs">Pendiente</span>
                                                            ) : (
                                                                <span className="text-green-600 font-semibold text-xs flex justify-end items-center gap-1">
                                                                    <CheckIcon className="w-3 h-3" /> 
                                                                    {sig.status === 'signed' ? 'Firmado' : 'Leído'}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {isUploadModalOpen && (
                    <DocumentUploadModal 
                        isOpen={isUploadModalOpen} 
                        onClose={() => setIsUploadModalOpen(false)} 
                        onSave={handleCreateDocument}
                        employees={employees}
                    />
                )}

                <AIAssistant 
                    context={{ employees, locations: [], currentUser: auth?.employee || undefined }} 
                    onAction={handleAIAction}
                    allowedInputs={allowedInputs}
                />
            </div>
        );
    }

    // --- RENDER EMPLOYEE VIEW ---
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <PaperClipIcon className="text-primary" />
                Mis Documentos y Comunicados
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myDocuments.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-500 bg-white rounded-lg shadow">
                        No tienes documentos pendientes ni historial.
                    </div>
                ) : (
                    myDocuments.map(item => {
                        const isPending = item.status === 'pending';
                        return (
                            <div key={item.id} className={`border rounded-lg p-4 bg-white shadow-sm flex flex-col relative ${isPending ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-green-500'}`}>
                                {isPending && <span className="absolute top-2 right-2 bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded">Pendiente</span>}
                                {!isPending && <span className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">Completado</span>}
                                
                                <h3 className="font-bold text-gray-800 mt-2 mb-1">{item.document.title}</h3>
                                <p className="text-sm text-gray-500 flex-grow mb-4">{item.document.description}</p>
                                
                                <div className="text-xs text-gray-400 mb-4">
                                    Recibido: {new Date(item.document.created_at).toLocaleDateString()}
                                </div>

                                <Button 
                                    onClick={() => openSignModal(item)} 
                                    variant={isPending ? 'primary' : 'secondary'}
                                    className="w-full"
                                >
                                    {isPending ? (item.document.requires_signature ? 'Leer y Firmar' : 'Leer y Confirmar') : 'Ver Detalles'}
                                </Button>
                            </div>
                        );
                    })
                )}
            </div>

            {isSignModalOpen && selectedDocToSign && (
                <SignDocumentModal 
                    isOpen={isSignModalOpen}
                    onClose={() => setIsSignModalOpen(false)}
                    document={selectedDocToSign.doc}
                    signatureEntry={selectedDocToSign.sig}
                    onSign={handleSignDocument}
                />
            )}
        </div>
    );
};

export default DocumentsView;
