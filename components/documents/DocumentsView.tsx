
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../App';
import { getDocuments, createDocument, getEmployeeDocuments, signDocument, markDocumentAsViewed, getEmployees, getDocumentSignatures, pushPRLCampaign, sendSignatureReminder, checkDocumentTablesStatus, deleteDocument } from '../../services/mockApi';
import { CompanyDocument, Employee, DocumentSignature } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { DocumentIcon, PaperClipIcon, CheckIcon, SparklesIcon, MegaphoneIcon, BellIcon, LocationIcon, XMarkIcon, TrashIcon } from '../icons';
import DocumentUploadModal from './DocumentUploadModal';
import SignDocumentModal from './SignDocumentModal';
import PayrollSplitterModal from './PayrollSplitterModal';
import { PDFDocument } from 'pdf-lib';

const DocumentsView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [activeTab, setActiveTab] = useState<'docs' | 'tracking'>('docs');
    
    const [dbHealth, setDbHealth] = useState<{ company_documents: boolean; document_signatures: boolean } | null>(null);

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
            // Cargar SIEMPRE mis documentos personales, seas admin o no
            const myDocs = await getEmployeeDocuments(auth.employee.employee_id);
            setMyDocuments(myDocs.sort((a,b) => new Date(b.document.created_at).getTime() - new Date(a.document.created_at).getTime()));

            if (hasAdminPerms) {
                const health = await checkDocumentTablesStatus();
                setDbHealth(health);
                
                if (health.company_documents) {
                    const [docs, emps] = await Promise.all([getDocuments(), getEmployees()]);
                    const sortedDocs = docs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    setAdminDocuments(sortedDocs);
                    setEmployees(emps);
                    const sigs: Record<string, DocumentSignature[]> = {};
                    for (const doc of sortedDocs) {
                        sigs[doc.document_id] = await getDocumentSignatures(doc.document_id);
                    }
                    setSignaturesMap(sigs);
                }
            }
        } catch (e) { 
            console.error("Error initializing documents view:", e); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => { init(); }, [auth?.employee]);

    const handleConfirmPayroll = async (mappings: any[], originalPdfBase64: string, onProgress: (current: number, total: number) => void) => {
        if (!auth?.employee) return;
        
        const monthName = new Date().toLocaleString('es-ES', { month: 'long' });
        const total = mappings.length;

        try {
            // Cargar el PDF original una sola vez para procesar los recortes
            const existingPdfBytes = await fetch(originalPdfBase64).then(res => res.arrayBuffer());
            const pdfDoc = await PDFDocument.load(existingPdfBytes);

            for (let i = 0; i < total; i++) {
                const mapping = mappings[i];
                
                // --- SEGURIDAD CRÍTICA: RECORTE FÍSICO REAL ---
                // Creamos un documento nuevo que solo contendrá una página
                const newPdf = await PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [mapping.page_number - 1]);
                newPdf.addPage(copiedPage);
                
                // Generamos el base64 del PDF que ya solo tiene 1 página
                const singlePageBase64 = await newPdf.saveAsBase64({ dataUri: true });

                const docData = {
                    title: `Nómina ${monthName} - ${mapping.employee_name}`,
                    description: `Nómina individual confidencial de ${mapping.employee_name}.`,
                    type: 'file' as const,
                    content_url: singlePageBase64, 
                    requires_signature: true,
                    created_by: auth.employee.employee_id
                };
                
                try {
                    await createDocument(docData, [mapping.employee_id]);
                    onProgress(i + 1, total);
                } catch (err: any) {
                    throw new Error(`Fallo al subir la nómina de ${mapping.employee_name}: ${err.message}`);
                }
            }
            
            alert("Nóminas procesadas con éxito. Privacidad total garantizada: cada empleado solo recibirá físicamente su página.");
            init();
        } catch (error: any) {
            console.error("Critical error splitting payroll:", error);
            alert("Error crítico procesando el PDF: " + error.message);
        }
    };

    const handleDeleteDoc = async (id: string, title: string) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar "${title}"? Se borrarán también todos los registros de firma.`)) return;
        try {
            await deleteDocument(id);
            alert("Documento eliminado.");
            init();
        } catch (e) {
            alert("Error al eliminar el documento.");
        }
    };

    const handlePushPRL = async () => {
        if (!auth?.employee || !window.confirm("¿Lanzar campaña de PRL?")) return;
        setIsPushing(true);
        try {
            await pushPRLCampaign(auth.employee.employee_id);
            alert("Campaña PRL activada.");
            init();
        } catch (e) { alert("Error al activar campaña."); } finally { setIsPushing(false); }
    };

    const handleRemindEmployee = async (employeeId: string) => {
        if (!auth?.employee) return;
        try {
            await sendSignatureReminder(employeeId, auth.employee.employee_id);
            alert("Recordatorio enviado.");
        } catch (e) { alert("Error al enviar."); }
    };

    const handleCreateDocument = async (data: any) => {
        if (!auth?.employee) return;
        try {
            await createDocument({ ...data, created_by: auth.employee.employee_id }, data.target_employee_ids);
            init();
        } catch (e: any) { alert("Error: " + e.message); }
    };

    const handleSignDocument = async (sigId: string, url?: string) => {
        if (url) await signDocument(sigId, url);
        else await markDocumentAsViewed(sigId);
        init();
    };

    const trackingData = useMemo(() => {
        if (!isAdminMode) return [];
        return employees.map(emp => {
            const empSigs = Object.values(signaturesMap).flat().filter(s => s.employee_id === emp.employee_id);
            const pending = empSigs.filter(s => s.status === 'pending');
            return {
                ...emp,
                total: empSigs.length,
                pending: pending.length,
                pendingList: pending.map(p => adminDocuments.find(d => d.document_id === p.document_id)?.title).filter(Boolean)
            };
        }).filter(e => e.total > 0);
    }, [employees, signaturesMap, adminDocuments, isAdminMode]);

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-8">
            {/* SECCIÓN PERSONAL: Visible para todos, incluidos Administradores */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <PaperClipIcon /> Mis Documentos Personales
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myDocuments.length === 0 ? (
                        <div className="col-span-full py-10 text-center text-gray-400 bg-white rounded-xl border-2 border-dashed">
                            No tienes documentos personales asignados.
                        </div>
                    ) : myDocuments.map(item => (
                        <Card key={item.id} className={`border-t-4 transition-all hover:shadow-lg ${item.status === 'pending' ? 'border-orange-500 bg-orange-50/20' : 'border-green-500'}`}>
                            <div className="flex justify-between mb-2">
                                <h3 className="font-bold text-gray-800">{item.document.title}</h3>
                                {item.status === 'signed' && <CheckIcon className="w-5 h-5 text-green-600" />}
                            </div>
                            <p className="text-sm text-gray-500 mb-4 h-12 overflow-hidden">{item.document.description}</p>
                            <Button onClick={() => { setSelectedDocToSign({ doc: item.document, sig: item }); setIsSignModalOpen(true); }} className="w-full shadow-md">
                                {item.status === 'pending' ? 'Ver y Firmar' : 'Consultar'}
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>

            {/* SECCIÓN GESTIÓN: Solo para Administradores */}
            {isAdminMode && (
                <div className="space-y-6 pt-8 border-t-2 border-gray-200">
                    {dbHealth && !dbHealth.company_documents && (
                        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-500 shadow-sm">
                            <div className="bg-red-100 p-2 rounded-full"><XMarkIcon className="text-red-600 h-6 w-6"/></div>
                            <div className="flex-1">
                                <h3 className="text-red-800 font-black uppercase text-sm">Error de Configuración Detectado</h3>
                                <p className="text-red-700 text-xs mt-1">Supabase no reconoce las tablas de documentos. Ve a Administración {'->'} Actualizar BD (SQL).</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-700">
                                <DocumentIcon /> Panel de Gestión Documental
                            </h2>
                            <p className="text-xs text-gray-400">Control de envío y auditoría de firmas de todo el personal</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <Button variant="secondary" onClick={() => setIsPayrollModalOpen(true)} className="bg-indigo-50 border-indigo-200 text-indigo-700">
                                <SparklesIcon className="w-4 h-4 mr-2" /> IA Splitter Nóminas
                            </Button>
                            <Button onClick={() => setIsUploadModalOpen(true)}>+ Nuevo</Button>
                        </div>
                    </div>

                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                        <button onClick={() => setActiveTab('docs')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'docs' ? 'bg-white text-primary shadow-sm' : 'text-gray-50'}`}>Lista de Docs</button>
                        <button onClick={() => setActiveTab('tracking')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'tracking' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>Seguimiento</button>
                    </div>

                    {activeTab === 'docs' ? (
                        <div className="grid grid-cols-1 gap-4">
                            {adminDocuments.map(doc => {
                                const sigs = signaturesMap[doc.document_id] || [];
                                const signed = sigs.filter(s => s.status !== 'pending').length;
                                return (
                                    <Card key={doc.document_id} className="p-4 border-l-4 border-primary hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-800">{doc.title}</h3>
                                                <p className="text-[10px] text-gray-400">Enviado: {new Date(doc.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Firma / Lectura</p>
                                                    <p className="font-black text-primary">{signed} / {sigs.length}</p>
                                                </div>
                                                <button onClick={() => handleDeleteDoc(doc.document_id, doc.title)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Card title="Estado por Empleado">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead><tr className="border-b bg-gray-50 text-gray-400 uppercase text-[10px] font-black"><th className="p-4">Empleado</th><th className="p-4">Pendientes</th><th className="p-4 text-right">Acción</th></tr></thead>
                                    <tbody>
                                        {trackingData.map((row) => (
                                            <tr key={row.employee_id} className="border-b hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-bold text-gray-800">{row.first_name} {row.last_name}</td>
                                                <td className="p-4">{row.pending > 0 ? <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">{row.pending} pendientes</span> : <span className="text-green-600 font-bold">✓ Al día</span>}</td>
                                                <td className="p-4 text-right">{row.pending > 0 && <button onClick={() => handleRemindEmployee(row.employee_id)} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold hover:bg-primary/20 transition-colors">Recordar</button>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {isSignModalOpen && selectedDocToSign && (
                <SignDocumentModal 
                    isOpen={isSignModalOpen} 
                    onClose={() => setIsSignModalOpen(false)} 
                    document={selectedDocToSign.doc} 
                    signatureEntry={selectedDocToSign.sig} 
                    onSign={handleSignDocument} 
                />
            )}
            
            {isUploadModalOpen && <DocumentUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSave={handleCreateDocument} employees={employees} />}
            {isPayrollModalOpen && <PayrollSplitterModal isOpen={isPayrollModalOpen} onClose={() => setIsPayrollModalOpen(false)} employees={employees} onConfirm={handleConfirmPayroll} />}
        </div>
    );
};

export default DocumentsView;
