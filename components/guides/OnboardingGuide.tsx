
import React, { useState, useEffect } from 'react';
import Button from '../shared/Button';
import { Role } from '../../types';

interface OnboardingGuideProps {
  role: Role;
  onFinish: (dontShowAgain: boolean) => void;
}

interface TourStep {
    targetId?: string; // ID of the DOM element to highlight. If undefined, it's a centered modal.
    title: string;
    description: string;
    position?: 'bottom' | 'top' | 'left' | 'right';
}

const getRoleSpecificMessage = (roleId: string) => {
    switch (roleId) {
        case 'cleaner': return "Verás tus tareas asignadas y podrás marcar las habitaciones como limpias.";
        case 'gobernanta': return "Podrás planificar turnos, asignar tareas y supervisar el estado de las habitaciones.";
        case 'admin': return "Tienes control total sobre empleados, ubicaciones y configuración del sistema.";
        default: return "Registra tu jornada, consulta el cuadrante y comunícate con tu equipo.";
    }
};

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ role, onFinish }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);
    
    // Steps Definition
    const steps: TourStep[] = [
        {
            title: `¡Bienvenido/a, ${role.name}!`,
            description: "Esta es la nueva aplicación de gestión de Como en Casa. Vamos a hacer un recorrido rápido para enseñarte lo más importante.",
            targetId: undefined // Center screen
        },
        {
            title: "Menú Principal",
            description: "Aquí arriba a la izquierda (las 3 rayitas en móvil) encontrarás el menú principal. Desde aquí accedes a Fichajes, Cuadrantes, Incidencias y más.",
            targetId: 'mobile-menu-btn', // Mobile logic first
            position: 'bottom'
        },
        {
            title: "Panel Lateral",
            description: "En pantallas grandes, el menú estará siempre visible aquí a la izquierda para un acceso rápido.",
            targetId: 'sidebar-menu', // Desktop logic
            position: 'right'
        },
        {
            title: "Tu Perfil",
            description: "Aquí puedes cambiar tu foto (importante para los cuadrantes), ver tus documentos firmados y consultar la política de privacidad.",
            targetId: 'user-profile-btn',
            position: 'bottom'
        },
        {
            title: "Área de Trabajo",
            description: `Esta es tu zona principal. ${getRoleSpecificMessage(role.role_id)}`,
            targetId: 'main-content-area',
            position: 'top'
        },
        {
            title: "¡Todo listo!",
            description: "Ya puedes empezar a usar la aplicación. Recuerda fichar siempre al entrar y salir.",
            targetId: undefined
        }
    ];

    // Filter steps based on visibility (e.g., skip mobile menu step on desktop)
    const activeSteps = steps.filter(step => {
        if (!step.targetId) return true;
        const el = document.getElementById(step.targetId);
        // Only include if element exists and is visible
        return el && el.offsetParent !== null; 
    });

    const currentStep = activeSteps[currentStepIndex];

    // Calculate position of the highlighter and tooltip
    useEffect(() => {
        const updatePosition = () => {
            if (currentStep?.targetId) {
                const element = document.getElementById(currentStep.targetId);
                if (element) {
                    const r = element.getBoundingClientRect();
                    setRect(r);
                }
            } else {
                setRect(null);
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
        
        // Slight delay to ensure DOM is ready/rendered
        const timeout = setTimeout(updatePosition, 100);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
            clearTimeout(timeout);
        };
    }, [currentStepIndex, currentStep]);

    const handleNext = () => {
        if (currentStepIndex < activeSteps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onFinish(dontShowAgain);
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    // Calculate Tooltip Position with Edge Detection
    const getTooltipStyle = () => {
        if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }; // Center if no target

        const gap = 15;
        const margin = 16; // Minimum distance from screen edge
        const windowWidth = window.innerWidth;
        
        // Calculate estimated width based on CSS classes (w-[90%] max-w-sm)
        // max-w-sm is 24rem = 384px
        const estimatedWidth = Math.min(windowWidth * 0.9, 384);
        const halfWidth = estimatedWidth / 2;
        
        let top = 0;
        let left = 0;
        let transform = '';

        switch (currentStep.position) {
            case 'bottom':
                top = rect.bottom + gap;
                left = rect.left + (rect.width / 2);
                transform = 'translate(-50%, 0)';
                break;
            case 'top':
                top = rect.top - gap;
                left = rect.left + (rect.width / 2);
                transform = 'translate(-50%, -100%)';
                break;
            case 'right':
                top = rect.top + (rect.height / 2);
                left = rect.right + gap;
                transform = 'translate(0, -50%)';
                break;
            case 'left':
                top = rect.top + (rect.height / 2);
                left = rect.left - gap;
                transform = 'translate(-100%, -50%)';
                break;
            default: // Center / Fallback
                return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }

        // --- Intelligent Boundary Clamping ---

        // 1. Horizontal Clamping for Centered Tooltips (translate(-50%))
        // Used for 'top' and 'bottom' positions
        if (transform.includes('translate(-50%')) {
            // Check Right Edge Overflow
            if (left + halfWidth > windowWidth - margin) {
                // Force the center point to shift left so the right edge fits
                left = windowWidth - margin - halfWidth;
            }
            // Check Left Edge Overflow
            if (left - halfWidth < margin) {
                // Force the center point to shift right
                left = margin + halfWidth;
            }
        } 
        
        // 2. Vertical Clamping
        if (top < margin) top = margin;
        
        // Ensure no negative values
        if (left < 0) left = 0;

        return { top, left, transform, position: 'absolute' as const };
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-70 transition-all duration-300"></div>

            {/* Highlighter Box (The Spot) */}
            {rect && (
                <div 
                    className="absolute border-4 border-white rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-300 ease-in-out pointer-events-none"
                    style={{
                        top: rect.top - 5,
                        left: rect.left - 5,
                        width: rect.width + 10,
                        height: rect.height + 10,
                    }}
                ></div>
            )}

            {/* Tooltip Card */}
            <div 
                className="fixed bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-sm transition-all duration-300 ease-out z-[101]"
                style={getTooltipStyle()}
            >
                <div className="flex flex-col h-full">
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-bold text-gray-800">{currentStep.title}</h3>
                            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                {currentStepIndex + 1} / {activeSteps.length}
                            </span>
                        </div>
                        <p className="text-gray-600 mb-6 text-sm leading-relaxed">{currentStep.description}</p>
                    </div>

                    {/* Checkbox only on last step */}
                    {currentStepIndex === activeSteps.length - 1 && (
                        <div className="mb-4 pt-2 border-t">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                    className="rounded text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm text-gray-600">No volver a mostrar este tutorial</span>
                            </label>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-auto">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleBack} 
                            disabled={currentStepIndex === 0}
                            className="opacity-80 hover:opacity-100"
                        >
                            Anterior
                        </Button>
                        <Button 
                            onClick={handleNext} 
                            size="sm"
                            className="shadow-lg"
                        >
                            {currentStepIndex === activeSteps.length - 1 ? '¡Entendido!' : 'Siguiente'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingGuide;
