
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../App';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getTimeEntriesForEmployee, clockIn, clockOut, getBreaksForTimeEntry, startBreak, endBreak } from '../../services/mockApi';
import { formatDuration } from '../../utils/helpers';
import { TimeEntry, BreakLog } from '../../types';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import ClockInModal from './ClockInModal';
import ClockOutModal from './ClockOutModal';
import TimeCorrectionModal from './TimeCorrectionModal';

const TimesheetsView: React.FC = () => {
  const auth = useContext(AuthContext);
  const { position, getLocation } = useGeolocation();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [breakLogs, setBreakLogs] = useState<BreakLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | false>(false);
  const [elapsedWorkdayTime, setElapsedWorkdayTime] = useState(0);
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [isClockOutModalOpen, setIsClockOutModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);

  const runningWorkday = useMemo(() => timeEntries.find(t => t.status === 'running'), [timeEntries]);
  const currentBreak = useMemo(() => breakLogs.find(b => !b.end_time), [breakLogs]);

  const fetchData = useCallback(async () => {
    if (!auth?.employee) return;
    try {
      const entries = await getTimeEntriesForEmployee(auth.employee.employee_id);
      setTimeEntries(entries);
      const rw = entries.find(t => t.status === 'running');
      if (rw) {
        const breaks = await getBreaksForTimeEntry(rw.entry_id);
        setBreakLogs(breaks); 
        setIsOnBreak(breaks.some(b => !b.end_time));
      }
    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsLoading(false); 
    }
  }, [auth?.employee]);

  useEffect(() => { 
    fetchData();
    getLocation(); 
  }, [fetchData, getLocation]);
  
  useEffect(() => {
    if (runningWorkday) {
      const i = setInterval(() => {
        const now = Date.now();
        const start = new Date(runningWorkday.clock_in_time).getTime();
        const bt = breakLogs.reduce((acc, b) => acc + ((b.end_time ? new Date(b.end_time).getTime() : now) - new Date(b.start_time).getTime()), 0);
        setElapsedWorkdayTime(now - start - bt);
      }, 1000);
      return () => clearInterval(i);
    }
  }, [runningWorkday, breakLogs]);

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="text-center">
          {runningWorkday ? (
            <>
              <p className="text-lg text-gray-600">En curso ({runningWorkday.work_type})</p>
              <p className="text-5xl font-bold my-4">{formatDuration(elapsedWorkdayTime)}</p>
              <div className="flex justify-center gap-3">
                {isOnBreak ? <Button onClick={async () => { setIsSubmitting('b'); if (currentBreak) await endBreak(currentBreak.break_id); fetchData(); setIsSubmitting(false); }}>Reanudar</Button> : <Button onClick={async () => { setIsSubmitting('b'); await startBreak(runningWorkday.entry_id, 'descanso'); fetchData(); setIsSubmitting(false); }}>Pausa</Button>}
                <Button variant="danger" onClick={() => setIsClockOutModalOpen(true)}>Terminar</Button>
              </div>
            </>
          ) : <Button onClick={() => setIsClockInModalOpen(true)} variant="success" size="lg">Iniciar Jornada</Button>}
        </div>
      </Card>
      <div className="text-right"><button onClick={() => setIsCorrectionModalOpen(true)} className="text-xs text-blue-600">¿Error? Solicitar corrección</button></div>
      {isClockInModalOpen && <ClockInModal isOpen={isClockInModalOpen} onClose={() => setIsClockInModalOpen(false)} onConfirm={async (d) => { if (auth?.employee) { setIsSubmitting('in'); try { await clockIn(auth.employee.employee_id, null, position?.coords.latitude, position?.coords.longitude, d.workType, d.workMode, d.deviceData, d.customTime); fetchData(); setIsClockInModalOpen(false); } catch (e: any) { console.error("Clock In failed", e); const msg = e.message || ""; if (msg.includes("column")) { alert("Error de base de datos: Faltan columnas en la tabla 'time_entries'. Por favor, ve a la sección de ADMINISTRACIÓN y pulsa en 'Actualizar BD (SQL)' para ejecutar el script de migración."); } else { alert("Error al iniciar la jornada: " + msg); } } setIsSubmitting(false); } }} isLoading={isSubmitting==='in'} />}
      {isClockOutModalOpen && <ClockOutModal isOpen={isClockOutModalOpen} onClose={() => setIsClockOutModalOpen(false)} onConfirm={async (t) => { if (runningWorkday) { setIsSubmitting('out'); try { await clockOut(runningWorkday.entry_id, null, false, t); fetchData(); setIsClockOutModalOpen(false); } catch (e) { console.error("Clock Out failed", e); alert("Error al registrar salida."); } setIsSubmitting(false); } }} isLoading={isSubmitting==='out'} isForgotten={false} />}
      {isCorrectionModalOpen && auth?.employee && <TimeCorrectionModal isOpen={isCorrectionModalOpen} onClose={() => setIsCorrectionModalOpen(false)} employeeId={auth.employee.employee_id} />}
    </div>
  );
};

export default TimesheetsView;
