
import React, { useState, useEffect } from 'react';
import { getEmployees, getLocations, getIncidents, getTimeCorrectionRequests } from '../../../services/mockApi';
import { TimeCorrectionRequest, Employee } from '../../../types';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import { AdminIcon, LocationIcon, IncidentIcon, ReportIcon } from '../../icons';
import Button from '../../shared/Button';

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
    // Refresco rápido para el administrador (cada 30s)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      {pendingCorrections.length > 0 && (
        <Card className="border-2 border-red-500 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <ReportIcon className="text-red-600 w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-red-800 uppercase tracking-tighter">Acción Requerida</h3>
                <p className="text-sm text-red-600 font-bold">Hay {pendingCorrections.length} correcciones de fichaje esperando aprobación.</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingCorrections.slice(0, 3).map(c => {
                  const emp = allEmployees.find(e => e.employee_id === c.employee_id);
                  return (
                    <div key={c.request_id} className="bg-white p-3 rounded-lg border-2 border-red-50 flex justify-between items-center shadow-sm hover:border-red-200 transition-colors">
                        <div className="text-xs">
                            <p className="font-black text-gray-900 uppercase">{emp?.first_name} {emp?.last_name}</p>
                            <p className="text-gray-500 font-medium">{new Date(c.requested_date).toLocaleDateString()} • {c.requested_clock_in}</p>
                        </div>
                        <button 
                            onClick={() => window.location.hash = '#/admin'} 
                            className="text-[9px] font-black uppercase bg-red-600 text-white px-2 py-1.5 rounded-md shadow-sm hover:bg-red-700 transition-colors"
                        >
                            Gestionar
                        </button>
                    </div>
                  )
              })}
              {pendingCorrections.length > 3 && (
                  <button 
                    onClick={() => window.location.hash = '#/admin'}
                    className="flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:bg-gray-100"
                  >
                      + Ver otras {pendingCorrections.length - 3} solicitudes
                  </button>
              )}
           </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><div className="flex items-center space-x-4"><AdminIcon className="text-primary w-8 h-8" /><div><p className="text-xs text-gray-500 uppercase font-bold">Empleados</p><p className="text-2xl font-bold">{stats.employees}</p></div></div></Card>
        <Card><div className="flex items-center space-x-4"><LocationIcon className="text-blue-500 w-8 h-8" /><div><p className="text-xs text-gray-500 uppercase font-bold">Establecimientos</p><p className="text-2xl font-bold">{stats.locations}</p></div></div></Card>
        <Card><div className="flex items-center space-x-4"><IncidentIcon className="text-red-500 w-8 h-8" /><div><p className="text-xs text-gray-500 uppercase font-bold">Incidencias</p><p className="text-2xl font-bold">{stats.incidents}</p></div></div></Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
