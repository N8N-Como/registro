
import React, { useState, useEffect } from 'react';
import { Location } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: Location) => void;
  location: Location | null;
}

const LocationFormModal: React.FC<LocationFormModalProps> = ({ isOpen, onClose, onSave, location }) => {
  const [formData, setFormData] = useState<Partial<Location>>({});

  useEffect(() => {
    if (location) {
      setFormData(location);
    } else {
      setFormData({ radius_meters: 100 });
    }
  }, [location, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Location);
  };
  
  const title = location ? 'Editar Ubicación' : 'Añadir Ubicación';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre</label>
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
          <label className="block text-sm font-medium text-gray-700">Dirección</label>
          <input
            type="text"
            name="address"
            value={formData.address || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
         <div>
          <label className="block text-sm font-medium text-gray-700">Latitud</label>
          <input
            type="number"
            name="latitude"
            step="any"
            value={formData.latitude || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Longitud</label>
          <input
            type="number"
            name="longitude"
            step="any"
            value={formData.longitude || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Radio (metros)</label>
          <input
            type="number"
            name="radius_meters"
            value={formData.radius_meters || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </Modal>
  );
};

export default LocationFormModal;
