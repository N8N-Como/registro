import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../App';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getLocations, getTimeEntriesForEmployee, clockIn, clockOut, getActivityLogsForTimeEntry, checkInToLocation, checkOutOfLocation } from '../../services/mockApi';
import { getDistanceFromLatLonInMeters, formatDuration, formatTime } from '../../utils/helpers';
import { TimeEntry, Location as OfficeLocation, ActivityLog } from '../../types';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import Card from '../shared/Card';
import { LocationIcon, CheckIcon, CarIcon, BuildingIcon, FlagIcon, DotIcon } from '../icons';

type TimelineItem = 
    | { type: 'WORKDAY_START', time: Date, entry: TimeEntry }
    | { type: 'WORKDAY_END', time: Date, entry: TimeEntry }
    | { type: 'LOCATION_CHECK_IN', time: Date, log: ActivityLog }
    | { type: 'LOCATION_CHECK_OUT', time: Date, log: ActivityLog }
    | { type: 'TRAVEL', startTime: Date, endTime: Date };


const TimesheetsView: React.FC = () => {
  const auth = useContext(AuthContext);
  const { position, getLocation } = useGeolocation();
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | false>(false);
  const [elapsedWorkdayTime, setElapsedWorkdayTime] = useState(0);

  const runningWorkday = useMemo(() => timeEntries.find(t => t.status === 'running'), [timeEntries]);
  const currentActivity = useMemo(() => activityLogs.find(a => !a.check_out_time), [activityLogs]);

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
        const logs = await getActivityLogsForTimeEntry(currentRunningWorkday.entry_id);
        setActivityLogs(logs.sort((a,b) => new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime()));
      } else {
        setActivityLogs([]);
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
        setElapsedWorkdayTime(Date.now() - new Date(runningWorkday.clock_in_time).getTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [runningWorkday]);

  useEffect(() => {
    if (runningWorkday && !currentActivity) {
      getLocation(); // Get location immediately when in travel mode
    }
  }, [runningWorkday, currentActivity, getLocation]);
  
  const nearbyLocations = useMemo(() => {
    if (!position) return [];
    return locations.filter(loc => 
      getDistanceFromLatLonInMeters(
        position.coords.latitude,
        position.coords.longitude,
        loc.latitude,
        loc.longitude
      ) <= loc.radius_meters
    ).sort((a,b) => getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, a.latitude, a.longitude) - getDistanceFromLatLonInMeters(position.coords.latitude, position.coords.longitude, b.latitude, b.longitude));
  }, [position, locations]);

  const handleClockIn = async () => {
    if (!auth?.employee) return;
    setIsSubmitting('workday-in');
    try {
      await clockIn(auth.employee.employee_id);
      fetchData();
    } finally { setIsSubmitting(false); }
  };

  const handleClockOut = async () => {
    if (!auth?.employee || !runningWorkday) return;
    setIsSubmitting('workday-out');
    try {
      await clockOut(runningWorkday.entry_id);
      fetchData();
    } finally { setIsSubmitting(false); }
  };
  
  const handleCheckIn = async (locationId: string) => {
    if (!auth?.employee || !runningWorkday) return;
    setIsSubmitting(`location-in-${locationId}`);
    try {
        await checkInToLocation(runningWorkday.entry_id, auth.employee.employee_id, locationId);
        fetchData();
    } finally { setIsSubmitting(false); }
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
    
    // Add workday start
    const startTime = new Date(runningWorkday.clock_in_time);
    items.push({ type: 'WORKDAY_START', time: startTime, entry: runningWorkday, sortTime: startTime });

    // Add activities
    activityLogs.forEach(log => {
        const checkInTime = new Date(log.check_in_time);
        items.push({ type: 'LOCATION_CHECK_IN', time: checkInTime, log: log, sortTime: checkInTime });
        if (log.check_out_time) {
            const checkOutTime = new Date(log.check_out_time);
            items.push({ type: 'LOCATION_CHECK_OUT', time: checkOutTime, log: log, sortTime: checkOutTime });
        }
    });

    return items.sort((a, b) => a.sortTime.getTime() - b.sortTime.getTime());
  }, [runningWorkday, activityLogs]);
  
  const renderTimeline = () => (
    <div className="mt-6 flow-root">
        <ul className="-mb-8">
            {timelineItems.map((item, itemIdx) => {
                const isLast = itemIdx === timelineItems.length - 1;
                let content;
                switch (item.type) {
                    case 'WORKDAY_START':
                        content = <><p className="font-semibold text-green-600">Inicio de Jornada</p><p className="text-sm text-gray-500">{formatTime(item.time)}</p></>;
                        break;
                    case 'LOCATION_CHECK_IN':
                        const locNameIn = locations.find(l => l.location_id === item.log.location_id)?.name;
                        content = <><p className="font-semibold text-blue-600">Entrada en {locNameIn}</p><p className="text-sm text-gray-500">{formatTime(item.time)}</p></>;
                        break;
                    case 'LOCATION_CHECK_OUT':
                        const locNameOut = locations.find(l => l.location_id === item.log.location_id)?.name;
                        content = <><p className="font-semibold text-orange-600">Salida de {locNameOut}</p><p className="text-sm text-gray-500">{formatTime(item.time)}</p></>;
                        break;
                }
                
                let icon;
                switch (item.type) {
                    case 'WORKDAY_START': icon = <FlagIcon className="w-5 h-5 text-white" />; break;
                    case 'LOCATION_CHECK_IN': icon = <BuildingIcon className="w-5 h-5 text-white" />; break;
                    case 'LOCATION_CHECK_OUT': icon = <CarIcon className="w-5 h-5 text-white" />; break;
                    default: icon = <DotIcon className="w-5 h-5 text-white" />; break;
                }
                
                const iconBgColor = item.type === 'WORKDAY_START' ? 'bg-green-500' : item.type === 'LOCATION_CHECK_IN' ? 'bg-blue-500' : 'bg-orange-500';

                return (
                    <li key={itemIdx}>
                        <div className="relative pb-8">
                            {!isLast ? <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" /> : null}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white ${iconBgColor}`}>
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
              <p className="text-lg text-gray-600">Jornada en curso</p>
              <p className="text-5xl font-bold text-gray-800 my-4">{formatDuration(elapsedWorkdayTime)}</p>
              <Button onClick={handleClockOut} variant="danger" size="lg" className="w-full sm:w-auto" isLoading={isSubmitting === 'workday-out'}>
                Finalizar Jornada
              </Button>
            </>
          ) : (
            <>
              <p className="text-lg text-gray-600">Bienvenido, {auth?.employee?.first_name}.</p>
              <Button onClick={handleClockIn} variant="success" size="lg" className="w-full my-4 sm:w-auto" isLoading={isSubmitting === 'workday-in'}>
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
              ) : (
                  <div className="space-y-4">
                      <p className="text-center font-semibold text-lg text-orange-600">En Desplazamiento</p>
                       <div className="space-y-2 pt-2">
                          <h4 className="font-semibold text-center text-gray-700">Registrar Entrada en Establecimiento Cercano</h4>
                          {nearbyLocations.length > 0 ? (
                             <div className="flex flex-wrap justify-center gap-2">
                               {nearbyLocations.map(loc => (
                                 <Button key={loc.location_id} onClick={() => handleCheckIn(loc.location_id)} variant="primary" isLoading={isSubmitting === `location-in-${loc.location_id}`}>
                                    <LocationIcon /> <span className="ml-2">{loc.name}</span>
                                 </Button>
                               ))}
                             </div>
                          ) : (
                            <p className="text-sm text-center text-gray-500">No se detectan establecimientos cercanos. Acércate a uno para poder registrar tu entrada.</p>
                          )}
                       </div>
                  </div>
              )}
            </div>
        </Card>
      )}
    </div>
  );
};

export default TimesheetsView;
