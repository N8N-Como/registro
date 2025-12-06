
import React from 'react';
import { COMPANY_NAME } from '../../constants';
import { formatDuration } from '../../utils/helpers';
import { Employee, MonthlySignature } from '../../types';
import Button from '../shared/Button';

interface DailyLog {
    day: number;
    date: string;
    entries: {
        clockIn: string;
        clockOut: string;
        duration: number;
    }[];
    totalDuration: number;
}

interface EmployeeReportData {
    employee: Employee;
    dailyLogs: DailyLog[];
    monthlyTotal: number;
    signature?: MonthlySignature | null;
}

interface PrintableMonthlyLogProps {
    data: EmployeeReportData[];
    month: number;
    year: number;
}

const PrintableMonthlyLog: React.FC<PrintableMonthlyLogProps> = ({ data, month, year }) => {
    const monthName = new Date(year, month - 1, 1).toLocaleString('es-ES', { month: 'long' });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white p-4">
            <div className="flex justify-end mb-4 no-print">
                <Button onClick={handlePrint}>Imprimir Informe Completo</Button>
            </div>
            <div id="print-area" className="text-xs">
                {data.map(({ employee, dailyLogs, monthlyTotal, signature }, index) => (
                    <div key={employee.employee_id} className={`mb-12 ${index < data.length - 1 ? 'break-after-page' : ''}`}>
                        <header className="flex justify-between items-center pb-4 border-b mb-4">
                            <div>
                                <h1 className="text-xl font-bold text-primary">{COMPANY_NAME}</h1>
                                <p className="text-gray-600">Registro de Jornada Laboral</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{employee.first_name} {employee.last_name}</p>
                                <p className="text-sm text-gray-500 capitalize">{monthName} {year}</p>
                            </div>
                        </header>

                        <main className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="border-b-2 border-gray-300 bg-gray-100">
                                        <th className="p-2 font-semibold">Día</th>
                                        <th className="p-2 font-semibold">Fecha</th>
                                        <th className="p-2 font-semibold">Hora Entrada</th>
                                        <th className="p-2 font-semibold">Hora Salida</th>
                                        <th className="p-2 font-semibold text-right">Total Horas Día</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyLogs.map(log => (
                                        <tr key={log.day} className="border-b hover:bg-gray-50">
                                            <td className="p-2">{log.day}</td>
                                            <td className="p-2">{log.date}</td>
                                            <td className="p-2">{log.entries.map(e => e.clockIn).join(', ')}</td>
                                            <td className="p-2">{log.entries.map(e => e.clockOut).join(', ')}</td>
                                            <td className="p-2 text-right font-medium">{log.totalDuration > 0 ? formatDuration(log.totalDuration) : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-300 bg-gray-100">
                                        <td colSpan={4} className="p-2 text-right font-bold">Total Horas del Mes:</td>
                                        <td className="p-2 text-right font-bold">{formatDuration(monthlyTotal)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </main>

                        <footer className="mt-16 flex justify-around text-center">
                            <div className="flex flex-col items-center">
                                {signature ? (
                                    <img src={signature.signature_url} alt="Firma Empleado" className="h-16 mb-2 border-b border-gray-300" />
                                ) : (
                                    <div className="h-16 w-48 mb-2 border-b border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 italic">
                                        Sin Firma Digital
                                    </div>
                                )}
                                <p className="text-gray-700">Firma del Trabajador/a</p>
                                {signature && <p className="text-[10px] text-gray-400">Firmado digitalmente: {new Date(signature.signed_at).toLocaleString()}</p>}
                            </div>
                            <div className="flex flex-col items-center justify-end">
                                <div className="h-16 w-48 mb-2 border-b border-gray-300"></div>
                                <p className="text-gray-700">Firma de la Empresa</p>
                            </div>
                        </footer>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PrintableMonthlyLog;
