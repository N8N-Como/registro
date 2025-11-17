import React, { useState, useEffect } from 'react';
import { COMPANY_NAME } from '../../constants';
import Button from '../shared/Button';
import Card from '../shared/Card';
import { getPolicies } from '../../services/mockApi';
import { Policy } from '../../types';
import Spinner from '../shared/Spinner';

interface PolicyAcceptanceScreenProps {
  employeeName: string;
  onAccept: () => void;
  onDecline: () => void;
}

const PolicyAcceptanceScreen: React.FC<PolicyAcceptanceScreenProps> = ({ employeeName, onAccept, onDecline }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    const fetchPolicies = async () => {
        try {
            const fetchedPolicies = await getPolicies();
            setPolicies(fetchedPolicies);
        } catch (error) {
            console.error("Failed to fetch policies", error);
        } finally {
            setIsLoading(false);
        }
    }
    fetchPolicies();
  }, []);


  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Políticas y Condiciones de la Empresa</h1>
          <p className="mt-2 text-gray-600">Hola {employeeName}, antes de continuar, por favor, lee y acepta las siguientes políticas de {COMPANY_NAME}.</p>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 border rounded-md max-h-80 overflow-y-auto text-sm text-gray-700 space-y-4">
            {isLoading ? <Spinner/> : policies.map(policy => (
                <div key={policy.policy_id}>
                    <h2 className="font-bold text-base mb-2">{policy.title}</h2>
                    <p className="whitespace-pre-wrap">{policy.content}</p>
                </div>
            ))}
        </div>

        <div className="mt-6">
            <label className="flex items-center">
                <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={hasAgreed}
                    onChange={() => setHasAgreed(!hasAgreed)}
                />
                <span className="ml-2 text-gray-700">He leído, entiendo y acepto todas las políticas y condiciones.</span>
            </label>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <Button variant="secondary" onClick={onDecline}>
            Rechazar y Salir
          </Button>
          <Button variant="primary" onClick={onAccept} disabled={!hasAgreed}>
            Aceptar y Continuar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PolicyAcceptanceScreen;