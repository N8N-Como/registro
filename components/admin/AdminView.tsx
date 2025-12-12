
import React, { useState, useEffect } from 'react';
import { getEmployees, getLocations, getRoles, addEmployee, updateEmployee, addLocation, updateLocation, getRooms, addRoom, updateRoom, updateRole, getShiftConfigs, addShiftConfig, updateShiftConfig, deleteShiftConfig } from '../../services/mockApi';
import { Employee, Location, Role, Room, Permission, ShiftConfig } from '../../types';
import Button from '../shared/Button';
import Card from '../shared/Card';
import Spinner from '../shared/Spinner';
import EmployeeFormModal from './EmployeeFormModal';
import LocationFormModal from './LocationFormModal';
import RoomFormModal from './RoomFormModal'; 
import RoleFormModal from './RoleFormModal';
import ShiftConfigFormModal from './ShiftConfigFormModal';
import { DoorOpenIcon, KeyIcon, CalendarIcon } from '../icons';

type AdminTab = 'employees' | 'locations' | 'rooms' | 'roles' | 'shift_configs';

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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [shiftConfigs, setShiftConfigs] = useState<ShiftConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isShiftConfigModalOpen, setIsShiftConfigModalOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedShiftConfig, setSelectedShiftConfig] = useState<ShiftConfig | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('employees');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [emps, locs, rols, rms, shifts] = await Promise.all([
          getEmployees(), getLocations(), getRoles(), getRooms(), getShiftConfigs()
      ]);
      setEmployees(emps);
      setLocations(locs);
      setRoles(rols);
      setRooms(rms);
      setShiftConfigs(shifts);
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
        alert("Error al guardar empleado: " + (e as any).message);
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
      } catch (e) {
          alert("Error al guardar configuración de turno.");
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


  if (isLoading) return <Spinner />;
  
  const getRoleName = (roleId: string) => roles.find(r => r.role_id === roleId)?.name || 'N/A';
  const getLocationName = (locationId: string) => locations.find(l => l.location_id === locationId)?.name || 'N/A';

  const tabClasses = (tabName: AdminTab) => 
    `px-3 py-2 font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
      activeTab === tabName 
        ? 'bg-white border-b-0 border-gray-200' 
        : 'bg-gray-50 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className="space-y-6">
        <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-1 sm:space-x-2 overflow-x-auto" aria-label="Tabs">
                <button onClick={() => setActiveTab('employees')} className={tabClasses('employees')}>
                    <span>Empleados</span>
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
                        <td className="p-3">
                            <Button variant="secondary" size="sm" onClick={() => handleEditEmployee(emp)}>Editar</Button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
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
                        <td className="p-3">
                            <Button variant="secondary" size="sm" onClick={() => handleEditLocation(loc)}>Editar</Button>
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
                        <td className="p-3">
                            <Button variant="secondary" size="sm" onClick={() => handleEditRoom(room)}>Editar</Button>
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
    </div>
  );
};

export default AdminView;
