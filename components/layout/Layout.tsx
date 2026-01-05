
import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../../App';
import { Permission, MaintenancePlan, Location, InventoryItem, TimeCorrectionRequest } from '../../types';
import { DashboardIcon, TimesheetIcon, AdminIcon, IncidentIcon, ReportIcon, LogoutIcon, BroomIcon, BookOpenIcon, PencilIcon, MegaphoneIcon, CalendarIcon, MenuIcon, ArchiveBoxIcon, SunIcon, DocumentIcon, WrenchIcon, LocationIcon, BoxIcon, BellIcon } from '../icons';
import DashboardView from '../dashboard/DashboardView';
import TimesheetsView from '../timesheets/TimesheetsView';
import AdminView from '../admin/AdminView';
import IncidentsView from '../incidents/IncidentsView';
import ReportsView from '../reports/ReportsView';
import CleaningView from '../cleaning/CleaningView';
import GobernantaView from '../gobernanta/GobernantaView';
import ShiftLogView from '../shiftlog/ShiftLogView';
import LostFoundView from '../lostandfound/LostFoundView';
import { COMPANY_NAME } from '../../constants';
import ProfileEditModal from '../user/ProfileEditModal';
import AnnouncementsView from '../announcements/AnnouncementsView';
import TimeOffView from '../timeoff/TimeOffView';
import ShiftSchedulerView from '../scheduling/ShiftSchedulerView';
import DocumentsView from '../documents/DocumentsView';
import MaintenanceCalendarView from '../maintenance/MaintenanceCalendarView';
import PendingDocumentsNotification from '../documents/PendingDocumentsNotification';
import MaintenanceNotificationModal from '../maintenance/MaintenanceNotificationModal';
import ComplianceMonitor from '../shared/ComplianceMonitor';
import InventoryView from '../inventory/InventoryView';
import { getEmployeeDocuments, checkAndGenerateMaintenanceTasks, getMaintenancePlans, getLocations, getTimeEntriesForEmployee, getInventoryItems, getTimeCorrectionRequests } from '../../services/mockApi';


type NavItem = {
    name: string;
    view: string;
    icon: React.FC<{className?: string}>;
    requiredPermission?: Permission;
    role_id?: string;
    badgeCount?: number;
};

const Layout: React.FC = () => {
    const auth = useContext(AuthContext);
    const [activeView, setActiveView] = useState('dashboard');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    
    // Notification States
    const [pendingDocsCount, setPendingDocsCount] = useState(0);
    const [pendingDocIds, setPendingDocIds] = useState<string[]>([]);
    const [showDocNotification, setShowDocNotification] = useState(false);
    const [pendingCorrectionsCount, setPendingCorrectionsCount] = useState(0);
    const [upcomingPlans, setUpcomingPlans] = useState<MaintenancePlan[]>([]);
    const [showMaintNotification, setShowMaintNotification] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
    const [isTrackingActive, setIsTrackingActive] = useState(false);

    const navItems: NavItem[] = [
        { name: 'Panel', view: 'dashboard', icon: DashboardIcon },
        { name: 'Fichajes', view: 'timesheets', icon: TimesheetIcon },
        { name: 'Cuadrantes', view: 'scheduler_shifts', icon: CalendarIcon },
        { name: 'Ausencias', view: 'time_off', icon: SunIcon },
        { name: 'Documentación', view: 'documents', icon: DocumentIcon }, 
        { name: 'Tareas Limpieza', view: 'cleaning', icon: BroomIcon, role_id: 'cleaner' },
        { name: 'Planificador Tareas', view: 'scheduler', icon: CalendarIcon, requiredPermission: 'schedule_tasks' },
        { name: 'Inventario', view: 'inventory', icon: BoxIcon, requiredPermission: 'manage_inventory' },
        { name: 'Incidencias', view: 'incidents', icon: IncidentIcon },
        { name: 'Mantenimiento Prev.', view: 'maintenance_plan', icon: WrenchIcon, requiredPermission: 'manage_incidents' },
        { name: 'Objetos Olvidados', view: 'lost_found', icon: ArchiveBoxIcon },
        { name: 'Registro de Turno', view: 'shiftlog', icon: BookOpenIcon, requiredPermission: 'access_shift_log' },
        { name: 'Comunicados', view: 'announcements', icon: MegaphoneIcon, requiredPermission: 'manage_announcements' },
        { name: 'Informes', view: 'reports', icon: ReportIcon, requiredPermission: 'view_reports' },
        { name: 'Administración', view: 'admin', icon: AdminIcon, requiredPermission: 'manage_employees', badgeCount: pendingCorrectionsCount },
    ];

    const availableNavItems = useMemo(() => {
        return navItems.filter(item => {
            if (auth?.role?.role_id === 'admin' && item.view !== 'cleaning') return true;
            const hasPermission = !item.requiredPermission || auth?.role?.permissions.includes(item.requiredPermission);
            const hasRole = !item.role_id || auth?.role?.role_id === item.role_id;
            return hasPermission && hasRole;
        });
    }, [auth?.role, pendingCorrectionsCount]);
    
    useEffect(() => {
        const performChecks = async () => {
            if (!auth?.employee) return;

            // LOPD status
            const entries = await getTimeEntriesForEmployee(auth.employee.employee_id);
            setIsTrackingActive(entries.some(e => e.status === 'running'));

            // Check Pending Corrections (Admin only)
            if (auth.role?.role_id === 'admin' || auth.role?.permissions.includes('manage_employees')) {
                try {
                    const corrs = await getTimeCorrectionRequests();
                    setPendingCorrectionsCount(corrs.filter(c => c.status === 'pending').length);
                } catch(e) {}
            }

            // Generate Maintenance Tasks
            if (auth.role?.permissions.includes('manage_incidents')) {
                try {
                    await checkAndGenerateMaintenanceTasks();
                    const [plans, locs] = await Promise.all([getMaintenancePlans(), getLocations()]);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const nextWeek = new Date(today);
                    nextWeek.setDate(today.getDate() + 7);
                    const alerts = plans.filter(p => p.active && new Date(p.next_due_date) <= nextWeek);
                    if (alerts.length > 0) { setUpcomingPlans(alerts); setLocations(locs); setShowMaintNotification(true); }
                } catch (e) {}
            }

            // Check Pending Documents
            try {
                const docs = await getEmployeeDocuments(auth.employee.employee_id);
                const pending = docs.filter(d => d.status === 'pending');
                if (pending.length > 0) {
                    setPendingDocsCount(pending.length);
                    setPendingDocIds(pending.map(d => d.document_id));
                    const dismissed = JSON.parse(localStorage.getItem(`dismissed_docs_${auth.employee.employee_id}`) || '[]');
                    if (pending.some(d => !dismissed.includes(d.document_id))) setShowDocNotification(true);
                }
            } catch (e) {}

            // Check Low Stock
            if (auth.role?.permissions.includes('manage_inventory')) {
                try {
                    const items = await getInventoryItems();
                    setLowStockItems(items.filter(i => i.quantity <= i.min_threshold));
                } catch (e) {}
            }
        };
        performChecks();
        const interval = setInterval(performChecks, 30000);
        return () => clearInterval(interval);
    }, [auth?.employee, auth?.role]);

    const handleDismissDocs = (permanent: boolean) => {
        setShowDocNotification(false);
        if (permanent && auth?.employee) {
            const dismissed = JSON.parse(localStorage.getItem(`dismissed_docs_${auth.employee.employee_id}`) || '[]');
            localStorage.setItem(`dismissed_docs_${auth.employee.employee_id}`, JSON.stringify([...new Set([...dismissed, ...pendingDocIds])]));
        }
    };

    const handleGoToDocs = () => { setShowDocNotification(false); setActiveView('documents'); setIsNotificationsOpen(false); };
    const handleGoToInventory = () => { setActiveView('inventory'); setIsNotificationsOpen(false); };
    const handleGoToMaintenance = () => { setShowMaintNotification(false); setActiveView('maintenance_plan'); setIsNotificationsOpen(false); };
    
    const renderView = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardView />;
            case 'timesheets': return <TimesheetsView />;
            case 'scheduler_shifts': return <ShiftSchedulerView />;
            case 'time_off': return <TimeOffView />;
            case 'documents': return <DocumentsView />;
            case 'admin': return <AdminView />;
            case 'incidents': return <IncidentsView />;
            case 'maintenance_plan': return <MaintenanceCalendarView />;
            case 'reports': return <ReportsView />;
            case 'cleaning': return <CleaningView />;
            case 'scheduler': return <GobernantaView />;
            case 'inventory': return <InventoryView />;
            case 'shiftlog': return <ShiftLogView />;
            case 'announcements': return <AnnouncementsView />;
            case 'lost_found': return <LostFoundView />;
            default: return <DashboardView />;
        }
    };
    
    if (!auth || !auth.employee || !auth.role) return <div>Error de autenticación.</div>;

    const currentViewName = navItems.find(item => item.view === activeView)?.name || 'Panel';
    const totalAlerts = pendingDocsCount + upcomingPlans.length + lowStockItems.length;

    return (
        <>
            <div className="min-h-screen flex bg-gray-100">
                 {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
                <aside id="sidebar-menu" className={`fixed inset-y-0 left-0 w-64 bg-primary text-white flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-30`}>
                    <div className="h-20 flex items-center justify-center text-xl font-bold border-b border-primary-dark px-4 text-center">{COMPANY_NAME}</div>
                    <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                        {availableNavItems.map(item => (
                            <button key={item.view} onClick={() => { setActiveView(item.view); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${activeView === item.view ? 'bg-primary-dark' : 'hover:bg-primary-dark'}`}>
                                <div className="flex items-center space-x-3">
                                    <item.icon className="w-6 h-6" />
                                    <span>{item.name}</span>
                                </div>
                                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                                        {item.badgeCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-primary-dark">
                        <button onClick={auth.logout} className="w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors hover:bg-red-700">
                            <LogoutIcon />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </aside>
                <main className="flex-1 flex flex-col">
                    <header className="h-20 bg-white text-gray-900 shadow-md flex items-center justify-between px-3 sm:px-6 relative z-20">
                        <div className="flex items-center">
                             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mr-4 p-2 text-gray-600 hover:bg-gray-100 rounded-full"><MenuIcon /></button>
                            <h1 className="text-lg sm:text-2xl font-semibold text-gray-800 capitalize">{currentViewName}</h1>
                        </div>
                        <div className="flex items-center space-x-3 sm:space-x-6">
                            {isTrackingActive ? (
                                <div className="hidden sm:flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200 animate-pulse">
                                    <LocationIcon className="w-3 h-3 mr-1" />
                                    <span className="font-semibold">Ubicación Activa</span>
                                </div>
                            ) : (
                                <div className="hidden sm:flex items-center text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                                    <span>Privacidad: Inactivo</span>
                                </div>
                            )}
                            <div className="relative">
                                <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full focus:outline-none">
                                    <BellIcon className="w-6 h-6" />
                                    {totalAlerts > 0 && <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center border border-white">{totalAlerts}</span>}
                                </button>
                                {isNotificationsOpen && (
                                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                                        <div className="px-4 py-2 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Notificaciones</h3></div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {totalAlerts === 0 ? <p className="text-sm text-gray-500 text-center py-4">No hay notificaciones.</p> : (
                                                <>
                                                    {pendingDocsCount > 0 && <button onClick={handleGoToDocs} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 flex items-start"><DocumentIcon className="w-5 h-5 text-orange-500 mt-0.5 mr-3" /><div><p className="text-sm font-medium">Documentos Pendientes</p></div></button>}
                                                    {upcomingPlans.length > 0 && <button onClick={handleGoToMaintenance} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 flex items-start"><WrenchIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3" /><div><p className="text-sm font-medium">Alertas Mantenimiento</p></div></button>}
                                                    {lowStockItems.length > 0 && <button onClick={handleGoToInventory} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 flex items-start"><BoxIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3" /><div><p className="text-sm font-medium">Stock Bajo</p></div></button>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="text-right">
                                    <p className="font-semibold text-sm sm:text-base">{auth.employee.first_name} {auth.employee.last_name}</p>
                                    <p className="text-xs sm:text-sm text-gray-500">{auth.role.name}</p>
                                </div>
                                <div className="relative flex-shrink-0">
                                    <img src={auth.employee.photo_url} alt="User" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover" />
                                    <button onClick={() => setIsProfileModalOpen(true)} className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border shadow-sm hover:bg-gray-100 transition"><PencilIcon className="w-4 h-4 text-primary" /></button>
                                </div>
                            </div>
                        </div>
                    </header>
                    <div id="main-content-area" className="flex-1 p-4 sm:p-8 overflow-y-auto" onClick={() => setIsNotificationsOpen(false)}>
                        {renderView()}
                    </div>
                </main>
            </div>
            {isProfileModalOpen && <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />}
            {showDocNotification && <PendingDocumentsNotification isOpen={showDocNotification} count={pendingDocsCount} onReviewNow={handleGoToDocs} onRemindLater={() => handleDismissDocs(false)} onDontShowAgain={() => handleDismissDocs(true)} />}
            {showMaintNotification && !showDocNotification && <MaintenanceNotificationModal isOpen={showMaintNotification} onClose={() => setShowMaintNotification(false)} plans={upcomingPlans} locations={locations} />}
            <ComplianceMonitor />
        </>
    );
};

export default Layout;
