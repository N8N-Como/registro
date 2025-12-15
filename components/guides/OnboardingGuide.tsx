
import React, { useState, useEffect, useMemo } from 'react';
import Button from '../shared/Button';
import { Role } from '../../types';
import { 
    SparklesIcon, 
    MenuIcon, 
    LocationIcon, 
    TimesheetIcon, 
    BellIcon, 
    CheckIcon 
} from '../icons';

interface OnboardingGuideProps {
  role: Role;
  onFinish: (dontShowAgain: boolean) => void;
}

interface TourStep {
    targetId?: string; // Si es undefined, es un modal central
    title: string;
    description: string;
    icon: React.ReactNode;
    position?: 'bottom' | 'top' | 'left' | 'right';
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ role, onFinish }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [isVisible, setIsVisible] = useState(false); // Para animación de entrada

    useEffect(() => {
        // Animación de entrada
        setTimeout(() => setIsVisible(true), 100);
    }, []);

    // --- Definición del Contenido del Tour ---
    const steps = useMemo((): TourStep[] => {
        const roleMessage = role.role_id === 'admin' 
            ? "Como Administrador, tienes acceso total a la configuración y gestión."
            : role.role_id === 'gobernanta'
            ? "Como Gobernanta, gestionarás las tareas de limpieza y supervisión."
            : "Aquí podrás gestionar tu día a día de forma sencilla.";

        return [
            {
                title: `¡Hola, ${role.name}!`,
                description: `Bienvenido a la nueva plataforma de gestión de Como en Casa. ${roleMessage} Vamos a enseñarte lo más importante en menos de 1 minuto.`,
                icon: <div className="text-4xl">👋</div>,
                targetId: undefined // Modal central
            },
            {
                title: "Tu Estado Actual",
                description: "Este es el panel más importante. Aquí verás si estás 'Dentro' o 'Fuera' y el tiempo que llevas trabajando. Si olvidas fichar, te avisará.",
                icon: <TimesheetIcon className="w-10 h-10 text-blue-500" />,
                targetId: 'widget-my-status',
                position: 'bottom'
            },
            {
                title: "Equipo en Tiempo Real",
                description: "Consulta quién está trabajando ahora mismo y en qué ubicación se encuentran. Útil para saber con quién cuentas en cada momento.",
                icon: <LocationIcon className="w-10 h-10 text-orange-500" />,
                targetId: 'widget-team-status',
                position: 'bottom'
            },
            {
                title: "Libro de Novedades",
                description: "La comunicación es clave. Aquí aparecerán notas importantes dejadas por el turno anterior o comunicados de dirección.",
                icon: <BellIcon className="w-10 h-10 text-purple-500" />,
                targetId: 'widget-shift-log',
                position: 'top'
            },
            {
                title: "Tu Panel de Control",
                description: `Esta sección cambia según tu rol (${role.name}). Aquí tienes tus herramientas específicas: incidencias, tareas de limpieza o estadísticas.`,
                icon: <SparklesIcon className="w-10 h-10 text-yellow-500" />,
                targetId: 'widget-role-specific',
                position: 'top'
            },
            {
                title: "Navegación Principal",
                description: "Usa el menú lateral (o el botón de hamburguesa en móvil) para acceder a Fichajes, Cuadrantes, Petición de Vacaciones y más.",
                icon: <MenuIcon className="w-10 h-10 text-gray-700" />,
                targetId: window.innerWidth >= 1024 ? 'sidebar-menu' : 'mobile-menu-btn',
                position: window.innerWidth >= 1024 ? 'right' : 'bottom'
            },
            {
                title: "¡Todo Listo!",
                description: "Recuerda: lo más importante es fichar al entrar y salir. ¡Que tengas un buen día!",
                icon: <CheckIcon className="w-12 h-12 text-green-500" />,
                targetId: undefined
            }
        ];
    }, [role]);

    // Filtrar pasos cuyos elementos no existen en el DOM actual
    const activeSteps = useMemo(() => {
        return steps.filter(step => {
            if (!step.targetId) return true;
            const el = document.getElementById(step.targetId);
            return el && el.offsetParent !== null; // Existe y es visible
        });
    }, [steps]);

    const currentStep = activeSteps[currentStepIndex];

    // --- Cálculo de Posición (Spotlight) ---
    useEffect(() => {
        const updatePosition = () => {
            if (currentStep?.targetId) {
                const element = document.getElementById(currentStep.targetId);
                if (element) {
                    const r = element.getBoundingClientRect();
                    // Ajuste para móviles si el elemento está medio fuera
                    if (r.top < 0 || r.bottom > window.innerHeight) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    setRect(r);
                }
            } else {
                setRect(null);
            }
        };

        // Pequeño delay para asegurar renderizado
        setTimeout(updatePosition, 150); 
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
        
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
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

    // Estilos dinámicos para la tarjeta
    const getTooltipStyle = () => {
        if (!rect) return { 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            maxWidth: '450px',
            width: '90%'
        }; 

        const gap = 20;
        const margin = 20;
        const windowWidth = window.innerWidth;
        const width = Math.min(windowWidth - 40, 380); // Max width of tooltip
        
        let top = 0;
        let left = 0;
        
        // Lógica posicional básica
        if (currentStep.position === 'bottom') {
            top = rect.bottom + gap;
            left = rect.left + (rect.width / 2) - (width / 2);
        } else if (currentStep.position === 'top') {
            top = rect.top - gap - 250; // Aproximar altura tooltip
            left = rect.left + (rect.width / 2) - (width / 2);
        } else if (currentStep.position === 'right') {
            top = rect.top;
            left = rect.right + gap;
        } else { // left
            top = rect.top;
            left = rect.left - width - gap;
        }

        // Clamping (evitar que se salga de pantalla)
        if (left < margin) left = margin;
        if (left + width > windowWidth - margin) left = windowWidth - margin - width;
        if (top < margin) top = margin;

        return { 
            top: `${top}px`, 
            left: `${left}px`, 
            width: `${width}px`,
            position: 'absolute' as const 
        };
    };

    const progress = ((currentStepIndex + 1) / activeSteps.length) * 100;

    return (
        <div className={`fixed inset-0 z-[100] transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* 1. Backdrop Oscuro con recorte (Spotlight) */}
            {/* Usamos un div gigante con clip-path o borders para simular el recorte sería complejo.
                Mejor usar box-shadow gigante invertido sobre el elemento resaltado. */}
            
            {rect ? (
                // Spotlight Mode
                <div 
                    className="absolute rounded-lg transition-all duration-500 ease-in-out pointer-events-none"
                    style={{
                        top: rect.top - 5,
                        left: rect.left - 5,
                        width: rect.width + 10,
                        height: rect.height + 10,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)', // El truco del "agujero"
                        zIndex: 101
                    }}
                >
                    {/* Borde animado pulsante */}
                    <div className="absolute inset-0 rounded-lg ring-4 ring-white/50 animate-pulse"></div>
                </div>
            ) : (
                // Modal Mode (Full Overlay)
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[101]"></div>
            )}

            {/* 2. Tarjeta del Tutorial */}
            <div 
                className="fixed bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ease-out z-[102] flex flex-col"
                style={getTooltipStyle()}
            >
                {/* Barra de Progreso */}
                <div className="h-1.5 w-full bg-gray-100">
                    <div 
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <div className="p-6 md:p-8 flex flex-col h-full relative">
                    
                    {/* Header Multimedia */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 shadow-inner ring-8 ring-gray-50/50">
                            {currentStep.icon}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 leading-tight">
                            {currentStep.title}
                        </h3>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 text-center">
                        <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                            {currentStep.description}
                        </p>
                    </div>

                    {/* Checkbox (Solo al final) */}
                    {currentStepIndex === activeSteps.length - 1 && (
                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-primary border-primary' : 'border-gray-300 bg-white'}`}>
                                    {dontShowAgain && <CheckIcon className="w-3 h-3 text-white" />}
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                    className="hidden"
                                />
                                <span className="text-xs text-gray-500 group-hover:text-gray-700 select-none">
                                    No mostrar de nuevo
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Footer Nav */}
                    <div className="flex items-center justify-between mt-8 gap-4">
                        <button 
                            onClick={handleBack}
                            disabled={currentStepIndex === 0}
                            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                                currentStepIndex === 0 
                                    ? 'text-gray-300 cursor-not-allowed' 
                                    : 'text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            Atrás
                        </button>
                        
                        <div className="flex space-x-1.5">
                            {activeSteps.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentStepIndex ? 'bg-primary' : 'bg-gray-200'}`}
                                ></div>
                            ))}
                        </div>

                        <Button onClick={handleNext} className="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all">
                            {currentStepIndex === activeSteps.length - 1 ? 'Empezar' : 'Siguiente'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingGuide;
