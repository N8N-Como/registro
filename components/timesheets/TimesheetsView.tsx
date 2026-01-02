
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../App';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getLocations, getTimeEntriesForEmployee, clockIn, clockOut, getActivityLogsForTimeEntry, checkInToLocation, checkOutOfLocation, logAccessAttempt, getBreaksForTimeEntry, startBreak, endBreak } from '../../services/mockApi';
import { getDistanceFromLatLonInMeters, formatDuration, formatTime } from '../../utils/helpers';
import { TimeEntry, Location as OfficeLocation, ActivityLog, BreakLog, WorkType, WorkMode } from '../../types';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import { LocationIcon, CarIcon, BuildingIcon, FlagIcon, DotIcon, ReportIcon } from '../icons';
import ClockInModal from './ClockInModal';
import ClockOutModal from './ClockOutModal';
import TimeCorrectionModal from './TimeCorrectionModal';

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
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);

  const runningWorkday = useMemo(() => timeEntries.find(t => t.status === 'running'), [timeEntries]);
  const currentActivity = useMemo(() => activityLogs.find(a => !a.check_out_time), [activityLogs]);
  const currentBreak = useMemo(() => breakLogs.find(b => !b.end_time), [breakLogs]);

  const fetchData = useCallback(async () => {
    if (!auth?.employee) return;
    try {
      const [entries, locs] = await Promise.all([getTimeEntriesForEmployee(auth.employee.employee_id), getLocations()]);
      setTimeEntries(entries); setLocations(locs);
      const rw = entries.find(t => t.status === 'running');
      if (rw) {
        const [logs, breaks] = await Promise.all([getActivityLogsForTimeEntry(rw.entry_id), getBreaksForTimeEntry(rw.entry_id)]);
        setActivityLogs(logs); setBreakLogs(breaks); setIsOnBreak(breaks.some(b => !b.end_time));
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, [auth?.employee]);

  useEffect(() => { fetchData(); }, [fetchData]);
  
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
      {isClockInModalOpen && <ClockInModal isOpen={isClockInModalOpen} onClose={() => setIsClockInModalOpen(false)} onConfirm={async (d) => { if (auth?.employee) { setIsSubmitting('in'); await clockIn(auth.employee.employee_id, null, position?.coords.latitude, position?.coords.longitude, d.workType, d.workMode, d.deviceData, d.customTime); fetchData(); setIsClockInModalOpen(false); setIsSubmitting(false); } }} isLoading={isSubmitting==='in'} />}
      {isClockOutModalOpen && <ClockOutModal isOpen={isClockOutModalOpen} onClose={() => setIsClockOutModalOpen(false)} onConfirm={async (t) => { if (runningWorkday) { setIsSubmitting('out'); await clockOut(runningWorkday.entry_id, null, false, t); fetchData(); setIsClockOutModalOpen(false); setIsSubmitting(false); } }} isLoading={isSubmitting==='out'} isForgotten={false} />}
      {isCorrectionModalOpen && auth?.employee && <TimeCorrectionModal isOpen={isCorrectionModalOpen} onClose={() => setIsCorrectionModalOpen(false)} employeeId={auth.employee.employee_id} />}
    </div>
  );
};

export default TimesheetsView;
