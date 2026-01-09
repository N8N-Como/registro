
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
import { WrenchIcon, CheckIcon, XMarkIcon, TrashIcon, PencilIcon, LocationIcon, SparklesIcon } from '../icons';

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
  
  const [activeTab, setActiveTab] = useState<AdminTab>('employees');
  
  // Modals state
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
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => { 
    fetchData(); 
    if (window.location.hash === '#/admin/corrections') setActiveTab('corrections');
  }, []);

  const handleResolveCorrection = async (id: string, status: 'approved' | 'rejected') => {
      if (!auth?.employee) return;
      try {
          await resolveTimeCorrectionRequest(id, status, auth.employee.employee_id);
          fetchData();
      } catch (e) { alert("Error al procesar"); }
  };

  const handleCreateDefaultConfigs = async () => {
      if (!window.confirm("Se crearán los códigos estándar (V25, MM, T, L, etc.). ¿Continuar?")) return;
      const defaults = [
          { code: 'V25', name: 'Vacaciones', start_time: '00:00', end_time: '00:00', color: '#10b981' },
          { code: 'L', name: 'Libre', start_time: '00:00', end_time: '00:00', color: '#9ca3af' },
          { code: 'MM', name: 'Media Mañana', start_time: '10:00', end_time: '14:00', color: '#3b82f6' },
          { code: 'T', name: 'Tarde', start_time: '15:00', end_time: '23:00', color: '#6366f1' },
          { code: 'TH', name: 'Tarde Hospital', start_time: '15:00', end_time: '23:00', color: '#8b5cf6' },
          { code: 'P', name: 'Partida', start_time: '10:00', end_time: '20:00', color: '#f59e0b' },
          { code: 'BM', name: 'Baja Médica', start_time: '00:00', end_time: '00:00', color: '#ef4444' },
          { code: 'AD', name: 'Disponibilidad', start_time: '09:00', end_time: '17:00', color: '#ec4899' },
      ];
      for (const d of defaults) { await addShiftConfig(d); }
      fetchData();
  };

  if (isLoading) return <Spinner />;

  const tabClass = (id: AdminTab) => `px-6 py-3 font-black uppercase text-[10px] tracking-widest transition-all border-b-4 ${activeTab === id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-gray-400 hover:text-gray-600'}`;

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-primary uppercase tracking-tight">Administración</h2>
            <button onClick={() => setIsSchemaHelpOpen(true)} className="text-xs font-bold text-gray-400 underline hover:text-primary">Instrucciones SQL</button>
        </div>

        <Card className={`border-l-8 transition-all ${isEmergencyMode ? 'border-red-600 bg-red-50' : 'border-green-600 bg-white'}`}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <WrenchIcon className={isEmergencyMode ? 'text-red-600 animate-pulse' : 'text-green-600'} />
                    <div>
                        <h3 className="font-black uppercase text-xs">Modo Mantenimiento</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">{isEmergencyMode ? '🔴 Personal bloqueado' : '🟢 Sistema Operativo'}</p>
                    </div>
                </div>
                <Button variant={isEmergencyMode ? 'success' : 'danger'} size="sm" onClick={async () => { await setMaintenanceMode(!isEmergencyMode); fetchData(); }}>
                    {isEmergencyMode ? 'Desbloquear Acceso' : 'Bloquear Personal'}
                </Button>
            </div>
        </Card>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden no-print">
            <div className="flex border-b overflow-x-auto custom-scrollbar">
                <button onClick={() => setActiveTab('employees')} className={tabClass('employees')}>Empleados</button>
                <button onClick={() => setActiveTab('corrections')} className={tabClass('corrections')}>Correcciones {corrections.filter(c => c.status === 'pending').length > 0 && <span className="ml-2 bg-red-600 text-white rounded-full px-1.5 font-bold">{corrections.filter(c => c.status === 'pending').length}</span>}</button>
                <button onClick={() => setActiveTab('locations')} className={tabClass('locations')}>Ubicaciones</button>
                <button onClick={() => setActiveTab('rooms')} className={tabClass('rooms')}>Habitaciones</button>
                <button onClick={() => setActiveTab('roles')} className={tabClass('roles')}>Roles</button>
                <button onClick={() => setActiveTab('shift_configs')} className={tabClass('shift_configs')}>Turnos</button>
            </div>

            <div className="p-6">
                {activeTab === 'employees' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><h3 className="font-bold uppercase text-xs tracking-widest text-gray-400">Personal</h3><Button size="sm" onClick={() => { setSelectedEmployee(null); setIsEmployeeModalOpen(true); }}>+ Añadir</Button></div>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b"><tr><th className="p-3">Nombre</th><th className="p-3">Rol</th><th className="p-3">Estado</th><th className="p-3 text-right">Acciones</th></tr></thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.employee_id} className="border-b hover:bg-gray-50 transition-all">
                                        <td className="p-3 font-bold">{emp.first_name} {emp.last_name}</td>
                                        <td className="p-3 text-xs uppercase opacity-70">{roles.find(r => r.role_id === emp.role_id)?.name}</td>
                                        <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${emp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{emp.status}</span></td>
                                        <td className="p-3 flex justify-end gap-2">
                                            <button onClick={() => { setSelectedEmployee(emp); setIsEmployeeModalOpen(true); }} className="p-1 text-primary hover:bg-primary/10 rounded"><PencilIcon className="w-4 h-4"/></button>
                                            <button onClick={async () => { if(window.confirm("¿Borrar?")) { await deleteEmployee(emp.employee_id); fetchData(); } }} className="p-1 text-red-500 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'corrections' && (
                    <div className="space-y-4">
                        <h3 className="font-bold uppercase text-xs tracking-widest text-gray-400">Solicitudes de Corrección</h3>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b"><tr><th className="p-3">Empleado</th><th className="p-3">Fecha</th><th className="p-3">Nueva Hora</th><th className="p-3">Motivo</th><th className="p-3 text-right">Acciones</th></tr></thead>
                            <tbody>
                                {corrections.filter(c => c.status === 'pending').map(c => {
                                    const emp = employees.find(e => e.employee_id === c.employee_id);
                                    return (
                                        <tr key={c.request_id} className="border-b bg-yellow-50/30">
                                            <td className="p-3 font-bold">{emp?.first_name} {emp?.last_name}</td>
                                            <td className="p-3 font-mono">{c.requested_date}</td>
                                            <td className="p-3 font-mono font-bold text-primary">
                                                {c.requested_clock_in ? new Date(c.requested_clock_in).toLocaleTimeString() : (c.requested_clock_out ? new Date(c.requested_clock_out).toLocaleTimeString() : '---')}
                                            </td>
                                            <td className="p-3 italic text-xs truncate max-w-[200px]">{c.reason}</td>
                                            <td className="p-3 flex justify-end gap-2">
                                                <button onClick={() => handleResolveCorrection(c.request_id, 'approved')} className="p-2 bg-green-600 text-white rounded-lg shadow-sm"><CheckIcon className="w-4 h-4 text-white"/></button>
                                                <button onClick={() => handleResolveCorrection(c.request_id, 'rejected')} className="p-2 bg-red-600 text-white rounded-lg shadow-sm"><XMarkIcon className="w-4 h-4 text-white"/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {corrections.filter(c => c.status === 'pending').length === 0 && <p className="text-center py-10 text-gray-400 italic">No hay solicitudes pendientes.</p>}
                    </div>
                )}

                {activeTab === 'locations' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><h3 className="font-bold uppercase text-xs tracking-widest text-gray-400">Centros de Trabajo</h3><Button size="sm" onClick={() => { setSelectedLocation(null); setIsLocationModalOpen(true); }}>+ Añadir</Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {locations.map(loc => (
                                <div key={loc.location_id} className="p-4 border-2 rounded-xl flex justify-between items-start hover:border-primary transition-all group">
                                    <div className="flex gap-3">
                                        <div className="p-2 bg-primary/5 rounded-lg text-primary"><LocationIcon className="w-5 h-5"/></div>
                                        <div><p className="font-black uppercase text-xs tracking-tight">{loc.name}</p><p className="text-[10px] text-gray-400 font-bold">{loc.address}</p></div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button onClick={() => { setSelectedLocation(loc); setIsLocationModalOpen(true); }} className="p-1.5 text-primary bg-primary/5 rounded hover:bg-primary/10"><PencilIcon className="w-4 h-4"/></button>
                                        <button onClick={async () => { if(window.confirm("¿Borrar?")) { await deleteLocation(loc.location_id); fetchData(); } }} className="p-1.5 text-red-500 bg-red-50 rounded hover:bg-red-100"><TrashIcon className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'rooms' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><h3 className="font-bold uppercase text-xs tracking-widest text-gray-400">Habitaciones</h3><Button size="sm" onClick={() => { setSelectedRoom(null); setIsRoomModalOpen(true); }}>+ Nueva</Button></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {rooms.map(room => (
                                <div key={room.room_id} className="p-3 border-2 rounded-xl flex justify-between items-center hover:border-primary transition-all">
                                    <div className="truncate"><p className="font-black text-sm">{room.name.split(' ').pop()}</p><p className="text-[8px] text-gray-400 uppercase font-black">{locations.find(l => l.location_id === room.location_id)?.name.substring(0,6)}</p></div>
                                    <button onClick={() => { setSelectedRoom(room); setIsRoomModalOpen(true); }} className="text-gray-300 hover:text-primary"><PencilIcon className="w-3 h-3"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'roles' && (
                    <div className="space-y-4">
                        <h3 className="font-bold uppercase text-xs tracking-widest text-gray-400">Roles y Permisos</h3>
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

                {activeTab === 'shift_configs' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold uppercase text-xs tracking-widest text-gray-400">Configuración IA de Turnos</h3>
                            <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={handleCreateDefaultConfigs}><SparklesIcon className="w-3 h-3 mr-1"/> Cargar Estándar</Button>
                                <Button size="sm" onClick={() => { setSelectedShiftConfig(null); setIsShiftConfigModalOpen(true); }}>+ Nuevo</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {shiftConfigs.map(config => (
                                <div key={config.config_id} className="p-3 border-2 rounded-xl text-center relative" style={{ borderColor: config.color }}>
                                    <span className="text-xl font-black">{config.code}</span>
                                    <p className="text-[9px] font-black uppercase text-gray-400 mt-1">{config.name}</p>
                                    <p className="text-[8px] text-gray-500">{config.start_time} - {config.end_time}</p>
                                    <button onClick={() => { setSelectedShiftConfig(config); setIsShiftConfigModalOpen(true); }} className="mt-2 text-[8px] font-black uppercase underline">Editar</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Modals Reutilizados */}
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
