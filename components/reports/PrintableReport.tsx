import React from 'react';
import { COMPANY_NAME } from '../../constants';
import { formatDuration } from '../../utils/helpers';

interface ReportDataRow {
    employeeName: string;
    date: string;
    clockIn: string;
    clockOut: string;
    duration: string;
}

interface PrintableReportProps {
    data: ReportDataRow[];
    title: string;
}

const PrintableReport: React.FC<PrintableReportProps> = ({ data, title }) => {
    
    const totalMilliseconds = data.reduce((acc, row) => {
        const parts = row.duration.split(':').map(Number);
        if (parts.length === 3) {
            return acc + (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        }
        return acc;
    }, 0);

    return (
        <div className="bg-white p-8">
            <header className="flex justify-between items-center pb-4 border-b mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-primary">{COMPANY_NAME}</h1>
                    <p className="text-gray-600">Informe de Registro Horario</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold">{title}</p>
                    <p className="text-sm text-gray-500">Generado el: {new Date().toLocaleDateString('es-ES')}</p>
                </div>
            </header>
            
            <main className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="border-b-2 border-gray-300 bg-gray-100">
                            <th className="p-3 text-sm font-semibold text-gray-700">Empleado</th>
                            <th className="p-3 text-sm font-semibold text-gray-700">Fecha</th>
                            <th className="p-3 text-sm font-semibold text-gray-700">Entrada</th>
                            <th className="p-3 text-sm font-semibold text-gray-700">Salida</th>
                            <th className="p-3 text-sm font-semibold text-gray-700 text-right">Duración</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-sm">{row.employeeName}</td>
                                <td className="p-3 text-sm">{row.date}</td>
                                <td className="p-3 text-sm">{row.clockIn}</td>
                                <td className="p-3 text-sm">{row.clockOut}</td>
                                <td className="p-3 text-sm text-right">{row.duration}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>

            <footer className="mt-8 pt-4 border-t text-right">
                 <p className="text-lg font-bold">
                    Total Horas del Periodo: 
                    <span className="ml-4 px-3 py-1 bg-primary text-white rounded">{formatDuration(totalMilliseconds)}</span>
                 </p>
            </footer>
        </div>
    );
};

export default PrintableReport;