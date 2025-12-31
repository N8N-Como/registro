
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
        type: string;
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
        <div className="bg-white">
            <div className="flex justify-end mb-4 no-print">
                <Button onClick={() => window.print()} variant="secondary" size="sm">🖨️ Imprimir PDF</Button>
            </div>
            
            <div id="print-area" className="text-[10px] leading-tight font-sans text-black">
                {data.map(({ employee, dailyLogs, monthlyTotal, signature }, index) => (
                    <div key={employee.employee_id} className={`p-8 border-b-2 border-gray-100 ${index < data.length - 1 ? 'break-after-page' : ''}`}>
                        {/* Cabecera Oficial */}
                        <header className="flex justify-between items-start pb-4 border-b-2 border-black mb-6">
                            <div>
                                <h1 className="text-2xl font-black text-primary mb-1">{COMPANY_NAME}</h1>
                                <p className="text-[11px] font-bold uppercase tracking-wider">Registro de Jornada - Art. 34.9 Estatuto de los Trabajadores</p>
                                <p className="text-[10px] text-gray-600">Periodo: <span className="capitalize">{monthName} {year}</span></p>
                            </div>
                            <div className="text-right bg-gray-50 p-2 border border-gray-200 rounded">
                                <p className="text-[11px] font-black uppercase">{employee.first_name} {employee.last_name}</p>
                                <p className="text-[9px] text-gray-500">ID: {employee.employee_id}</p>
                                <p className="text-[9px] text-gray-500">Centro: {employee.province === 'coruna' ? 'A Coruña' : 'Pontevedra'}</p>
                            </div>
                        </header>

                        {/* Tabla de Registros */}
                        <table className="w-full border-collapse border border-black">
                            <thead>
                                <tr className="bg-gray-100 border-b border-black">
                                    <th className="p-2 border-r border-black w-10 text-center">Día</th>
                                    <th className="p-2 border-r border-black">Tramos Horarios [Entrada - Salida]</th>
                                    <th className="p-2 border-r border-black w-24 text-center">Validación</th>
                                    <th className="p-2 border-r border-black w-20 text-center">Tipo</th>
                                    <th className="p-2 font-black text-right w-24">Total Día</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyLogs.map(log => {
                                    const hasActivity = log.entries.length > 0;
                                    return (
                                        <tr key={log.day} className={`border-b border-gray-300 ${!hasActivity ? 'bg-gray-50' : ''}`}>
                                            <td className="p-2 border-r border-gray-300 text-center font-bold">{log.day}</td>
                                            <td className="p-2 border-r border-gray-300">
                                                {hasActivity ? (
                                                    <div className="space-y-1">
                                                        {log.entries.map((e, i) => (
                                                            <div key={i} className="flex justify-between">
                                                                <span className={e.isManual ? 'text-red-600 font-bold' : ''}>
                                                                    {e.clockIn} - {e.clockOut}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-gray-300">Sin actividad</span>}
                                            </td>
                                            <td className="p-2 border-r border-gray-300 text-center text-[8px] uppercase">
                                                {log.entries.map((e, i) => (
                                                    <div key={i} className={e.isManual ? 'text-red-600 font-black' : 'text-green-700'}>
                                                        {e.isManual ? '⚠ Manual (Adm)' : '✓ Digital'}
                                                    </div>
                                                ))}
                                            </td>
                                            <td className="p-2 border-r border-gray-300 text-center capitalize text-gray-500">
                                                {log.entries.map((e, i) => <div key={i}>{e.type}</div>)}
                                            </td>
                                            <td className="p-2 text-right font-bold bg-gray-50">
                                                {log.totalDuration > 0 ? formatDuration(log.totalDuration) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100 font-black border-t-2 border-black">
                                    <td colSpan={4} className="p-3 text-right uppercase text-sm">Cómputo Total de Horas Efectivas:</td>
                                    <td className="p-3 text-right text-sm underline decoration-double">{formatDuration(monthlyTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Leyenda de Auditoría */}
                        <div className="mt-4 grid grid-cols-2 gap-4 text-[8px] italic text-gray-600">
                            <div>
                                <p>✓ DIGITAL: Registro automático vía App con verificación GPS y Fingerprint.</p>
                                <p>⚠ MANUAL: Ajuste solicitado por trabajador y autorizado por administración (Art. 34.9 ET).</p>
                            </div>
                            <div className="text-right">
                                <p>Firma digital realizada por el trabajador de forma inequívoca.</p>
                                <p>Pausas obligatorias descontadas según registro efectivo.</p>
                            </div>
                        </div>

                        {/* Firmas */}
                        <footer className="mt-12 grid grid-cols-2 gap-16 px-8">
                            <div className="text-center border-t border-black pt-2">
                                <p className="font-bold text-[9px] uppercase mb-4">Firma del Trabajador/a</p>
                                <div className="h-24 flex items-center justify-center bg-gray-50/50 rounded border border-dashed border-gray-200">
                                    {signature ? (
                                        <img src={signature.signature_url} className="h-full object-contain mix-blend-multiply" alt="Firma empleado" />
                                    ) : (
                                        <div className="text-gray-300 uppercase font-black opacity-20 text-[20px] transform -rotate-12">PENDIENTE DE FIRMA</div>
                                    )}
                                </div>
                            </div>
                            <div className="text-center border-t border-black pt-2">
                                <p className="font-bold text-[9px] uppercase mb-4">Sello y Firma de la Empresa</p>
                                <div className="h-24 flex flex-col items-center justify-center">
                                    <div className="border-4 border-primary/20 text-primary/20 p-2 rounded-lg font-black text-[12px] transform rotate-12">
                                        COMO EN CASA SL<br/>CIF: B-XXXXXXXX
                                    </div>
                                </div>
                            </div>
                        </footer>
                        
                        <p className="mt-8 text-center text-[7px] text-gray-400">Este documento constituye el registro diario de jornada obligatorio según Real Decreto-ley 8/2019. Debe conservarse durante cuatro años.</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PrintableMonthlyLog;
