
import React, { useEffect, useState, useRef, useContext } from 'react';
import { AuthContext } from '../../App';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getTimeEntriesForEmployee, getActivityLogsForTimeEntry, getWorkShifts, getLocations } from '../../services/mockApi';
import { getDistanceFromLatLonInMeters } from '../../utils/helpers';
import { Location } from '../../types';

const ComplianceMonitor: React.FC = () => {
    const auth = useContext(AuthContext);
    const { position, getLocation } = useGeolocation();
    const [locations, setLocations] = useState<Location[]>([]);
    
    const [runningWorkday, setRunningWorkday] = useState<any>(null);
    const [activeActivity, setActiveActivity] = useState<any>(null);
    const [currentShift, setCurrentShift] = useState<any>(null);
    
    // Alarms State
    const [showDistanceAlert, setShowDistanceAlert] = useState(false);
    const [showShiftEndAlert, setShowShiftEndAlert] = useState(false);
    
    // Audio Context
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initial Load & Polling for Data (Workday/Shift)
    useEffect(() => {
        if (!auth?.employee) return;

        const checkStatus = async () => {
            try {
                // 1. Get Locations
                if (locations.length === 0) {
                    const locs = await getLocations();
                    setLocations(locs);
                }

                // 2. Get Workday & Activity
                const entries = await getTimeEntriesForEmployee(auth.employee!.employee_id);
                const running = entries.find(e => e.status === 'running');
                setRunningWorkday(running);

                if (running) {
                    const logs = await getActivityLogsForTimeEntry(running.entry_id);
                    const active = logs.find(l => !l.check_out_time);
                    setActiveActivity(active);
                } else {
                    setActiveActivity(null);
                }

                // 3. Get Shift
                const today = new Date();
                today.setHours(0,0,0,0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                
                const shifts = await getWorkShifts(today.toISOString(), tomorrow.toISOString());
                const myShift = shifts.find(s => s.employee_id === auth.employee!.employee_id);
                setCurrentShift(myShift);

            } catch (e) {
                console.error("Compliance Monitor Error", e);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check DB every 30s
        return () => clearInterval(interval);
    }, [auth?.employee, locations.length]);

    // GPS & Logic Loop (Every 1 min)
    useEffect(() => {
        if (!runningWorkday) return;

        const runComplianceChecks = () => {
            getLocation(); // Request fresh GPS
            
            // Allow GPS to update then check
            setTimeout(() => {
                if (!position) return;

                // 1. Distance Check (If checked in to a location)
                if (activeActivity) {
                    const loc = locations.find(l => l.location_id === activeActivity.location_id);
                    if (loc) {
                        const dist = getDistanceFromLatLonInMeters(
                            position.coords.latitude, position.coords.longitude,
                            loc.latitude, loc.longitude
                        );
                        
                        if (dist > 150) {
                            triggerAlarm('distance');
                        }
                    }
                }

                // 2. Shift End Check
                if (currentShift && runningWorkday) {
                    const now = new Date();
                    const endTime = new Date(currentShift.end_time);
                    // If we are past end time by > 5 mins and still working
                    if (now > endTime && (now.getTime() - endTime.getTime()) > 5 * 60 * 1000) {
                        triggerAlarm('shift_end');
                    }
                }

            }, 2000);
        };

        const interval = setInterval(runComplianceChecks, 60000 * 10); // Run every 10 mins as requested for alarms
        // Initial run delayed
        const timeout = setTimeout(runComplianceChecks, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [runningWorkday, activeActivity, currentShift, position, locations, getLocation]);

    const triggerAlarm = (type: 'distance' | 'shift_end') => {
        // Play Sound
        if (!audioRef.current) {
            audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        }
        audioRef.current.play().catch(e => console.log("Audio autoplay blocked", e));

        if (type === 'distance') setShowDistanceAlert(true);
        if (type === 'shift_end') setShowShiftEndAlert(true);
    };

    if (!showDistanceAlert && !showShiftEndAlert) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {showDistanceAlert && (
                <div className="bg-red-600 text-white p-4 rounded-lg shadow-xl animate-bounce flex items-center justify-between max-w-sm">
                    <div>
                        <p className="font-bold text-lg">⚠️ ALERTA DE UBICACIÓN</p>
                        <p className="text-sm">Te has alejado del establecimiento sin registrar la salida.</p>
                        <p className="text-xs mt-1">Por favor, registra la salida en el panel.</p>
                    </div>
                    <button onClick={() => setShowDistanceAlert(false)} className="ml-4 bg-white text-red-600 px-3 py-1 rounded font-bold">OK</button>
                </div>
            )}
            {showShiftEndAlert && (
                <div className="bg-orange-500 text-white p-4 rounded-lg shadow-xl flex items-center justify-between max-w-sm">
                    <div>
                        <p className="font-bold text-lg">🕒 FIN DE TURNO</p>
                        <p className="text-sm">Tu turno ha finalizado. Recuerda fichar la salida cerca del centro de trabajo.</p>
                    </div>
                    <button onClick={() => setShowShiftEndAlert(false)} className="ml-4 bg-white text-orange-600 px-3 py-1 rounded font-bold">OK</button>
                </div>
            )}
        </div>
    );
};

export default ComplianceMonitor;
