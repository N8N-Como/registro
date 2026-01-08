
import React, { useState, useEffect, createContext } from 'react';
import { getEmployees, getRoles, acceptPolicy as apiAcceptPolicy, getActiveAnnouncement, getMaintenanceMode } from './services/mockApi';
import { Employee, Role, Announcement } from './types';
import LoginScreen from './components/auth/LoginScreen';
import Layout from './components/layout/Layout';
import PolicyAcceptanceScreen from './components/auth/PolicyAcceptanceScreen';
import Spinner from './components/shared/Spinner';
import AnnouncementModal from './components/shared/AnnouncementModal';
import OnboardingGuide from './components/guides/OnboardingGuide';
import Button from './components/shared/Button';
import NetworkStatus from './components/shared/NetworkStatus';
import { WrenchIcon } from './components/icons';

interface AuthContextType {
  employee: Employee | null;
  role: Role | null;
  logout: () => void;
  updateCurrentUser: (updatedData: Partial<Employee>) => void;
  showOnboarding: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);

  const fetchInitialData = async () => {
    try {
      const [rols, emps, maintenance] = await Promise.all([
          getRoles(),
          getEmployees(),
          getMaintenanceMode()
      ]);
      
      setEmployees(emps);
      setRoles(rols);
      setIsMaintenance(maintenance);
      
      if (rols.length === 0 && emps.length === 0) {
          setError("Conexión exitosa, pero sin datos. Revisa el SQL Editor.");
      } else {
          setError(null);
      }
    } catch (error: any) {
      setError(`Error de conexión: ${error?.message || 'Fallo desconocido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    // Monitorizar modo mantenimiento cada minuto
    const interval = setInterval(async () => {
        const m = await getMaintenanceMode();
        setIsMaintenance(m);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (employeeId: string) => {
    const user = employees.find(e => e.employee_id === employeeId);
    if (user) {
      setCurrentUser(user);
    }
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
    setIsOnboardingVisible(false);
  };
  
  const handleAcceptPolicy = async () => {
      if (currentUser) {
          await apiAcceptPolicy(currentUser.employee_id);
          setCurrentUser({...currentUser, policy_accepted: true});
      }
  }

  const handleUpdateCurrentUser = (updatedData: Partial<Employee>) => {
    if (currentUser) setCurrentUser({ ...currentUser, ...updatedData });
  };

  const userRole = currentUser ? roles.find(r => r.role_id === currentUser.role_id) || null : null;
  const isAdmin = userRole?.role_id === 'admin' || userRole?.role_id === 'administracion';

  if (isLoading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 space-y-4">
        <Spinner size="lg" />
        <p className="text-gray-600 font-medium">Conectando con Como en Casa Cloud...</p>
      </div>
  );

  if (error) return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
              <h2 className="text-xl font-bold text-red-600 mb-4">Error de Base de Datos</h2>
              <p className="text-gray-700 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
      </div>
  );

  // --- BLOQUEO POR MANTENIMIENTO ---
  if (isMaintenance && !isAdmin && currentUser) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-primary p-6">
              <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg text-center border-4 border-orange-500">
                  <div className="bg-orange-100 p-6 rounded-full inline-block mb-6 animate-pulse">
                      <WrenchIcon className="h-16 w-16 text-orange-600" />
                  </div>
                  <h1 className="text-3xl font-black text-primary mb-4 uppercase italic">¡Pausa Necesaria!</h1>
                  <p className="text-gray-600 text-lg leading-relaxed mb-8">
                      Estamos realizando mejoras de seguridad y actualizaciones en el sistema. <br/> 
                      <strong>La aplicación volverá a estar operativa en unos minutos.</strong>
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button variant="secondary" onClick={handleLogout}>Cerrar Sesión</Button>
                    <Button onClick={() => window.location.reload()}>Refrescar para Reintentar</Button>
                  </div>
                  <p className="mt-8 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Como en Casa Alojamientos - Centro de Soporte</p>
              </div>
          </div>
      );
  }

  if (!currentUser || !userRole) {
    return <LoginScreen employees={employees} roles={roles} onLogin={handleLogin} isMaintenance={isMaintenance} />;
  }
  
  if (!currentUser.policy_accepted) {
      return <PolicyAcceptanceScreen employeeName={currentUser.first_name} onAccept={handleAcceptPolicy} onDecline={handleLogout} />
  }

  return (
    <AuthContext.Provider value={{ 
        employee: currentUser, 
        role: userRole, 
        logout: handleLogout, 
        updateCurrentUser: handleUpdateCurrentUser,
        showOnboarding: () => setIsOnboardingVisible(true)
    }}>
      <Layout />
      {isOnboardingVisible && <OnboardingGuide role={userRole} onFinish={() => setIsOnboardingVisible(false)} />}
      <NetworkStatus />
    </AuthContext.Provider>
  );
};

export default App;
