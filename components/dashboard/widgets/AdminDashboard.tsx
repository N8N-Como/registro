
import React, { useState, useEffect } from 'react';
import { getEmployees, getLocations, getIncidents } from '../../../services/mockApi';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import { AdminIcon, LocationIcon, IncidentIcon } from '../../icons';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({ employees: 0, locations: 0, incidents: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [emps, locs, incs] = await Promise.all([
            getEmployees(), 
            getLocations(), 
            getIncidents()
        ]);
        setStats({
          employees: emps.filter(e => e.status === 'active').length,
          locations: locs.length,
          incidents: incs.filter(i => i.status !== 'resolved').length,
        });
      } catch (error) {
        console.error("Failed to fetch admin dashboard stats", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <div className="flex items-center space-x-4">
            <AdminIcon className="w-12 h-12 text-primary" />
            <div>
                <p className="text-gray-500">Empleados Activos</p>
                <p className="text-3xl font-bold">{stats.employees}</p>
            </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center space-x-4">
            <LocationIcon />
            <div>
                <p className="text-gray-500">Ubicaciones</p>
                <p className="text-3xl font-bold">{stats.locations}</p>
            </div>
        </div>
      </Card>
       <Card>
        <div className="flex items-center space-x-4">
            <IncidentIcon className="w-12 h-12 text-red-500" />
            <div>
                <p className="text-gray-500">Incidencias Abiertas</p>
                <p className="text-3xl font-bold">{stats.incidents}</p>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
