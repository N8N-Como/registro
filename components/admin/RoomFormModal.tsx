import React, { useState, useEffect } from 'react';
import { Room, Location } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (room: Room) => void;
  room: Room | null;
  locations: Location[];
}

const RoomFormModal: React.FC<RoomFormModalProps> = ({ isOpen, onClose, onSave, room, locations }) => {
  const [formData, setFormData] = useState<Partial<Room>>({});

  useEffect(() => {
    if (room) {
      setFormData(room);
    } else {
      setFormData({
        name: '',
        location_id: locations[0]?.location_id || '',
        status: 'clean'
      });
    }
  }, [room, isOpen, locations]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.location_id) {
        alert("Por favor, rellene todos los campos.");
        return;
    }
    onSave(formData as Room);
  };
  
  const title = room ? 'Editar Habitación/Zona' : 'Añadir Habitación/Zona';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre Habitación/Zona</label>
          <input
            type="text"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Establecimiento</label>
          <select
            name="location_id"
            value={formData.location_id || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            <option value="">Seleccione un establecimiento</option>
            {locations.map(loc => (
                <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
            ))}
          </select>
        </div>
        
        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </Modal>
  );
};

export default RoomFormModal;
