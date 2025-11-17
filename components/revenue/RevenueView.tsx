import React, { useContext } from 'react';
import Card from '../shared/Card';
import { AuthContext } from '../../App';

const RevenueView: React.FC = () => {
  const auth = useContext(AuthContext);

  // FIX: Check for 'view_reports' permission in the permissions array.
  if (!auth?.role?.permissions.includes('view_reports')) {
    return (
        <Card title="Acceso Denegado">
            <p>No tienes permiso para ver esta página.</p>
        </Card>
    );
  }

  return (
    <Card title="Ingresos">
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-700">Función de Ingresos Próximamente</h2>
        <p className="mt-2 text-gray-500">Estamos trabajando en un panel de control para visualizar los ingresos. ¡Vuelve más tarde!</p>
      </div>
    </Card>
  );
};

export default RevenueView;