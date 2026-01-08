
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../App';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getLocations, getTimeEntriesForEmployee, clockIn, clockOut, getActivityLogsForTimeEntry, checkInToLocation, checkOutOfLocation, logAccessAttempt, getBreaksForTimeEntry, startBreak, endBreak, getWorkShifts } from '../../services/mockApi';
import { getDistanceFromLatLonInMeters, formatDuration, formatTime } from '../../utils/helpers';
import { TimeEntry, Location as OfficeLocation, ActivityLog, BreakLog, WorkType, WorkMode, WorkShift } from '../../types';
import { addToQueue } from '../../services/offlineManager';
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
    } catch (e: any) {
        if (e.message === "Offline") {
            addToQueue('CLOCK_IN', {
                employeeId: auth.employee.employee_id,
                latitude: position?.coords.latitude,
                longitude: position?.coords.longitude,
                workType: data.workType,
                workMode: data.workMode,
                deviceData: data.deviceData,
                customTime: data.customTime
            });
            alert("Jornada iniciada localmente (Modo Offline).");
            setIsClockInModalOpen(false);
            fetchData();
        } else {
            alert("Error al iniciar jornada.");
        }
    } finally { setIsSubmitting(false); }
  };

  const handleClockOutConfirm = async (customTime?: string, deviceData?: any) => {
    if (!auth?.employee || !runningWorkday) return;
    setIsSubmitting('workday-out');
    try {
      await clockOut(runningWorkday.entry_id, undefined, false, customTime, deviceData);
      setIsClockOutModalOpen(false);
      await fetchData();
    } catch (e: any) {
        if (e.message === "Offline") {
            addToQueue('CLOCK_OUT', { entryId: runningWorkday.entry_id, customTime, deviceData });
            alert("Jornada finalizada localmente (Modo Offline).");
            setIsClockOutModalOpen(false);
            fetchData();
        }
    } finally { setIsSubmitting(false); }
  };

  const handleCheckInAttempt = async (locationId: string) => {
    if (!position) {
        alert("Buscando señal GPS...");
        getLocation();
        return;
    }

    const location = locations.find(l => l.location_id === locationId);
    if (!location) return;

    setIsSubmitting(`location-in-${locationId}`);
    try {
        const distance = getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, location.latitude, location.longitude);
        if (distance > 250) { 
            alert(`No puedes fichar aquí. Estás a ${Math.round(distance)} metros del establecimiento.`);
        } else {
            await checkInToLocation(runningWorkday!.entry_id, auth!.employee!.employee_id, locationId, position.coords.latitude, position.coords.longitude);
            await fetchData();
        }
    } catch (e: any) {
        if (e.message === "Offline") {
            addToQueue('CHECK_IN_LOCATION', {
                timeEntryId: runningWorkday!.entry_id,
                employeeId: auth!.employee!.employee_id,
                locationId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
            alert("Entrada a establecimiento guardada localmente.");
            fetchData();
        }
    } finally { setIsSubmitting(false); }
  }

  const handleCheckOut = async () => {
    if (!currentActivity) return;
    setIsSubmitting(`location-out-${currentActivity.activity_id}`);
    try {
        await checkOutOfLocation(currentActivity.activity_id);
        await fetchData();
    } catch (e: any) {
        if (e.message === "Offline") {
            addToQueue('CHECK_OUT_LOCATION', { activityId: currentActivity.activity_id });
            alert("Salida de establecimiento guardada localmente.");
            fetchData();
        }
    } finally { setIsSubmitting(false); }
  }

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
                      <Button onClick={async () => { try { await endBreak(currentBreak!.break_id); fetchData(); } catch(e: any) { if(e.message === "Offline") alert("Pausa finalizada localmente."); } }} variant="primary" size="lg">Reanudar Trabajo</Button>
                  </div>
              ) : (
                 <div className="my-4">
                    <p className="text-5xl font-black text-primary mb-2 tracking-tighter">{formatDuration(elapsedWorkdayTime)}</p>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Tiempo efectivo</p>
                 </div>
              )}
              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                  {!isOnBreak && (
                    <Button onClick={async () => { try { await startBreak(runningWorkday.entry_id, 'descanso'); fetchData(); } catch(e: any) { if(e.message === "Offline") alert("Pausa iniciada localmente."); } }} variant="secondary" className="bg-gray-600">☕ Pausa</Button>
                  )}
                  <Button onClick={() => setIsClockOutModalOpen(true)} variant="danger">Finalizar Jornada</Button>
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
        <Card title="Fichaje Establecimiento" className="border-t-4 border-primary">
            {currentActivity ? (
                <div className="text-center py-6 bg-blue-50 rounded-xl border border-blue-200">
                    <BuildingIcon className="w-12 h-12 text-primary mx-auto mb-2" />
                    <p className="font-bold text-xl text-primary">En {locations.find(l => l.location_id === currentActivity.location_id)?.name}</p>
                    <Button onClick={handleCheckOut} variant="secondary" size="lg" className="mt-4" isLoading={isSubmitting === `location-out-${currentActivity.activity_id}`}>Registrar Salida</Button>
                </div>
            ) : !isOnBreak ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {locations.map(loc => {
                            const dist = position ? getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, loc.latitude, loc.longitude) : Infinity;
                            const isFar = dist > 250;
                            return (
                                <button 
                                    key={loc.location_id} 
                                    onClick={() => handleCheckInAttempt(loc.location_id)} 
                                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${isFar ? 'bg-gray-50 border-gray-100 text-gray-400 grayscale' : 'bg-white border-primary text-primary hover:scale-[1.02]'}`}
                                >
                                    <span className="font-bold text-sm">{loc.name}</span>
                                    <span className="text-[10px] font-black">{position ? `${Math.round(dist)}m` : '---'}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </Card>
      )}

      {isClockInModalOpen && <ClockInModal isOpen={isClockInModalOpen} onClose={() => setIsClockInModalOpen(false)} onConfirm={handleClockInConfirm} isLoading={isSubmitting === 'workday-in'} />}
      {isClockOutModalOpen && <ClockOutModal isOpen={isClockOutModalOpen} onClose={() => setIsClockOutModalOpen(false)} onConfirm={handleClockOutConfirm} isLoading={isSubmitting === 'workday-out'} isForgotten={isForgottenClockOut} />}
      {isCorrectionModalOpen && auth?.employee && <TimeCorrectionModal isOpen={isCorrectionModalOpen} onClose={() => setIsCorrectionModalOpen(false)} employeeId={auth.employee.employee_id} existingEntryId={runningWorkday?.entry_id} />}
    </div>
  );
};

export default TimesheetsView;
