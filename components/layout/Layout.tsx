
import React, { useState, useContext, useMemo } from 'react';
import { AuthContext } from '../../App';
import { Permission } from '../../types';
import { DashboardIcon, TimesheetIcon, AdminIcon, IncidentIcon, ReportIcon, LogoutIcon, BroomIcon, BookOpenIcon, PencilIcon, MegaphoneIcon, CalendarIcon, MenuIcon } from '../icons';
import DashboardView from '../dashboard/DashboardView';
import TimesheetsView from '../timesheets/TimesheetsView';
import AdminView from '../admin/AdminView';
import IncidentsView from '../incidents/IncidentsView';
import ReportsView from '../reports/ReportsView';
import CleaningView from '../cleaning/CleaningView';
import GobernantaView from '../gobernanta/GobernantaView';
import ShiftLogView from '../shiftlog/ShiftLogView';
import { COMPANY_NAME } from '../../constants';
import ProfileEditModal from '../user/ProfileEditModal';
import AnnouncementsView from '../announcements/AnnouncementsView';


type NavItem = {
    name: string;
    view: string;
    icon: React.FC<{className?: string}>;
    requiredPermission?: Permission;
    role_id?: string;
};

const navItems: NavItem[] = [
    { name: 'Panel', view: 'dashboard', icon: DashboardIcon },
    { name: 'Fichajes', view: 'timesheets', icon: TimesheetIcon },
    { name: 'Tareas Limpieza', view: 'cleaning', icon: BroomIcon, role_id: 'cleaner' },
    { name: 'Planificador Tareas', view: 'scheduler', icon: CalendarIcon, requiredPermission: 'schedule_tasks' },
    { name: 'Incidencias', view: 'incidents', icon: IncidentIcon },
    { name: 'Registro de Turno', view: 'shiftlog', icon: BookOpenIcon, requiredPermission: 'access_shift_log' },
    { name: 'Comunicados', view: 'announcements', icon: MegaphoneIcon, requiredPermission: 'manage_announcements' },
    { name: 'Informes', view: 'reports', icon: ReportIcon, requiredPermission: 'view_reports' },
    { name: 'Administración', view: 'admin', icon: AdminIcon, requiredPermission: 'manage_employees' },
];

const Layout: React.FC = () => {
    const auth = useContext(AuthContext);
    const [activeView, setActiveView] = useState('dashboard');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);


    const availableNavItems = useMemo(() => {
        return navItems.filter(item => {
            if (auth?.role?.role_id === 'admin' && item.view !== 'cleaning') return true;
            const hasPermission = !item.requiredPermission || auth?.role?.permissions.includes(item.requiredPermission);
            const hasRole = !item.role_id || auth?.role?.role_id === item.role_id;
            return hasPermission && hasRole;
        });
    }, [auth?.role]);
    
    const renderView = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardView />;
            case 'timesheets': return <TimesheetsView />;
            case 'admin': return <AdminView />;
            case 'incidents': return <IncidentsView />;
            case 'reports': return <ReportsView />;
            case 'cleaning': return <CleaningView />;
            case 'scheduler': return <GobernantaView />;
            case 'shiftlog': return <ShiftLogView />;
            case 'announcements': return <AnnouncementsView />;
            default: return <DashboardView />;
        }
    };
    
    if (!auth || !auth.employee || !auth.role) {
        return <div>Error de autenticación.</div>;
    }

    const currentViewName = navItems.find(item => item.view === activeView)?.name || 'Panel';

    return (
        <>
            <div className="min-h-screen flex bg-gray-100">
                {/* Mobile Overlay */}
                 {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden" 
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                 )}

                <aside className={`fixed inset-y-0 left-0 w-64 bg-primary text-white flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-30`}>
                    <div className="h-20 flex items-center justify-center text-xl font-bold border-b border-primary-dark px-4 text-center">
                        {COMPANY_NAME}
                    </div>
                    <nav className="flex-grow p-4 space-y-2">
                        {availableNavItems.map(item => (
                            <button 
                                key={item.view} 
                                onClick={() => {
                                    setActiveView(item.view)
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                                    activeView === item.view ? 'bg-primary-dark' : 'hover:bg-primary-dark'
                                }`}
                            >
                                <item.icon className="w-6 h-6" />
                                <span>{item.name}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-primary-dark">
                        <button 
                            onClick={auth.logout}
                            className="w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors hover:bg-red-700"
                        >
                            <LogoutIcon />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </aside>
                <main className="flex-1 flex flex-col">
                    <header className="h-20 bg-white text-gray-900 shadow-md flex items-center justify-between px-3 sm:px-6">
                        <div className="flex items-center">
                             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden mr-4 p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                                <MenuIcon />
                            </button>
                            <h1 className="text-lg sm:text-2xl font-semibold text-gray-800 capitalize">{currentViewName}</h1>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="text-right">
                                <p className="font-semibold text-sm sm:text-base">{auth.employee.first_name} {auth.employee.last_name}</p>
                                <p className="text-xs sm:text-sm text-gray-500">{auth.role.name}</p>
                            </div>
                            <div className="relative flex-shrink-0">
                                <img src={auth.employee.photo_url} alt="User" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover" />
                                <button
                                    onClick={() => setIsProfileModalOpen(true)}
                                    className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border shadow-sm hover:bg-gray-100 transition"
                                    aria-label="Editar perfil"
                                >
                                    <PencilIcon className="w-4 h-4 text-primary" />
                                </button>
                            </div>
                        </div>
                    </header>
                    <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
                        {renderView()}
                    </div>
                </main>
            </div>
            {isProfileModalOpen && (
                <ProfileEditModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                />
            )}
        </>
    );
};

export default Layout;