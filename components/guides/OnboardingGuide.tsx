import React from 'react';
import Card from '../shared/Card';
import Button from '../shared/Button';
import { Role } from '../../types';
import { TaskIcon, AdminIcon, IncidentIcon } from '../icons';

interface OnboardingGuideProps {
  role: Role;
  onDismiss: () => void;
}

const getRoleSpecificSteps = (roleId: string) => {
    switch (roleId) {
        case 'cleaner':
            return [
                { icon: TaskIcon, title: 'Consulta tus Tareas', description: 'En la sección "Tareas Limpieza" encontrarás tu plan de trabajo diario y semanal.' },
                { icon: AdminIcon, title: 'Ficha tu Jornada', description: 'No olvides iniciar y finalizar tu jornada desde la sección "Fichajes".' },
                { icon: IncidentIcon, title: 'Reporta Incidencias', description: 'Si encuentras algo roto o que necesite atención, repórtalo en "Incidencias".' },
            ];
        case 'gobernanta':
            return [
                 { icon: TaskIcon, title: 'Planifica las Tareas', description: 'Desde "Planificador Tareas" puedes asignar el trabajo a todo el equipo de limpieza.' },
                 { icon: AdminIcon, title: 'Supervisa al Equipo', description: 'En "Administración" puedes ver el estado de las habitaciones y en "Informes" la productividad.' },
                 { icon: IncidentIcon, title: 'Gestiona Incidencias', description: 'Revisa y asigna las incidencias reportadas por el personal desde la sección "Incidencias".' },
            ];
        case 'admin':
             return [
                { icon: AdminIcon, title: 'Configura la Aplicación', description: 'En "Administración" puedes añadir empleados, ubicaciones, habitaciones y editar los permisos de cada rol.' },
                { icon: TaskIcon, title: 'Supervisa la Operación', description: 'Desde el "Panel" principal tendrás una vista general de todo lo que ocurre.' },
                { icon: IncidentIcon, title: 'Analiza los Informes', description: 'La sección "Informes" te ofrece gráficos y datos para entender la productividad de tu equipo.' },
            ];
        default:
            return [
                 { icon: TaskIcon, title: 'Revisa tu Panel', description: 'El "Panel" es tu punto de partida. Te muestra un resumen de lo más importante para ti.' },
                 { icon: AdminIcon, title: 'Ficha tu Jornada', description: 'Recuerda siempre registrar tus entradas y salidas desde la sección "Fichajes".' },
                 { icon: IncidentIcon, title: 'Comunícate', description: 'Usa el "Registro de Turno" para dejar notas importantes para tus compañeros.' },
            ];
    }
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ role, onDismiss }) => {
    const steps = getRoleSpecificSteps(role.role_id);
    return (
        <div className="fixed inset-0 bg-primary bg-opacity-75 z-50 flex justify-center items-center backdrop-blur-sm p-4">
            <Card className="w-full max-w-2xl transform transition-all shadow-2xl">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800">¡Bienvenido/a a la aplicación de {role.name}!</h2>
                    <p className="mt-2 text-gray-600">Aquí tienes unos pasos rápidos para empezar a usar tus herramientas.</p>
                </div>

                <div className="mt-8 space-y-6">
                    {steps.map((step, index) => (
                        <div key={index} className="flex items-start space-x-4">
                            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center">
                                <step.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800">{step.title}</h3>
                                <p className="text-gray-600">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-8 flex justify-center">
                    <Button onClick={onDismiss} size="lg">
                        ¡Entendido, a trabajar!
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default OnboardingGuide;
