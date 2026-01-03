
import React, { useState, useEffect } from 'react';
import { getEmployees, getLocations, getIncidents, getTimeCorrectionRequests } from '../../../services/mockApi';
import { TimeCorrectionRequest, Employee } from '../../../types';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import { AdminIcon, LocationIcon, IncidentIcon } from '../../icons';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({ employees: 0, locations: 0, incidents: 0 });
  const [pendingCorrections, setPendingCorrections] = useState<TimeCorrectionRequest[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [emps, locs, incs, corrs] = await Promise.all([
          getEmployees(), getLocations(), getIncidents(), getTimeCorrectionRequests()
      ]);
      setAllEmployees(emps);
      setStats({
        employees: emps.filter(e => e.status === 'active').length,
        locations: locs.length,
        incidents: incs.filter(i => i.status !== 'resolved').length,
      });
      setPendingCorrections(corrs.filter(c => c.status === 'pending'));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><div className="flex items-center space-x-4"><AdminIcon className="text-primary w-8 h-8" /><div><p className="text-xs text-gray-500 uppercase font-bold">Empleados</p><p className="text-2xl font-bold">{stats.employees}</p></div></div></Card>
        <Card><div className="flex items-center space-x-4"><LocationIcon className="text-blue-500 w-8 h-8" /><div><p className="text-xs text-gray-500 uppercase font-bold">Establecimientos</p><p className="text-2xl font-bold">{stats.locations}</p></div></div></Card>
        <Card><div className="flex items-center space-x-4"><IncidentIcon className="text-red-500 w-8 h-8" /><div><p className="text-xs text-gray-500 uppercase font-bold">Incidencias</p><p className="text-2xl font-bold">{stats.incidents}</p></div></div></Card>
      </div>

      {pendingCorrections.length > 0 && (
        <Card title="⚠️ Correcciones de Fichaje Pendientes" className="border-2 border-orange-200">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingCorrections.map(c => {
                  const emp = allEmployees.find(e => e.employee_id === c.employee_id);
                  return (
                    <div key={c.request_id} className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex justify-between items-center">
                        <div className="text-xs">
                            <p className="font-bold text-gray-800">{emp?.first_name} {emp?.last_name}</p>
                            <p className="text-gray-500">{new Date(c.requested_date).toLocaleDateString()} • {c.requested_clock_in}</p>
                        </div>
                        <button onClick={() => window.location.hash = '#/admin'} className="text-[10px] font-bold bg-white text-orange-600 px-2 py-1 rounded shadow-sm border border-orange-200">Ver en Admin</button>
                    </div>
                  )
              })}
           </div>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
