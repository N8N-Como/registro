
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../App';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getLocations, getTimeEntriesForEmployee, clockIn, clockOut, getActivityLogsForTimeEntry, checkInToLocation, checkOutOfLocation, getBreaksForTimeEntry, startBreak, endBreak } from '../../services/mockApi';
// Added getDistanceFromLatLonInMeters to imports to replace inline require() call
import { formatDuration, getDistanceFromLatLonInMeters } from '../../utils/helpers';
import { TimeEntry, Location as OfficeLocation, ActivityLog, BreakLog, WorkType, WorkMode } from '../../types';
import { addToQueue } from '../../services/offlineManager';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import { BuildingIcon, LocationIcon, CarIcon } from '../icons';
import ClockInModal from './ClockInModal';
import ClockOutModal from './ClockOutModal';

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
  
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);

  const runningWorkday = useMemo(() => timeEntries.find(t => t.status === 'running'), [timeEntries]);
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
      } else {
        setActivityLogs([]);
        setBreakLogs([]);
      }
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  }, [auth?.employee]);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  useEffect(() => {
    if (runningWorkday) {
      const interval = setInterval(() => {
        const now = Date.now();
        const start = new Date(runningWorkday.clock_in_time).getTime();
        
        // REGLA: Sólo descontamos las pausas de tipo 'comida'
        // Las de tipo 'descanso' (café) cuentan como tiempo trabajado retribuido
        let deductibleBreakTime = 0;
        breakLogs.forEach(b => {
            if (b.break_type === 'comida') {
                const bStart = new Date(b.start_time).getTime();
                const bEnd = b.end_time ? new Date(b.end_time).getTime() : now;
                deductibleBreakTime += (bEnd - bStart);
            }
        });

        setElapsedWorkdayTime(now - start - deductibleBreakTime);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [runningWorkday, breakLogs]);

  const handleClockInConfirm = async (data: any) => {
    if (!auth?.employee) return;
    setIsSubmitting('workday-in');
    try {
      const entry = await clockIn(auth.employee.employee_id, undefined, position?.coords.latitude, position?.coords.longitude, data.workType, data.workMode, data.deviceData, data.customTime);
      setTimeEntries(prev => [entry, ...prev]);
      setIsClockInModalOpen(false);
      await fetchData();
    } catch (e: any) {
        if (e.message === "Offline") {
            addToQueue('CLOCK_IN', { employeeId: auth.employee.employee_id, latitude: position?.coords.latitude, longitude: position?.coords.longitude, workType: data.workType, workMode: data.workMode, deviceData: data.deviceData, customTime: data.customTime });
            setIsClockInModalOpen(false);
            fetchData();
        }
    } finally { setIsSubmitting(false); }
  };

  const handleClockOutConfirm = async (customTime?: string, deviceData?: any) => {
    if (!auth?.employee || !runningWorkday) return;
    if (currentBreak) { alert("Debes finalizar el descanso/comida antes de salir."); return; }
    setIsSubmitting('workday-out');
    try {
      await clockOut(runningWorkday.entry_id, undefined, false, customTime, deviceData);
      setIsClockOutModalOpen(false);
      await fetchData();
    } catch (e: any) {
        if (e.message === "Offline") {
            addToQueue('CLOCK_OUT', { entryId: runningWorkday.entry_id, customTime, deviceData });
            setIsClockOutModalOpen(false);
            fetchData();
        }
    } finally { setIsSubmitting(false); }
  };

  const handleStartBreak = async (type: 'descanso' | 'comida') => {
      if (!runningWorkday) return;
      try {
          await startBreak(runningWorkday.entry_id, type);
          fetchData();
      } catch (e: any) { if(e.message === "Offline") addToQueue('UPDATE_ROOM_STATUS' as any, {}); /* Fallback offline break stub */ }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="text-center py-4">
          {runningWorkday ? (
            <>
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-1">Jornada Activa • {runningWorkday.work_type}</p>
              {currentBreak ? (
                  <div className="my-6 p-6 bg-amber-50 rounded-2xl border-2 border-amber-200 shadow-inner">
                      <p className="text-2xl font-black text-amber-800 mb-4 uppercase italic">⏸ {currentBreak.break_type === 'comida' ? 'Comiendo' : 'En Pausa'}</p>
                      <Button onClick={async () => { await endBreak(currentBreak.break_id); fetchData(); }} size="lg" className="shadow-lg">Reanudar Jornada</Button>
                  </div>
              ) : (
                 <div className="my-6">
                    <p className="text-6xl font-black text-primary tracking-tighter tabular-nums mb-1">{formatDuration(elapsedWorkdayTime)}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Horas Efectivas Hoy</p>
                 </div>
              )}
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                  {!currentBreak && (
                    <>
                        <button onClick={() => handleStartBreak('descanso')} className="flex-1 min-w-[140px] py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold border-b-4 border-gray-300 active:translate-y-1 active:border-b-0 transition-all hover:bg-gray-200">☕ Pausa Corta</button>
                        <button onClick={() => handleStartBreak('comida')} className="flex-1 min-w-[140px] py-3 px-4 bg-orange-50 text-orange-700 rounded-xl font-bold border-b-4 border-orange-200 active:translate-y-1 active:border-b-0 transition-all hover:bg-orange-100">🍱 Salir a Comer</button>
                    </>
                  )}
                  <Button onClick={() => setIsClockOutModalOpen(true)} variant="danger" className="w-full sm:w-auto px-10">Finalizar Día</Button>
              </div>
            </>
          ) : (
            <div className="py-8">
              <p className="text-xl font-bold text-gray-800 mb-6">Hola, {auth?.employee?.first_name}. <br/><span className="text-sm font-normal text-gray-500">¿Empezamos el turno?</span></p>
              <Button onClick={() => setIsClockInModalOpen(true)} variant="success" size="lg" className="w-full sm:w-64 h-20 text-xl shadow-2xl rounded-2xl transform hover:scale-105 transition-all">INICIAR JORNADA</Button>
            </div>
          )}
        </div>
      </Card>

      {runningWorkday && !currentBreak && (
        <Card title="Entrada a Establecimiento" className="border-t-4 border-primary shadow-lg">
            {currentActivity ? (
                <div className="text-center py-10 bg-blue-50/50 rounded-2xl border-2 border-dashed border-blue-200">
                    <BuildingIcon className="w-16 h-16 text-primary mx-auto mb-4 opacity-80" />
                    <p className="font-black text-2xl text-primary uppercase tracking-tight">Estás en {locations.find(l => l.location_id === currentActivity.location_id)?.name}</p>
                    <p className="text-xs text-blue-400 font-bold mt-1 uppercase">Entrada registrada a las {new Date(currentActivity.check_in_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    <Button onClick={async () => { await checkOutOfLocation(currentActivity.activity_id); fetchData(); }} variant="secondary" size="lg" className="mt-8 px-10 shadow-md">Registrar Salida</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {locations.map(loc => {
                        // Fix: Replaced CommonJS require call with imported ES function for getDistanceFromLatLonInMeters
                        const dist = position ? getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, loc.latitude, loc.longitude) : Infinity;
                        const isNear = dist <= 250;
                        return (
                            <button key={loc.location_id} onClick={async () => {
                                if (!isNear) { alert(`Demasiado lejos (${Math.round(dist)}m). Debes estar a menos de 250m.`); return; }
                                await checkInToLocation(runningWorkday.entry_id, auth!.employee!.employee_id, loc.location_id, position!.coords.latitude, position!.coords.longitude);
                                fetchData();
                            }} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${isNear ? 'bg-white border-primary text-primary hover:bg-primary/5 shadow-md' : 'bg-gray-50 border-gray-100 text-gray-300 opacity-60'}`}>
                                <div className="text-left"><p className="font-black uppercase text-sm tracking-tight">{loc.name}</p><p className="text-[10px] font-bold opacity-60">{loc.address}</p></div>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isNear ? 'bg-primary text-white' : 'bg-gray-200'}`}>{position ? `${Math.round(dist)}m` : '---'}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </Card>
      )}

      {isClockInModalOpen && <ClockInModal isOpen={isClockInModalOpen} onClose={() => setIsClockInModalOpen(false)} onConfirm={handleClockInConfirm} isLoading={isSubmitting === 'workday-in'} />}
      {isClockOutModalOpen && <ClockOutModal isOpen={isClockOutModalOpen} onClose={() => setIsClockOutModalOpen(false)} onConfirm={handleClockOutConfirm} isLoading={isSubmitting === 'workday-out'} isForgotten={false} />}
    </div>
  );
};

export default TimesheetsView;
