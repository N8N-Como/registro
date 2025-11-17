import React, { useState, useEffect } from 'react';
import { Role, Permission } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: Role) => void;
  role: Role;
  availablePermissions: { id: Permission; label: string }[];
}

const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, onSave, role, availablePermissions }) => {
  const [formData, setFormData] = useState<Role>({ ...role });

  useEffect(() => {
    setFormData({ ...role });
  }, [role, isOpen]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
  };

  const handlePermissionChange = (permissionId: Permission, isChecked: boolean) => {
    setFormData(prev => {
        const newPermissions = isChecked
            ? [...prev.permissions, permissionId]
            : prev.permissions.filter(p => p !== permissionId);
        return { ...prev, permissions: newPermissions };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  const title = `Editar Permisos para ${role.name}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nombre del Rol</label>
          <input
            type="text"
            name="name"
            value={formData.name || ''}
            onChange={handleNameChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        <div>
            <h4 className="text-sm font-medium text-gray-700">Permisos</h4>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 rounded-md bg-gray-50 max-h-60 overflow-y-auto">
                {availablePermissions.map(permission => (
                    <label key={permission.id} className="flex items-center">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={(e) => handlePermissionChange(permission.id, e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-800">{permission.label}</span>
                    </label>
                ))}
            </div>
        </div>
        
        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </Modal>
  );
};

export default RoleFormModal;
