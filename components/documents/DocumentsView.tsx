
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { getDocuments, createDocument, getEmployeeDocuments, signDocument, markDocumentAsViewed, getEmployees, getDocumentSignatures } from '../../services/mockApi';
import { CompanyDocument, Employee, DocumentSignature } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { DocumentIcon, PaperClipIcon, SparklesIcon } from '../icons';
import DocumentUploadModal from './DocumentUploadModal';
import SignDocumentModal from './SignDocumentModal';
import PayrollSplitterModal from './PayrollSplitterModal';
import { PayrollMapping } from '../../services/geminiService';

const DocumentsView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdminMode, setIsAdminMode] = useState(false);
    
    const [adminDocuments, setAdminDocuments] = useState<CompanyDocument[]>([]);
    const [myDocuments, setMyDocuments] = useState<(DocumentSignature & { document: CompanyDocument })[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [signaturesMap, setSignaturesMap] = useState<Record<string, DocumentSignature[]>>({});

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [selectedDocToSign, setSelectedDocToSign] = useState<{ doc: CompanyDocument, sig: DocumentSignature } | null>(null);

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
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    useEffect(() => { init(); }, [auth?.employee]);

    const handleCreateDocument = async (data: any) => {
        if (!auth?.employee) return;
        try {
            await createDocument({ ...data, created_by: auth.employee.employee_id }, data.target_employee_ids);
            init();
        } catch (e) { alert("Error al crear documento"); }
    };

    const handlePayrollConfirm = async (mappings: PayrollMapping[], fileData: string) => {
        if (!auth?.employee) return;
        const monthYear = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        
        for (const mapping of mappings) {
            // Nota: En una implementación real, aquí se extraería solo la página del PDF.
            // Para este prototipo, guardamos el documento referenciando al empleado identificado.
            await createDocument({
                title: `Nómina ${monthYear}`,
                description: `Documento confidencial para ${mapping.employee_name}. Página ${mapping.page_number} del archivo mensual.`,
                type: 'file',
                content_url: fileData,
                requires_signature: true,
                created_by: auth.employee.employee_id
            }, [mapping.employee_id]);
        }
        init();
    };

    const handleSignDocument = async (sigId: string, url?: string) => {
        if (url) await signDocument(sigId, url);
        else await markDocumentAsViewed(sigId);
        if (auth?.employee) {
            const myDocs = await getEmployeeDocuments(auth.employee.employee_id);
            setMyDocuments(myDocs.sort((a,b) => new Date(b.document.created_at).getTime() - new Date(a.document.created_at).getTime()));
        }
    };

    if (isLoading) return <Spinner />;

    if (isAdminMode) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                        <DocumentIcon /> Gestión Documental
                    </h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="secondary" onClick={() => setIsPayrollModalOpen(true)} className="flex-1">
                            <SparklesIcon className="w-4 h-4 mr-2" /> Splitter Nóminas
                        </Button>
                        <Button onClick={() => setIsUploadModalOpen(true)} className="flex-1">+ Nuevo</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {adminDocuments.map(doc => {
                        const sigs = signaturesMap[doc.document_id] || [];
                        const total = sigs.length;
                        const signed = sigs.filter(s => s.status !== 'pending').length;
                        const percentage = total > 0 ? Math.round((signed / total) * 100) : 0;
                        return (
                            <Card key={doc.document_id} className="overflow-hidden p-0">
                                <div className="p-4 flex flex-col md:flex-row justify-between border-b bg-gray-50">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{doc.title}</h3>
                                        <p className="text-xs text-gray-500">{doc.description}</p>
                                    </div>
                                    <div className="mt-2 md:mt-0 flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-gray-400 uppercase">Firmas</p>
                                            <p className="text-sm font-black text-primary">{signed} / {total}</p>
                                        </div>
                                        <div className="w-24 bg-gray-200 rounded-full h-2">
                                            <div className="bg-primary h-2 rounded-full" style={{width: `${percentage}%`}}></div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {isUploadModalOpen && <DocumentUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSave={handleCreateDocument} employees={employees} />}
                {isPayrollModalOpen && <PayrollSplitterModal isOpen={isPayrollModalOpen} onClose={() => setIsPayrollModalOpen(false)} employees={employees} onConfirm={handlePayrollConfirm} />}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><PaperClipIcon /> Mis Documentos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myDocuments.map(item => (
                    <Card key={item.id} className={`border-l-4 ${item.status === 'pending' ? 'border-orange-500' : 'border-green-500'}`}>
                        <h3 className="font-bold mb-2">{item.document.title}</h3>
                        <p className="text-sm text-gray-500 mb-4 h-12 overflow-hidden">{item.document.description}</p>
                        <Button onClick={() => { setSelectedDocToSign({ doc: item.document, sig: item }); setIsSignModalOpen(true); }} variant={item.status === 'pending' ? 'primary' : 'secondary'} className="w-full">
                            {item.status === 'pending' ? 'Ver y Firmar' : 'Revisar'}
                        </Button>
                    </Card>
                ))}
            </div>
            {isSignModalOpen && selectedDocToSign && <SignDocumentModal isOpen={isSignModalOpen} onClose={() => setIsSignModalOpen(false)} document={selectedDocToSign.doc} signatureEntry={selectedDocToSign.sig} onSign={handleSignDocument} />}
        </div>
    );
};

export default DocumentsView;
