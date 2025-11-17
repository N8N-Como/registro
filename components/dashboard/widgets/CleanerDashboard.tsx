
import React, { useState, useEffect, useContext } from 'react';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import { getTasks } from '../../../services/mockApi';
import { AuthContext } from '../../../App';
import { TaskIcon } from '../../icons';

const CleanerDashboard: React.FC = () => {
  const auth = useContext(AuthContext);
  const [tasksCount, setTasksCount] = useState({ pending: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!auth?.employee) return;
      try {
        const allTasks = await getTasks();
        const myTasks = allTasks.filter(t => t.assigned_to === auth.employee?.employee_id);
        setTasksCount({
          pending: myTasks.filter(t => t.status !== 'completed').length,
          completed: myTasks.filter(t => t.status === 'completed').length,
        });
      } catch (error) {
        console.error("Failed to fetch cleaner tasks", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, [auth?.employee]);

  if (isLoading) return <Spinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <div className="flex items-center space-x-4">
            <TaskIcon className="w-12 h-12 text-orange-500"/>
            <div>
                <p className="text-gray-500">Tareas Pendientes Hoy</p>
                <p className="text-3xl font-bold">{tasksCount.pending}</p>
            </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center space-x-4">
            <TaskIcon className="w-12 h-12 text-green-500"/>
            <div>
                <p className="text-gray-500">Tareas Completadas Hoy</p>
                <p className="text-3xl font-bold">{tasksCount.completed}</p>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default CleanerDashboard;
