
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

const DEFAULT_POLICIES: Policy[] = [
    {
        policy_id: 'default_1',
        title: '1. Política de Privacidad y Protección de Datos (LOPD)',
        content: `En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPD-GDD), se le informa que sus datos personales serán tratados por ${COMPANY_NAME} con la finalidad de gestionar la relación laboral, el control horario obligatorio (Art 34.9 ET) y la seguridad de las instalaciones.\n\nSus datos de geolocalización y captura de imagen se utilizarán exclusivamente para verificar el inicio y fin de la jornada laboral y no serán cedidos a terceros salvo obligación legal.`,
        version: 1
    },
    {
        policy_id: 'default_2',
        title: '2. Derecho a la Desconexión Digital',
        content: `La empresa garantiza el derecho a la desconexión digital (Art. 88 LOPD-GDD). Fuera de su horario laboral establecido, usted no está obligado a responder comunicaciones (mensajes, correos, notificaciones de la App) salvo causas de fuerza mayor justificadas.\n\nEl sistema de control horario de esta aplicación está configurado para no realizar seguimiento de geolocalización fuera de la jornada activa.`,
        version: 1
    },
    {
        policy_id: 'default_3',
        title: '3. Uso de Dispositivos y Herramientas',
        content: `El usuario se compromete a hacer un uso responsable de esta aplicación, manteniendo la confidencialidad de su PIN de acceso. El uso fraudulento de la geolocalización o la suplantación de identidad en el fichaje podrá ser motivo de sanción disciplinaria.`,
        version: 1
    }
];

const PolicyAcceptanceScreen: React.FC<PolicyAcceptanceScreenProps> = ({ employeeName, onAccept, onDecline }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    const fetchPolicies = async () => {
        try {
            const fetchedPolicies = await getPolicies();
            // Si no hay políticas en la BD (mock), usamos las legales por defecto para asegurar cumplimiento
            if (fetchedPolicies.length === 0) {
                setPolicies(DEFAULT_POLICIES);
            } else {
                setPolicies(fetchedPolicies);
            }
        } catch (error) {
            console.error("Failed to fetch policies", error);
            setPolicies(DEFAULT_POLICIES);
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
          <p className="mt-2 text-gray-600">Hola {employeeName}, para cumplir con la normativa vigente, debes aceptar las siguientes condiciones.</p>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 border rounded-md max-h-80 overflow-y-auto text-sm text-gray-700 space-y-4">
            {isLoading ? <Spinner/> : policies.map(policy => (
                <div key={policy.policy_id} className="pb-4 border-b last:border-0">
                    <h2 className="font-bold text-base mb-2 text-primary">{policy.title}</h2>
                    <p className="whitespace-pre-wrap leading-relaxed">{policy.content}</p>
                </div>
            ))}
        </div>

        <div className="mt-6 bg-blue-50 p-3 rounded-md border border-blue-200">
            <label className="flex items-start cursor-pointer">
                <input 
                    type="checkbox" 
                    className="h-5 w-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={hasAgreed}
                    onChange={() => setHasAgreed(!hasAgreed)}
                />
                <span className="ml-3 text-sm text-gray-700">
                    He leído y acepto expresamente el tratamiento de mis datos para el control horario, incluyendo geolocalización durante la jornada, y confirmo haber sido informado de mi derecho a la desconexión digital.
                </span>
            </label>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <Button variant="secondary" onClick={onDecline}>
            No Acepto (Salir)
          </Button>
          <Button variant="primary" onClick={onAccept} disabled={!hasAgreed}>
            Aceptar y Entrar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PolicyAcceptanceScreen;
