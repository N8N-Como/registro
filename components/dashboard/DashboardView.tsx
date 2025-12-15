
import React, { useContext } from 'react';
import { AuthContext } from '../../App';
import AdminDashboard from './widgets/AdminDashboard';
import CleanerDashboard from './widgets/CleanerDashboard';
import GobernantaDashboard from './widgets/GobernantaDashboard';
import MaintenanceDashboard from './widgets/MaintenanceDashboard';
import ReceptionistDashboard from './widgets/ReceptionistDashboard';
import EmployeeStatusWidget from './widgets/EmployeeStatusWidget';
import EstablishmentCheckInWidget from './widgets/EstablishmentCheckInWidget';
import ShiftLogWidget from './widgets/ShiftLogWidget';

const DashboardView: React.FC = () => {
    const auth = useContext(AuthContext);

    const renderRoleSpecificDashboard = () => {
        switch (auth?.role?.role_id) {
            case 'admin':
                return <AdminDashboard />;
            case 'cleaner':
                return <CleanerDashboard />;
            case 'gobernanta':
                return <GobernantaDashboard />;
            case 'maintenance':
                return <MaintenanceDashboard />;
            case 'receptionist':
                return <ReceptionistDashboard />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1" id="widget-my-status">
                    <EmployeeStatusWidget />
                </div>
                <div className="lg:col-span-2" id="widget-team-status">
                   <EstablishmentCheckInWidget />
                </div>
            </div>
            
            <div id="widget-shift-log">
                <ShiftLogWidget />
            </div>
            
            <div id="widget-role-specific">
                {renderRoleSpecificDashboard()}
            </div>
        </div>
    );
};

export default DashboardView;
