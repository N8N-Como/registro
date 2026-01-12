
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
import InventoryView from '../inventory/InventoryView';
import { getEmployeeDocuments, getTimeEntriesForEmployee, getTimeCorrectionRequests } from '../../services/mockApi';

const Layout: React.FC = () => {
    const auth = useContext(AuthContext);
    const [activeView, setActiveView] = useState('dashboard');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [pendingCorrectionsCount, setPendingCorrectionsCount] = useState(0);
    const [isTrackingActive, setIsTrackingActive] = useState(false);

    // Soporte para navegación externa (Dashboard -> Admin)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#/admin')) setActiveView('admin');
            if (hash.startsWith('#/incidents')) setActiveView('incidents');
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Check initial
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const navItems = [
        { name: 'Panel', view: 'dashboard', icon: DashboardIcon },
        { name: 'Fichajes', view: 'timesheets', icon: TimesheetIcon },
        { name: 'Cuadrantes', view: 'scheduler_shifts', icon: CalendarIcon },
        { name: 'Ausencias', view: 'time_off', icon: SunIcon },
        { name: 'Documentación', view: 'documents', icon: DocumentIcon }, 
        { name: 'Tareas Limpieza', view: 'cleaning', icon: BroomIcon, role_id: 'cleaner' },
        { name: 'Planificador Tareas', view: 'scheduler', icon: CalendarIcon, requiredPermission: 'schedule_tasks' as Permission },
        { name: 'Inventario', view: 'inventory', icon: BoxIcon, requiredPermission: 'manage_inventory' as Permission },
        { name: 'Incidencias', view: 'incidents', icon: IncidentIcon },
        { name: 'Mantenimiento Prev.', view: 'maintenance_plan', icon: WrenchIcon, requiredPermission: 'manage_incidents' as Permission },
        { name: 'Objetos Olvidados', view: 'lost_found', icon: ArchiveBoxIcon },
        { name: 'Registro de Turno', view: 'shiftlog', icon: BookOpenIcon, requiredPermission: 'access_shift_log' as Permission },
        { name: 'Comunicados', view: 'announcements', icon: MegaphoneIcon, requiredPermission: 'manage_announcements' as Permission },
        { name: 'Informes', view: 'reports', icon: ReportIcon }, // Visible para todos
        { name: 'Administración', view: 'admin', icon: AdminIcon, requiredPermission: 'manage_employees' as Permission, badgeCount: pendingCorrectionsCount },
    ];

    const availableNavItems = useMemo(() => {
        return navItems.filter(item => {
            const isAdmin = auth?.role?.role_id === 'admin' || auth?.role?.role_id === 'administracion';
            if (isAdmin && item.view !== 'cleaning') return true;
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
        };
        performChecks();
        const interval = setInterval(performChecks, 60000);
        return () => clearInterval(interval);
    }, [auth?.employee]);

    if (!auth?.employee || !auth?.role) return null;

    return (
        <div className="min-h-screen flex bg-gray-100">
            {isSidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-primary text-white flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 z-30 shadow-2xl`}>
                <div className="h-20 flex items-center justify-center text-xl font-bold border-b border-primary-dark uppercase tracking-tighter">Como en Casa</div>
                <nav className="flex-grow p-4 space-y-1 overflow-y-auto custom-scrollbar" id="sidebar-menu">
                    {availableNavItems.map(item => (
                        <button key={item.view} onClick={() => { setActiveView(item.view); setIsSidebarOpen(false); window.location.hash = ''; }} className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${activeView === item.view ? 'bg-white/10 shadow-inner translate-x-1' : 'hover:bg-white/5'}`}>
                            <div className="flex items-center space-x-3"><item.icon className="w-5 h-5 opacity-80" /> <span className="text-sm font-medium">{item.name}</span></div>
                            {item.badgeCount ? <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-primary animate-pulse">{item.badgeCount}</span> : null}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-primary-dark">
                    <button onClick={auth.logout} className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-red-700 transition-colors opacity-70 hover:opacity-100"><LogoutIcon /> <span className="text-sm font-bold">Cerrar Sesión</span></button>
                </div>
            </aside>
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-20 bg-white shadow-sm flex items-center justify-between px-6 z-20">
                    <div className="flex items-center">
                        <button id="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)} className="lg:hidden mr-4 p-2 bg-gray-100 rounded-lg"><MenuIcon /></button>
                        <h1 className="text-lg font-black text-gray-800 uppercase tracking-tight">{navItems.find(i => i.view === activeView)?.name}</h1>
                    </div>
                    <div className="flex items-center space-x-6">
                        {isTrackingActive && <span className="hidden sm:flex items-center text-[10px] bg-green-50 text-green-600 px-3 py-1 rounded-full border border-green-200 animate-pulse font-bold uppercase"><LocationIcon className="w-3 h-3 mr-1"/> GPS Activo</span>}
                        <div className="flex items-center space-x-3">
                            <div className="text-right hidden sm:block">
                                <p className="font-black text-xs uppercase leading-none">{auth.employee.first_name}</p>
                                <p className="text-[9px] text-gray-400 uppercase font-bold mt-1 tracking-widest">{auth.role.name}</p>
                            </div>
                            <div className="relative">
                                <img src={auth.employee.photo_url} className="w-10 h-10 rounded-xl object-cover border-2 border-gray-100 shadow-sm" />
                                <button onClick={() => setIsProfileModalOpen(true)} className="absolute -bottom-1 -right-1 bg-primary text-white rounded-lg p-0.5 shadow-md"><PencilIcon className="w-3 h-3" /></button>
                            </div>
                        </div>
                    </div>
                </header>
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
                    {activeView === 'dashboard' && <DashboardView />}
                    {activeView === 'timesheets' && <TimesheetsView />}
                    {activeView === 'scheduler_shifts' && <ShiftSchedulerView />}
                    {activeView === 'time_off' && <TimeOffView />}
                    {activeView === 'documents' && <DocumentsView />}
                    {activeView === 'admin' && <AdminView />}
                    {activeView === 'incidents' && <IncidentsView />}
                    {activeView === 'maintenance_plan' && <MaintenanceCalendarView />}
                    {activeView === 'reports' && <ReportsView />}
                    {activeView === 'cleaning' && <CleaningView />}
                    {activeView === 'scheduler' && <GobernantaView />}
                    {activeView === 'inventory' && <InventoryView />}
                    {activeView === 'shiftlog' && <ShiftLogView />}
                    {activeView === 'announcements' && <AnnouncementsView />}
                    {activeView === 'lost_found' && <LostFoundView />}
                </div>
            </main>
            {isProfileModalOpen && <ProfileEditModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />}
        </div>
    );
};

export default Layout;
