
import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AuthContext } from '../../App';
import { Permission, MaintenancePlan, Location, InventoryItem } from '../../types';
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
    
    const [pendingDocsCount, setPendingDocsCount] = useState(0);
    const [pendingCorrectionsCount, setPendingCorrectionsCount] = useState(0);
    const [upcomingPlans, setUpcomingPlans] = useState<MaintenancePlan[]>([]);
    const [showMaintNotification, setShowMaintNotification] = useState(false);
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
            const isAdmin = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'administracion';
            if (isAdmin && item.view !== 'cleaning') return true;
            // Solo Administrador ve Informes generales
            if (item.view === 'reports' && !isAdmin) return false;
            
            const hasPermission = !item.requiredPermission || auth?.role?.permissions.includes(item.requiredPermission);
            const hasRole = !item.role_id || auth?.role?.role_id === item.role_id;
            return hasPermission && hasRole;
        });
    }, [auth?.role, pendingCorrectionsCount]);
    
    useEffect(() => {
        const performChecks = async () => {
            if (!auth?.employee) return;
            const entries = await getTimeEntriesForEmployee(auth.employee.employee_id);
            setIsTrackingActive(entries.some(e => e.status === 'running'));

            if (auth.role?.role_id === 'admin' || auth.role?.permissions.includes('manage_employees')) {
                const corrs = await getTimeCorrectionRequests();
                setPendingCorrectionsCount(corrs.filter(c => c.status === 'pending').length);
            }

            const docs = await getEmployeeDocuments(auth.employee.employee_id);
            setPendingDocsCount(docs.filter(d => d.status === 'pending').length);
        };
        performChecks();
    }, [auth?.employee]);

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
    
    if (!auth?.employee || !auth?.role) return null;

    return (
        <div className="min-h-screen flex bg-gray-100">
            {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-primary text-white flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 z-30`}>
                <div className="h-20 flex items-center justify-center text-xl font-bold border-b border-primary-dark">{COMPANY_NAME}</div>
                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    {availableNavItems.map(item => (
                        <button key={item.view} onClick={() => { setActiveView(item.view); setIsSidebarOpen(false); }} className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${activeView === item.view ? 'bg-primary-dark shadow-inner' : 'hover:bg-primary-dark'}`}>
                            <div className="flex items-center space-x-3"><item.icon className="w-6 h-6" /><span>{item.name}</span></div>
                            {item.badgeCount ? <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{item.badgeCount}</span> : null}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-primary-dark">
                    <button onClick={auth.logout} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-red-700 transition-colors"><LogoutIcon /><span>Cerrar Sesión</span></button>
                </div>
            </aside>
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-20 bg-white shadow-md flex items-center justify-between px-6 z-20">
                    <div className="flex items-center">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mr-4 p-2"><MenuIcon /></button>
                        <h1 className="text-xl font-bold text-gray-800 capitalize">{navItems.find(i => i.view === activeView)?.name}</h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        {isTrackingActive && <span className="hidden sm:flex items-center text-[10px] bg-green-50 text-green-600 px-3 py-1 rounded-full border border-green-200 animate-pulse font-bold uppercase"><LocationIcon className="w-3 h-3 mr-1"/> GPS Activo</span>}
                        <div className="flex items-center space-x-3">
                            <div className="text-right hidden sm:block">
                                <p className="font-black text-sm">{auth.employee.first_name}</p>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">{auth.role.name}</p>
                            </div>
                            <div className="relative">
                                <img src={auth.employee.photo_url} className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 shadow-sm" />
                                <button onClick={() => setIsProfileModalOpen(true)} className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border shadow-sm"><PencilIcon className="w-3 h-3 text-primary" /></button>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto">{renderView()}</div>
            </main>
            {isProfileModalOpen && <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />}
            <ComplianceMonitor />
        </div>
    );
};

export default Layout;
