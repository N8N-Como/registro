
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../App';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getLocations, getTimeEntriesForEmployee, clockIn, clockOut, getActivityLogsForTimeEntry, checkInToLocation, checkOutOfLocation, logAccessAttempt, getBreaksForTimeEntry, startBreak, endBreak, getWorkShifts } from '../../services/mockApi';
import { getDistanceFromLatLonInMeters, formatDuration, formatTime } from '../../utils/helpers';
import { TimeEntry, Location as OfficeLocation, ActivityLog, BreakLog, WorkType, WorkMode, WorkShift } from '../../types';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import { LocationIcon, CarIcon, BuildingIcon, FlagIcon, DotIcon } from '../icons';
import ClockInModal from './ClockInModal';
import ClockOutModal from './ClockOutModal';

type TimelineItem = 
    | { type: 'WORKDAY_START', time: Date, entry: TimeEntry }
    | { type: 'WORKDAY_END', time: Date, entry: TimeEntry }
    | { type: 'LOCATION_CHECK_IN', time: Date, log: ActivityLog }
    | { type: 'LOCATION_CHECK_OUT', time: Date, log: ActivityLog }
    | { type: 'BREAK_START', time: Date, log: BreakLog }
    | { type: 'BREAK_END', time: Date, log: BreakLog }
    | { type: 'TRAVEL', startTime: Date, endTime: Date };


const TimesheetsView: React.FC = () => {
  const auth = useContext(AuthContext);
  const { position, getLocation } = useGeolocation();
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | false>(false);
  const [elapsedWorkdayTime, setElapsedWorkdayTime] = useState(0);
  
  // Modal State
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
  const [isForgottenClockOut, setIsForgottenClockOut] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [suggestedEndTime, setSuggestedEndTime] = useState<Date | undefined>(undefined);

  const runningWorkday = useMemo(() => timeEntries.find(t => t.status === 'running'), [timeEntries]);
  const currentActivity = useMemo(() => activityLogs.find(a => !a.check_out_time), [activityLogs]);
  const currentBreak = useMemo(() => breakLogs.find(b => !b.end_time), [breakLogs]);

  const fetchData = useCallback(async () => {
    if (!auth?.employee) return;
    setIsLoading(true);
    try {
      const [entries, locs] = await Promise.all([
        getTimeEntriesForEmployee(auth.employee.employee_id),
        getLocations()
      ]);
      setTimeEntries(entries);
      setLocations(locs);

      const currentRunningWorkday = entries.find(t => t.status === 'running');
      if (currentRunningWorkday) {
        const [logs, breaks] = await Promise.all([
            getActivityLogsForTimeEntry(currentRunningWorkday.entry_id),
            getBreaksForTimeEntry(currentRunningWorkday.entry_id)
        ]);
        setActivityLogs(logs.sort((a,b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()));
        setBreakLogs(breaks);
        setIsOnBreak(breaks.some(b => !b.end_time));

        // Check for Forgotten Clock Out
        checkForForgottenClockOut(currentRunningWorkday);
      } else {
        setActivityLogs([]);
        setBreakLogs([]);
        setIsOnBreak(false);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  }, [auth?.employee]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Logic to detect if user forgot to clock out based on Shift Schedule
  const checkForForgottenClockOut = async (entry: TimeEntry) => {
      // 1. Get today's shift
      const today = new Date();
      const startOfDay = new Date(today); startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(today); endOfDay.setHours(23,59,59,999);
      
      try {
          const shifts = await getWorkShifts(startOfDay.toISOString(), endOfDay.toISOString());
          const myShift = shifts.find(s => s.employee_id === auth?.employee?.employee_id);
          
          if (myShift) {
              const shiftEnd = new Date(myShift.end_time);
              const now = new Date();
              const diffMs = now.getTime() - shiftEnd.getTime();
              const diffMinutes = diffMs / (1000 * 60);

              // If more than 30 mins passed since shift end
              if (diffMinutes > 30) {
                  setIsForgottenClockOut(true);
                  setSuggestedEndTime(shiftEnd);
                  setIsClockOutModalOpen(true);
              }
          } else {
               // Fallback: If working > 12 hours, assume forgotten
               const start = new Date(entry.clock_in_time);
               const now = new Date();
               const hours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
               if (hours > 12) {
                   setIsForgottenClockOut(true);
                   setSuggestedEndTime(now);
                   setIsClockOutModalOpen(true);
               }
          }
      } catch (e) {
          console.error("Error checking shifts", e);
      }
  };
  
  // Timer Logic: Calculate Effective Time (Total - Breaks)
  useEffect(() => {
    if (runningWorkday) {
      const interval = setInterval(() => {
        const now = Date.now();
        const start = new Date(runningWorkday.clock_in_time).getTime();
        let totalBreakTime = 0;
        
        breakLogs.forEach(b => {
            const bStart = new Date(b.start_time).getTime();
            const bEnd = b.end_time ? new Date(b.end_time).getTime() : now;
            totalBreakTime += (bEnd - bStart);
        });

        setElapsedWorkdayTime(now - start - totalBreakTime);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [runningWorkday, breakLogs]);

  useEffect(() => {
    if (runningWorkday && !currentActivity && !isOnBreak) {
      getLocation(); // Get location immediately when in travel mode
    }
  }, [runningWorkday, currentActivity, isOnBreak, getLocation]);
  
  const sortedLocations = useMemo(() => {
    if (!position) return locations;
    return [...locations].sort((a,b) => 
        getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, a.latitude, a.longitude) - 
        getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, b.latitude, b.longitude)
    );
  }, [position, locations]);

  // CLOCK IN HANDLER (Called from Modal)
  const handleClockInConfirm = async (data: { workType: WorkType; workMode: WorkMode; photoUrl: string }) => {
    if (!auth?.employee) return;
    setIsSubmitting('workday-in');
    try {
      await clockIn(
          auth.employee.employee_id, 
          undefined, 
          position?.coords.latitude, 
          position?.coords.longitude,
          data.workType,
          data.workMode,
          data.photoUrl
      );
      setIsClockInModalOpen(false);
      fetchData();
    } catch (e) {
        alert("Error al iniciar jornada.");
        console.error(e);
    } finally { setIsSubmitting(false); }
  };

  const handleOpenClockOutModal = () => {
    if (!runningWorkday) return;
    
    // Safety check: Close active activities/breaks before clocking out
    if (currentActivity) {
        alert("Debes salir del establecimiento antes de finalizar la jornada.");
        return;
    }
    if (currentBreak) {
        alert("Debes reanudar el trabajo (finalizar pausa) antes de terminar el día.");
        return;
    }
    
    setIsForgottenClockOut(false);
    setSuggestedEndTime(undefined);
    setIsClockOutModalOpen(true);
  };

  const handleClockOutConfirm = async (customTime?: string) => {
    if (!auth?.employee || !runningWorkday) return;

    setIsSubmitting('workday-out');
    try {
      await clockOut(runningWorkday.entry_id, undefined, false, customTime);
      setIsClockOutModalOpen(false);
      fetchData();
    } catch(e) {
        alert("Error al registrar salida.");
        console.error(e);
    } finally { setIsSubmitting(false); }
  };
  
  // Break Handlers
  const handleStartBreak = async (type: string) => {
      if (!runningWorkday) return;
      setIsSubmitting('break-start');
      try {
          await startBreak(runningWorkday.entry_id, type);
          fetchData();
      } finally { setIsSubmitting(false); }
  };

  const handleEndBreak = async () => {
      if (!currentBreak) return;
      setIsSubmitting('break-end');
      try {
          await endBreak(currentBreak.break_id);
          fetchData();
      } finally { setIsSubmitting(false); }
  };


  // Location Check In
  const handleCheckInAttempt = async (locationId: string) => {
    if (!auth?.employee || !runningWorkday || !position) {
        alert("Esperando señal GPS...");
        getLocation();
        return;
    }
    
    if (isOnBreak) {
        alert("Estás en pausa. Reanuda el trabajo para fichar en un sitio.");
        return;
    }

    const location = locations.find(l => l.location_id === locationId);
    if (!location) return;

    setIsSubmitting(`location-in-${locationId}`);
    try {
        const distance = getDistanceFromLatLonInMeters(
            position.coords.latitude, 
            position.coords.longitude, 
            location.latitude, 
            location.longitude
        );

        if (distance > 200) { // Hard limit 200m as requested
            // BLOCK and LOG FAILURE
            await logAccessAttempt({
                employee_id: auth.employee.employee_id,
                location_id: location.location_id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                was_allowed: false,
                denial_reason: `Distancia excesiva: ${Math.round(distance)}m > 200m`
            });
            alert(`No puedes fichar aquí. Estás a ${Math.round(distance)} metros del establecimiento (Límite: 200m). Se ha registrado el intento.`);
        } else {
            // ALLOW
            await logAccessAttempt({
                employee_id: auth.employee.employee_id,
                location_id: location.location_id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                was_allowed: true,
            });

            await checkInToLocation(
                runningWorkday.entry_id, 
                auth.employee.employee_id, 
                locationId, 
                position.coords.latitude, 
                position.coords.longitude
            );
            fetchData();
        }
    } catch(e) {
        console.error("Error during check-in attempt", e);
        alert("Error técnico al intentar fichar.");
    } finally { 
        setIsSubmitting(false); 
    }
  }

  const handleCheckOut = async () => {
    if (!currentActivity) return;
    setIsSubmitting(`location-out-${currentActivity.activity_id}`);
    try {
        await checkOutOfLocation(currentActivity.activity_id);
        fetchData();
    } finally { setIsSubmitting(false); }
  }

  const timelineItems = useMemo((): TimelineItem[] => {
    if (!runningWorkday) return [];

    const items: (TimelineItem & { sortTime: Date })[] = [];
    
    // Start
    const startTime = new Date(runningWorkday.clock_in_time);
    items.push({ type: 'WORKDAY_START', time: startTime, entry: runningWorkday, sortTime: startTime });

    // Locations
    activityLogs.forEach(log => {
        const checkInTime = new Date(log.check_in_time);
        items.push({ type: 'LOCATION_CHECK_IN', time: checkInTime, log: log, sortTime: checkInTime });
        if (log.check_out_time) {
            const checkOutTime = new Date(log.check_out_time);
            items.push({ type: 'LOCATION_CHECK_OUT', time: checkOutTime, log: log, sortTime: checkOutTime });
        }
    });

    // Breaks
    breakLogs.forEach(log => {
        const st = new Date(log.start_time);
        items.push({ type: 'BREAK_START', time: st, log, sortTime: st });
        if (log.end_time) {
            const et = new Date(log.end_time);
            items.push({ type: 'BREAK_END', time: et, log, sortTime: et });
        }
    });

    return items.sort((a, b) => a.sortTime.getTime() - b.sortTime.getTime());
  }, [runningWorkday, activityLogs, breakLogs]);
  
  const renderTimeline = () => (
    <div className="mt-6 flow-root">
        <ul className="-mb-8">
            {timelineItems.map((item, itemIdx) => {
                const isLast = itemIdx === timelineItems.length - 1;
                let content;
                let colorClass = 'bg-gray-400';
                let icon = <DotIcon className="w-5 h-5 text-white" />;

                switch (item.type) {
                    case 'WORKDAY_START':
                        content = <><p className="font-semibold text-green-600">Inicio Jornada ({runningWorkday?.work_type})</p><p className="text-sm text-gray-500">{formatTime(item.time)}</p></>;
                        colorClass = 'bg-green-500';
                        icon = <FlagIcon className="w-5 h-5 text-white" />;
                        break;
                    case 'LOCATION_CHECK_IN':
                        const locNameIn = locations.find(l => l.location_id === item.log.location_id)?.name;
                        content = <><p className="font-semibold text-blue-600">Entrada: {locNameIn}</p><p className="text-sm text-gray-500">{formatTime(item.time)}</p></>;
                        colorClass = 'bg-blue-500';
                        icon = <BuildingIcon className="w-5 h-5 text-white" />;
                        break;
                    case 'LOCATION_CHECK_OUT':
                        const locNameOut = locations.find(l => l.location_id === item.log.location_id)?.name;
                        content = <><p className="font-semibold text-orange-600">Salida: {locNameOut}</p><p className="text-sm text-gray-500">{formatTime(item.time)}</p></>;
                        colorClass = 'bg-orange-500';
                        icon = <CarIcon className="w-5 h-5 text-white" />;
                        break;
                    case 'BREAK_START':
                        content = <><p className="font-semibold text-gray-600">Pausa ({item.log.break_type})</p><p className="text-sm text-gray-500">{formatTime(item.time)}</p></>;
                        colorClass = 'bg-gray-500';
                        break;
                    case 'BREAK_END':
                        content = <><p className="font-semibold text-gray-800">Fin de Pausa</p><p className="text-sm text-gray-500">{formatTime(item.time)}</p></>;
                        colorClass = 'bg-gray-700';
                        break;
                }

                return (
                    <li key={itemIdx}>
                        <div className="relative pb-8">
                            {!isLast ? <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" /> : null}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white ${colorClass}`}>
                                        {icon}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                    <div>{content}</div>
                                </div>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    </div>
  );


  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="text-center">
          {runningWorkday ? (
            <>
              <p className="text-lg text-gray-600">Jornada en curso ({runningWorkday.work_type})</p>
              
              {isOnBreak ? (
                  <div className="my-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xl font-bold text-yellow-800 mb-2">⏸ EN PAUSA</p>
                      <Button onClick={handleEndBreak} variant="primary" size="lg" isLoading={isSubmitting === 'break-end'}>
                          Reanudar Trabajo
                      </Button>
                  </div>
              ) : (
                 <div className="my-4">
                    <p className="text-5xl font-bold text-gray-800 mb-2">{formatDuration(elapsedWorkdayTime)}</p>
                    <p className="text-xs text-gray-500">Tiempo de trabajo efectivo</p>
                 </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                  {!isOnBreak && (
                    <>
                        <Button onClick={() => handleStartBreak('descanso')} variant="secondary" className="bg-gray-600 hover:bg-gray-700" isLoading={isSubmitting === 'break-start'}>
                            ☕ Pausa Café
                        </Button>
                         <Button onClick={() => handleStartBreak('comida')} variant="secondary" className="bg-gray-600 hover:bg-gray-700" isLoading={isSubmitting === 'break-start'}>
                            🍽 Comida
                        </Button>
                    </>
                  )}
                  <Button onClick={handleOpenClockOutModal} variant="danger" isLoading={isSubmitting === 'workday-out'}>
                    Finalizar Jornada
                  </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg text-gray-600">Bienvenido, {auth?.employee?.first_name}.</p>
              <Button onClick={() => setIsClockInModalOpen(true)} variant="success" size="lg" className="w-full my-4 sm:w-auto">
                Iniciar Jornada
              </Button>
            </>
          )}
        </div>
      </Card>

      {runningWorkday && (
        <Card title="Mi Día de Hoy">
            {timelineItems.length > 0 && renderTimeline()}
            
            <div className="mt-4 pt-4 border-t">
              {currentActivity ? (
                  <div className="text-center space-y-2">
                      <p className="font-semibold text-lg">Actualmente en <span className="text-primary">{locations.find(l => l.location_id === currentActivity.location_id)?.name}</span></p>
                      <Button onClick={handleCheckOut} variant="secondary" size="lg" isLoading={isSubmitting === `location-out-${currentActivity.activity_id}`}>
                        Registrar Salida de Establecimiento
                      </Button>
                  </div>
              ) : !isOnBreak ? (
                  <div className="space-y-4">
                      <p className="text-center font-semibold text-lg text-orange-600">En Desplazamiento</p>
                       <div className="space-y-2 pt-2">
                          <h4 className="font-semibold text-center text-gray-700">Registrar Entrada en Establecimiento</h4>
                          {sortedLocations.length > 0 ? (
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               {sortedLocations.map(loc => {
                                 const dist = position ? getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, loc.latitude, loc.longitude) : Infinity;
                                 const isFar = dist > 200; // Hard limit 200m

                                 return (
                                 <button 
                                    key={loc.location_id} 
                                    onClick={() => handleCheckInAttempt(loc.location_id)} 
                                    disabled={isSubmitting !== false}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                        isFar ? 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100' : 'bg-white border-primary text-primary hover:bg-blue-50'
                                    }`}
                                 >
                                    <div className="flex items-center">
                                        <LocationIcon /> 
                                        <span className="ml-2 font-medium text-left">{loc.name}</span>
                                    </div>
                                    {position && (
                                        <span className="text-xs ml-2 whitespace-nowrap">
                                            {dist > 1000 ? `${(dist/1000).toFixed(1)} km` : `${Math.round(dist)} m`}
                                        </span>
                                    )}
                                 </button>
                               )})}
                             </div>
                          ) : (
                            <p className="text-sm text-center text-gray-500">No se encontraron establecimientos configurados.</p>
                          )}
                       </div>
                  </div>
              ) : (
                  <p className="text-center text-gray-500 italic">Opciones de ubicación deshabilitadas durante la pausa.</p>
              )}
            </div>
        </Card>
      )}

      {/* Clock In Modal */}
      {isClockInModalOpen && (
          <ClockInModal 
            isOpen={isClockInModalOpen}
            onClose={() => setIsClockInModalOpen(false)}
            onConfirm={handleClockInConfirm}
            isLoading={isSubmitting === 'workday-in'}
          />
      )}

      {/* Clock Out Modal (Standard & Forgotten) */}
      {isClockOutModalOpen && (
          <ClockOutModal
            isOpen={isClockOutModalOpen}
            onClose={() => setIsClockOutModalOpen(false)}
            onConfirm={handleClockOutConfirm}
            isLoading={isSubmitting === 'workday-out'}
            defaultTime={suggestedEndTime}
            isForgotten={isForgottenClockOut}
          />
      )}
    </div>
  );
};

export default TimesheetsView;
