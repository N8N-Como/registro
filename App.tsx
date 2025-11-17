
import React, { useState, useEffect, createContext } from 'react';
import { getEmployees, getRoles, acceptPolicy as apiAcceptPolicy, getActiveAnnouncement } from './services/mockApi';
import { Employee, Role, Announcement } from './types';
import LoginScreen from './components/auth/LoginScreen';
import Layout from './components/layout/Layout';
import PolicyAcceptanceScreen from './components/auth/PolicyAcceptanceScreen';
import Spinner from './components/shared/Spinner';
import AnnouncementModal from './components/shared/AnnouncementModal';
import OnboardingGuide from './components/guides/OnboardingGuide';
import Button from './components/shared/Button';

interface AuthContextType {
  employee: Employee | null;
  role: Role | null;
  logout: () => void;
  updateCurrentUser: (updatedData: Partial<Employee>) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setError(null);
        // Check connection by fetching roles first
        const rols = await getRoles();
        const emps = await getEmployees();
        
        setEmployees(emps);
        setRoles(rols);
        
        if (rols.length === 0 && emps.length === 0) {
            setError("Conexión exitosa a Supabase, pero no se encontraron datos. ¿Ejecutaste el script SQL para insertar los datos iniciales?");
        }
      } catch (error: any) {
        console.error("Failed to fetch initial data", error);
        setError("No se pudo conectar con la base de datos. Comprueba tu conexión a internet.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleLogin = async (employeeId: string) => {
    const user = employees.find(e => e.employee_id === employeeId);
    if (user) {
      setCurrentUser(user);
      if (user.policy_accepted) {
        const onboardingKey = `onboarding_completed_${user.employee_id}`;
        if (!localStorage.getItem(onboardingKey)) {
            setShowOnboarding(true);
        } else {
             // Only check for announcements if onboarding is done
            const announcement = await getActiveAnnouncement();
            if (announcement) {
              const seenAnnouncements = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
              if (!seenAnnouncements.includes(announcement.announcement_id)) {
                setActiveAnnouncement(announcement);
                setShowAnnouncement(true);
              }
            }
        }
      }
    }
  };
  
  const handleLogout = () => {
    setCurrentUser(null);
  };
  
  const handleAcceptPolicy = async () => {
      if (currentUser) {
          await apiAcceptPolicy(currentUser.employee_id);
          const updatedUser = {...currentUser, policy_accepted: true};
          setCurrentUser(updatedUser);
          
          setEmployees(prevEmployees => 
              prevEmployees.map(e => e.employee_id === currentUser.employee_id ? updatedUser : e)
          );
          
          const onboardingKey = `onboarding_completed_${currentUser.employee_id}`;
          if (!localStorage.getItem(onboardingKey)) {
            setShowOnboarding(true);
          } else {
            const announcement = await getActiveAnnouncement();
            if (announcement) {
                setActiveAnnouncement(announcement);
                setShowAnnouncement(true);
            }
          }
      }
  }

  const handleDismissOnboarding = async () => {
      if (currentUser) {
          localStorage.setItem(`onboarding_completed_${currentUser.employee_id}`, 'true');
      }
      setShowOnboarding(false);

      // Check for announcements now that onboarding is done
      const announcement = await getActiveAnnouncement();
      if (announcement) {
          const seenAnnouncements = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
          if (!seenAnnouncements.includes(announcement.announcement_id)) {
              setActiveAnnouncement(announcement);
              setShowAnnouncement(true);
          }
      }
  };


  const handleDismissAnnouncement = () => {
    if (activeAnnouncement) {
      const seenAnnouncements = JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
      seenAnnouncements.push(activeAnnouncement.announcement_id);
      localStorage.setItem('seenAnnouncements', JSON.stringify(seenAnnouncements));
    }
    setShowAnnouncement(false);
    setActiveAnnouncement(null);
  };
  
  const handleUpdateCurrentUser = (updatedData: Partial<Employee>) => {
    if (currentUser) {
        const updatedUser = { ...currentUser, ...updatedData };
        setCurrentUser(updatedUser);
        
        const updatedEmployees = employees.map(e => e.employee_id === updatedUser.employee_id ? updatedUser : e);
        setEmployees(updatedEmployees);
    }
};

  const userRole = currentUser ? roles.find(r => r.role_id === currentUser.role_id) || null : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 space-y-4">
        <Spinner size="lg" />
        <p className="text-gray-600 font-medium animate-pulse">Conectando con Como en Casa Cloud...</p>
      </div>
    );
  }

  if (error) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
              <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
                  <h2 className="text-xl font-bold text-red-600 mb-4">Estado de Conexión</h2>
                  <p className="text-gray-700 mb-6">{error}</p>
                  <Button onClick={() => window.location.reload()} size="md">
                    Reintentar Conexión
                  </Button>
              </div>
          </div>
      );
  }

  if (!currentUser || !userRole) {
    return <LoginScreen employees={employees} roles={roles} onLogin={handleLogin} />;
  }
  
  if (!currentUser.policy_accepted) {
      return <PolicyAcceptanceScreen employeeName={currentUser.first_name} onAccept={handleAcceptPolicy} onDecline={handleLogout} />
  }

  if (showOnboarding) {
      return <OnboardingGuide role={userRole} onDismiss={handleDismissOnboarding} />;
  }

  if (showAnnouncement && activeAnnouncement) {
    return <AnnouncementModal announcement={activeAnnouncement} onClose={handleDismissAnnouncement} />;
  }

  return (
    <AuthContext.Provider value={{ employee: currentUser, role: userRole, logout: handleLogout, updateCurrentUser: handleUpdateCurrentUser }}>
      <Layout />
    </AuthContext.Provider>
  );
};

export default App;
