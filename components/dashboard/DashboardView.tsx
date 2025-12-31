
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
import LiveStaffMap from './LiveStaffMap';
import RoomFloorPlan from '../shared/RoomFloorPlan';

const DashboardView: React.FC = () => {
    const auth = useContext(AuthContext);
    const isAdmin = auth?.role?.role_id === 'admin';
    const isReception = auth?.role?.role_id === 'receptionist';

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
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div id="widget-my-status">
                        <EmployeeStatusWidget />
                    </div>
                    <div id="widget-team-status">
                       <EstablishmentCheckInWidget />
                    </div>
                </div>
                <div className="lg:col-span-2">
                    <RoomFloorPlan />
                </div>
            </div>
            
            {(isAdmin || isReception) && (
                <div id="live-map">
                    <LiveStaffMap />
                </div>
            )}
            
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
