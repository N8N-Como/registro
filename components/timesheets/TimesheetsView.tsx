
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../App';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getLocations, getTimeEntriesForEmployee, clockIn, clockOut, getActivityLogsForTimeEntry, checkInToLocation, checkOutOfLocation, logAccessAttempt, getBreaksForTimeEntry, startBreak, endBreak, getWorkShifts } from '../../services/mockApi';
import { getDistanceFromLatLonInMeters, formatDuration, formatTime } from '../../utils/helpers';
import { TimeEntry, Location as OfficeLocation, ActivityLog, BreakLog, WorkType, WorkMode, WorkShift } from '../../types';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import { LocationIcon, CarIcon, BuildingIcon, FlagIcon, DotIcon, ReportIcon, SparklesIcon } from '../icons';
import ClockInModal from './ClockInModal';
import ClockOutModal from './ClockOutModal';
import TimeCorrectionModal from './TimeCorrectionModal';

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
  const { position, getLocation, loading: geoLoading, error: geoError } = useGeolocation();
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | false>(false);
  const [elapsedWorkdayTime, setElapsedWorkdayTime] = useState(0);
  
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isForgottenClockOut, setIsForgottenClockOut] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [suggestedEndTime, setSuggestedEndTime] = useState<Date | undefined>(undefined);

  const runningWorkday = useMemo(() => {
    return timeEntries.find(t => t.status === 'running');
  }, [timeEntries]);

  const currentActivity = useMemo(() => activityLogs.find(a => !a.check_out_time), [activityLogs]);
  const currentBreak = useMemo(() => breakLogs.find(b => !b.end_time), [breakLogs]);

  const fetchData = useCallback(async () => {
    if (!auth?.employee) return;
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
      getLocation(); 
    }
  }, [runningWorkday, currentActivity, isOnBreak, getLocation]);
  
  const sortedLocations = useMemo(() => {
    if (!position) return locations;
    return [...locations].sort((a,b) => 
        getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, a.latitude, a.longitude) - 
        getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, b.latitude, b.longitude)
    );
  }, [position, locations]);

  const handleClockInConfirm = async (data: any) => {
    if (!auth?.employee) return;
    setIsSubmitting('workday-in');
    try {
      const entry = await clockIn(
          auth.employee.employee_id, 
          undefined, 
          position?.coords.latitude, 
          position?.coords.longitude,
          data.workType,
          data.workMode,
          data.deviceData,
          data.customTime
      );
      setTimeEntries(prev => [entry, ...prev]);
      setIsClockInModalOpen(false);
      await fetchData();
    } catch (e) {
        alert("Error al iniciar jornada.");
    } finally { setIsSubmitting(false); }
  };

  const handleOpenClockOutModal = () => {
    if (!runningWorkday) return;
    if (currentActivity) { alert("Debes salir del establecimiento antes de finalizar la jornada."); return; }
    if (currentBreak) { alert("Debes reanudar el trabajo antes de terminar el día."); return; }
    setIsClockOutModalOpen(true);
  };

  const handleClockOutConfirm = async (customTime?: string) => {
    if (!auth?.employee || !runningWorkday) return;
    setIsSubmitting('workday-out');
    try {
      await clockOut(runningWorkday.entry_id, undefined, false, customTime);
      setIsClockOutModalOpen(false);
      await fetchData();
    } finally { setIsSubmitting(false); }
  };
  
  const handleStartBreak = async (type: string) => {
      if (!runningWorkday) return;
      setIsSubmitting('break-start');
      try {
          await startBreak(runningWorkday.entry_id, type);
          await fetchData();
      } finally { setIsSubmitting(false); }
  };

  const handleEndBreak = async () => {
      if (!currentBreak) return;
      setIsSubmitting('break-end');
      try {
          await endBreak(currentBreak.break_id);
          await fetchData();
      } finally { setIsSubmitting(false); }
  };

  const handleCheckInAttempt = async (locationId: string) => {
    if (!position) {
        alert("Buscando señal GPS... Por favor, pulsa el botón 'Refrescar GPS' o asegúrate de que tienes la ubicación activada.");
        getLocation();
        return;
    }
    if (isOnBreak) { alert("Estás en pausa. Reanuda el trabajo para fichar."); return; }

    const location = locations.find(l => l.location_id === locationId);
    if (!location) return;

    setIsSubmitting(`location-in-${locationId}`);
    try {
        const distance = getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, location.latitude, location.longitude);
        if (distance > 250) { // Margen de error GPS ampliado ligeramente
            await logAccessAttempt({ employee_id: auth!.employee!.employee_id, location_id: location.location_id, latitude: position.coords.latitude, longitude: position.coords.longitude, was_allowed: false, denial_reason: `Distancia: ${Math.round(distance)}m` });
            alert(`No puedes fichar aquí. Estás a ${Math.round(distance)} metros del establecimiento.`);
        } else {
            await logAccessAttempt({ employee_id: auth!.employee!.employee_id, location_id: location.location_id, latitude: position.coords.latitude, longitude: position.coords.longitude, was_allowed: true });
            await checkInToLocation(runningWorkday!.entry_id, auth!.employee!.employee_id, locationId, position.coords.latitude, position.coords.longitude);
            await fetchData();
        }
    } finally { setIsSubmitting(false); }
  }

  const handleCheckOut = async () => {
    if (!currentActivity) return;
    setIsSubmitting(`location-out-${currentActivity.activity_id}`);
    try {
        await checkOutOfLocation(currentActivity.activity_id);
        await fetchData();
    } finally { setIsSubmitting(false); }
  }

  const timelineItems = useMemo((): TimelineItem[] => {
    if (!runningWorkday) return [];
    const items: (TimelineItem & { sortTime: Date })[] = [];
    const startTime = new Date(runningWorkday.clock_in_time);
    items.push({ type: 'WORKDAY_START', time: startTime, entry: runningWorkday, sortTime: startTime });
    activityLogs.forEach(log => {
        const cit = new Date(log.check_in_time);
        items.push({ type: 'LOCATION_CHECK_IN', time: cit, log: log, sortTime: cit });
        if (log.check_out_time) {
            const cot = new Date(log.check_out_time);
            items.push({ type: 'LOCATION_CHECK_OUT', time: cot, log: log, sortTime: cot });
        }
    });
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

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="text-center">
          {runningWorkday ? (
            <>
              <p className="text-lg text-gray-600 font-medium">Jornada en curso ({runningWorkday.work_type})</p>
              {isOnBreak ? (
                  <div className="my-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xl font-bold text-yellow-800 mb-2">⏸ EN PAUSA</p>
                      <Button onClick={handleEndBreak} variant="primary" size="lg" isLoading={isSubmitting === 'break-end'}>Reanudar Trabajo</Button>
                  </div>
              ) : (
                 <div className="my-4">
                    <p className="text-5xl font-black text-primary mb-2 tracking-tighter">{formatDuration(elapsedWorkdayTime)}</p>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Tiempo de trabajo efectivo</p>
                 </div>
              )}
              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                  {!isOnBreak && (
                    <>
                        <Button onClick={() => handleStartBreak('descanso')} variant="secondary" className="bg-gray-600 hover:bg-gray-700" isLoading={isSubmitting === 'break-start'}>☕ Pausa Café</Button>
                         <Button onClick={() => handleStartBreak('comida')} variant="secondary" className="bg-gray-600 hover:bg-gray-700" isLoading={isSubmitting === 'break-start'}>🍽 Comida</Button>
                    </>
                  )}
                  <Button onClick={handleOpenClockOutModal} variant="danger" isLoading={isSubmitting === 'workday-out'}>Finalizar Jornada</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg text-gray-600">Bienvenido, {auth?.employee?.first_name}.</p>
              <Button onClick={() => setIsClockInModalOpen(true)} variant="success" size="lg" className="w-full my-4 sm:w-auto shadow-lg">Iniciar Jornada</Button>
            </>
          )}
        </div>
      </Card>

      {runningWorkday && (
        <Card title="Ubicación y Fichaje" className="border-t-4 border-primary">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${geoLoading ? 'bg-yellow-400 animate-pulse' : position ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs font-bold text-gray-500 uppercase">
                        {geoLoading ? 'Buscando señal GPS...' : position ? 'Señal GPS OK' : 'Sin señal GPS'}
                    </span>
                </div>
                <button 
                    onClick={() => getLocation()} 
                    className="text-xs font-black text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10 hover:bg-primary/10 transition-colors flex items-center"
                >
                    <SparklesIcon className="w-3 h-3 mr-1"/> Refrescar GPS
                </button>
            </div>

            {currentActivity ? (
                <div className="text-center py-6 bg-blue-50 rounded-xl border border-blue-200">
                    <BuildingIcon className="w-12 h-12 text-primary mx-auto mb-2" />
                    <p className="font-bold text-xl text-primary">En {locations.find(l => l.location_id === currentActivity.location_id)?.name}</p>
                    <p className="text-sm text-blue-600 mb-4">Fichado a las {new Date(currentActivity.check_in_time).toLocaleTimeString()}</p>
                    <Button onClick={handleCheckOut} variant="secondary" size="lg" className="shadow-md" isLoading={isSubmitting === `location-out-${currentActivity.activity_id}`}>Registrar Salida de Establecimiento</Button>
                </div>
            ) : !isOnBreak ? (
                <div className="space-y-4">
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center">
                            <CarIcon className="w-6 h-6 text-orange-500 mr-3" />
                            <div>
                                <p className="font-bold text-orange-800">En Desplazamiento</p>
                                <p className="text-xs text-orange-600">Busca el establecimiento en la lista para fichar entrada.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sortedLocations.map(loc => {
                            const dist = position ? getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, loc.latitude, loc.longitude) : Infinity;
                            const isFar = dist > 250;
                            return (
                                <button 
                                    key={loc.location_id} 
                                    onClick={() => handleCheckInAttempt(loc.location_id)} 
                                    disabled={isSubmitting !== false} 
                                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${isFar ? 'bg-gray-50 border-gray-100 text-gray-400 grayscale' : 'bg-white border-primary text-primary hover:scale-[1.02] shadow-sm'}`}
                                >
                                    <div className="flex items-center">
                                        <BuildingIcon className={`w-5 h-5 ${isFar ? 'text-gray-300' : 'text-primary'}`} /> 
                                        <span className="ml-2 font-bold text-left text-sm">{loc.name}</span>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded ${isFar ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'}`}>
                                        {position ? (dist > 1000 ? `${(dist/1000).toFixed(1)}km` : `${Math.round(dist)}m`) : '---'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : <p className="text-center text-gray-500 italic py-4">Opciones de ubicación deshabilitadas durante la pausa.</p>}
        </Card>
      )}

      <div className="text-right">
          <button onClick={() => setIsCorrectionModalOpen(true)} className="text-xs text-blue-600 hover:underline flex items-center justify-end ml-auto font-medium">
              <ReportIcon className="w-4 h-4 mr-1" /> ¿Olvidaste fichar o hay un error? Solicitar corrección
          </button>
      </div>

      {isClockInModalOpen && <ClockInModal isOpen={isClockInModalOpen} onClose={() => setIsClockInModalOpen(false)} onConfirm={handleClockInConfirm} isLoading={isSubmitting === 'workday-in'} />}
      {isClockOutModalOpen && <ClockOutModal isOpen={isClockOutModalOpen} onClose={() => setIsClockOutModalOpen(false)} onConfirm={handleClockOutConfirm} isLoading={isSubmitting === 'workday-out'} defaultTime={suggestedEndTime} isForgotten={isForgottenClockOut} />}
      {isCorrectionModalOpen && auth?.employee && <TimeCorrectionModal isOpen={isCorrectionModalOpen} onClose={() => setIsCorrectionModalOpen(false)} employeeId={auth.employee.employee_id} existingEntryId={runningWorkday?.entry_id} />}
    </div>
  );
};

export default TimesheetsView;
