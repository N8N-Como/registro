
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Employee, Location, WorkShift, ShiftType } from '../../types';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import { CheckIcon, XMarkIcon } from '../icons';

interface ExcelImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (shifts: Omit<WorkShift, 'shift_id'>[]) => Promise<void>;
    employees: Employee[];
    locations: Location[];
}

interface ParsedRow {
    isValid: boolean;
    error?: string;
    originalData: any;
    parsedShift?: Omit<WorkShift, 'shift_id'>;
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ isOpen, onClose, onImport, employees, locations }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        const headers = [
            {
                "PIN (Obligatorio)": "1234",
                "Nombre (Referencia)": "Juan Perez",
                "Fecha (YYYY-MM-DD)": "2023-10-25",
                "Hora Inicio (HH:MM)": "09:00",
                "Hora Fin (HH:MM)": "17:00",
                "Ubicación (Nombre Exacto)": locations[0]?.name || "Hotel Central",
                "Tipo (trabajo/libre/vacaciones)": "trabajo",
                "Notas": "Turno refuerzo"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla Turnos");
        XLSX.writeFile(wb, "Plantilla_Turnos_ComoEnCasa.xlsx");
    };

    const parseExcelDate = (dateVal: any): string | null => {
        if (!dateVal) return null;
        if (typeof dateVal === 'string' && dateVal.match(/^\d{4}-\d{2}-\d{2}$/)) return dateVal;
        if (typeof dateVal === 'number') {
            const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
        }
        if (dateVal instanceof Date) return dateVal.toISOString().split('T')[0];
        return null;
    };

    const parseExcelTime = (timeVal: any): string | null => {
        if (!timeVal) return null;
        if (typeof timeVal === 'string') return timeVal.trim();
        if (typeof timeVal === 'number') {
            const totalMinutes = Math.round(timeVal * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        return null;
    };

    const handleFileProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setIsProcessing(true);
        setParsedRows([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const rows: ParsedRow[] = data.map((row: any, _index: number) => {
                    const pin = row["PIN (Obligatorio)"]?.toString();
                    const dateStr = parseExcelDate(row["Fecha (YYYY-MM-DD)"]);
                    const startTimeStr = parseExcelTime(row["Hora Inicio (HH:MM)"]);
                    const endTimeStr = parseExcelTime(row["Hora Fin (HH:MM)"]);
                    const locName = row["Ubicación (Nombre Exacto)"];
                    const typeRaw = row["Tipo (trabajo/libre/vacaciones)"]?.toLowerCase() || 'trabajo';
                    
                    if (!pin) return { isValid: false, error: "Falta PIN", originalData: row };
                    const employee = employees.find(e => e.pin === pin);
                    if (!employee) return { isValid: false, error: `PIN ${pin} no existe`, originalData: row };
                    if (!dateStr) return { isValid: false, error: "Fecha inválida", originalData: row };
                    
                    let type: ShiftType = 'work';
                    let color = '#3b82f6';
                    if (typeRaw.includes('libre')) { type = 'off'; color = '#9ca3af'; }
                    else if (typeRaw.includes('vacaci')) { type = 'vacation'; color = '#10b981'; }
                    else if (typeRaw.includes('baja')) { type = 'sick'; color = '#ef4444'; }

                    if (type === 'work' && (!startTimeStr || !endTimeStr)) return { isValid: false, error: "Horas inválidas", originalData: row };

                    let locationId = '';
                    if (locName) {
                        const loc = locations.find(l => l.name.toLowerCase().trim() === locName.toString().toLowerCase().trim());
                        if (loc) locationId = loc.location_id;
                    }

                    return {
                        isValid: true,
                        originalData: row,
                        parsedShift: {
                            employee_id: employee.employee_id,
                            start_time: new Date(`${dateStr}T${startTimeStr || '00:00'}:00`).toISOString(),
                            end_time: new Date(`${dateStr}T${endTimeStr || '23:59'}:00`).toISOString(),
                            location_id: locationId || undefined,
                            type: type,
                            color: color,
                            notes: row["Notas"] || ''
                        }
                    };
                });
                setParsedRows(rows);
            } catch (err) { console.error(err); } finally { setIsProcessing(false); }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const handleConfirmImport = async () => {
        const validRows = parsedRows.filter(r => r.isValid && r.parsedShift);
        if (validRows.length === 0) return;
        setIsImporting(true);
        try {
            await onImport(validRows.map(r => r.parsedShift!));
            onClose();
        } catch (error) { alert("Error al importar"); } finally { setIsImporting(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Cuadrante">
            <div className="space-y-6">
                <Button size="sm" variant="secondary" onClick={handleDownloadTemplate}>📥 Plantilla Excel</Button>
                <input ref={fileInputRef} type="file" accept=".xlsx, .xls" onChange={handleFileProcess} className="block w-full text-sm" />
                {isProcessing && <Spinner />}
                {parsedRows.length > 0 && !isProcessing && (
                    <div className="max-h-60 overflow-y-auto border rounded text-xs">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50">
                                <tr><th className="p-2">PIN</th><th className="p-2">Fecha</th><th className="p-2">Estado</th></tr>
                            </thead>
                            <tbody>
                                {parsedRows.map((row, idx) => (
                                    <tr key={idx} className={row.isValid ? '' : 'bg-red-50'}>
                                        <td className="p-2">{row.originalData["PIN (Obligatorio)"]}</td>
                                        <td className="p-2">{row.originalData["Fecha (YYYY-MM-DD)"]}</td>
                                        <td className="p-2">{row.isValid ? <CheckIcon className="w-4 h-4 text-green-500"/> : <XMarkIcon className="w-4 h-4 text-red-500"/>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="pt-4 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleConfirmImport} disabled={isImporting || parsedRows.filter(r=>r.isValid).length === 0} isLoading={isImporting}>Importar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ExcelImportModal;
