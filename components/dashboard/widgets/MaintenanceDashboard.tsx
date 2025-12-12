
import React, { useState, useEffect } from 'react';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import { getIncidents } from '../../../services/mockApi';
import { IncidentIcon, WrenchIcon } from '../../icons';

const MaintenanceDashboard: React.FC = () => {
  const [stats, setStats] = useState({ corrective: 0, preventive: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const incidents = await getIncidents();
        const active = incidents.filter(i => i.status !== 'resolved');
        
        setStats({
            total: active.length,
            corrective: active.filter(i => !i.type || i.type === 'corrective').length,
            preventive: active.filter(i => i.type === 'preventive').length
        });
      } catch (error) {
        console.error("Failed to fetch incidents for maintenance", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
        <div className="flex items-center space-x-4">
            <IncidentIcon className="w-12 h-12 text-red-500" />
            <div>
            <p className="text-gray-500">Averías (Correctivo)</p>
            <p className="text-3xl font-bold">{stats.corrective}</p>
            </div>
        </div>
        </Card>
        <Card>
        <div className="flex items-center space-x-4">
            <WrenchIcon className="w-12 h-12 text-blue-500" />
            <div>
            <p className="text-gray-500">Tareas Programadas</p>
            <p className="text-3xl font-bold">{stats.preventive}</p>
            </div>
        </div>
        </Card>
    </div>
  );
};

export default MaintenanceDashboard;
