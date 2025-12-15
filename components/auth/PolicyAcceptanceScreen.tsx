
import React, { useState, useEffect } from 'react';
import { COMPANY_NAME } from '../../constants';
import Button from '../shared/Button';
import Card from '../shared/Card';
import { getPolicies } from '../../services/mockApi';
import { Policy } from '../../types';
import Spinner from '../shared/Spinner';
import { MegaphoneIcon, CalendarIcon, CheckIcon } from '../icons';

interface PolicyAcceptanceScreenProps {
  employeeName: string;
  onAccept: () => void;
  onDecline: () => void;
}

const DEFAULT_POLICIES: Policy[] = [
    {
        policy_id: 'default_1',
        title: '1. Protección de Datos y Registro Horario (Art. 34.9 ET)',
        content: `De conformidad con el Estatuto de los Trabajadores y la LOPD-GDD 3/2018, ${COMPANY_NAME} tratará sus datos para la gestión de la relación laboral y el cumplimiento de la obligación legal de registro de jornada.\n\nDatos recogidos:\n- Geolocalización: Solo se registrará en el momento exacto del fichaje o durante el tiempo efectivo de trabajo si se detecta un abandono del perímetro laboral.\n- Huella Digital del Dispositivo: Se registrará el ID técnico del dispositivo utilizado para prevenir la suplantación de identidad (fichaje por compañeros).`,
        version: 2
    },
    {
        policy_id: 'default_2',
        title: '2. Desconexión Digital y Privacidad',
        content: `La empresa garantiza su derecho a la desconexión digital (Art. 88 LOPD-GDD). La aplicación NO realizará seguimiento de su ubicación ni enviará comunicaciones operativas fuera de su horario laboral registrado, salvo situaciones de fuerza mayor justificadas.`,
        version: 2
    },
    {
        policy_id: 'default_3',
        title: '3. Sistema de Alertas y Notificaciones',
        content: `Para evitar errores en el registro (como olvidar fichar la salida al marcharse), esta aplicación utiliza un sistema de notificaciones inteligentes.\n\nEl trabajador confirma que MANTENDRÁ ACTIVAS las notificaciones de la aplicación en su dispositivo móvil. Desactivarlas podría conllevar incidencias en el cómputo de horas trabajadas y se considerará falta de diligencia en el uso de las herramientas facilitadas por la empresa.`,
        version: 2
    },
    {
        policy_id: 'default_4',
        title: '4. Responsabilidad de Fichaje (Entrada)',
        content: `Es responsabilidad exclusiva del trabajador registrar su entrada puntualmente al inicio de la jornada. Se recomienda configurar una alarma personal en su teléfono móvil 5 minutos antes de la hora de inicio para evitar olvidos. El olvido reiterado del fichaje de entrada podrá ser objeto de sanción conforme al convenio colectivo.`,
        version: 2
    }
];

const PolicyAcceptanceScreen: React.FC<PolicyAcceptanceScreenProps> = ({ employeeName, onAccept, onDecline }) => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    const fetchPolicies = async () => {
        try {
            const fetchedPolicies = await getPolicies();
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
    
    // Check initial notification state
    if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationsEnabled(true);
    }
  }, []);

  const requestNotificationPermission = async () => {
      if (!('Notification' in window)) {
          alert("Tu navegador no soporta notificaciones.");
          return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
          setNotificationsEnabled(true);
          new Notification("✅ Notificaciones activadas", {
              body: "El sistema te avisará si olvidas fichar la salida."
          });
      } else {
          alert("Es necesario activar las notificaciones para el correcto funcionamiento del sistema de alertas.");
      }
  };

  const downloadCalendarReminder = () => {
      // Create a simple ICS content for a recurring alarm
      const eventContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'SUMMARY:⏰ Fichar Entrada - Como en Casa',
        'DESCRIPTION:Recordatorio para registrar la jornada laboral en la App.',
        'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', // Lunes a Viernes por defecto
        'DTSTART:' + new Date().toISOString().replace(/-|:|\.\d\d\d/g, "").substring(0, 8) + 'T085500', // 08:55 AM
        'DURATION:PT5M',
        'ALARM:DISPLAY',
        'DESCRIPTION:Fichar Entrada',
        'TRIGGER:-PT0M',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\n');

      const blob = new Blob([eventContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'recordatorio_fichaje.ics');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Políticas Laborales y Uso de App</h1>
          <p className="mt-2 text-gray-600">Hola {employeeName}, para garantizar el cumplimiento legal y tus derechos, por favor confirma los siguientes puntos.</p>
        </div>
        
        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-md max-h-80 overflow-y-auto text-sm text-gray-700 space-y-6 shadow-inner">
            {isLoading ? <Spinner/> : policies.map(policy => (
                <div key={policy.policy_id} className="pb-4 border-b border-gray-100 last:border-0">
                    <h2 className="font-bold text-base mb-2 text-primary flex items-center">
                        <span className="bg-primary/10 text-primary p-1 rounded mr-2">§</span>
                        {policy.title}
                    </h2>
                    <p className="whitespace-pre-wrap leading-relaxed text-gray-600 pl-6">{policy.content}</p>
                </div>
            ))}
        </div>

        {/* Action Area: Notifications & Alarm */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Notifications Box */}
            <div className={`p-4 rounded-lg border ${notificationsEnabled ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-center mb-2">
                    <MegaphoneIcon className={`w-5 h-5 mr-2 ${notificationsEnabled ? 'text-green-600' : 'text-orange-600'}`} />
                    <h3 className={`font-bold text-sm ${notificationsEnabled ? 'text-green-800' : 'text-orange-800'}`}>
                        {notificationsEnabled ? 'Notificaciones Activas' : 'Permiso de Notificaciones'}
                    </h3>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                    {notificationsEnabled 
                        ? 'Correcto. Recibirás avisos si sales del recinto sin fichar.' 
                        : 'Necesario para que la app te avise si te olvidas de fichar la salida.'}
                </p>
                {!notificationsEnabled && (
                    <Button size="sm" onClick={requestNotificationPermission} className="w-full text-xs">
                        Activar Notificaciones
                    </Button>
                )}
                {notificationsEnabled && <div className="text-xs text-green-700 font-bold flex items-center"><CheckIcon className="w-4 h-4 mr-1"/> Configurado</div>}
            </div>

            {/* Alarm Help Box */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                    <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                    <h3 className="font-bold text-sm text-blue-800">Ayuda: No olvides fichar</h3>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                    Descarga un evento de calendario recurrente (L-V) para recordarte fichar al llegar.
                </p>
                <button 
                    onClick={downloadCalendarReminder}
                    className="w-full py-2 bg-white border border-blue-300 text-blue-700 rounded text-xs font-semibold hover:bg-blue-100 transition-colors shadow-sm"
                >
                    📅 Descargar Recordatorio (.ics)
                </button>
            </div>
        </div>

        <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-300">
            <label className="flex items-start cursor-pointer">
                <input 
                    type="checkbox" 
                    className="h-5 w-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={hasAgreed}
                    onChange={() => setHasAgreed(!hasAgreed)}
                />
                <span className="ml-3 text-sm text-gray-800 font-medium">
                    He leído y acepto las condiciones legales, el tratamiento de mi huella digital para control horario y confirmo que mantendré las notificaciones activas para el correcto funcionamiento del sistema.
                </span>
            </label>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4">
          <Button variant="secondary" onClick={onDecline}>
            No Acepto (Salir)
          </Button>
          <Button variant="primary" onClick={onAccept} disabled={!hasAgreed}>
            Confirmar y Entrar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PolicyAcceptanceScreen;
