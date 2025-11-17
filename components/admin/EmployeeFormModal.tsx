
import React, { useState, useEffect } from 'react';
import { Employee, Role } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Omit<Employee, 'employee_id'> | Employee) => void;
  employee: Employee | null;
  roles: Role[];
}

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({ isOpen, onClose, onSave, employee, roles }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    } else {
      setFormData({ 
          status: 'active', 
          role_id: roles[0]?.role_id,
          policy_accepted: false,
          photo_url: `https://i.pravatar.cc/150?u=${Date.now()}`
        });
    }
  }, [employee, isOpen, roles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Employee);
  };
  
  const title = employee ? 'Editar Empleado' : 'Añadir Empleado';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
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
        
        <div className="pt-4 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EmployeeFormModal;
