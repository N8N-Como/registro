
import React, { useState, useEffect } from 'react';
import { Employee, Role, Location, DocumentSignature, CompanyDocument, TimeEntry } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { getLocations, getEmployeeDocuments, getTimeEntriesForEmployee } from '../../services/mockApi';
import { CheckIcon } from '../icons';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Omit<Employee, 'employee_id'> | Employee) => void;
  onDelete?: (employeeId: string) => void;
  employee: Employee | null;
  roles: Role[];
}

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSave, onDelete, employee, roles }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'docs' | 'devices'>('info');
  const [employeeDocs, setEmployeeDocs] = useState<(DocumentSignature & { document: CompanyDocument })[]>([]);
  const [deviceHistory, setDeviceHistory] = useState<{deviceId: string, deviceInfo: string, lastUsed: string}[]>([]);

  useEffect(() => {
    getLocations().then(setLocations);
  }, []);

  useEffect(() => {
    if (employee) {
      setFormData(employee);
      // Fetch docs
      getEmployeeDocuments(employee.employee_id).then(setEmployeeDocs);
      
      // Fetch device history from time entries
      getTimeEntriesForEmployee(employee.employee_id).then((entries: TimeEntry[]) => {
          const devices = new Map<string, {deviceId: string, deviceInfo: string, lastUsed: string}>();
          
          entries.forEach(entry => {
              if (entry.device_id && entry.device_info) {
                  // Keep the most recent timestamp for each device
                  const existing = devices.get(entry.device_id);
                  if (!existing || new Date(entry.clock_in_time) > new Date(existing.lastUsed)) {
                      devices.set(entry.device_id, {
                          deviceId: entry.device_id,
                          deviceInfo: entry.device_info,
                          lastUsed: entry.clock_in_time
                      });
                  }
              }
          });
          
          setDeviceHistory(Array.from(devices.values()).sort((a,b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()));
      });

    } else {
      setFormData({ 
          status: 'active', 
          role_id: roles[0]?.role_id,
          policy_accepted: false,
          photo_url: `https://i.pravatar.cc/150?u=${Date.now()}`,
          province: 'coruna',
          annual_hours_contract: 1784, // Defecto Coruña aprox
          default_start_time: '08:00',
          default_end_time: '16:00'
        });
      setEmployeeDocs([]);
      setDeviceHistory([]);
    }
    setActiveTab('info');
  }, [employee, isOpen, roles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Auto-update hours based on province selection
    if (name === 'province') {
        let hours = formData.annual_hours_contract;
        if (value === 'coruna') hours = 1784;
        if (value === 'pontevedra') hours = 1792;
        
        setFormData(prev => ({ 
            ...prev, 
            province: value as 'coruna' | 'pontevedra' | 'other',
            annual_hours_contract: hours
        }));
    } else {
        // Handle number inputs correctly
        const finalValue = type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value;
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Employee);
  };

  const handleDelete = () => {
      if (employee && onDelete) {
          if (window.confirm(`¿Estás seguro de que quieres eliminar a ${employee.first_name} ${employee.last_name}?\n\nSi tiene historial de fichajes o turnos, esta acción podría fallar o dejar datos huérfanos. Se recomienda cambiar el estado a "Inactivo" en su lugar.`)) {
              onDelete(employee.employee_id);
          }
      }
  };
  
  const title = employee ? 'Editar Empleado' : 'Añadir Empleado';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {employee && (
            <div className="flex border-b mb-4">
                <button 
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2 text-sm font-medium ${activeTab === 'info' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                >
                    Info
                </button>
                <button 
                    onClick={() => setActiveTab('docs')}
                    className={`flex-1 py-2 text-sm font-medium ${activeTab === 'docs' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                >
                    Docs
                </button>
                <button 
                    onClick={() => setActiveTab('devices')}
                    className={`flex-1 py-2 text-sm font-medium ${activeTab === 'devices' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                >
                    Dispositivos
                </button>
            </div>
        )}

        {activeTab === 'info' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                    <input type="text" name="first_name" value={formData.first_name || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Apellidos</label>
                    <input type="text" name="last_name" value={formData.last_name || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </div>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700">PIN (4 dígitos)</label>
                <input type="text" name="pin" value={formData.pin || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required pattern="\d{4}" title="El PIN debe tener 4 dígitos" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Rol</label>
                    <select name="role_id" value={formData.role_id || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        {roles.map(role => <option key={role.role_id} value={role.role_id}>{role.name}</option>)}
                    </select>
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <select name="status" value={formData.status || 'active'} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                    </select>
                    </div>
                </div>

                <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Datos de Contrato (Convenio)</h4>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Provincia Contrato</label>
                            <select name="province" value={formData.province || 'coruna'} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                                <option value="coruna">A Coruña</option>
                                <option value="pontevedra">Pontevedra</option>
                                <option value="other">Otra</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Horas Anuales</label>
                            <input type="number" name="annual_hours_contract" value={formData.annual_hours_contract || 1784} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            <p className="text-[10px] text-gray-500">Ref. Hostelería: Coruña ~1784h / Pont. ~1792h</p>
                        </div>
                    </div>

                    <h4 className="font-semibold text-gray-800 mb-2 mt-4">Ubicación y Horario Habitual</h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Centro de Trabajo Habitual</label>
                        <select name="default_location_id" value={formData.default_location_id || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="">Sin asignar</option>
                            {locations.map(loc => <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>)}
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hora Entrada (Por defecto)</label>
                            <input type="time" name="default_start_time" value={formData.default_start_time || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hora Salida (Por defecto)</label>
                            <input type="time" name="default_end_time" value={formData.default_end_time || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                        </div>
                    </div>
                </div>
                
                <div className="pt-4 flex justify-between space-x-2">
                    {employee && onDelete ? (
                        <Button type="button" variant="danger" onClick={handleDelete}>Eliminar</Button>
                    ) : <div></div>}
                    <div className="flex space-x-2">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Guardar Cambios</Button>
                    </div>
                </div>
            </form>
        ) : activeTab === 'docs' ? (
            <div className="space-y-4">
                {employeeDocs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay documentos asignados a este empleado.</p>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-2">Documento</th>
                                <th className="p-2">Estado</th>
                                <th className="p-2">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employeeDocs.map(item => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-2 font-medium">{item.document.title}</td>
                                    <td className="p-2">
                                        {item.status === 'signed' ? (
                                            <span className="text-green-600 flex items-center"><CheckIcon className="w-3 h-3 mr-1"/> Firmado</span>
                                        ) : item.status === 'viewed' ? (
                                            <span className="text-green-600 flex items-center"><CheckIcon className="w-3 h-3 mr-1"/> Leído</span>
                                        ) : (
                                            <span className="text-red-500">Pendiente</span>
                                        )}
                                    </td>
                                    <td className="p-2 text-gray-500">
                                        {item.signed_at || item.viewed_at ? new Date(item.signed_at || item.viewed_at || '').toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="pt-4 flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        ) : (
            // DEVICES TAB
            <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded text-sm mb-2">
                    <p className="font-bold">Auditoría de Dispositivos</p>
                    <p>Lista de dispositivos utilizados por este empleado para fichar. Revisa si hay cambios sospechosos de dispositivo.</p>
                </div>
                {deviceHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No hay historial de dispositivos disponible.</p>
                ) : (
                    <ul className="space-y-2">
                        {deviceHistory.map((dev, idx) => (
                            <li key={idx} className="border p-3 rounded-lg bg-gray-50 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-sm">{dev.deviceInfo || 'Dispositivo Desconocido'}</p>
                                    <p className="text-xs text-gray-500 font-mono mt-1">ID: {dev.deviceId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Último uso:</p>
                                    <p className="text-sm font-medium">{new Date(dev.lastUsed).toLocaleDateString()} {new Date(dev.lastUsed).toLocaleTimeString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="pt-4 flex justify-end space-x-2">
                    <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        )}
      </div>
    </Modal>
  );
};

export default EmployeeFormModal;
