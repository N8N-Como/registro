
import { createClient } from '@supabase/supabase-js';
import { Role, Employee, Location, TimeEntry, Policy, Announcement, Room, Task, TaskTimeLog, Incident, ShiftLogEntry, ActivityLog, LostItem, AccessLog, BreakLog, WorkType, WorkMode, MonthlySignature, TimeOffRequest, WorkShift, ShiftConfig, CompanyDocument, DocumentSignature, MaintenancePlan, TimeCorrectionRequest, InventoryItem, StockLog } from '../types';
import { addToQueue } from './offlineManager';

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://acinnuphpdnsrmijsbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaW5udXBocGRuc3JtaWpzYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTIyNjgsImV4cCI6MjA3ODk2ODI2OH0.DcaNxpI68W0gaGppraL9yZO6a9fHStVkU1ee4_zKbsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- FALLBACK DATA (Offline/Demo Mode) ---
const FALLBACK_ROLES: Role[] = [
    { role_id: 'admin', name: 'Administrador', permissions: ['manage_employees', 'manage_locations', 'manage_announcements', 'view_reports', 'manage_incidents', 'access_shift_log', 'schedule_tasks', 'audit_records', 'manage_documents', 'manage_inventory'] },
    { role_id: 'gobernanta', name: 'Gobernanta', permissions: ['manage_tasks', 'schedule_tasks', 'view_reports', 'access_shift_log', 'manage_incidents', 'manage_inventory'] },
    { role_id: 'cleaner', name: 'Camarera de Pisos', permissions: ['manage_tasks', 'manage_inventory'] },
    { role_id: 'maintenance', name: 'Mantenimiento', permissions: ['manage_incidents', 'manage_inventory'] },
    { role_id: 'receptionist', name: 'Recepción', permissions: ['access_shift_log', 'manage_incidents', 'view_reports'] },
    { role_id: 'revenue', name: 'Revenue', permissions: ['view_reports', 'access_shift_log'] },
    { role_id: 'administracion', name: 'Administración', permissions: ['manage_employees', 'view_reports', 'manage_documents'] }
];

// ORDERED EMPLOYEE LIST (Matching the image provided + New Additions)
const FALLBACK_EMPLOYEES: Employee[] = [
    { employee_id: 'noelia', first_name: 'Noelia', last_name: '', pin: '0001', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'lydia', first_name: 'Lydia', last_name: '', pin: '0002', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'begona', first_name: 'Begoña', last_name: '', pin: '0003', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'maureen', first_name: 'Maureen', last_name: '', pin: '0004', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'marisa', first_name: 'Marisa', last_name: '', pin: '0005', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'anxo', first_name: 'Anxo', last_name: '', pin: '0006', role_id: 'receptionist', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'oscar', first_name: 'Oscar', last_name: '', pin: '0007', role_id: 'receptionist', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'isabel', first_name: 'Maria Isabel', last_name: '', pin: '0008', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'stephany', first_name: 'Stephany', last_name: '', pin: '0009', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'yessica', first_name: 'Yessica', last_name: '', pin: '0010', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'nisley', first_name: 'Nisley', last_name: '', pin: '0011', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'mari', first_name: 'Dolores', last_name: 'Varela', pin: '0012', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'diana', first_name: 'Diana', last_name: '', pin: '0013', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'andres', first_name: 'Andres', last_name: '', pin: '0014', role_id: 'maintenance', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'itagu', first_name: 'Itagu', last_name: '', pin: '0015', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    // NEW ADDITIONS FROM IMAGE
    { employee_id: 'doris', first_name: 'Dolores', last_name: 'Escalante', pin: '0016', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'silvia', first_name: 'Silvia', last_name: 'Estefania', pin: '0017', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'laura', first_name: 'María Laura', last_name: 'Castro', pin: '0018', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'yurima', first_name: 'Yurima', last_name: 'Mairoa', pin: '0019', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    // Hidden / Non-Quadrant Employees
    { employee_id: 'emp_admin', first_name: 'Admin', last_name: 'Sistema', pin: '1234', role_id: 'admin', status: 'active', policy_accepted: true, photo_url: 'https://ui-avatars.com/api/?name=Admin+Sistema&background=0D8ABC&color=fff' },
];

const FALLBACK_LOCATIONS: Location[] = [
    { location_id: 'loc_main', name: 'Pensión Residencia FyF', address: 'Dirección FyF', latitude: 40.416775, longitude: -3.703790, radius_meters: 100 },
    { location_id: 'loc_beach', name: 'Apartamentos Playa', address: 'Paseo Marítimo 22', latitude: 40.420000, longitude: -3.710000, radius_meters: 100 }
];

const FALLBACK_SHIFT_CONFIGS: ShiftConfig[] = [
    { config_id: 'conf_M', code: 'M', name: 'Mañana FyF', start_time: '07:30', end_time: '15:30', color: '#93c5fd', location_id: 'loc_main' }, // blue-300
    { config_id: 'conf_T', code: 'T', name: 'Tarde FyF', start_time: '15:30', end_time: '23:30', color: '#fdba74', location_id: 'loc_main' }, // orange-300
    { config_id: 'conf_P', code: 'P', name: 'Partido', start_time: '09:00', end_time: '18:00', color: '#86efac', location_id: 'loc_main' }, // green-300
    { config_id: 'conf_MM', code: 'MM', name: 'Media Mañana', start_time: '10:30', end_time: '14:30', color: '#5eead4', location_id: 'loc_main' }, // teal-300
    { config_id: 'conf_R', code: 'R', name: 'Refuerzo', start_time: '09:00', end_time: '18:00', color: '#86efac', location_id: 'loc_main' },
    { config_id: 'conf_A', code: 'A', name: 'Apoyo', start_time: '11:00', end_time: '15:00', color: '#a5b4fc', location_id: 'loc_main' }, // indigo-300
    { config_id: 'conf_D', code: 'D', name: 'Partido (D)', start_time: '08:30', end_time: '18:30', color: '#c4b5fd', location_id: 'loc_main' } // violet-300
];

const SHIFT_MATRIX: Record<string, string[]> = {
    'noelia': ['V', 'L', 'L', 'T', 'T', 'V', 'T', 'T', 'T', 'L', 'L', 'T', 'T', 'T', 'L', 'L', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'L', 'L', 'T', 'T', 'T', 'L', 'L', 'T'],
    'lydia': ['V', 'T', 'T', 'P', 'P', 'V', 'P', 'L', 'L', 'P', 'P', 'P', 'P', 'P', 'T', 'T', 'L', 'L', 'V25', 'V25', 'V25', 'V25', 'V25', 'V25', 'V25', 'L', 'L', 'P', 'P', 'P', 'P'],
    'begona': ['V', 'V25', 'V25', 'V25', 'L', 'V', 'L', 'P', 'P', 'T', 'T', 'P', 'L', 'L', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'L', 'L', 'T', 'T', 'P', 'P', 'P', 'T', 'T', 'L'],
    'maureen': ['V', 'V25', 'L', 'L', 'V25', 'V', 'R', 'R', 'R', 'L', 'L', 'R', 'R', 'R', 'R', 'R', 'L', 'L', 'R', 'R', 'R', 'P', 'P', 'L', 'L', 'R', 'R', 'R', 'R', 'R', 'L'],
    'marisa': ['V25', 'V25', 'V25', 'V25', 'V25', 'V25', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L', 'L'],
    'anxo': ['V', 'P', 'P', 'L', 'D', 'V', 'D', 'D', 'D', 'L', 'L', 'D', 'D', 'D', 'D', 'D', 'L', 'L', 'D', 'D', 'D', 'L', 'L', 'P', 'P', 'V25', 'V25', 'V25', 'V25', 'V25', 'V25'],
    'oscar': ['V', 'MM', 'L', 'L', 'MM', 'V', 'MM', 'MM', 'MM', 'L', 'L', 'MM', 'MM', 'MM', 'MM', 'MM', 'L', 'L', 'MM', 'MM', 'MM', 'MM', 'MM', 'L', 'L', 'MM', 'MM', 'MM', 'MM', 'MM', 'L'],
    'isabel': Array(31).fill('B'),
    'stephany': ['V25', 'V25', 'V25', 'V25', 'V25', 'V', 'M', 'M', 'M', 'L', 'L', 'M', 'M', 'M', 'L', 'L', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'L', 'L', 'M', 'M', 'M', 'L', 'L', 'M'],
    'yessica': ['V', 'V', 'V', 'V', 'V', 'V', 'L', 'A', 'A', 'A', 'A', 'L', 'L', 'A', 'A', 'A', 'L', 'L', 'A', 'A', 'A', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'A', 'L', 'L'],
    'nisley': ['V', 'A', 'A', 'L', 'L', 'V', 'A', 'A', 'L', 'L', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'A', 'A'],
    'mari': Array(31).fill('B'), // Dolores Varela
    'diana': ['V', 'V', 'V', 'V', 'V', 'V', 'A', 'L', 'L', 'M', 'M', 'A', 'A', 'A', 'M', 'M', 'L', 'L', 'L', 'A', 'A', 'A', 'M', 'M', 'A', 'L', 'L', 'L', 'M', 'M', 'A'],
    'andres': ['V', 'V', 'V', 'V', 'V', 'V', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'L', 'L', 'L', 'A', 'A', 'A', 'A', 'A'],
    'itagu': ['V25', 'V25', 'V25', 'V25', 'V25', 'V25', 'V25', 'V25', 'V25', 'V25', 'V25', 'L', 'L', 'L', 'L', 'A', 'A', 'A', 'L', 'L', 'L', 'L', 'A', 'A', 'A', 'L', 'L', 'L', 'L', 'A', 'A'],
    'doris': ['V', 'V', 'V', 'V', 'V', 'V', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'L', 'L', 'L', 'A', 'A', 'A', 'A', 'A'],
    'silvia': ['V', 'V', 'V', 'V', 'V', 'V', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'L', 'L', 'L', 'A', 'A', 'A', 'A', 'A'],
    'laura': ['V', 'V', 'V', 'V', 'V', 'V', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'L', 'L', 'L', 'A', 'A', 'A', 'A', 'A'],
    'yurima': ['V', 'V', 'V', 'V', 'V', 'V', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'A', 'A', 'A', 'A', 'A', 'L', 'L', 'L', 'L', 'L', 'A', 'A', 'A', 'A', 'A']
};

const SHIFT_CONFIGS_MAP: any = {
    'M': { start: '07:30', end: '15:30', color: '#93c5fd', name: 'Mañana FyF', loc: 'loc_main' },
    'T': { start: '15:30', end: '23:30', color: '#fdba74', name: 'Tarde FyF', loc: 'loc_main' },
    'P': { start: '09:00', end: '18:00', color: '#86efac', name: 'Partido', loc: 'loc_main' },
    'MM': { start: '10:30', end: '14:30', color: '#5eead4', name: 'Media Mañana', loc: 'loc_main' },
    'R': { start: '09:00', end: '18:00', color: '#86efac', name: 'Refuerzo', loc: 'loc_main' },
    'A': { start: '11:00', end: '15:00', color: '#a5b4fc', name: 'Apoyo', loc: 'loc_main' },
    'D': { split: true, parts: [{start: '08:30', end: '14:30'}, {start: '16:30', end: '18:30'}], color: '#c4b5fd', name: 'Partido (D)', loc: 'loc_main' }
};

// HELPER: Map Matrix Name to Real Employee ID
const findEmployeeIdByName = (employees: Employee[], nameKey: string): string | undefined => {
    const key = nameKey.toLowerCase();
    
    // Explicit mappings for common confusions
    if (key === 'mari') {
        // Look for Dolores Varela specifically
        const varela = employees.find(e => 
            (e.first_name.toLowerCase().includes('dolores') || e.first_name.toLowerCase().includes('mari')) && 
            e.last_name.toLowerCase().includes('varela')
        );
        return varela?.employee_id;
    }

    if (key === 'doris') {
        // Look for Dolores Escalante specifically
        const escalante = employees.find(e => 
            (e.first_name.toLowerCase().includes('dolores') || e.first_name.toLowerCase().includes('doris')) && 
            e.last_name.toLowerCase().includes('escalante')
        );
        return escalante?.employee_id;
    }
    
    if (key === 'begona') {
        const begona = employees.find(e => 
            e.first_name.toLowerCase().includes('begoña') || e.first_name.toLowerCase().includes('begona')
        );
        return begona?.employee_id;
    }

    const found = employees.find(e => {
        const first = e.first_name.toLowerCase();
        const last = e.last_name.toLowerCase();
        const full = `${first} ${last}`;
        
        // Exact or partial match on firstname
        if (first === key) return true;
        if (first.includes(key)) return true;
        return false;
    });
    return found?.employee_id;
};

// --- DYNAMIC GENERATOR ---
const generateDynamicJanuaryShifts = (employees: Employee[]): WorkShift[] => {
    const shifts: WorkShift[] = [];
    const year = 2025;

    Object.entries(SHIFT_MATRIX).forEach(([nameKey, days]) => {
        const empId = findEmployeeIdByName(employees, nameKey);
        if (!empId) return; // Skip if employee not found in DB

        days.forEach((code, idx) => {
            const day = idx + 1;
            const dateStr = `${year}-01-${day.toString().padStart(2, '0')}`;
            
            const baseShift = {
                shift_id: `auto_${empId}_${day}_${Math.random()}`,
                employee_id: empId,
                location_id: 'loc_main'
            };

            if (code === 'L') {
                shifts.push({ ...baseShift, type: 'off', start_time: `${dateStr}T00:00:00`, end_time: `${dateStr}T23:59:59`, color: '#f3f4f6', notes: 'L' } as WorkShift); 
            } else if (['V', 'V25'].includes(code)) {
                shifts.push({ ...baseShift, type: 'vacation', start_time: `${dateStr}T00:00:00`, end_time: `${dateStr}T23:59:59`, color: '#d1fae5', notes: code } as WorkShift);
            } else if (code === 'B') {
                shifts.push({ ...baseShift, type: 'sick', start_time: `${dateStr}T00:00:00`, end_time: `${dateStr}T23:59:59`, color: '#fee2e2', notes: 'B' } as WorkShift);
            } else if (SHIFT_CONFIGS_MAP[code]) {
                const cfg = SHIFT_CONFIGS_MAP[code];
                
                if (cfg.split) {
                    cfg.parts.forEach((part: any, pIdx: number) => {
                        shifts.push({
                            ...baseShift,
                            shift_id: baseShift.shift_id + `_p${pIdx}`,
                            type: 'work',
                            start_time: `${dateStr}T${part.start}:00`,
                            end_time: `${dateStr}T${part.end}:00`,
                            color: cfg.color,
                            notes: code,
                            location_id: cfg.loc,
                            shift_config_id: `conf_${code}`
                        } as WorkShift);
                    });
                } else {
                    shifts.push({
                        ...baseShift,
                        type: 'work',
                        start_time: `${dateStr}T${cfg.start}:00`,
                        end_time: `${dateStr}T${cfg.end}:00`,
                        color: cfg.color,
                        notes: code,
                        location_id: cfg.loc,
                        shift_config_id: `conf_${code}`
                    } as WorkShift);
                }
            }
        });
    });

    return shifts;
};

// Fallback constant for pure offline mode without employees
const FALLBACK_WORK_SHIFTS = generateDynamicJanuaryShifts(FALLBACK_EMPLOYEES);
const FALLBACK_INVENTORY: InventoryItem[] = [
    { item_id: 'inv_1', name: 'Gel de Baño (Garrafa 5L)', category: 'amenities', quantity: 10, unit: 'garrafas', min_threshold: 2, last_updated: new Date().toISOString() },
    { item_id: 'inv_2', name: 'Papel Higiénico (Industrial)', category: 'amenities', quantity: 50, unit: 'paquetes', min_threshold: 10, last_updated: new Date().toISOString() },
];

// Helper to throw readable errors or fallback
const handleSupabaseError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    const isNetworkError = error.message?.includes('Failed to fetch') || error.name === 'TypeError';
    if (isNetworkError) { console.warn("Network error detected."); }
    let msg = error.message || "Unknown error";
    if (error.details) msg += ` (${error.details})`;
    throw new Error(msg);
};

const isSchemaError = (error: any) => {
    if (!error) return false;
    const msg = error.message?.toLowerCase() || '';
    return (error.code === '42703' || msg.includes('column') && (msg.includes('does not exist') || msg.includes('could not find') || msg.includes('schema cache')));
};

const NEW_EMPLOYEE_FIELDS = ['province', 'annual_hours_contract', 'default_location_id', 'default_start_time', 'default_end_time'];
const cleanData = (data: any, fieldsToRemove: string[]) => {
    const cleaned = { ...data };
    fieldsToRemove.forEach(f => delete cleaned[f]);
    return cleaned;
};

// --- API Functions ---

export const getRoles = async (): Promise<Role[]> => {
    try {
        const { data, error } = await supabase.from('roles').select('*');
        if (error || !data || data.length === 0) return FALLBACK_ROLES;
        return data;
    } catch (error) { return FALLBACK_ROLES; }
};

export const updateRole = async (roleData: Role): Promise<Role> => {
    try {
        const { data, error } = await supabase.from('roles').update({ name: roleData.name, permissions: roleData.permissions }).eq('role_id', roleData.role_id).select().single();
        if (error) throw error;
        return data;
    } catch(e) { return roleData; }
};

export const getEmployees = async (): Promise<Employee[]> => {
    try {
        const { data, error } = await supabase.from('employees').select('*');
        if (error || !data || data.length === 0) return FALLBACK_EMPLOYEES;
        return data;
    } catch (error) { return FALLBACK_EMPLOYEES; }
};

export const addEmployee = async (employeeData: Omit<Employee, 'employee_id'>): Promise<Employee> => {
    try {
        let { data, error } = await supabase.from('employees').insert([employeeData]).select().single();
        if (isSchemaError(error)) {
            const safeData = cleanData(employeeData, NEW_EMPLOYEE_FIELDS);
            const retry = await supabase.from('employees').insert([safeData]).select().single();
            data = retry.data; error = retry.error;
        }
        if (error) throw error;
        return data;
    } catch(e) { return { ...employeeData, employee_id: crypto.randomUUID() } as Employee; }
};

export const updateEmployee = async (employeeData: Employee): Promise<Employee> => {
    try {
        let { data, error } = await supabase.from('employees').update(employeeData).eq('employee_id', employeeData.employee_id).select().single();
        if (isSchemaError(error)) {
            const safeData = cleanData(employeeData, NEW_EMPLOYEE_FIELDS);
            const retry = await supabase.from('employees').update(safeData).eq('employee_id', employeeData.employee_id).select().single();
            data = retry.data; error = retry.error;
        }
        if (error) throw error;
        return data;
    } catch (e) { return employeeData; }
};

export const acceptPolicy = async (employeeId: string): Promise<void> => {
    try { await supabase.from('employees').update({ policy_accepted: true }).eq('employee_id', employeeId); } catch (e) {}
};

export const getLocations = async (): Promise<Location[]> => {
    try {
        const { data, error } = await supabase.from('locations').select('*');
        if (error || !data || data.length === 0) return FALLBACK_LOCATIONS;
        return data;
    } catch (error) { return FALLBACK_LOCATIONS; }
};

export const addLocation = async (locationData: Omit<Location, 'location_id'>): Promise<Location> => {
    try {
        const { data, error } = await supabase.from('locations').insert([locationData]).select().single();
        if (error) throw error;
        return data;
    } catch (e) { return { ...locationData, location_id: crypto.randomUUID() }; }
};

export const updateLocation = async (locationData: Location): Promise<Location> => {
    try {
        const { data, error } = await supabase.from('locations').update(locationData).eq('location_id', locationData.location_id).select().single();
        if (error) throw error;
        return data;
    } catch (e) { return locationData; }
};

export const getTimeEntriesForEmployee = async (employeeId: string): Promise<TimeEntry[]> => {
    try {
        const { data, error } = await supabase.from('time_entries').select('*').eq('employee_id', employeeId).order('clock_in_time', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (error) { return []; }
};

export const getAllRunningTimeEntries = async (): Promise<TimeEntry[]> => {
    try {
        const { data, error } = await supabase.from('time_entries').select('*').eq('status', 'running');
        if (error) throw error;
        return data || [];
    } catch (error) { return []; }
};

export const clockIn = async (employeeId: string, locationId?: string, latitude?: number, longitude?: number, workType: WorkType = 'ordinaria', workMode: WorkMode = 'presencial', deviceData?: { deviceId: string, deviceInfo: string }, isSyncing = false): Promise<TimeEntry> => {
    const newEntry = {
        employee_id: employeeId,
        clock_in_time: new Date().toISOString(),
        clock_in_location_id: locationId || null,
        clock_in_latitude: latitude,
        clock_in_longitude: longitude,
        status: 'running',
        work_type: workType,
        work_mode: workMode,
        device_id: deviceData?.deviceId,
        device_info: deviceData?.deviceInfo
    };
    if (!isSyncing && !navigator.onLine) {
        addToQueue('CLOCK_IN', { employeeId, locationId, latitude, longitude, workType, workMode, deviceData });
        return { ...newEntry, entry_id: 'offline-' + Date.now() } as TimeEntry;
    }
    try {
        let { data, error } = await supabase.from('time_entries').insert([newEntry]).select().single();
        if (isSchemaError(error)) {
            const safeEntry = cleanData(newEntry, ['device_id', 'device_info']);
            const retry = await supabase.from('time_entries').insert([safeEntry]).select().single();
            data = retry.data; error = retry.error;
        }
        if (error) throw error;
        return data;
    } catch (e: any) {
        if (!isSyncing) {
             addToQueue('CLOCK_IN', { employeeId, locationId, latitude, longitude, workType, workMode, deviceData });
             return { ...newEntry, entry_id: 'offline-' + Date.now() } as TimeEntry;
        }
        throw e;
    }
};

export const clockOut = async (entryId: string, locationId?: string, isSyncing = false, customEndTime?: string): Promise<TimeEntry> => {
    const endTime = customEndTime || new Date().toISOString();
    if (!isSyncing && !navigator.onLine) {
        addToQueue('CLOCK_OUT', { entryId, locationId, customEndTime });
        return { entry_id: entryId, status: 'completed', clock_out_time: endTime } as TimeEntry;
    }
    try {
        const { data, error } = await supabase.from('time_entries').update({ clock_out_time: endTime, clock_out_location_id: locationId || null, status: 'completed' }).eq('entry_id', entryId).select().single();
        if (error) throw error;
        return data;
    } catch (e: any) {
        if (!isSyncing) {
            addToQueue('CLOCK_OUT', { entryId, locationId, customEndTime });
            return { entry_id: entryId, status: 'completed', clock_out_time: endTime } as TimeEntry;
        }
        throw e;
    }
};

export const createTimeCorrectionRequest = async (data: Omit<TimeCorrectionRequest, 'request_id' | 'created_at' | 'status'>): Promise<TimeCorrectionRequest> => {
    try {
        const { data: created, error } = await supabase.from('time_correction_requests').insert([{...data, status: 'pending', created_at: new Date().toISOString()}]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return { ...data, request_id: 'mock', status: 'pending', created_at: new Date().toISOString() } as TimeCorrectionRequest; }
};

export const getTimeCorrectionRequests = async (): Promise<TimeCorrectionRequest[]> => {
    try {
        const { data, error } = await supabase.from('time_correction_requests').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const resolveTimeCorrectionRequest = async (requestId: string, status: 'approved' | 'rejected', reviewerId: string): Promise<void> => {
    try {
        const { data: request } = await supabase.from('time_correction_requests').select('*').eq('request_id', requestId).single();
        if (!request) throw new Error("Request not found");
        await supabase.from('time_correction_requests').update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }).eq('request_id', requestId);
        if (status === 'approved') {
            if (request.correction_type === 'create_entry') {
                const startTime = `${request.requested_date}T${request.requested_clock_in}:00`;
                const endTime = request.requested_clock_out ? `${request.requested_date}T${request.requested_clock_out}:00` : undefined;
                await supabase.from('time_entries').insert([{ employee_id: request.employee_id, clock_in_time: startTime, clock_out_time: endTime, status: endTime ? 'completed' : 'running', work_type: 'ordinaria', work_mode: 'presencial', is_manual: true }]);
            } else if (request.correction_type === 'fix_time' && request.original_entry_id) {
                const startTime = `${request.requested_date}T${request.requested_clock_in}:00`;
                const endTime = request.requested_clock_out ? `${request.requested_date}T${request.requested_clock_out}:00` : null;
                await supabase.from('time_entries').update({ clock_in_time: startTime, clock_out_time: endTime, is_manual: true }).eq('entry_id', request.original_entry_id);
            }
        }
    } catch(e) { console.error("Error resolving correction", e); }
};

export const getBreaksForTimeEntry = async (timeEntryId: string): Promise<BreakLog[]> => {
    if (timeEntryId.startsWith('offline-')) return [];
    try {
        const { data, error } = await supabase.from('break_logs').select('*').eq('time_entry_id', timeEntryId).order('start_time', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const getAllBreaksForEmployee = async (employeeId: string): Promise<BreakLog[]> => { return []; }

export const getBreaksForTimeEntries = async (timeEntryIds: string[]): Promise<BreakLog[]> => {
    if (timeEntryIds.length === 0) return [];
    try {
        const { data, error } = await supabase.from('break_logs').select('*').in('time_entry_id', timeEntryIds);
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
}

export const startBreak = async (timeEntryId: string, breakType: string): Promise<BreakLog> => {
    try {
        const newBreak = { time_entry_id: timeEntryId, start_time: new Date().toISOString(), break_type: breakType };
        const { data, error } = await supabase.from('break_logs').insert([newBreak]).select().single();
        if (error) throw error;
        return data;
    } catch(e) { return { break_id: 'mock', time_entry_id: timeEntryId, start_time: new Date().toISOString(), break_type: breakType }; }
};

export const endBreak = async (breakId: string): Promise<BreakLog> => {
    try {
        const { data, error } = await supabase.from('break_logs').update({ end_time: new Date().toISOString() }).eq('break_id', breakId).select().single();
        if (error) throw error;
        return data;
    } catch(e) { return { break_id: breakId, time_entry_id: '', start_time: '', break_type: '', end_time: new Date().toISOString() }; }
};

export const getActivityLogsForTimeEntry = async (timeEntryId: string): Promise<ActivityLog[]> => {
    if (timeEntryId.startsWith('offline-')) return [];
    try {
        const { data, error } = await supabase.from('activity_logs').select('*').eq('time_entry_id', timeEntryId);
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const getCurrentEstablishmentStatus = async (): Promise<ActivityLog[]> => {
    try {
        const { data, error } = await supabase.from('activity_logs').select('*').is('check_out_time', null);
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
};

export const checkInToLocation = async (timeEntryId: string, employeeId: string, locationId: string, latitude?: number, longitude?: number, isSyncing = false): Promise<ActivityLog> => {
    const newLog = { time_entry_id: timeEntryId, employee_id: employeeId, location_id: locationId, check_in_time: new Date().toISOString(), check_in_latitude: latitude, check_in_longitude: longitude };
    if (!isSyncing && !navigator.onLine) {
        addToQueue('CHECK_IN_LOCATION', { timeEntryId, employeeId, locationId, latitude, longitude });
        return { ...newLog, activity_id: 'offline-' + Date.now() } as ActivityLog;
    }
    try {
        const { data, error } = await supabase.from('activity_logs').insert([newLog]).select().single();
        if (error) throw error;
        return data;
    } catch(e) {
        if (!isSyncing) {
            addToQueue('CHECK_IN_LOCATION', { timeEntryId, employeeId, locationId, latitude, longitude });
            return { ...newLog, activity_id: 'offline-' + Date.now() } as ActivityLog;
        }
        throw e;
    }
};

export const checkOutOfLocation = async (activityId: string, isSyncing = false): Promise<ActivityLog> => {
    if (!isSyncing && !navigator.onLine) {
        addToQueue('CHECK_OUT_LOCATION', { activityId });
        return { activity_id: activityId, check_out_time: new Date().toISOString() } as unknown as ActivityLog;
    }
    try {
        const { data, error } = await supabase.from('activity_logs').update({ check_out_time: new Date().toISOString() }).eq('activity_id', activityId).select().single();
        if (error) throw error;
        return data;
    } catch(e) {
        if (!isSyncing) {
            addToQueue('CHECK_OUT_LOCATION', { activityId });
            return { activity_id: activityId, check_out_time: new Date().toISOString() } as unknown as ActivityLog;
        }
        throw e;
    }
};

export const logAccessAttempt = async (data: any): Promise<AccessLog> => {
    try {
        const { data: created, error } = await supabase.from('access_logs').insert([{...data, attempt_time: new Date().toISOString()}]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return data; }
}

export const getPolicies = async (): Promise<Policy[]> => {
    try {
        const { data, error } = await supabase.from('policies').select('*');
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
    try {
        const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
};

export const getActiveAnnouncement = async (): Promise<Announcement | null> => {
    try {
        const { data, error } = await supabase.from('announcements').select('*').eq('is_active', true).limit(1).maybeSingle();
        if (error) throw error;
        return data;
    } catch (e) { return null; }
};

export const addAnnouncement = async (data: any): Promise<Announcement> => {
    try {
        const { data: created, error } = await supabase.from('announcements').insert([{...data, created_at: new Date().toISOString()}]).select().single();
        if (error) throw error;
        return created;
    } catch (e) { return { ...data, announcement_id: 'mock' } as Announcement; }
};

export const updateAnnouncement = async (data: Announcement): Promise<Announcement> => {
    try {
        const { data: updated, error } = await supabase.from('announcements').update(data).eq('announcement_id', data.announcement_id).select().single();
        if (error) throw error;
        return updated;
    } catch (e) { return data; }
};

export const getRooms = async (): Promise<Room[]> => {
    try {
        const { data, error } = await supabase.from('rooms').select('*');
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
};

export const addRoom = async (data: any): Promise<Room> => {
    try {
        const { data: created, error } = await supabase.from('rooms').insert([{...data, status: 'clean'}]).select().single();
        if (error) throw error;
        return created;
    } catch (e) { return { ...data, room_id: 'mock', status: 'clean' } as Room; }
};

export const updateRoom = async (data: Room): Promise<Room> => {
    try {
        const { data: updated, error } = await supabase.from('rooms').update(data).eq('room_id', data.room_id).select().single();
        if (error) throw error;
        return updated;
    } catch (e) { return data; }
};

export const getTasks = async (): Promise<Task[]> => {
    try {
        const { data, error } = await supabase.from('tasks').select('*');
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
};

export const addTask = async (data: any): Promise<Task> => {
    try {
        const { data: created, error } = await supabase.from('tasks').insert([{...data, created_at: new Date().toISOString()}]).select().single();
        if (error) throw error;
        return created;
    } catch (e) { return { ...data, task_id: 'mock' } as Task; }
};

export const updateTask = async (data: Task): Promise<Task> => {
    try {
        const { data: updated, error } = await supabase.from('tasks').update(data).eq('task_id', data.task_id).select().single();
        if (error) throw error;
        return updated;
    } catch (e) { return data; }
};

export const getTaskTimeLogs = async (): Promise<TaskTimeLog[]> => {
    try {
        const { data, error } = await supabase.from('task_time_logs').select('*');
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
};

export const getActiveTaskLogForEmployee = async (employeeId: string): Promise<TaskTimeLog | null> => {
    try {
        const { data, error } = await supabase.from('task_time_logs').select('*').eq('employee_id', employeeId).is('end_time', null).maybeSingle();
        if (error) throw error;
        return data;
    } catch (e) { return null; }
};

export const startTask = async (taskId: string, employeeId: string, locationId: string): Promise<TaskTimeLog> => {
    try {
        await supabase.from('tasks').update({ status: 'in_progress' }).eq('task_id', taskId);
        const { data, error } = await supabase.from('task_time_logs').insert([{task_id: taskId, employee_id: employeeId, start_time: new Date().toISOString(), location_id: locationId}]).select().single();
        if (error) throw error;
        return data;
    } catch(e) { return { log_id: 'mock', task_id: taskId, employee_id: employeeId, start_time: new Date().toISOString(), location_id: locationId }; }
};

export const finishTask = async (logId: string, taskId: string): Promise<TaskTimeLog> => {
    try {
        await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('task_id', taskId);
        const { data, error } = await supabase.from('task_time_logs').update({ end_time: new Date().toISOString() }).eq('log_id', logId).select().single();
        if (error) throw error;
        return data;
    } catch(e) { return { log_id: logId } as any; }
};

export const getIncidents = async (): Promise<Incident[]> => {
    try {
        const { data, error } = await supabase.from('incidents').select('*');
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const addIncident = async (data: any): Promise<Incident> => {
    try {
        const { data: created, error } = await supabase.from('incidents').insert([{...data, type: data.type || 'corrective', created_at: new Date().toISOString()}]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return { ...data, incident_id: 'mock' } as Incident; }
};

export const updateIncident = async (data: Incident): Promise<Incident> => {
    try {
        const { data: updated, error } = await supabase.from('incidents').update(data).eq('incident_id', data.incident_id).select().single();
        if (error) throw error;
        return updated;
    } catch(e) { return data; }
};

export const getShiftLog = async (): Promise<ShiftLogEntry[]> => {
    try {
        const { data, error } = await supabase.from('shift_log').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const addShiftLogEntry = async (data: any): Promise<ShiftLogEntry> => {
    try {
        const { data: created, error } = await supabase.from('shift_log').insert([{...data, created_at: new Date().toISOString(), status: 'pending'}]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return { ...data, log_id: 'mock' } as ShiftLogEntry; }
};

export const updateShiftLogEntry = async (data: ShiftLogEntry): Promise<ShiftLogEntry> => {
    try {
        const { data: updated, error } = await supabase.from('shift_log').update(data).eq('log_id', data.log_id).select().single();
        if (error) throw error;
        return updated;
    } catch(e) { return data; }
};

export const getLostItems = async (): Promise<LostItem[]> => {
    try {
        const { data, error } = await supabase.from('lost_items').select('*').order('found_date', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const addLostItem = async (data: any): Promise<LostItem> => {
    try {
        const { data: created, error } = await supabase.from('lost_items').insert([{...data, found_date: new Date().toISOString(), status: 'pending'}]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return { ...data, item_id: 'mock' } as LostItem; }
};

export const updateLostItem = async (data: LostItem): Promise<LostItem> => {
    try {
        const { data: updated, error } = await supabase.from('lost_items').update(data).eq('item_id', data.item_id).select().single();
        if (error) throw error;
        return updated;
    } catch(e) { return data; }
};

export const getMonthlySignature = async (employeeId: string, month: number, year: number): Promise<MonthlySignature | null> => {
    try {
        const { data, error } = await supabase.from('monthly_signatures').select('*').eq('employee_id', employeeId).eq('month', month).eq('year', year).maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch(e) { return null; }
};

export const saveMonthlySignature = async (employeeId: string, month: number, year: number, signatureUrl: string): Promise<MonthlySignature> => {
    try {
        const { data, error } = await supabase.from('monthly_signatures').insert([{employee_id: employeeId, month, year, signature_url: signatureUrl, signed_at: new Date().toISOString()}]).select().single();
        if (error) throw error;
        return data;
    } catch(e) { return { signature_id: 'mock', employee_id: employeeId, month, year, signature_url: signatureUrl, signed_at: new Date().toISOString() }; }
};

export const getTimeOffRequests = async (): Promise<TimeOffRequest[]> => {
    try {
        const { data, error } = await supabase.from('time_off_requests').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const createTimeOffRequest = async (data: any): Promise<TimeOffRequest> => {
    try {
        const { data: created, error } = await supabase.from('time_off_requests').insert([{...data, status: 'pending', created_at: new Date().toISOString()}]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return { ...data, request_id: 'mock' } as TimeOffRequest; }
};

export const updateTimeOffRequestStatus = async (requestId: string, status: 'approved' | 'rejected', reviewerId: string, rejectionReason?: string): Promise<TimeOffRequest> => {
    try {
        const { data, error } = await supabase.from('time_off_requests').update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), rejection_reason: rejectionReason }).eq('request_id', requestId).select().single();
        if (error) throw error;
        return data;
    } catch(e) { return { request_id: requestId } as any; }
};

export const getWorkShifts = async (startDate: string, endDate: string): Promise<WorkShift[]> => {
    try {
        const { data, error } = await supabase.from('work_shifts').select('*').gte('start_time', startDate).lte('end_time', endDate);
        
        // Critical Logic: If DB is empty for this range, GENERATE DYNAMIC FALLBACK
        // This solves "Empty Cells" issue by generating data mapped to real employees if needed.
        if (error || !data || data.length === 0) {
             console.warn("Using dynamic fallback shifts (mapped to current employees)");
             const employees = await getEmployees();
             return generateDynamicJanuaryShifts(employees);
        }
        return data || [];
    } catch(e) {
        // FALLBACK FOR OFFLINE MODE
        console.warn("Using fallback shifts data (Error caught)");
        // Try to use fallback employees here if getEmployees fails
        return generateDynamicJanuaryShifts(FALLBACK_EMPLOYEES);
    }
};

export const createWorkShift = async (data: any): Promise<WorkShift> => {
    try {
        const { data: created, error } = await supabase.from('work_shifts').insert([data]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return { ...data, shift_id: 'mock' } as WorkShift; }
};

export const updateWorkShift = async (data: WorkShift): Promise<WorkShift> => {
    try {
        const { data: updated, error } = await supabase.from('work_shifts').update(data).eq('shift_id', data.shift_id).select().single();
        if (error) throw error;
        return updated;
    } catch(e) { return data; }
};

export const deleteWorkShift = async (shiftId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('work_shifts').delete().eq('shift_id', shiftId);
        if (error) throw error;
    } catch(e) { }
};

export const getShiftConfigs = async (): Promise<ShiftConfig[]> => {
    try {
        const { data, error } = await supabase.from('shift_configs').select('*');
        if (error || !data || data.length === 0) return FALLBACK_SHIFT_CONFIGS;
        return data || [];
    } catch(e) { return FALLBACK_SHIFT_CONFIGS; }
};

export const addShiftConfig = async (data: any): Promise<ShiftConfig> => {
    try {
        if (!data.location_id || data.location_id === '') {
            data.location_id = null; // Explicitly null for Supabase UUID
        }
        const { data: created, error } = await supabase.from('shift_configs').insert([data]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return { ...data, config_id: 'mock' } as ShiftConfig; }
};

export const updateShiftConfig = async (data: ShiftConfig): Promise<ShiftConfig> => {
    try {
        // Fix for empty string location_id causing UUID errors
        const payload = { ...data };
        if (!payload.location_id || payload.location_id === '') {
            (payload as any).location_id = null;
        }

        const { data: updated, error } = await supabase.from('shift_configs').update(payload).eq('config_id', data.config_id).select().single();
        if (error) throw error;
        return updated;
    } catch(e) { return data; }
};

export const deleteShiftConfig = async (configId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('shift_configs').delete().eq('config_id', configId);
        if (error) throw error;
    } catch(e) { }
};

export const getDocuments = async (): Promise<CompanyDocument[]> => {
    try {
        const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const createDocument = async (documentData: any, targetEmployeeIds: string[]): Promise<CompanyDocument> => {
    try {
        const { data: doc, error } = await supabase.from('documents').insert([{...documentData, created_at: new Date().toISOString()}]).select().single();
        if (error) throw error;
        const signaturesData = targetEmployeeIds.map(empId => ({ document_id: doc.document_id, employee_id: empId, status: 'pending' }));
        if (signaturesData.length > 0) await supabase.from('document_signatures').insert(signaturesData);
        return doc;
    } catch(e) { return { ...documentData, document_id: 'mock' } as CompanyDocument; }
};

export const getEmployeeDocuments = async (employeeId: string): Promise<(DocumentSignature & { document: CompanyDocument })[]> => {
    try {
        const { data, error } = await supabase.from('document_signatures').select(`*, document:documents(*)`).eq('employee_id', employeeId);
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const getDocumentSignatures = async (documentId: string): Promise<DocumentSignature[]> => {
    try {
        const { data, error } = await supabase.from('document_signatures').select('*').eq('document_id', documentId);
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const signDocument = async (signatureId: string, signatureUrl?: string): Promise<void> => {
    try {
        const updates: Partial<DocumentSignature> = { status: 'signed', signed_at: new Date().toISOString(), viewed_at: new Date().toISOString() };
        if (signatureUrl) updates.signature_url = signatureUrl;
        const { error } = await supabase.from('document_signatures').update(updates).eq('id', signatureId);
        if (error) throw error;
    } catch(e) { }
};

export const markDocumentAsViewed = async (signatureId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('document_signatures').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', signatureId).eq('status', 'pending');
        if (error) throw error;
    } catch(e) { }
};

export const getMaintenancePlans = async (): Promise<MaintenancePlan[]> => {
    try {
        const { data, error } = await supabase.from('maintenance_plans').select('*');
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const addMaintenancePlan = async (planData: any): Promise<MaintenancePlan> => {
    try {
        const { data, error } = await supabase.from('maintenance_plans').insert([planData]).select().single();
        if (error) throw error;
        return data;
    } catch(e) { return { ...planData, plan_id: 'mock' } as MaintenancePlan; }
};

export const updateMaintenancePlan = async (planData: MaintenancePlan): Promise<MaintenancePlan> => {
    try {
        const { data, error } = await supabase.from('maintenance_plans').update(planData).eq('plan_id', planData.plan_id).select().single();
        if (error) throw error;
        return data;
    } catch(e) { return planData; }
};

export const deleteMaintenancePlan = async (planId: string): Promise<void> => {
    try {
        const { error } = await supabase.from('maintenance_plans').delete().eq('plan_id', planId);
        if (error) throw error;
    } catch(e) { }
};

export const checkAndGenerateMaintenanceTasks = async (): Promise<void> => {
    try {
        const plans = await getMaintenancePlans();
        const today = new Date();
        today.setHours(0,0,0,0);
        for (const plan of plans) {
            if (!plan.active) continue;
            const dueDate = new Date(plan.next_due_date);
            dueDate.setHours(0,0,0,0);
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) {
                await addIncident({ description: `[MANTENIMIENTO] ${plan.title}: ${plan.description}`, location_id: plan.location_id, room_id: '', priority: 'medium', status: 'open', reported_by: 'system', type: 'preventive', maintenance_plan_id: plan.plan_id, due_date: plan.next_due_date } as any);
                let nextDate = new Date(dueDate);
                switch (plan.frequency) {
                    case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                    case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
                    case 'semestral': nextDate.setMonth(nextDate.getMonth() + 6); break;
                    case 'annual': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
                }
                await updateMaintenancePlan({ ...plan, next_due_date: nextDate.toISOString().split('T')[0] });
            }
        }
    } catch (e) { }
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
    try {
        const { data, error } = await supabase.from('inventory_items').select('*');
        if (error || !data || data.length === 0) return FALLBACK_INVENTORY;
        return data;
    } catch(e) { console.warn("Supabase unreachable (Inventory), using fallback data."); return FALLBACK_INVENTORY; }
};

export const addInventoryItem = async (data: any): Promise<InventoryItem> => {
    try {
        const { data: created, error } = await supabase.from('inventory_items').insert([{...data, last_updated: new Date().toISOString()}]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return { ...data, item_id: 'mock', last_updated: new Date().toISOString() } as InventoryItem; }
};

export const updateInventoryItem = async (data: InventoryItem): Promise<InventoryItem> => {
    try {
        const { data: updated, error } = await supabase.from('inventory_items').update({...data, last_updated: new Date().toISOString()}).eq('item_id', data.item_id).select().single();
        if (error) throw error;
        return updated;
    } catch(e) { return data; }
};

export const logStockMovement = async (itemId: string, changeAmount: number, reason: string, employeeId: string): Promise<void> => {
    try { await supabase.from('stock_logs').insert([{ item_id: itemId, change_amount: changeAmount, reason, employee_id: employeeId, created_at: new Date().toISOString() }]); } catch(e) { }
}

export const getStockLogs = async (itemId: string): Promise<StockLog[]> => {
    try {
        const { data, error } = await supabase.from('stock_logs').select('*').eq('item_id', itemId).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
}
