
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
      setCorrections(corrs.filter(c => c.status === 'pending'));
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

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
        {/* PANEL DE EMERGENCIA */}
        <Card className={`border-2 transition-colors ${isEmergencyMode ? 'bg-red-50 border-red-500' : 'bg-white border-gray-200'}`}>
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
                    <button onClick={() => setActiveTab('employees')} className={`px-3 py-2 font-semibold rounded-t-lg ${activeTab === 'employees' ? 'bg-white border-b-2 border-primary' : 'bg-gray-50 text-gray-600'}`}>Empleados</button>
                    <button onClick={() => setActiveTab('corrections')} className={`px-3 py-2 font-semibold rounded-t-lg flex items-center ${activeTab === 'corrections' ? 'bg-white border-b-2 border-primary' : 'bg-gray-50 text-gray-600'}`}>
                        <ReportIcon className="w-5 h-5 mr-1 text-red-500" /> Fichajes
                        {corrections.length > 0 && <span className="ml-2 bg-red-600 text-white text-[10px] rounded-full px-1.5">{corrections.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('locations')} className={`px-3 py-2 font-semibold rounded-t-lg ${activeTab === 'locations' ? 'bg-white border-b-2 border-primary' : 'bg-gray-50 text-gray-600'}`}>Ubicaciones</button>
                    <button onClick={() => setActiveTab('rooms')} className={`px-3 py-2 font-semibold rounded-t-lg ${activeTab === 'rooms' ? 'bg-white border-b-2 border-primary' : 'bg-gray-50 text-gray-600'}`}>Zonas</button>
                </nav>
            </div>
            <button onClick={() => setIsSchemaHelpOpen(true)} className="text-xs flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200"><WrenchIcon className="w-3 h-3 mr-1" /> Actualizar BD (SQL)</button>
        </div>

        {activeTab === 'employees' && (
             <Card>
                <Button onClick={() => setIsEmployeeModalOpen(true)} className="mb-4">Añadir Empleado</Button>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50"><tr className="border-b"><th className="p-3">Nombre</th><th className="p-3">Rol</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
                    <tbody>
                    {employees.map(emp => (
                        <tr key={emp.employee_id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{emp.first_name} {emp.last_name}</td>
                        <td className="p-3">{roles.find(r => r.role_id === emp.role_id)?.name}</td>
                        <td className="p-3 capitalize">{emp.status}</td>
                        <td className="p-3 flex space-x-2">
                            <button onClick={() => deleteEmployee(emp.employee_id).then(fetchData)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5"/></button>
                        </td>
                        </tr>
                    ))}
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
