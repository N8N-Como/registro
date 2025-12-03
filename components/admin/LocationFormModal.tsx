
import React, { useState, useEffect } from 'react';
import { Location } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { LocationIcon } from '../icons';

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
  
  const handleSearchOnMap = () => {
      const query = formData.address || formData.name;
      if (query) {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
      } else {
          alert("Introduce primero un nombre o dirección para buscar.");
      }
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
            placeholder="Ej: Apartamentos Centro"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Dirección</label>
          <div className="flex gap-2">
              <input
                type="text"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
                placeholder="Calle Principal 123, Ciudad"
              />
              <button
                type="button"
                onClick={handleSearchOnMap}
                className="mt-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-md border border-blue-200 hover:bg-blue-100 flex items-center"
                title="Buscar en Google Maps"
              >
                  <LocationIcon className="w-5 h-5" />
              </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Pulsa el icono del mapa para buscar la dirección y obtener las coordenadas.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
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
                placeholder="Ej: 42.8805"
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
                placeholder="Ej: -8.5456"
              />
            </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Radio permitido (metros)</label>
          <input
            type="number"
            name="radius_meters"
            value={formData.radius_meters || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Distancia máxima desde la que se permite fichar (Recomendado: 100-200m).</p>
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
