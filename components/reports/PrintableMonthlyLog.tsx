
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
        isManual: boolean; 
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

    return (
        <div className="bg-white p-4">
            <div className="flex justify-end mb-4 no-print">
                <Button onClick={() => window.print()}>🖨️ Imprimir Registro Oficial</Button>
            </div>
            <div id="print-area" className="text-[9px] leading-tight font-sans">
                {data.map(({ employee, dailyLogs, monthlyTotal, signature }, index) => (
                    <div key={employee.employee_id} className={`mb-10 ${index < data.length - 1 ? 'break-after-page' : ''}`}>
                        <header className="flex justify-between items-center pb-2 border-b-2 border-gray-800 mb-4">
                            <div>
                                <h1 className="text-lg font-bold text-primary">{COMPANY_NAME}</h1>
                                <p className="text-[10px] font-semibold text-gray-600 uppercase">Registro Individual de Jornada - Art. 34.9 ET</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold uppercase">{employee.first_name} {employee.last_name}</p>
                                <p className="text-[10px] text-gray-500 capitalize">{monthName} {year}</p>
                            </div>
                        </header>

                        <table className="w-full border-collapse border border-gray-400">
                            <thead>
                                <tr className="bg-gray-100 border-b border-gray-400">
                                    <th className="p-1 border-r border-gray-400 w-8">Día</th>
                                    <th className="p-1 border-r border-gray-400 w-16">Fecha</th>
                                    <th className="p-1 border-r border-gray-400">H. Entrada</th>
                                    <th className="p-1 border-r border-gray-400">H. Salida</th>
                                    <th className="p-1 font-bold text-right w-20">Total Jornada</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyLogs.map(log => {
                                    const hasManual = log.entries.some(e => e.isManual);
                                    return (
                                        <tr key={log.day} className={`border-b border-gray-300 ${hasManual ? 'bg-red-50' : ''}`}>
                                            <td className="p-1 border-r border-gray-300 text-center font-bold">{log.day}</td>
                                            <td className="p-1 border-r border-gray-300 text-center">{log.date}</td>
                                            <td className="p-1 border-r border-gray-300 text-center">
                                                {log.entries.map((e, i) => (
                                                    <span key={i} className={e.isManual ? 'text-red-600 font-bold underline' : ''}>
                                                        {e.clockIn}{i < log.entries.length - 1 ? ', ' : ''}
                                                    </span>
                                                ))}
                                            </td>
                                            <td className="p-1 border-r border-gray-300 text-center">
                                                {log.entries.map((e, i) => (
                                                    <span key={i} className={e.isManual ? 'text-red-600 font-bold underline' : ''}>
                                                        {e.clockOut}{i < log.entries.length - 1 ? ', ' : ''}
                                                    </span>
                                                ))}
                                            </td>
                                            <td className={`p-1 text-right font-bold ${hasManual ? 'text-red-600' : ''}`}>
                                                {log.totalDuration > 0 ? formatDuration(log.totalDuration) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100 font-bold border-t-2 border-gray-800">
                                    <td colSpan={4} className="p-2 text-right uppercase">Cómputo Total Mensual:</td>
                                    <td className="p-2 text-right text-sm">{formatDuration(monthlyTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="mt-4 flex justify-between items-start text-[8px] italic text-gray-500">
                            <div>
                                <p>* Registro automatizado vía App con verificación de ubicación y huella digital del dispositivo.</p>
                                <p className="font-bold text-red-600">** Los registros en rojo indican una corrección autorizada manualmente por la administración.</p>
                            </div>
                            <div className="text-right">
                                <p>Centro: {employee.province === 'coruna' ? 'A Coruña' : 'Pontevedra'}</p>
                            </div>
                        </div>

                        <footer className="mt-8 grid grid-cols-2 gap-10 px-4">
                            <div className="text-center">
                                <p className="font-bold mb-1 border-b border-gray-800">Firma del Trabajador/a</p>
                                <div className="h-16 flex items-center justify-center">
                                    {signature ? <img src={signature.signature_url} className="h-full object-contain" /> : <span className="text-gray-300">Pendiente de firma</span>}
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold mb-1 border-b border-gray-800">Sello y Firma Empresa</p>
                                <div className="h-16 flex items-center justify-center">
                                    <div className="border border-gray-200 p-1 rounded opacity-20 transform -rotate-12 uppercase text-[8px] font-bold">Como en Casa SL</div>
                                </div>
                            </div>
                        </footer>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PrintableMonthlyLog;
