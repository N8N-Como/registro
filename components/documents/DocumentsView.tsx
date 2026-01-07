
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../App';
import { getDocuments, createDocument, getEmployeeDocuments, signDocument, markDocumentAsViewed, getEmployees, getDocumentSignatures, pushPRLCampaign, sendSignatureReminder } from '../../services/mockApi';
import { CompanyDocument, Employee, DocumentSignature } from '../../types';
import Card from '../shared/Card';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { DocumentIcon, PaperClipIcon, CheckIcon, SparklesIcon, MegaphoneIcon, BellIcon } from '../icons';
import DocumentUploadModal from './DocumentUploadModal';
import SignDocumentModal from './SignDocumentModal';
import PayrollSplitterModal from './PayrollSplitterModal';

const DocumentsView: React.FC = () => {
    const auth = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [isPushing, setIsPushing] = useState(false);
    const [activeTab, setActiveTab] = useState<'docs' | 'tracking'>('docs');
    
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
                setAdminDocuments(docs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
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

    const handlePushPRL = async () => {
        if (!auth?.employee || !window.confirm("¿Lanzar la campaña de PRL (Manual, EPIs, Salud) a toda la plantilla?")) return;
        setIsPushing(true);
        try {
            await pushPRLCampaign(auth.employee.employee_id);
            alert("Campaña PRL activada. Todos los empleados han recibido los nuevos documentos obligatorios.");
            init();
        } catch (e) {
            alert("Error al lanzar campaña");
        } finally {
            setIsPushing(false);
        }
    };

    const handleRemindEmployee = async (employeeId: string) => {
        if (!auth?.employee) return;
        try {
            await sendSignatureReminder(employeeId, auth.employee.employee_id);
            alert("Recordatorio enviado correctamente.");
        } catch (e) {
            alert("Error al enviar recordatorio.");
        }
    };

    const handleCreateDocument = async (data: any) => {
        if (!auth?.employee) return;
        try {
            await createDocument({ ...data, created_by: auth.employee.employee_id }, data.target_employee_ids);
            init();
        } catch (e) { alert("Error al crear documento"); }
    };

    const handleSignDocument = async (sigId: string, url?: string) => {
        if (url) await signDocument(sigId, url);
        else await markDocumentAsViewed(sigId);
        init();
    };

    // Lógica para el tracking consolidado
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

    if (isAdminMode) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                        <DocumentIcon /> Gestión Documental
                    </h2>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button variant="secondary" onClick={handlePushPRL} isLoading={isPushing} className="bg-orange-500 hover:bg-orange-600 border-orange-600">
                            <MegaphoneIcon className="w-4 h-4 mr-2" /> 🚀 Lanzar Campaña PRL
                        </Button>
                        <Button variant="secondary" onClick={() => setIsPayrollModalOpen(true)}>
                            <SparklesIcon className="w-4 h-4 mr-2" /> Splitter Nóminas
                        </Button>
                        <Button onClick={() => setIsUploadModalOpen(true)}>+ Nuevo</Button>
                    </div>
                </div>

                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                    <button onClick={() => setActiveTab('docs')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'docs' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        Documentos
                    </button>
                    <button onClick={() => setActiveTab('tracking')} className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'tracking' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        Seguimiento de Firmas
                    </button>
                </div>

                {activeTab === 'docs' ? (
                    <div className="grid grid-cols-1 gap-4">
                        {adminDocuments.map(doc => {
                            const sigs = signaturesMap[doc.document_id] || [];
                            const total = sigs.length;
                            const signed = sigs.filter(s => s.status !== 'pending').length;
                            const percentage = total > 0 ? Math.round((signed / total) * 100) : 0;
                            const isPRL = doc.title.includes('PRL') || doc.title.includes('MPE') || doc.title.includes('EPI');
                            
                            return (
                                <Card key={doc.document_id} className={`overflow-hidden p-0 border-l-4 ${isPRL ? 'border-orange-500' : 'border-blue-500'}`}>
                                    <div className="p-4 flex flex-col md:flex-row justify-between border-b bg-gray-50">
                                        <div>
                                            <h3 className="font-bold text-gray-800 flex items-center">
                                                {isPRL && <span className="mr-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-black uppercase">Obligatorio</span>}
                                                {doc.title}
                                            </h3>
                                            <p className="text-xs text-gray-500">{doc.description}</p>
                                        </div>
                                        <div className="mt-2 md:mt-0 flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-gray-400 uppercase">Estado Firmas</p>
                                                <p className="text-sm font-black text-primary">{signed} / {total}</p>
                                            </div>
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{width: `${percentage}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card title="Estado por Empleado">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b bg-gray-50 text-xs uppercase font-black text-gray-400">
                                        <th className="p-4">Empleado</th>
                                        <th className="p-4">Progreso</th>
                                        <th className="p-4">Pendientes</th>
                                        <th className="p-4 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trackingData.map(row => (
                                        <tr key={row.employee_id} className="border-b hover:bg-gray-50">
                                            <td className="p-4 font-bold text-gray-800">{row.first_name} {row.last_name}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-black ${row.pending === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                        {Math.round(((row.total - row.pending) / row.total) * 100)}%
                                                    </span>
                                                    <div className="flex-1 max-w-[100px] bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                                        <div className={`h-full ${row.pending === 0 ? 'bg-green-500' : 'bg-orange-500'}`} style={{width: `${((row.total-row.pending)/row.total)*100}%`}}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {row.pending > 0 ? (
                                                    <div className="text-[10px] text-red-500 font-medium">
                                                        {row.pendingList.slice(0,2).join(', ')}{row.pendingList.length > 2 ? '...' : ''}
                                                    </div>
                                                ) : <span className="text-xs text-green-600 font-bold">✓ Al día</span>}
                                            </td>
                                            <td className="p-4 text-right">
                                                {row.pending > 0 && (
                                                    <button onClick={() => handleRemindEmployee(row.employee_id)} className="text-xs bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/10 font-bold flex items-center ml-auto">
                                                        <BellIcon className="w-3 h-3 mr-1" /> Recordar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {isUploadModalOpen && <DocumentUploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSave={handleCreateDocument} employees={employees} />}
                {isPayrollModalOpen && <PayrollSplitterModal isOpen={isPayrollModalOpen} onClose={() => setIsPayrollModalOpen(false)} employees={employees} onConfirm={() => init()} />}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-primary"><PaperClipIcon /> Mis Documentos y Firmas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myDocuments.map(item => (
                    <Card key={item.id} className={`border-t-4 transition-all hover:shadow-lg ${item.status === 'pending' ? 'border-orange-500 bg-orange-50/30' : 'border-green-500'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-800">{item.document.title}</h3>
                            {item.status === 'signed' && <CheckIcon className="w-5 h-5 text-green-600" />}
                        </div>
                        <p className="text-sm text-gray-500 mb-6 h-12 overflow-hidden leading-relaxed">{item.document.description}</p>
                        <Button onClick={() => { setSelectedDocToSign({ doc: item.document, sig: item }); setIsSignModalOpen(true); }} variant={item.status === 'pending' ? 'primary' : 'secondary'} className="w-full">
                            {item.status === 'pending' ? 'Ver y Firmar Ahora' : 'Consultar Documento'}
                        </Button>
                    </Card>
                ))}
                {myDocuments.length === 0 && <p className="col-span-full text-center py-12 text-gray-400 italic bg-white rounded-lg border-2 border-dashed">No tienes documentos pendientes ni firmados.</p>}
            </div>
            {isSignModalOpen && selectedDocToSign && <SignDocumentModal isOpen={isSignModalOpen} onClose={() => setIsSignModalOpen(false)} document={selectedDocToSign.doc} signatureEntry={selectedDocToSign.sig} onSign={handleSignDocument} />}
        </div>
    );
};

export default DocumentsView;
