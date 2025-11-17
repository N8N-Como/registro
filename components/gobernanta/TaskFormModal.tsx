import React, { useState, useEffect } from 'react';
import { Task, Location, Room, Employee } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'task_id' | 'created_at' | 'completed_at'> | Task) => void;
  locations: Location[];
  rooms: Room[];
  employees: Employee[];
  task: Task | null;
}

// FIX: Define a type for the form data that includes `location_id` for UI logic.
type TaskFormData = Partial<Task> & { location_id?: string };

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSave, locations, rooms, employees, task }) => {
  // FIX: Use the new TaskFormData type for the state.
  const [formData, setFormData] = useState<TaskFormData>({});

  useEffect(() => {
    if (isOpen) {
        if (task) {
            // FIX: When editing a task, find its location from the associated room.
            const room = rooms.find(r => r.room_id === task.room_id);
            setFormData({
                ...task,
                location_id: room?.location_id || '',
            });
        } else {
            setFormData({
                description: '',
                location_id: locations[0]?.location_id || '',
                room_id: '',
                assigned_to: employees[0]?.employee_id || '',
                due_date: new Date().toISOString().split('T')[0],
                status: 'pending'
            });
        }
    }
  }, [isOpen, task, locations, rooms, employees]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value}));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.location_id || !formData.room_id || !formData.assigned_to || !formData.due_date) {
        alert('Por favor, rellena todos los campos.');
        return;
    }
    // FIX: The parent component expects location_id and strips it, so we cast to 'any' to pass it through.
    onSave(formData as any);
  };
  
  const filteredRooms = rooms.filter(r => r.location_id === formData.location_id);
  
  useEffect(() => {
      // If the selected room is no longer valid after a location change, reset it.
      if (formData.location_id && formData.room_id && formData.room_id !== 'all_rooms') {
          if (!filteredRooms.some(r => r.room_id === formData.room_id)) {
              setFormData(prev => ({...prev, room_id: ''}));
          }
      }
  }, [formData.location_id, formData.room_id, filteredRooms]);

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const title = task ? 'Editar Tarea' : 'Crear Nueva Tarea';

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
            rows={3}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Establecimiento</label>
          <select name="location_id" value={formData.location_id || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
            <option value="">Selecciona un establecimiento</option>
            {locations.map(loc => <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Habitación/Zona</label>
          <select name="room_id" value={formData.room_id || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required disabled={!formData.location_id}>
            <option value="">Selecciona una habitación/zona</option>
            {formData.location_id && <option value="all_rooms">Todas las habitaciones</option>}
            {filteredRooms.map(room => <option key={room.room_id} value={room.room_id}>{room.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Asignar a</label>
          <select name="assigned_to" value={formData.assigned_to || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
            <option value="">Selecciona un empleado</option>
            <option value="all_cleaners">Todos</option>
            {employees.map(emp => <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha Límite</label>
          <input 
            type="date" 
            name="due_date"
            value={formData.due_date || ''} 
            onChange={handleChange} 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" 
            required 
            min={today}
            max={maxDateStr}
          />
        </div>
        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar Tarea</Button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskFormModal;
