
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
    const [selectedTrackDoc, setSelectedTrackDoc] = useState<string | null>(null);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const [isSignModalOpen, setIsSignModalOpen] = useState(false);
    const [selectedDocToSign, setSelectedDocToSign] = useState<{ doc: CompanyDocument, sig: DocumentSignature } | null>(null);

    const init = async () => {
        if (!auth?.employee) return;
        const hasAdminPerms = auth.role?.permissions.includes('manage_employees') || auth.role?.role_id === 'admin' || auth.role?.role_id === 'administracion';
        setIsAdminMode(hasAdminPerms);
        
        try {
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
            } else {
                const myDocs = await getEmployeeDocuments(auth.employee.employee_id);
                setMyDocuments(myDocs.sort((a,b) => new Date(b.document.created_at).getTime() - new Date(a.document.created_at).getTime()));
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
            const existingPdfBytes = await fetch(originalPdfBase64).then(res => res.arrayBuffer());
            const pdfDoc = await PDFDocument.load(existingPdfBytes);

            for (let i = 0; i < total; i++) {
                const mapping = mappings[i];
                const newPdf = await PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [mapping.page_number - 1]);
                newPdf.addPage(copiedPage);
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
            
            alert("Nóminas procesadas con éxito. Privacidad total garantizada.");
            init();
        } catch (error: any) {
            console.error("Critical error splitting payroll:", error);
            alert("Error crítico procesando el PDF: " + error.message);
        }
    };

    const handleDeleteDoc = async (id: string, title: string) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar "${title}"? Se borrarán todos los registros de descarga/firma de todos los empleados.`)) return;
        try {
            await deleteDocument(id);
            alert("Documento eliminado correctamente.");
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

    const getStatusText = (status: string) => {
        switch(status) {
            case 'signed': return 'FIRMADO';
            case 'viewed': return 'VISTO';
            default: return 'PENDIENTE';
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'signed': return 'text-green-600 bg-green-50';
            case 'viewed': return 'text-blue-600 bg-blue-50';
            default: return 'text-red-600 bg-red-50';
        }
    };

    if (isLoading) return <Spinner />;

    if (isAdminMode) {
        return (
            <div className="space-y-6">
                {dbHealth && !dbHealth.company_documents && (
                    <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-500 shadow-sm">
                        <div className="bg-red-100 p-2 rounded-full"><XMarkIcon className="text-red-600 h-6 w-6"/></div>
                        <div className="flex-1">
                            <h3 className="text-red-800 font-black uppercase text-sm">Error de Configuración Detectado</h3>
                            <p className="text-red-700 text-xs mt-1">Supabase no reconoce las tablas de documentos. Para solucionarlo:</p>
                            <ol className="list-decimal ml-4 mt-2 text-xs text-red-700 font-bold space-y-1">
                                <li>Ve al panel de <strong>Administración {'->'} Actualizar BD (SQL)</strong>.</li>
                                <li>Copia y ejecuta el código en Supabase.</li>
                                <li><strong>IMPORTANTE:</strong> Ve a Supabase Settings {'->'} API y pulsa el botón <u>'Reload PostgREST Schema'</u>.</li>
                            </ol>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                            <DocumentIcon /> Gestión y Auditoría Documental
                        </h2>
                        <div className="flex items-center text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded mt-1 border border-green-100">
                             <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                             MÓDULO DE PRIVACIDAD ACTIVO
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button variant="secondary" onClick={() => setIsPayrollModalOpen(true)} disabled={!dbHealth?.company_documents}>
                            <SparklesIcon className="w-4 h-4 mr-2" /> IA Splitter Nóminas
                        </Button>
                        <Button onClick={() => setIsUploadModalOpen(true)} disabled={!dbHealth?.company_documents}>+ Nuevo</Button>
                    </div>
                </div>

                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                    <button onClick={() => setActiveTab('docs')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'docs' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>Archivos</button>
                    <button onClick={() => setActiveTab('tracking')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'tracking' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'}`}>Auditoría (Descargas)</button>
                </div>

                {activeTab === 'docs' ? (
                    <div className="grid grid-cols-1 gap-4">
                        {adminDocuments.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed text-gray-400">
                                <DocumentIcon className="mx-auto h-12 w-12 mb-2 opacity-20"/>
                                <p>No hay documentos enviados.</p>
                            </div>
                        ) : adminDocuments.map(doc => {
                            const sigs = signaturesMap[doc.document_id] || [];
                            const signedCount = sigs.filter(s => s.status === 'signed').length;
                            const viewedCount = sigs.filter(s => s.status === 'viewed').length;
                            
                            return (
                                <Card key={doc.document_id} className="p-4 border-l-4 border-primary hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800">{doc.title}</h3>
                                            <p className="text-xs text-gray-500">{doc.description}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">ID: {doc.document_id} | {new Date(doc.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <button onClick={() => { setActiveTab('tracking'); setSelectedTrackDoc(doc.document_id); }} className="text-right hover:opacity-75 transition-opacity">
                                                <p className="text-[10px] font-black text-gray-400 uppercase">Estado Global</p>
                                                <p className="font-black text-primary">Firmas: {signedCount} | Vistos: {viewedCount}</p>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteDoc(doc.document_id, doc.title)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Eliminar permanentemente"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Card title="Auditoría de Acceso">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona un documento para ver quién lo ha descargado:</label>
                                <select 
                                    value={selectedTrackDoc || ''} 
                                    onChange={(e) => setSelectedTrackDoc(e.target.value)}
                                    className="w-full border p-3 rounded-lg font-bold text-gray-800 bg-white shadow-sm"
                                >
                                    <option value="">-- Listado de documentos enviados --</option>
                                    {adminDocuments.map(d => (
                                        <option key={d.document_id} value={d.document_id}>{d.title}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedTrackDoc ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
                                                <th className="p-4">Empleado</th>
                                                <th className="p-4 text-center">Estado actual</th>
                                                <th className="p-4">Fecha de acción</th>
                                                <th className="p-4 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(signaturesMap[selectedTrackDoc] || []).length === 0 ? (
                                                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Nadie asignado a este documento.</td></tr>
                                            ) : (signaturesMap[selectedTrackDoc] || []).map(sig => {
                                                const emp = employees.find(e => e.employee_id === sig.employee_id);
                                                const actionDate = sig.signed_at || sig.viewed_at;
                                                return (
                                                    <tr key={sig.id} className="border-b hover:bg-gray-50 transition-colors">
                                                        <td className="p-4 font-bold text-gray-800">{emp ? `${emp.first_name} ${emp.last_name}` : 'Empleado desconocido'}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${getStatusColor(sig.status)}`}>
                                                                {getStatusText(sig.status)}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-gray-500 text-xs font-mono">
                                                            {actionDate ? new Date(actionDate).toLocaleString('es-ES') : '---'}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            {sig.status === 'pending' && (
                                                                <button onClick={() => handleRemindEmployee(sig.employee_id)} className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-all shadow-sm">RECORDAR</button>
                                                            )}
                                                            {sig.status === 'signed' && <span className="text-green-600 font-black text-[10px]">✓ COMPLETADO</span>}
                                                            {sig.status === 'viewed' && <span className="text-blue-600 font-black text-[10px]">⚠ SOLO VISTO</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-gray-400">
                                    <BellIcon className="mx-auto h-12 w-12 mb-2 opacity-20" />
                                    <p>Selecciona un documento arriba para ver el registro de actividad.</p>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {isUploadModalOpen && <DocumentUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSave={handleCreateDocument} employees={employees} />}
                {isPayrollModalOpen && <PayrollSplitterModal isOpen={isPayrollModalOpen} onClose={() => setIsPayrollModalOpen(false)} employees={employees} onConfirm={handleConfirmPayroll} />}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-primary"><PaperClipIcon /> Mis Documentos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myDocuments.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-400">No tienes documentos asignados en este momento.</div>
                ) : myDocuments.map(item => (
                    <Card key={item.id} className={`border-t-4 transition-all hover:shadow-lg ${item.status === 'pending' ? 'border-orange-500 bg-orange-50/20' : 'border-green-500'}`}>
                        <div className="flex justify-between mb-2">
                            <h3 className="font-bold text-gray-800">{item.document.title}</h3>
                            {item.status === 'signed' && <CheckIcon className="w-5 h-5 text-green-600" />}
                        </div>
                        <p className="text-sm text-gray-500 mb-4 h-12 overflow-hidden">{item.document.description}</p>
                        <Button onClick={() => { setSelectedDocToSign({ doc: item.document, sig: item }); setIsSignModalOpen(true); }} className="w-full">
                            {item.status === 'pending' ? 'Ver y Firmar' : 'Consultar'}
                        </Button>
                    </Card>
                ))}
            </div>
            {isSignModalOpen && selectedDocToSign && <SignDocumentModal isOpen={isSignModalOpen} onClose={() => setIsSignModalOpen(false)} document={selectedDocToSign.doc} signatureEntry={selectedDocToSign.sig} onSign={handleSignDocument} />}
        </div>
    );
};

export default DocumentsView;
