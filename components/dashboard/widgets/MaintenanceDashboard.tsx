
import React, { useState, useEffect } from 'react';
import Card from '../../shared/Card';
import Spinner from '../../shared/Spinner';
import { getIncidents } from '../../../services/mockApi';
import { IncidentIcon } from '../../icons';

const MaintenanceDashboard: React.FC = () => {
  const [openIncidents, setOpenIncidents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const incidents = await getIncidents();
        setOpenIncidents(incidents.filter(i => i.status !== 'resolved').length);
      } catch (error) {
        console.error("Failed to fetch incidents for maintenance", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIncidents();
  }, []);

  if (isLoading) return <Spinner />;

  return (
    <Card>
      <div className="flex items-center space-x-4">
        <IncidentIcon className="w-12 h-12 text-red-500" />
        <div>
          <p className="text-gray-500">Incidencias Abiertas</p>
          <p className="text-3xl font-bold">{openIncidents}</p>
        </div>
      </div>
    </Card>
  );
};

export default MaintenanceDashboard;
