
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../App';
import { getTimeEntriesForEmployee } from '../../../services/mockApi';
import { formatDuration } from '../../../utils/helpers';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';

const EmployeeStatusWidget: React.FC = () => {
    const auth = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(true);
    const [clockInTime, setClockInTime] = useState<Date | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!auth?.employee) return;
            try {
                const entries = await getTimeEntriesForEmployee(auth.employee.employee_id);
                const runningEntry = entries.find(e => e.status === 'running');
                if (runningEntry) {
                    setClockInTime(new Date(runningEntry.clock_in_time));
                } else {
                    setClockInTime(null);
                }
            } catch (error) {
                console.error("Failed to fetch employee status", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStatus();
    }, [auth?.employee]);

    const [elapsedTime, setElapsedTime] = useState(0);
    useEffect(() => {
        if (clockInTime) {
          const interval = setInterval(() => {
            setElapsedTime(Date.now() - clockInTime.getTime());
          }, 1000);
          return () => clearInterval(interval);
        }
    }, [clockInTime]);

    if (isLoading) return <Card><Spinner size="sm" /></Card>;

    return (
        <Card title="Mi Estado Actual">
            {clockInTime ? (
                <div>
                    <p className="text-lg text-green-600 font-semibold">Fichado (Entrada)</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">{formatDuration(elapsedTime)}</p>
                    <p className="text-sm text-gray-500">en curso</p>
                </div>
            ) : (
                <div>
                    <p className="text-lg text-red-600 font-semibold">Fichado (Salida)</p>
                     <p className="text-sm text-gray-500 mt-2">No estás trabajando actualmente.</p>
                </div>
            )}
        </Card>
    );
};

export default EmployeeStatusWidget;
