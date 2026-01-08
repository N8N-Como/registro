
import React, { useState, useEffect, useContext } from 'react';
import { getEmployees, getLocations, getRoles, addEmployee, updateEmployee, addLocation, updateLocation, getRooms, addRoom, updateRoom, updateRole, getShiftConfigs, addShiftConfig, updateShiftConfig, deleteShiftConfig, getTimeCorrectionRequests, resolveTimeCorrectionRequest, deleteEmployee, deleteLocation, deleteRoom, getMaintenanceMode, setMaintenanceMode } from '../../services/mockApi';
import { Employee, Location, Role, Room, Permission, ShiftConfig, TimeCorrectionRequest } from '../../types';
import { AuthContext } from '../../App';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import EmployeeFormModal from './EmployeeFormModal';
import LocationFormModal from './LocationFormModal';
import RoomFormModal from './RoomFormModal'; 
import RoleFormModal from './RoleFormModal';
import ShiftConfigFormModal from './ShiftConfigFormModal';
import SchemaHelpModal from './SchemaHelpModal';
import { DoorOpenIcon, KeyIcon, CalendarIcon, WrenchIcon, ReportIcon, CheckIcon, XMarkIcon, TrashIcon } from '../icons';

type AdminTab = 'employees' | 'locations' | 'rooms' | 'roles' | 'shift_configs' | 'corrections';

const AdminView: React.FC = () => {
  const auth = useContext(AuthContext);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>([]);
  const [corrections, setCorrections] = useState<TimeCorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [isUpdatingEmergency, setIsUpdatingEmergency] = useState(false);
  
  const [activeTab, setActiveTab] = useState<AdminTab>('employees');
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isSchemaHelpOpen, setIsSchemaHelpOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [emps, locs, rols, rms, shifts, corrs, maint] = await Promise.all([
          getEmployees(), getLocations(), getRoles(), getRooms(), getShiftConfigs(), getTimeCorrectionRequests(), getMaintenanceMode()
      ]);
      setEmployees(emps);
      setLocations(locs);
      setRoles(rols);
      setRooms(rms);
      setShiftConfigs(shifts);
      // Filtramos las pendientes para resaltar, pero las mostramos todas en la tabla de gestión
      setCorrections(corrs);
      setIsEmergencyMode(maint);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleEmergency = async () => {
      const confirmMsg = isEmergencyMode 
        ? "¿Abrir acceso a todos los usuarios?" 
        : "⚠️ ¿BLOQUEAR ACCESO? Todos los empleados (excepto tú) verán una pantalla de mantenimiento y no podrán fichar ni ver datos.";
      
      if (!window.confirm(confirmMsg)) return;

      setIsUpdatingEmergency(true);
      try {
          await setMaintenanceMode(!isEmergencyMode);
          setIsEmergencyMode(!isEmergencyMode);
      } catch {
          alert("Error al cambiar estado.");
      } finally {
          setIsUpdatingEmergency(false);
      }
  };

  const handleResolveCorrection = async (requestId: string, status: 'approved' | 'rejected') => {
      if (!auth?.employee) return;
      if (!window.confirm(`¿Estás seguro de ${status === 'approved' ? 'APROBAR' : 'RECHAZAR'} este cambio de horario?`)) return;
      
      try {
          await resolveTimeCorrectionRequest(requestId, status, auth.employee.employee_id);
          fetchData();
      } catch (e) {
          alert("Error al resolver la solicitud.");
      }
  };

  const pendingCount = corrections.filter(c => c.status === 'pending').length;

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
        {/* PANEL DE EMERGENCIA */}
        <Card className={`border-2 transition-colors ${isEmergencyMode ? 'bg-red-50 border-red-500 shadow-xl' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className={`p-3 rounded-full ${isEmergencyMode ? 'bg-red-100' : 'bg-gray-100'}`}>
                        <WrenchIcon className={isEmergencyMode ? 'text-red-600' : 'text-gray-400'} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-sm ${isEmergencyMode ? 'text-red-800' : 'text-gray-700'}`}>
                            Control de Acceso (Mantenimiento)
                        </h3>
                        <p className="text-xs text-gray-500 font-bold">
                            {isEmergencyMode 
                                ? '🔴 BLOQUEO ACTIVO: Solo los administradores tienen acceso.' 
                                : '🟢 OPERATIVO: Todos los empleados pueden usar la aplicación.'}
                        </p>
                    </div>
                </div>
                <Button 
                    variant={isEmergencyMode ? 'success' : 'danger'} 
                    onClick={handleToggleEmergency}
                    isLoading={isUpdatingEmergency}
                    className="w-full sm:w-auto shadow-xl font-black uppercase italic"
                >
                    {isEmergencyMode ? '🔓 Restaurar Acceso' : '🚨 Activar Bloqueo'}
                </Button>
            </div>
        </Card>

        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2">
            <div className="border-b border-gray-200 w-full md:w-auto">
                <nav className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveTab('employees')} className={`px-3 py-2 font-semibold rounded-t-lg ${activeTab === 'employees' ? 'bg-white border-b-2 border-primary text-primary' : 'bg-gray-50 text-gray-600'}`}>Empleados</button>
                    <button onClick={() => setActiveTab('corrections')} className={`px-3 py-2 font-semibold rounded-t-lg flex items-center transition-all ${activeTab === 'corrections' ? 'bg-white border-b-2 border-primary text-primary' : 'bg-gray-50 text-gray-600'}`}>
                        <ReportIcon className={`w-5 h-5 mr-1 ${pendingCount > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`} /> 
                        Fichajes
                        {pendingCount > 0 && <span className="ml-2 bg-red-600 text-white text-[10px] font-black rounded-full px-2 py-0.5 shadow-sm">{pendingCount}</span>}
                    </button>
                    <button onClick={() => setActiveTab('locations')} className={`px-3 py-2 font-semibold rounded-t-lg ${activeTab === 'locations' ? 'bg-white border-b-2 border-primary' : 'bg-gray-50 text-gray-600'}`}>Ubicaciones</button>
                    <button onClick={() => setActiveTab('rooms')} className={`px-3 py-2 font-semibold rounded-t-lg ${activeTab === 'rooms' ? 'bg-white border-b-2 border-primary' : 'bg-gray-50 text-gray-600'}`}>Zonas</button>
                </nav>
            </div>
            <button onClick={() => setIsSchemaHelpOpen(true)} className="text-xs flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200"><WrenchIcon className="w-3 h-3 mr-1" /> Actualizar BD (SQL)</button>
        </div>

        {activeTab === 'employees' && (
             <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700 uppercase text-xs">Listado de Personal</h3>
                    <Button size="sm" onClick={() => setIsEmployeeModalOpen(true)}>Añadir Empleado</Button>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50"><tr className="border-b text-[10px] uppercase font-black text-gray-400"><th className="p-3">Nombre</th><th className="p-3">Rol</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
                    <tbody>
                    {employees.map(emp => (
                        <tr key={emp.employee_id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-bold text-gray-800">{emp.first_name} {emp.last_name}</td>
                        <td className="p-3 text-xs">{roles.find(r => r.role_id === emp.role_id)?.name}</td>
                        <td className="p-3 capitalize text-xs">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {emp.status}
                            </span>
                        </td>
                        <td className="p-3 flex space-x-2">
                            <button onClick={() => deleteEmployee(emp.employee_id).then(fetchData)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-5 h-5"/></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </Card>
        )}

        {activeTab === 'corrections' && (
            <Card title="Gestión de Fichajes y Correcciones">
                <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4 text-xs text-red-800 font-medium">
                    Resaltadas en rojo las peticiones pendientes que requieren tu aprobación para actualizar los informes oficiales.
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50"><tr className="border-b text-[10px] uppercase font-black text-gray-400"><th className="p-3">Empleado</th><th className="p-3">Fecha</th><th className="p-3">Solicitud</th><th className="p-3">Motivo</th><th className="p-3 text-right">Acciones</th></tr></thead>
                        <tbody>
                        {corrections.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No hay registros de corrección para mostrar.</td></tr>
                        ) : (
                            corrections.sort((a,b) => a.status === 'pending' ? -1 : 1).map(corr => {
                                const emp = employees.find(e => e.employee_id === corr.employee_id);
                                const isPending = corr.status === 'pending';
                                
                                // Formateo de la hora solicitada
                                const timeVal = corr.requested_clock_in || corr.requested_clock_out;
                                const displayTime = timeVal?.includes('T') ? timeVal.split('T')[1].substring(0, 5) : timeVal;
                                const label = corr.requested_clock_in ? 'ENTRADA' : 'SALIDA';

                                return (
                                    <tr key={corr.request_id} className={`border-b transition-colors ${isPending ? 'bg-red-50 hover:bg-red-100' : 'bg-white opacity-60'}`}>
                                        <td className="p-3 font-bold text-gray-800">{emp?.first_name} {emp?.last_name}</td>
                                        <td className="p-3 text-xs font-medium">{new Date(corr.requested_date).toLocaleDateString('es-ES')}</td>
                                        <td className="p-3">
                                            <div className="flex flex-col">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded w-fit ${isPending ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'}`}>
                                                    MODIFICAR {label}
                                                </span>
                                                <span className="text-sm font-black mt-1">{displayTime}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-xs text-gray-600 max-w-xs">{corr.reason}</td>
                                        <td className="p-3 text-right">
                                            {isPending ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleResolveCorrection(corr.request_id, 'approved')}
                                                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transform active:scale-95 transition-all"
                                                        title="Aprobar cambio"
                                                    >
                                                        <CheckIcon className="w-5 h-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleResolveCorrection(corr.request_id, 'rejected')}
                                                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md transform active:scale-95 transition-all"
                                                        title="Rechazar cambio"
                                                    >
                                                        <XMarkIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${corr.status === 'approved' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                                                    {corr.status === 'approved' ? '✓ Aprobado' : '✕ Rechazado'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </Card>
        )}
        
        {isEmployeeModalOpen && <EmployeeFormModal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} onSave={() => { fetchData(); setIsEmployeeModalOpen(false); }} employee={null} roles={roles} />}
        {isSchemaHelpOpen && <SchemaHelpModal isOpen={isSchemaHelpOpen} onClose={() => setIsSchemaHelpOpen(false)} />}
    </div>
  );
};

export default AdminView;
