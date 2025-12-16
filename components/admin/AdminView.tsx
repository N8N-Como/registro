
import React, { useState, useEffect, useContext } from 'react';
import { getEmployees, getLocations, getRoles, addEmployee, updateEmployee, addLocation, updateLocation, getRooms, addRoom, updateRoom, updateRole, getShiftConfigs, addShiftConfig, updateShiftConfig, deleteShiftConfig, getTimeCorrectionRequests, resolveTimeCorrectionRequest, deleteEmployee, deleteLocation, deleteRoom } from '../../services/mockApi';
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

const allPermissions: { id: Permission; label: string }[] = [
    { id: 'manage_employees', label: 'Gestionar Empleados' },
    { id: 'manage_locations', label: 'Gestionar Ubicaciones' },
    { id: 'manage_announcements', label: 'Gestionar Comunicados' },
    { id: 'view_reports', label: 'Ver Informes' },
    { id: 'manage_incidents', label: 'Gestionar Incidencias' },
    { id: 'manage_tasks', label: 'Gestionar Tareas (rol específico)' },
    { id: 'access_shift_log', label: 'Acceder a Registro de Turno' },
    { id: 'schedule_tasks', label: 'Planificar Tareas' },
    { id: 'audit_records', label: 'Auditar Registros' },
];


const AdminView: React.FC = () => {
  const auth = useContext(AuthContext);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>([]);
  const [corrections, setCorrections] = useState<TimeCorrectionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isShiftConfigModalOpen, setIsShiftConfigModalOpen] = useState(false);
  const [isSchemaHelpOpen, setIsSchemaHelpOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedShiftConfig, setSelectedShiftConfig] = useState<ShiftConfig | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('employees');

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
      setCorrections(corrs.filter(c => c.status === 'pending')); // Only show pending initially
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Employee Handlers
  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEmployeeModalOpen(true);
  };
  const handleAddNewEmployee = () => {
    setSelectedEmployee(null);
    setIsEmployeeModalOpen(true);
  };
  const handleSaveEmployee = async (employeeData: Omit<Employee, 'employee_id'> | Employee) => {
    try {
        if ('employee_id' in employeeData) {
            await updateEmployee(employeeData);
        } else {
            await addEmployee(employeeData);
        }
        fetchData();
        setIsEmployeeModalOpen(false);
    } catch (e) {
        // Warning: The retry logic in mockApi suppresses the error if handled, 
        // so if we are here, it's a real failure.
        alert("Error al guardar empleado: " + (e as any).message);
    }
  };
  const handleDeleteEmployee = async (employee: Employee) => {
      if (window.confirm(`¿Seguro que quieres eliminar a ${employee.first_name} ${employee.last_name}? Esta acción no se puede deshacer.`)) {
          try {
              await deleteEmployee(employee.employee_id);
              fetchData();
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  // Location Handlers
  const handleEditLocation = (location: Location) => {
      setSelectedLocation(location);
      setIsLocationModalOpen(true);
  }
  const handleAddNewLocation = () => {
      setSelectedLocation(null);
      setIsLocationModalOpen(true);
  }
  const handleSaveLocation = async (locationData: Location) => {
    try {
        if (locationData.location_id) {
            await updateLocation(locationData);
        } else {
            await addLocation(locationData);
        }
        fetchData();
        setIsLocationModalOpen(false);
    } catch (e) {
        console.error(e);
        alert("Error al guardar ubicación. Comprueba que los datos sean correctos.");
    }
  };
  const handleDeleteLocation = async (location: Location) => {
      if (window.confirm(`¿Seguro que quieres eliminar la ubicación ${location.name}?`)) {
          try {
              await deleteLocation(location.location_id);
              fetchData();
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  // Room Handlers
  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setIsRoomModalOpen(true);
  };
  const handleAddNewRoom = () => {
    setSelectedRoom(null);
    setIsRoomModalOpen(true);
  };
  const handleSaveRoom = async (roomData: Room) => {
    try {
        if (roomData.room_id) {
          await updateRoom(roomData);
        } else {
          await addRoom(roomData);
        }
        fetchData();
        setIsRoomModalOpen(false);
    } catch (e) {
        alert("Error al guardar habitación/zona.");
    }
  };
  const handleDeleteRoom = async (room: Room) => {
      if (window.confirm(`¿Seguro que quieres eliminar la habitación/zona ${room.name}?`)) {
          try {
              await deleteRoom(room.room_id);
              fetchData();
          } catch (e: any) {
              alert(e.message);
          }
      }
  };

  // Role Handlers
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsRoleModalOpen(true);
  };
  const handleSaveRole = async (roleData: Role) => {
    try {
        await updateRole(roleData);
        fetchData();
        setIsRoleModalOpen(false);
    } catch (e) {
        alert("Error al guardar rol.");
    }
  };
  
  // Shift Config Handlers
  const handleEditShiftConfig = (config: ShiftConfig) => {
      setSelectedShiftConfig(config);
      setIsShiftConfigModalOpen(true);
  }
  const handleAddNewShiftConfig = () => {
      setSelectedShiftConfig(null);
      setIsShiftConfigModalOpen(true);
  }
  const handleSaveShiftConfig = async (data: any) => {
      try {
          if ('config_id' in data) {
              await updateShiftConfig(data);
          } else {
              await addShiftConfig(data);
          }
          fetchData();
          setIsShiftConfigModalOpen(false);
      } catch (e: any) {
          console.error(e);
          alert("Error al guardar configuración de turno: " + e.message);
      }
  }
  const handleDeleteShiftConfig = async (id: string) => {
      try {
          await deleteShiftConfig(id);
          fetchData();
          setIsShiftConfigModalOpen(false);
      } catch (e) {
          alert("Error al eliminar.");
      }
  }

  // Correction Handlers
  const handleResolveCorrection = async (id: string, status: 'approved' | 'rejected') => {
      if (!auth?.employee) return;
      try {
          await resolveTimeCorrectionRequest(id, status, auth.employee.employee_id);
          fetchData();
      } catch (e) {
          alert("Error al procesar solicitud.");
      }
  }


  if (isLoading) return <Spinner />;
  
  const getRoleName = (roleId: string) => roles.find(r => r.role_id === roleId)?.name || 'N/A';
  const getLocationName = (locationId: string) => locations.find(l => l.location_id === locationId)?.name || 'N/A';
  const getEmployeeName = (id: string) => {
      const e = employees.find(emp => emp.employee_id === id);
      return e ? `${e.first_name} ${e.last_name}` : 'Desconocido';
  }

  const tabClasses = (tabName: AdminTab) => 
    `px-3 py-2 font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
      activeTab === tabName 
        ? 'bg-white border-b-0 border-gray-200' 
        : 'bg-gray-50 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2">
            <div className="border-b border-gray-200 w-full md:w-auto">
                <nav className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveTab('employees')} className={tabClasses('employees')}>
                        <span>Empleados</span>
                    </button>
                    <button onClick={() => setActiveTab('corrections')} className={tabClasses('corrections')}>
                        <ReportIcon className="w-5 h-5 text-red-500" />
                        <span>Incidencias Fichaje</span>
                        {corrections.length > 0 && <span className="ml-2 bg-red-600 text-white text-xs rounded-full px-2">{corrections.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('locations')} className={tabClasses('locations')}>
                        <span>Ubicaciones</span>
                    </button>
                    <button onClick={() => setActiveTab('rooms')} className={tabClasses('rooms')}>
                        <DoorOpenIcon className="w-5 h-5" />
                        <span>Habitaciones/Zonas</span>
                    </button>
                    <button onClick={() => setActiveTab('roles')} className={tabClasses('roles')}>
                        <KeyIcon className="w-5 h-5" />
                        <span>Roles</span>
                    </button>
                    <button onClick={() => setActiveTab('shift_configs')} className={tabClasses('shift_configs')}>
                        <CalendarIcon className="w-5 h-5" />
                        <span>Tipos de Turno</span>
                    </button>
                </nav>
            </div>
            <button 
                onClick={() => setIsSchemaHelpOpen(true)}
                className="text-xs flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200"
            >
                <WrenchIcon className="w-3 h-3 mr-1" />
                Actualizar BD (SQL)
            </button>
        </div>
        
        {activeTab === 'employees' && (
             <Card>
                <Button onClick={handleAddNewEmployee} className="mb-4">Añadir Empleado</Button>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                    <tr className="border-b bg-gray-50">
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3">Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {employees.map(emp => (
                        <tr key={emp.employee_id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{emp.first_name} {emp.last_name}</td>
                        <td className="p-3">{getRoleName(emp.role_id)}</td>
                        <td className="p-3 capitalize">{emp.status}</td>
                        <td className="p-3 flex space-x-2">
                            <Button variant="secondary" size="sm" onClick={() => handleEditEmployee(emp)}>Editar</Button>
                            <button onClick={() => handleDeleteEmployee(emp)} className="text-red-500 hover:text-red-700" title="Eliminar"><TrashIcon className="w-5 h-5"/></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </Card>
        )}

        {activeTab === 'corrections' && (
            <Card title="Solicitudes de Corrección de Horario">
                {corrections.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay solicitudes pendientes.</p>
                ) : (
                    <div className="space-y-4">
                        {corrections.map(req => (
                            <div key={req.request_id} className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-gray-800">{getEmployeeName(req.employee_id)}</p>
                                        <p className="text-sm text-gray-600">Fecha solicitada: {new Date(req.requested_date).toLocaleDateString()}</p>
                                    </div>
                                    <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded font-bold uppercase">
                                        {req.correction_type === 'create_entry' ? 'Falta Fichaje' : 'Hora Incorrecta'}
                                    </span>
                                </div>
                                <div className="mt-2 bg-white p-2 rounded border border-gray-200 text-sm">
                                    <p><strong>Cambio Solicitado:</strong> {req.requested_clock_in} - {req.requested_clock_out || 'En curso'}</p>
                                    <p className="mt-1"><strong>Motivo:</strong> {req.reason}</p>
                                </div>
                                <div className="mt-4 flex justify-end space-x-2">
                                    <button 
                                        onClick={() => handleResolveCorrection(req.request_id, 'rejected')}
                                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-bold flex items-center"
                                    >
                                        <XMarkIcon className="w-4 h-4 mr-1" /> Rechazar
                                    </button>
                                    <button 
                                        onClick={() => handleResolveCorrection(req.request_id, 'approved')}
                                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-bold flex items-center"
                                    >
                                        <CheckIcon className="w-4 h-4 mr-1" /> Aprobar y Corregir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        )}
        
        {activeTab === 'locations' && (
             <Card>
                <Button onClick={handleAddNewLocation} className="mb-4">Añadir Ubicación</Button>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                    <tr className="border-b bg-gray-50">
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Dirección</th>
                        <th className="p-3">Radio (m)</th>
                        <th className="p-3">Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {locations.map(loc => (
                        <tr key={loc.location_id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{loc.name}</td>
                        <td className="p-3">{loc.address}</td>
                        <td className="p-3">{loc.radius_meters}</td>
                        <td className="p-3 flex space-x-2">
                            <Button variant="secondary" size="sm" onClick={() => handleEditLocation(loc)}>Editar</Button>
                            <button onClick={() => handleDeleteLocation(loc)} className="text-red-500 hover:text-red-700" title="Eliminar"><TrashIcon className="w-5 h-5"/></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </Card>
        )}

        {activeTab === 'rooms' && (
             <Card>
                <Button onClick={handleAddNewRoom} className="mb-4">Añadir Habitación/Zona</Button>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                    <tr className="border-b bg-gray-50">
                        <th className="p-3">Nombre Habitación/Zona</th>
                        <th className="p-3">Establecimiento</th>
                        <th className="p-3">Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rooms.map(room => (
                        <tr key={room.room_id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{room.name}</td>
                        <td className="p-3">{getLocationName(room.location_id)}</td>
                        <td className="p-3 flex space-x-2">
                            <Button variant="secondary" size="sm" onClick={() => handleEditRoom(room)}>Editar</Button>
                            <button onClick={() => handleDeleteRoom(room)} className="text-red-500 hover:text-red-700" title="Eliminar"><TrashIcon className="w-5 h-5"/></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </Card>
        )}

        {activeTab === 'roles' && (
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-3">Rol</th>
                                <th className="p-3">Permisos</th>
                                <th className="p-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map(role => (
                                <tr key={role.role_id} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-semibold">{role.name}</td>
                                    <td className="p-3 text-sm text-gray-600">{role.permissions.length} permisos activos</td>
                                    <td className="p-3">
                                        <Button variant="secondary" size="sm" onClick={() => handleEditRole(role)}>Editar Permisos</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        )}

        {activeTab === 'shift_configs' && (
             <Card>
                <Button onClick={handleAddNewShiftConfig} className="mb-4">Crear Nuevo Tipo de Turno</Button>
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                    <tr className="border-b bg-gray-50">
                        <th className="p-3">Código</th>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Horario</th>
                        <th className="p-3">Ubicación</th>
                        <th className="p-3">Color</th>
                        <th className="p-3">Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {shiftConfigs.map(config => (
                        <tr key={config.config_id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-bold">{config.code}</td>
                        <td className="p-3">{config.name}</td>
                        <td className="p-3">{config.start_time} - {config.end_time}</td>
                        <td className="p-3">{getLocationName(config.location_id || '')}</td>
                        <td className="p-3">
                            <div className="w-6 h-6 rounded-full" style={{backgroundColor: config.color}}></div>
                        </td>
                        <td className="p-3">
                            <Button variant="secondary" size="sm" onClick={() => handleEditShiftConfig(config)}>Editar</Button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </Card>
        )}
      
      {isEmployeeModalOpen && (
        <EmployeeFormModal
            isOpen={isEmployeeModalOpen}
            onClose={() => setIsEmployeeModalOpen(false)}
            onSave={handleSaveEmployee}
            employee={selectedEmployee}
            roles={roles}
        />
      )}
      {isLocationModalOpen && (
          <LocationFormModal
            isOpen={isLocationModalOpen}
            onClose={() => setIsLocationModalOpen(false)}
            onSave={handleSaveLocation}
            location={selectedLocation}
          />
      )}
      {isRoomModalOpen && (
          <RoomFormModal
            isOpen={isRoomModalOpen}
            onClose={() => setIsRoomModalOpen(false)}
            onSave={handleSaveRoom}
            room={selectedRoom}
            locations={locations}
          />
      )}
      {isRoleModalOpen && selectedRole && (
          <RoleFormModal
            isOpen={isRoleModalOpen}
            onClose={() => setIsRoleModalOpen(false)}
            onSave={handleSaveRole}
            role={selectedRole}
            availablePermissions={allPermissions}
          />
      )}
      {isShiftConfigModalOpen && (
          <ShiftConfigFormModal 
            isOpen={isShiftConfigModalOpen}
            onClose={() => setIsShiftConfigModalOpen(false)}
            onSave={handleSaveShiftConfig}
            onDelete={handleDeleteShiftConfig}
            config={selectedShiftConfig}
            locations={locations}
          />
      )}
      {isSchemaHelpOpen && (
          <SchemaHelpModal 
            isOpen={isSchemaHelpOpen}
            onClose={() => setIsSchemaHelpOpen(false)}
          />
      )}
    </div>
  );
};

export default AdminView;
