import React, { useState, useEffect } from 'react';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import { getRooms, getTasks } from '../../../services/mockApi';
import { BroomIcon, TaskIcon } from '../../icons';

const GobernantaDashboard: React.FC = () => {
  const [stats, setStats] = useState({ clean: 0, dirty: 0, pendingTasks: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [rooms, tasks] = await Promise.all([getRooms(), getTasks()]);
        setStats({
          clean: rooms.filter(r => r.status === 'clean').length,
          dirty: rooms.filter(r => r.status === 'dirty' || r.status === 'pending').length,
          pendingTasks: tasks.filter(t => t.status !== 'completed').length,
        });
      } catch (error) {
        console.error("Failed to fetch gobernanta dashboard stats", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <div className="flex items-center space-x-4">
          <BroomIcon className="w-12 h-12 text-green-500" />
          <div>
            <p className="text-gray-500">Habitaciones Limpias</p>
            <p className="text-3xl font-bold">{stats.clean}</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center space-x-4">
          <BroomIcon className="w-12 h-12 text-red-500" />
          <div>
            <p className="text-gray-500">Habitaciones por Limpiar</p>
            <p className="text-3xl font-bold">{stats.dirty}</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center space-x-4">
          <TaskIcon className="w-12 h-12 text-orange-500" />
          <div>
            <p className="text-gray-500">Tareas Pendientes (Camareras de pisos)</p>
            <p className="text-3xl font-bold">{stats.pendingTasks}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GobernantaDashboard;