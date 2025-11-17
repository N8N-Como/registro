import React, { useState, useEffect } from 'react';
import { Incident, Location, Employee, Room } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface IncidentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (incident: Omit<Incident, 'incident_id' | 'created_at' | 'reported_by'> | Incident) => void;
  incident: Incident | null;
  locations: Location[];
  employees: Employee[];
  rooms: Room[];
  canManage: boolean;
}

const IncidentFormModal: React.FC<IncidentFormModalProps> = ({ isOpen, onClose, onSave, incident, locations, employees, rooms, canManage }) => {
  const [formData, setFormData] = useState<Partial<Incident>>({});

  useEffect(() => {
    if (incident) {
      setFormData(incident);
    } else {
      setFormData({
        status: 'open',
        priority: 'medium',
        location_id: locations[0]?.location_id,
        room_id: '',
      });
    }
  }, [incident, isOpen, locations]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Incident);
  };

  const title = incident ? 'Detalle de Incidencia' : 'Reportar Incidencia';
  const maintenanceStaff = employees.filter(e => e.role_id === 'maintenance');
  const filteredRooms = rooms.filter(r => r.location_id === formData.location_id);
  const isReadOnly = incident && !canManage;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows={4}
            required
            readOnly={isReadOnly}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Establecimiento</label>
          <select 
            name="location_id" 
            value={formData.location_id || ''} 
            onChange={e => {
                handleChange(e);
                setFormData(prev => ({...prev, room_id: ''})) // Reset room on location change
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
            required
            disabled={isReadOnly}
          >
            {locations.map(loc => <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Habitación/Zona</label>
          <select 
            name="room_id" 
            value={formData.room_id || ''} 
            onChange={handleChange} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            disabled={isReadOnly || !formData.location_id}
          >
            <option value="">(Opcional)</option>
            {filteredRooms.map(room => <option key={room.room_id} value={room.room_id}>{room.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Prioridad</label>
            <select name="priority" value={formData.priority || 'medium'} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required disabled={isReadOnly}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <select name="status" value={formData.status || 'open'} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required disabled={!canManage}>
              <option value="open">Abierta</option>
              <option value="in_progress">En Progreso</option>
              <option value="resolved">Resuelta</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Asignado a (opcional)</label>
          <select name="assigned_to" value={formData.assigned_to || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" disabled={!canManage}>
            <option value="">Sin asignar</option>
            {maintenanceStaff.map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</option>)}
          </select>
        </div>
        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
            {!isReadOnly && <Button type="submit">Guardar</Button>}
        </div>
      </form>
    </Modal>
  );
};

export default IncidentFormModal;