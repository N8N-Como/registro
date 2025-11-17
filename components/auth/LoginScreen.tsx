import React, { useState, useMemo } from 'react';
import { Employee, Role } from '../../types';
import Button from '../shared/Button';
import Card from '../shared/Card';
import { COMPANY_NAME } from '../../constants';

interface LoginScreenProps {
  employees: Employee[];
  roles: Role[];
  onLogin: (employeeId: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ employees, onLogin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const employeeMap = useMemo(() => new Map(employees.map(e => [e.pin, e])), [employees]);

  const handlePinChange = (value: string) => {
    if (error) setError('');
    const newPin = pin + value;
    if (newPin.length > 4) return;
    setPin(newPin);
    if (newPin.length === 4) {
      const employee = employeeMap.get(newPin);
      if (employee) {
        onLogin(employee.employee_id);
      } else {
        setError('PIN incorrecto. Inténtalo de nuevo.');
        setTimeout(() => setPin(''), 500);
      }
    }
  };
  
  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
  };
  
  const pinDisplay = '●'.repeat(pin.length).padEnd(4, '○');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary">{COMPANY_NAME}</h1>
        <p className="text-gray-600 mt-2">Sistema de Gestión de Personal</p>
      </div>
      <Card className="max-w-sm w-full">
        <div className="text-center">
            <h2 className="text-xl font-semibold">Introduce tu PIN</h2>
            <div className="my-4 text-3xl tracking-widest font-mono bg-gray-100 p-2 rounded-lg">
                {pinDisplay}
            </div>
            {error && <p className="text-red-500 text-sm mb-2 h-5">{error}</p>}
             {!error && <div className="h-5 mb-2"></div>}
        </div>
        <div className="grid grid-cols-3 gap-4">
            {[...Array(9).keys()].map(i => (
                <Button key={i+1} onClick={() => handlePinChange((i + 1).toString())} size="lg" variant="secondary" className="text-2xl">{i + 1}</Button>
            ))}
             <Button onClick={handleClear} size="lg" variant="danger" className="text-lg">C</Button>
            <Button onClick={() => handlePinChange('0')} size="lg" variant="secondary" className="text-2xl">0</Button>
            <Button onClick={handleDelete} size="lg" variant="secondary" className="text-lg">⌫</Button>
        </div>
      </Card>
    </div>
  );
};

export default LoginScreen;
