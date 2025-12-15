
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
        // If string YYYY-MM-DD
        if (typeof dateVal === 'string' && dateVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateVal;
        }
        // If Excel Serial Number
        if (typeof dateVal === 'number') {
            const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0];
        }
        // If JS Date
        if (dateVal instanceof Date) {
            return dateVal.toISOString().split('T')[0];
        }
        return null;
    };

    const parseExcelTime = (timeVal: any): string | null => {
        if (!timeVal) return null;
        if (typeof timeVal === 'string') return timeVal.trim();
        // If decimal (fraction of day)
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

                const rows: ParsedRow[] = data.map((row: any, index: number) => {
                    const pin = row["PIN (Obligatorio)"]?.toString();
                    const dateStr = parseExcelDate(row["Fecha (YYYY-MM-DD)"]);
                    const startTimeStr = parseExcelTime(row["Hora Inicio (HH:MM)"]);
                    const endTimeStr = parseExcelTime(row["Hora Fin (HH:MM)"]);
                    const locName = row["Ubicación (Nombre Exacto)"];
                    const typeRaw = row["Tipo (trabajo/libre/vacaciones)"]?.toLowerCase() || 'trabajo';
                    const notes = row["Notas"] || '';

                    // Validation
                    if (!pin) return { isValid: false, error: "Falta PIN", originalData: row };
                    
                    const employee = employees.find(e => e.pin === pin);
                    if (!employee) return { isValid: false, error: `PIN ${pin} no existe`, originalData: row };

                    if (!dateStr) return { isValid: false, error: "Fecha inválida", originalData: row };
                    
                    // Normalize Type
                    let type: ShiftType = 'work';
                    let color = '#3b82f6';
                    if (typeRaw.includes('libre') || typeRaw.includes('descanso')) { type = 'off'; color = '#9ca3af'; }
                    else if (typeRaw.includes('vacaci')) { type = 'vacation'; color = '#10b981'; }
                    else if (typeRaw.includes('baja')) { type = 'sick'; color = '#ef4444'; }
                    else if (typeRaw.includes('permiso')) { type = 'permission'; color = '#f59e0b'; }

                    // Times are only mandatory if type is 'work'
                    if (type === 'work' && (!startTimeStr || !endTimeStr)) {
                        return { isValid: false, error: "Horas inválidas para turno de trabajo", originalData: row };
                    }

                    // Location mapping (Optional)
                    let locationId = '';
                    if (locName) {
                        const loc = locations.find(l => l.name.toLowerCase().trim() === locName.toString().toLowerCase().trim());
                        if (loc) locationId = loc.location_id;
                        else if (type === 'work') return { isValid: false, error: `Ubicación '${locName}' no encontrada`, originalData: row };
                    }

                    // Build ISO Dates
                    let startISO = '';
                    let endISO = '';
                    
                    if (type === 'work') {
                        startISO = `${dateStr}T${startTimeStr}:00`;
                        endISO = `${dateStr}T${endTimeStr}:00`;
                    } else {
                        // For absences, set dummy times (full day)
                        startISO = `${dateStr}T00:00:00`;
                        endISO = `${dateStr}T23:59:59`;
                    }

                    return {
                        isValid: true,
                        originalData: row,
                        parsedShift: {
                            employee_id: employee.employee_id,
                            start_time: new Date(startISO).toISOString(),
                            end_time: new Date(endISO).toISOString(),
                            location_id: locationId || undefined,
                            type: type,
                            color: color,
                            notes: notes
                        }
                    };
                });

                setParsedRows(rows);
            } catch (err) {
                console.error(err);
                alert("Error al leer el archivo Excel. Asegúrate de que el formato es correcto.");
            } finally {
                setIsProcessing(false);
            }
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
        } catch (error) {
            alert("Error al guardar los turnos en la base de datos.");
        } finally {
            setIsImporting(false);
        }
    };

    const validCount = parsedRows.filter(r => r.isValid).length;
    const errorCount = parsedRows.filter(r => !r.isValid).length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Cuadrante desde Excel">
            <div className="space-y-6">
                
                {/* Step 1: Template */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-800 mb-2">1. Descarga la plantilla</h4>
                    <p className="text-sm text-blue-700 mb-3">Usa este formato para asegurar que los datos se importen correctamente. Necesitarás el PIN de los empleados.</p>
                    <Button size="sm" variant="secondary" onClick={handleDownloadTemplate} className="w-full sm:w-auto">
                        📥 Descargar Plantilla Excel
                    </Button>
                </div>

                {/* Step 2: Upload */}
                <div>
                    <h4 className="font-bold text-gray-800 mb-2">2. Sube tu archivo</h4>
                    <div className="flex items-center space-x-2">
                        <label className="flex-1 cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex justify-center items-center text-sm font-medium text-gray-700 hover:bg-gray-50">
                            <span>{file ? file.name : "Seleccionar archivo .xlsx"}</span>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept=".xlsx, .xls" 
                                className="sr-only" 
                                onChange={handleFileProcess} 
                            />
                        </label>
                        {file && (
                            <button onClick={() => { setFile(null); setParsedRows([]); if(fileInputRef.current) fileInputRef.current.value=''; }} className="text-red-500 hover:text-red-700">
                                <XMarkIcon />
                            </button>
                        )}
                    </div>
                </div>

                {/* Step 3: Preview */}
                {isProcessing && <Spinner />}
                
                {parsedRows.length > 0 && !isProcessing && (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 p-2 border-b flex justify-between items-center text-sm">
                            <span className="font-semibold">Vista Previa</span>
                            <div className="flex space-x-3">
                                <span className="text-green-600 flex items-center"><CheckIcon className="w-4 h-4 mr-1"/> {validCount} Válidos</span>
                                <span className="text-red-600 flex items-center"><XMarkIcon className="w-4 h-4 mr-1"/> {errorCount} Errores</span>
                            </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-2 border-b">Estado</th>
                                        <th className="p-2 border-b">Emp (PIN)</th>
                                        <th className="p-2 border-b">Fecha</th>
                                        <th className="p-2 border-b">Turno</th>
                                        <th className="p-2 border-b">Ubicación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedRows.map((row, idx) => (
                                        <tr key={idx} className={`border-b ${row.isValid ? 'hover:bg-gray-50' : 'bg-red-50'}`}>
                                            <td className="p-2">
                                                {row.isValid ? (
                                                    <CheckIcon className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <span className="text-red-600 font-bold" title={row.error}>ERROR</span>
                                                )}
                                            </td>
                                            <td className="p-2 truncate max-w-[100px]" title={row.originalData["Nombre (Referencia)"]}>
                                                {row.originalData["PIN (Obligatorio)"]}
                                            </td>
                                            <td className="p-2">{row.originalData["Fecha (YYYY-MM-DD)"]}</td>
                                            <td className="p-2">
                                                {row.originalData["Tipo (trabajo/libre/vacaciones)"] === 'trabajo' 
                                                    ? `${row.originalData["Hora Inicio (HH:MM)"]} - ${row.originalData["Hora Fin (HH:MM)"]}`
                                                    : row.originalData["Tipo (trabajo/libre/vacaciones)"]}
                                            </td>
                                            <td className="p-2 truncate max-w-[100px]">
                                                {!row.isValid && row.error ? <span className="text-red-600">{row.error}</span> : row.originalData["Ubicación (Nombre Exacto)"]}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="pt-4 flex justify-end space-x-2 border-t">
                    <Button variant="secondary" onClick={onClose} disabled={isImporting}>Cancelar</Button>
                    <Button 
                        onClick={handleConfirmImport} 
                        disabled={validCount === 0 || isImporting} 
                        isLoading={isImporting}
                    >
                        Importar {validCount} Turnos
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ExcelImportModal;
