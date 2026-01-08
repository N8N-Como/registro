
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../App';
// Removed checkDocumentTablesStatus as it is not exported from mockApi and is unused
import { getDocuments, createDocument, getEmployeeDocuments, signDocument, markDocumentAsViewed, getEmployees, getDocumentSignatures, deleteDocument } from '../../services/mockApi';
import { CompanyDocument, Employee, DocumentSignature } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { DocumentIcon, PaperClipIcon, CheckIcon, SparklesIcon, XMarkIcon, TrashIcon, BookOpenIcon } from '../icons';
import DocumentUploadModal from './DocumentUploadModal';
import SignDocumentModal from './SignDocumentModal';
import PayrollSplitterModal from './PayrollSplitterModal';
import MonthlyWorkLogReport from '../reports/MonthlyWorkLogReport';
import { PDFDocument } from 'pdf-lib';

const DocumentsView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'official_log' | 'admin_panel'>('personal');
    
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
        const hasAdminPerms = auth.role?.permissions.includes('manage_employees') || auth.role?.role_id === 'admin' || auth.role?.role_id === 'administracion';
        setIsAdminMode(hasAdminPerms);
        
        try {
            const myDocs = await getEmployeeDocuments(auth.employee.employee_id);
            setMyDocuments(myDocs.sort((a,b) => new Date(b.document.created_at).getTime() - new Date(a.document.created_at).getTime()));

            if (hasAdminPerms) {
                const [docs, emps] = await Promise.all([getDocuments(), getEmployees()]);
                // Fix: Access 'created_at' directly on CompanyDocument as it's not a joined object here
                const sortedDocs = docs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setAdminDocuments(sortedDocs);
                setEmployees(emps);
                const sigs: Record<string, DocumentSignature[]> = {};
                for (const doc of sortedDocs) {
                    sigs[doc.document_id] = await getDocumentSignatures(doc.document_id);
                }
                setSignaturesMap(sigs);
            }
        } catch (e) { 
            console.error(e); 
        } finally { setIsLoading(false); }
    };

    useEffect(() => { init(); }, [auth?.employee]);

    const handleCreateDocument = async (formData: any) => {
        if (!auth?.employee) return;
        try {
            const { target_employee_ids, ...docData } = formData;
            await createDocument({ ...docData, created_by: auth.employee.employee_id }, target_employee_ids);
            alert("Enviado correctamente.");
            init();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    const handleSignDocument = async (sigId: string, url?: string) => {
        if (url) await signDocument(sigId, url);
        else await markDocumentAsViewed(sigId);
        init();
    };

    const pendingDocs = myDocuments.filter(d => d.status === 'pending').length;

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <nav className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit no-print">
                <button onClick={() => setActiveTab('personal')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'personal' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>
                    Mis Documentos {pendingDocs > 0 && <span className="ml-1 bg-orange-500 text-white text-[10px] px-1.5 rounded-full">{pendingDocs}</span>}
                </button>
                <button onClick={() => setActiveTab('official_log')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'official_log' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>
                    Registro de Jornada
                </button>
                {isAdminMode && (
                    <button onClick={() => setActiveTab('admin_panel')} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'admin_panel' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>
                        Gestión (Admin)
                    </button>
                )}
            </nav>

            {activeTab === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                    {myDocuments.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed">No tienes documentos asignados.</div>
                    ) : myDocuments.map(item => (
                        <Card key={item.id} className={`border-t-4 ${item.status === 'pending' ? 'border-orange-500 bg-orange-50/10' : 'border-green-500'}`}>
                            <div className="flex justify-between mb-2">
                                <h3 className="font-bold text-gray-800">{item.document.title}</h3>
                                {item.status === 'signed' && <CheckIcon className="w-5 h-5 text-green-600" />}
                            </div>
                            <p className="text-xs text-gray-500 mb-4 h-10 overflow-hidden">{item.document.description}</p>
                            <Button onClick={() => { setSelectedDocToSign({ doc: item.document, sig: item }); setIsSignModalOpen(true); }} className="w-full">
                                {item.status === 'pending' ? 'Ver y Firmar' : 'Consultar'}
                            </Button>
                        </Card>
                    ))}
                </div>
            )}

            {activeTab === 'official_log' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <MonthlyWorkLogReport />
                </div>
            )}

            {activeTab === 'admin_panel' && isAdminMode && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-700"><DocumentIcon /> Gestión Documental</h2>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={() => setIsPayrollModalOpen(true)} className="bg-indigo-50 border-indigo-200 text-indigo-700">
                                <SparklesIcon className="w-4 h-4 mr-2" /> IA Nóminas
                            </Button>
                            <Button onClick={() => setIsUploadModalOpen(true)}>+ Nuevo</Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {adminDocuments.map(doc => {
                            const sigs = signaturesMap[doc.document_id] || [];
                            const signed = sigs.filter(s => s.status !== 'pending').length;
                            return (
                                <Card key={doc.document_id} className="p-4 border-l-4 border-primary">
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800">{doc.title}</h3>
                                            <p className="text-[10px] text-gray-400">Enviado: {new Date(doc.created_at).toLocaleDateString()} • Firmas: {signed}/{sigs.length}</p>
                                        </div>
                                        <button onClick={() => deleteDocument(doc.document_id).then(init)} className="p-2 text-gray-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {isSignModalOpen && selectedDocToSign && (
                <SignDocumentModal isOpen={isSignModalOpen} onClose={() => setIsSignModalOpen(false)} document={selectedDocToSign.doc} signatureEntry={selectedDocToSign.sig} onSign={handleSignDocument} />
            )}
            
            {isUploadModalOpen && <DocumentUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSave={handleCreateDocument} employees={employees} />}
            {isPayrollModalOpen && <PayrollSplitterModal isOpen={isPayrollModalOpen} onClose={() => setIsPayrollModalOpen(false)} employees={employees} onConfirm={async (m, f, p) => {
                const pdfBytes = await fetch(f).then(res => res.arrayBuffer());
                const pdfDoc = await PDFDocument.load(pdfBytes);
                for (let i = 0; i < m.length; i++) {
                    const newPdf = await PDFDocument.create();
                    const [copiedPage] = await newPdf.copyPages(pdfDoc, [m[i].page_number - 1]);
                    newPdf.addPage(copiedPage);
                    const base64 = await newPdf.saveAsBase64({ dataUri: true });
                    await createDocument({ title: `Nómina - ${m[i].employee_name}`, type: 'file', content_url: base64, requires_signature: true, created_by: auth?.employee?.employee_id }, [m[i].employee_id]);
                    p(i + 1, m.length);
                }
                init();
            }} />}
        </div>
    );
};

export default DocumentsView;
