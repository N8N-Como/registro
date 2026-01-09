
import React, { useState, useEffect, useContext } from 'react';
import { getEmployees, getLocations, getRoles, addEmployee, updateEmployee, deleteEmployee, addLocation, updateLocation, deleteLocation, getRooms, addRoom, updateRoom, deleteRoom, getShiftConfigs, addShiftConfig, updateShiftConfig, deleteShiftConfig, getTimeCorrectionRequests, resolveTimeCorrectionRequest, getMaintenanceMode, setMaintenanceMode, updateRole } from '../../services/mockApi';
import { Employee, Location, Role, Room, ShiftConfig, TimeCorrectionRequest } from '../../types';
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
import { WrenchIcon, CheckIcon, XMarkIcon, TrashIcon, PencilIcon, LocationIcon, SparklesIcon, DoorOpenIcon, CalendarIcon } from '../icons';

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
  
  const [activeTab, setActiveTab] = useState<AdminTab>('employees');
  
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isShiftConfigModalOpen, setIsShiftConfigModalOpen] = useState(false);
  const [selectedShiftConfig, setSelectedShiftConfig] = useState<ShiftConfig | null>(null);
  const [isSchemaHelpOpen, setIsSchemaHelpOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [emps, locs, rols, rms, shifts, corrs] = await Promise.all([
          getEmployees(), getLocations(), getRoles(), getRooms(), getShiftConfigs(), getTimeCorrectionRequests()
      ]);
      setEmployees(emps);
      setLocations(locs);
      setRoles(rols);
      setRooms(rms);
      setShiftConfigs(shifts);
      setCorrections(corrs);
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleResolveCorrection = async (id: string, status: 'approved' | 'rejected') => {
      if (!auth?.employee) return;
      try {
          await resolveTimeCorrectionRequest(id, status, auth.employee.employee_id);
          fetchData();
      } catch (e: any) { alert("Error al procesar: " + e.message); }
  };

  const handleCreateDefaultConfigs = async () => {
      if (!window.confirm("Se crearán los códigos estándar. ¿Continuar?")) return;
      const defaults = [
          { code: 'V25', name: 'Vacaciones', start_time: '00:00', end_time: '00:00', color: '#10b981' },
          { code: 'L', name: 'Libre', start_time: '00:00', end_time: '00:00', color: '#9ca3af' },
          { code: 'MM', name: 'Media Mañana', start_time: '10:00', end_time: '14:00', color: '#3b82f6' },
          { code: 'T', name: 'Tarde', start_time: '15:00', end_time: '23:00', color: '#6366f1' }
      ];
      for (const d of defaults) { try { await addShiftConfig(d); } catch {} }
      fetchData();
  };

  if (isLoading) return <Spinner />;

  const tabClass = (id: AdminTab) => `px-6 py-3 font-black uppercase text-[10px] tracking-widest transition-all border-b-4 ${activeTab === id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-gray-600'}`;

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-primary uppercase tracking-tight">Panel Administrativo</h2>
            <button onClick={() => setIsSchemaHelpOpen(true)} className="text-xs font-bold text-gray-400 underline hover:text-primary">Instrucciones SQL</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="flex border-b overflow-x-auto custom-scrollbar">
                <button onClick={() => setActiveTab('employees')} className={tabClass('employees')}>Empleados</button>
                <button onClick={() => setActiveTab('corrections')} className={tabClass('corrections')}>Correcciones {corrections.filter(c => c.status === 'pending').length > 0 && <span className="ml-2 bg-red-600 text-white rounded-full px-1.5 font-bold">{corrections.filter(c => c.status === 'pending').length}</span>}</button>
                <button onClick={() => setActiveTab('rooms')} className={tabClass('rooms')}>Habitaciones</button>
                <button onClick={() => setActiveTab('locations')} className={tabClass('locations')}>Centros</button>
                <button onClick={() => setActiveTab('roles')} className={tabClass('roles')}>Roles</button>
                <button onClick={() => setActiveTab('shift_configs')} className={tabClass('shift_configs')}>Turnos</button>
            </div>

            <div className="p-6">
                {activeTab === 'employees' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center"><h3 className="font-bold uppercase text-xs text-gray-400">Personal</h3><Button size="sm" onClick={() => { setSelectedEmployee(null); setIsEmployeeModalOpen(true); }}>+ Añadir</Button></div>
                        <table className="w-full text-left text-sm">
                            <thead><tr className="bg-gray-50 text-[10px] font-black uppercase border-b text-gray-400"><th className="p-3">Nombre</th><th className="p-3">Rol</th><th className="p-3 text-right">Acciones</th></tr></thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.employee_id} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-bold">{emp.first_name} {emp.last_name}</td>
                                        <td className="p-3 text-xs uppercase text-gray-500">{roles.find(r => r.role_id === emp.role_id)?.name}</td>
                                        <td className="p-3 flex justify-end gap-2">
                                            <button onClick={() => { setSelectedEmployee(emp); setIsEmployeeModalOpen(true); }} className="p-1 text-primary"><PencilIcon className="w-4 h-4"/></button>
                                            <button onClick={async () => { if(window.confirm("¿Borrar?")) { await deleteEmployee(emp.employee_id); fetchData(); } }} className="p-1 text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'corrections' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h3 className="font-bold uppercase text-xs text-gray-400">Solicitudes de Cambio de Horario</h3>
                        {corrections.filter(c => c.status === 'pending').length === 0 ? <p className="text-gray-400 italic text-center py-8">No hay solicitudes pendientes.</p> : (
                            <div className="grid grid-cols-1 gap-3">
                                {corrections.filter(c => c.status === 'pending').map(c => {
                                    const emp = employees.find(e => e.employee_id === c.employee_id);
                                    return (
                                        <Card key={c.request_id} className="border-l-4 border-orange-500 p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-black text-gray-900 uppercase">{emp?.first_name} {emp?.last_name}</p>
                                                    <p className="text-xs text-gray-500">{new Date(c.requested_date).toLocaleDateString()} • {c.requested_clock_in ? `ENTRADA: ${new Date(c.requested_clock_in).toLocaleTimeString()}` : `SALIDA: ${new Date(c.requested_clock_out!).toLocaleTimeString()}`}</p>
                                                    <p className="mt-2 text-sm bg-gray-50 p-2 rounded border">{c.reason}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleResolveCorrection(c.request_id, 'approved')} className="p-2 bg-green-500 text-white rounded-lg shadow-sm"><CheckIcon className="w-4 h-4"/></button>
                                                    <button onClick={() => handleResolveCorrection(c.request_id, 'rejected')} className="p-2 bg-red-500 text-white rounded-lg shadow-sm"><XMarkIcon className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'rooms' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center"><h3 className="font-bold uppercase text-xs text-gray-400">Apartamentos y Zonas</h3><Button size="sm" onClick={() => { setSelectedRoom(null); setIsRoomModalOpen(true); }}>+ Añadir</Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {rooms.map(room => (
                                <Card key={room.room_id} className="p-3 border-l-4 border-blue-400 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-sm">{room.name}</p>
                                        <p className="text-[10px] text-gray-400 uppercase">{locations.find(l => l.location_id === room.location_id)?.name}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setSelectedRoom(room); setIsRoomModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><PencilIcon className="w-3.5 h-3.5"/></button>
                                        <button onClick={async () => { if(window.confirm("¿Borrar?")) { await deleteRoom(room.room_id); fetchData(); } }} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><TrashIcon className="w-3.5 h-3.5"/></button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'locations' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center"><h3 className="font-bold uppercase text-xs text-gray-400">Centros Registrados</h3><Button size="sm" onClick={() => { setSelectedLocation(null); setIsLocationModalOpen(true); }}>+ Nuevo</Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {locations.map(loc => (
                                <Card key={loc.location_id} className="p-4 border-l-4 border-primary">
                                    <div className="flex justify-between items-start">
                                        <div><p className="font-black uppercase text-xs">{loc.name}</p><p className="text-[10px] text-gray-500">{loc.address}</p></div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setSelectedLocation(loc); setIsLocationModalOpen(true); }} className="text-primary"><PencilIcon className="w-4 h-4"/></button>
                                            <button onClick={async () => { if(window.confirm("¿Borrar?")) { await deleteLocation(loc.location_id); fetchData(); } }} className="text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'shift_configs' && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold uppercase text-xs text-gray-400">Plantillas de Horarios</h3>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={handleCreateDefaultConfigs}><SparklesIcon className="w-3 h-3 mr-1"/> Cargar Semilla</Button>
                                <Button size="sm" onClick={() => { setSelectedShiftConfig(null); setIsShiftConfigModalOpen(true); }}>+ Nuevo</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {shiftConfigs.map(config => (
                                <div key={config.config_id} className="p-3 border-2 rounded-xl text-center relative" style={{ borderColor: config.color }}>
                                    <span className="text-xl font-black">{config.code}</span>
                                    <p className="text-[9px] font-black uppercase text-gray-400 mt-1">{config.name}</p>
                                    <button onClick={() => { setSelectedShiftConfig(config); setIsShiftConfigModalOpen(true); }} className="mt-2 text-[8px] font-black uppercase underline">Editar</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="space-y-4 animate-in fade-in">
                        <h3 className="font-bold uppercase text-xs text-gray-400">Roles y Permisos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {roles.map(role => (
                                <Card key={role.role_id} className="p-4 border-l-4 border-primary">
                                    <div className="flex justify-between mb-2"><h4 className="font-black uppercase text-sm tracking-widest">{role.name}</h4><button onClick={() => { setSelectedRole(role); setIsRoleModalOpen(true); }} className="text-primary hover:bg-primary/5 p-1 rounded"><PencilIcon className="w-4 h-4"/></button></div>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions.map(p => <span key={p} className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{p.replace(/_/g, ' ')}</span>)}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Modals */}
        {isEmployeeModalOpen && <EmployeeFormModal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} onSave={async (d) => { if('employee_id' in d) await updateEmployee(d); else await addEmployee(d); fetchData(); setIsEmployeeModalOpen(false); }} employee={selectedEmployee} roles={roles} />}
        {isLocationModalOpen && <LocationFormModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} onSave={async (d) => { if(d.location_id) await updateLocation(d); else await addLocation(d); fetchData(); setIsLocationModalOpen(false); }} location={selectedLocation} />}
        {isRoomModalOpen && <RoomFormModal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} onSave={async (d) => { if(d.room_id) await updateRoom(d); else await addRoom(d); fetchData(); setIsRoomModalOpen(false); }} room={selectedRoom} locations={locations} />}
        {isShiftConfigModalOpen && <ShiftConfigFormModal isOpen={isShiftConfigModalOpen} onClose={() => setIsShiftConfigModalOpen(false)} onSave={async (d) => { if('config_id' in d) await updateShiftConfig(d); else await addShiftConfig(d); fetchData(); setIsShiftConfigModalOpen(false); }} onDelete={async (id) => { await deleteShiftConfig(id); fetchData(); setIsShiftConfigModalOpen(false); }} config={selectedShiftConfig} locations={locations} />}
        {isRoleModalOpen && selectedRole && <RoleFormModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} onSave={async (d) => { await updateRole(d); fetchData(); setIsRoleModalOpen(false); }} role={selectedRole} availablePermissions={[]} />}
        {isSchemaHelpOpen && <SchemaHelpModal isOpen={isSchemaHelpOpen} onClose={() => setIsSchemaHelpOpen(false)} />}
    </div>
  );
};

export default AdminView;
