
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
import { DoorOpenIcon, KeyIcon, CalendarIcon, WrenchIcon, ReportIcon, CheckIcon, XMarkIcon, TrashIcon, PencilIcon } from '../icons';

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
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
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
      setCorrections(corrs);
      setIsEmergencyMode(maint);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEditEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (data: any) => {
    try {
      if (data.employee_id) await updateEmployee(data);
      else await addEmployee(data);
      fetchData();
      setIsEmployeeModalOpen(false);
    } catch (e) { alert("Error al guardar empleado"); }
  };

  const pendingCount = corrections.filter(c => c.status === 'pending').length;

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
        <Card className={`border-2 transition-colors ${isEmergencyMode ? 'bg-red-50 border-red-500 shadow-xl' : 'bg-white border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                    <div className={`p-3 rounded-full ${isEmergencyMode ? 'bg-red-100' : 'bg-gray-100'}`}>
                        <WrenchIcon className={isEmergencyMode ? 'text-red-600' : 'text-gray-400'} />
                    </div>
                    <div>
                        <h3 className={`font-black uppercase text-sm ${isEmergencyMode ? 'text-red-800' : 'text-gray-700'}`}>Mantenimiento</h3>
                        <p className="text-xs text-gray-500 font-bold">{isEmergencyMode ? '🔴 BLOQUEO ACTIVO' : '🟢 OPERATIVO'}</p>
                    </div>
                </div>
                <Button variant={isEmergencyMode ? 'success' : 'danger'} onClick={() => setMaintenanceMode(!isEmergencyMode).then(fetchData)}>
                    {isEmergencyMode ? '🔓 Restaurar Acceso' : '🚨 Activar Bloqueo'}
                </Button>
            </div>
        </Card>

        <nav className="flex space-x-2 border-b overflow-x-auto">
            <button onClick={() => setActiveTab('employees')} className={`px-4 py-2 font-bold ${activeTab === 'employees' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Empleados</button>
            <button onClick={() => setActiveTab('corrections')} className={`px-4 py-2 font-bold flex items-center ${activeTab === 'corrections' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Fichajes {pendingCount > 0 && <span className="ml-2 bg-red-600 text-white text-[10px] rounded-full px-2">{pendingCount}</span>}</button>
            <button onClick={() => setActiveTab('locations')} className={`px-4 py-2 font-bold ${activeTab === 'locations' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Ubicaciones</button>
        </nav>

        {activeTab === 'employees' && (
             <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700 uppercase text-xs">Personal</h3>
                    <Button size="sm" onClick={() => { setSelectedEmployee(null); setIsEmployeeModalOpen(true); }}>+ Añadir</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 border-b"><tr><th className="p-3">Nombre</th><th className="p-3">Rol</th><th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th></tr></thead>
                        <tbody>
                        {employees.map(emp => (
                            <tr key={emp.employee_id} className="border-b hover:bg-gray-50 transition-colors">
                                <td className="p-3 font-bold text-gray-800">{emp.first_name} {emp.last_name}</td>
                                <td className="p-3 text-xs">{roles.find(r => r.role_id === emp.role_id)?.name}</td>
                                <td className="p-3 text-xs capitalize"><span className={`px-2 py-0.5 rounded-full font-bold ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{emp.status}</span></td>
                                <td className="p-3 flex justify-end space-x-2">
                                    <button onClick={() => handleEditEmployee(emp)} className="p-2 text-primary hover:bg-primary/10 rounded-lg"><PencilIcon className="w-5 h-5"/></button>
                                    <button onClick={() => deleteEmployee(emp.employee_id).then(fetchData)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><TrashIcon className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        )}
        
        {isEmployeeModalOpen && <EmployeeFormModal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} onSave={handleSaveEmployee} employee={selectedEmployee} roles={roles} />}
        {isSchemaHelpOpen && <SchemaHelpModal isOpen={isSchemaHelpOpen} onClose={() => setIsSchemaHelpOpen(false)} />}
    </div>
  );
};

export default AdminView;
