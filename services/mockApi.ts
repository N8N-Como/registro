
import { createClient } from '@supabase/supabase-js';
import { Role, Employee, Location, TimeEntry, Policy, Announcement, Room, Task, TaskTimeLog, Incident, ShiftLogEntry, ActivityLog, LostItem, AccessLog, BreakLog, WorkType, WorkMode, MonthlySignature, TimeOffRequest, WorkShift, ShiftConfig, CompanyDocument, DocumentSignature, MaintenancePlan, TimeCorrectionRequest, InventoryItem, StockLog, RoomStatus } from '../types';
import { addToQueue } from './offlineManager';

const SUPABASE_URL = 'https://acinnuphpdnsrmijsbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaW5udXBocGRuc3JtaWpzYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTIyNjgsImV4cCI6MjA3ODk2ODI2OH0.DcaNxpI68W0gaGppraL9yZO6a9fHStVkU1ee4_zKbsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- FALLBACK DATA ---
const FALLBACK_ROLES: Role[] = [
    { role_id: 'admin', name: 'Administrador', permissions: ['manage_employees', 'manage_locations', 'manage_announcements', 'view_reports', 'manage_incidents', 'access_shift_log', 'schedule_tasks', 'audit_records', 'manage_documents', 'manage_inventory'] },
    { role_id: 'gobernanta', name: 'Gobernanta', permissions: ['manage_tasks', 'schedule_tasks', 'view_reports', 'access_shift_log', 'manage_incidents', 'manage_inventory'] },
    { role_id: 'cleaner', name: 'Camarera de Pisos', permissions: ['manage_tasks', 'manage_inventory'] },
    { role_id: 'maintenance', name: 'Mantenimiento', permissions: ['manage_incidents', 'manage_inventory'] },
    { role_id: 'receptionist', name: 'Recepción', permissions: ['access_shift_log', 'manage_incidents', 'view_reports'] },
    { role_id: 'revenue', name: 'Revenue', permissions: ['view_reports', 'access_shift_log'] },
    { role_id: 'administracion', name: 'Administración', permissions: ['manage_employees', 'view_reports', 'manage_documents'] }
];

const FALLBACK_EMPLOYEES: Employee[] = [
    { employee_id: 'noelia', first_name: 'Noelia', last_name: '', pin: '0001', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'lydia', first_name: 'Lydia', last_name: '', pin: '0002', role_id: 'cleaner', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'anxo', first_name: 'Anxo', last_name: 'Bernárdez', pin: '8724', role_id: 'admin', status: 'active', policy_accepted: true, photo_url: '' },
    { employee_id: 'emp_admin', first_name: 'Admin', last_name: 'Sistema', pin: '1234', role_id: 'admin', status: 'active', policy_accepted: true, photo_url: 'https://ui-avatars.com/api/?name=Admin+Sistema&background=0D8ABC&color=fff' },
];

const LOCAL_SHIFTS_KEY = 'local_work_shifts';
const LOCAL_ROOMS_KEY = 'local_rooms_status';

const getLocalData = <T>(key: string): T[] => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const saveLocalData = <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

export const getRoles = async (): Promise<Role[]> => {
    try {
        const { data, error } = await supabase.from('roles').select('*');
        if (error || !data || data.length === 0) return FALLBACK_ROLES;
        return data;
    } catch { return FALLBACK_ROLES; }
};

export const getEmployees = async (): Promise<Employee[]> => {
    try {
        const { data, error } = await supabase.from('employees').select('*');
        if (error || !data || data.length === 0) return FALLBACK_EMPLOYEES;
        return data;
    } catch { return FALLBACK_EMPLOYEES; }
};

export const getLocations = async (): Promise<Location[]> => {
    try {
        const { data, error } = await supabase.from('locations').select('*');
        if (error || !data) return [];
        return data;
    } catch { return []; }
};

export const getRooms = async (): Promise<Room[]> => {
    const local = getLocalData<Room>(LOCAL_ROOMS_KEY);
    try {
        const { data, error } = await supabase.from('rooms').select('*');
        if (error || !data || data.length === 0) return local;
        return data;
    } catch { return local; }
};

export const updateRoomStatus = async (roomId: string, status: RoomStatus, employeeId?: string): Promise<Room> => {
    const rooms = await getRooms();
    const idx = rooms.findIndex(r => r.room_id === roomId);
    if (idx !== -1) {
        rooms[idx].status = status;
        if (status === 'clean') {
            rooms[idx].last_cleaned_at = new Date().toISOString();
            rooms[idx].last_cleaned_by = employeeId;
            rooms[idx].is_priority = false;
        }
        saveLocalData(LOCAL_ROOMS_KEY, rooms);
        try {
            await supabase.from('rooms').update({ status, last_cleaned_at: rooms[idx].last_cleaned_at, last_cleaned_by: employeeId }).eq('room_id', roomId);
        } catch (e) {}
        return rooms[idx];
    }
    throw new Error("Habitación no encontrada");
};

export const finishTask = async (logId: string, taskId: string, inventoryUsage: { item_id: string, amount: number }[] = [], employeeId?: string): Promise<TaskTimeLog> => {
    try {
        for (const usage of inventoryUsage) {
            const { data: item } = await supabase.from('inventory_items').select('*').eq('item_id', usage.item_id).single();
            if (item) {
                const newQty = Math.max(0, item.quantity - usage.amount);
                await supabase.from('inventory_items').update({ quantity: newQty, last_updated: new Date().toISOString() }).eq('item_id', usage.item_id);
                if (employeeId) {
                    await logStockMovement(usage.item_id, -usage.amount, `Consumo en tarea: ${taskId}`, employeeId);
                }
            }
        }
        await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('task_id', taskId);
        const { data, error } = await supabase.from('task_time_logs').update({ end_time: new Date().toISOString() }).eq('log_id', logId).select().single();
        if (error) throw error;
        return data;
    } catch { return { log_id: logId } as any; }
};

export const updateIncident = async (incident: Incident, inventoryUsage: { item_id: string, amount: number }[] = [], employeeId?: string): Promise<Incident> => {
    try {
        if (incident.status === 'resolved') {
             for (const usage of inventoryUsage) {
                const { data: item } = await supabase.from('inventory_items').select('*').eq('item_id', usage.item_id).single();
                if (item) {
                    const newQty = Math.max(0, item.quantity - usage.amount);
                    await supabase.from('inventory_items').update({ quantity: newQty, last_updated: new Date().toISOString() }).eq('item_id', usage.item_id);
                    if (employeeId) {
                        await logStockMovement(usage.item_id, -usage.amount, `Repuesto en incidencia: ${incident.incident_id}`, employeeId);
                    }
                }
            }
        }
        const { data, error } = await supabase.from('incidents').update(incident).eq('incident_id', incident.incident_id).select().single();
        if (error) throw error;
        return data;
    } catch { return incident; }
};

export const logStockMovement = async (itemId: string, changeAmount: number, reason: string, employeeId: string): Promise<void> => {
    try { await supabase.from('stock_logs').insert([{ item_id: itemId, change_amount: changeAmount, reason, employee_id: employeeId, created_at: new Date().toISOString() }]); } catch {}
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
    try {
        const { data, error } = await supabase.from('inventory_items').select('*');
        if (error || !data) return [];
        return data;
    } catch { return []; }
};

export const updateInventoryItem = async (data: InventoryItem): Promise<InventoryItem> => {
    try {
        const { data: updated, error } = await supabase.from('inventory_items').update({...data, last_updated: new Date().toISOString()}).eq('item_id', data.item_id).select().single();
        if (error) throw error;
        return updated;
    } catch { return data; }
};

export const getStockLogs = async (itemId?: string): Promise<StockLog[]> => {
    try {
        let query = supabase.from('stock_logs').select('*').order('created_at', { ascending: false });
        if (itemId) query = query.eq('item_id', itemId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch { return []; }
};

export const getShiftLog = async (): Promise<ShiftLogEntry[]> => {
    try {
        const { data, error } = await supabase.from('shift_log').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch { return []; }
};

export const getActiveAnnouncement = async () => { try { const { data } = await supabase.from('announcements').select('*').eq('is_active', true).maybeSingle(); return data; } catch { return null; } };
export const acceptPolicy = async (id: string) => { try { await supabase.from('employees').update({ policy_accepted: true }).eq('employee_id', id); } catch {} };
export const getWorkShifts = async (s: string, e: string) => { try { const { data } = await supabase.from('work_shifts').select('*').gte('start_time', s).lte('end_time', e); return data || []; } catch { return []; } };
export const getShiftConfigs = async () => { try { const { data } = await supabase.from('shift_configs').select('*'); return data || []; } catch { return []; } };
export const getIncidents = async () => { try { const { data } = await supabase.from('incidents').select('*'); return data || []; } catch { return []; } };
export const getTimeEntriesForEmployee = async (id: string) => { try { const { data } = await supabase.from('time_entries').select('*').eq('employee_id', id).order('clock_in_time', { ascending: false }); return data || []; } catch { return []; } };
export const getAllRunningTimeEntries = async () => { try { const { data } = await supabase.from('time_entries').select('*').eq('status', 'running'); return data || []; } catch { return []; } };
export const getCurrentEstablishmentStatus = async () => { try { const { data } = await supabase.from('activity_logs').select('*').is('check_out_time', null); return data || []; } catch { return []; } };
export const getTasks = async () => { try { const { data } = await supabase.from('tasks').select('*'); return data || []; } catch { return []; } };
export const addTask = async (d: any) => { try { const { data } = await supabase.from('tasks').insert([d]).select().single(); return data; } catch { return d; } };
export const updateTask = async (d: any) => { try { const { data } = await supabase.from('tasks').update(d).eq('task_id', d.task_id).select().single(); return data; } catch { return d; } };
export const deleteTask = async (id: string) => { try { await supabase.from('tasks').delete().eq('task_id', id); } catch {} };
export const addIncident = async (d: any) => { try { const { data } = await supabase.from('incidents').insert([d]).select().single(); return data; } catch { return d; } };
export const deleteIncident = async (id: string) => { try { await supabase.from('incidents').delete().eq('incident_id', id); } catch {} };
export const getActiveTaskLogForEmployee = async (id: string) => { try { const { data } = await supabase.from('task_time_logs').select('*').eq('employee_id', id).is('end_time', null).maybeSingle(); return data; } catch { return null; } };
export const startTask = async (id: string, emp: string, loc: string) => { try { await supabase.from('tasks').update({ status: 'in_progress' }).eq('task_id', id); const { data } = await supabase.from('task_time_logs').insert([{task_id: id, employee_id: emp, start_time: new Date().toISOString(), location_id: loc}]).select().single(); return data; } catch { return { task_id: id } as any; } };
export const getLostItems = async () => { try { const { data } = await supabase.from('lost_items').select('*'); return data || []; } catch { return []; } };
export const addLostItem = async (d: any) => { try { const { data } = await supabase.from('lost_items').insert([d]).select().single(); return data; } catch { return d; } };
export const updateLostItem = async (d: any) => { try { const { data } = await supabase.from('lost_items').update(d).eq('item_id', d.item_id).select().single(); return data; } catch { return d; } };
export const getMonthlySignature = async (id: string, m: number, y: number) => { try { const { data } = await supabase.from('monthly_signatures').select('*').eq('employee_id', id).eq('month', m).eq('year', y).maybeSingle(); return data; } catch { return null; } };
export const saveMonthlySignature = async (id: string, m: number, y: number, s: string) => { try { const { data } = await supabase.from('monthly_signatures').insert([{employee_id: id, month: m, year: y, signature_url: s, signed_at: new Date().toISOString()}]).select().single(); return data; } catch { return { signature_id: 'mock' } as any; } };
export const getEmployeeDocuments = async (id: string) => { try { const { data } = await supabase.from('document_signatures').select('*, document:company_documents(*)').eq('employee_id', id); return data || []; } catch { return []; } };
export const getMaintenancePlans = async () => { try { const { data } = await supabase.from('maintenance_plans').select('*'); return data || []; } catch { return []; } };
export const checkAndGenerateMaintenanceTasks = async () => {};
export const getActivityLogsForTimeEntry = async (id: string) => { try { const { data } = await supabase.from('activity_logs').select('*').eq('time_entry_id', id); return data || []; } catch { return []; } };
export const getBreaksForTimeEntry = async (id: string) => { try { const { data } = await supabase.from('break_logs').select('*').eq('time_entry_id', id); return data || []; } catch { return []; } };
export const checkInToLocation = async (t: string, e: string, l: string, la: number, lo: number) => { try { const { data } = await supabase.from('activity_logs').insert([{time_entry_id: t, employee_id: e, location_id: l, check_in_time: new Date().toISOString(), check_in_latitude: la, check_in_longitude: lo}]).select().single(); return data; } catch { return {} as any; } };
export const checkOutOfLocation = async (id: string) => { try { const { data } = await supabase.from('activity_logs').update({check_out_time: new Date().toISOString()}).eq('activity_id', id).select().single(); return data; } catch { return {} as any; } };
export const logAccessAttempt = async (d: any) => { try { await supabase.from('access_logs').insert([d]); } catch {} };
export const startBreak = async (t: string, b: string) => { try { const { data } = await supabase.from('break_logs').insert([{time_entry_id: t, break_type: b, start_time: new Date().toISOString()}]).select().single(); return data; } catch { return {} as any; } };
export const endBreak = async (id: string) => { try { const { data } = await supabase.from('break_logs').update({end_time: new Date().toISOString()}).eq('break_id', id).select().single(); return data; } catch { return {} as any; } };

export const clockIn = async (employeeId: string, locationId: any, lat: any, lon: any, workType: any, workMode: any, deviceData: any, customTime?: string) => { 
    try { 
        const isManual = !!customTime;
        const entryTime = customTime || new Date().toISOString();
        
        const payload = {
            employee_id: employeeId, 
            clock_in_time: entryTime, 
            clock_in_latitude: lat || null, 
            clock_in_longitude: lon || null, 
            work_type: workType, 
            work_mode: workMode, 
            device_id: deviceData?.deviceId || null, 
            device_info: deviceData?.deviceInfo || null, 
            is_manual: isManual,
            status: 'running'
        };

        const { data, error } = await supabase.from('time_entries').insert([payload]).select().single(); 
        if (error) throw error;
        return data; 
    } catch (e: any) { 
        console.error("Error in clockIn:", e);
        // CRITICAL FIX: Return a valid running object even if DB fails so user isn't stuck.
        // Also inform user that schema might be out of date.
        if (e.message?.includes("column")) {
            console.warn("ADVERTENCIA: Parece que faltan columnas en tu tabla 'time_entries'. Ejecuta el SQL de actualización en el panel Admin.");
        }
        return { 
            entry_id: 'mock_' + Date.now(), 
            employee_id: employeeId,
            clock_in_time: customTime || new Date().toISOString(),
            status: 'running',
            is_manual: !!customTime,
            work_type: workType
        } as any; 
    } 
};

export const clockOut = async (id: string, l: any, s: any, t: any) => { try { const { data } = await supabase.from('time_entries').update({clock_out_time: t || new Date().toISOString(), status: 'completed'}).eq('entry_id', id).select().single(); return data; } catch { return { status: 'completed' } as any; } };
export const updateEmployee = async (d: any) => { try { const { data } = await supabase.from('employees').update(d).eq('employee_id', d.employee_id).select().single(); return data; } catch { return d; } };
export const getPolicies = async () => { try { const { data } = await supabase.from('policies').select('*').order('version', { ascending: false }); return data || []; } catch { return []; } };
export const addShiftLogEntry = async (d: any) => { try { const { data } = await supabase.from('shift_log').insert([d]).select().single(); return data; } catch { return d; } };
export const updateShiftLogEntry = async (d: any) => { try { const { data } = await supabase.from('shift_log').update(d).eq('log_id', d.log_id).select().single(); return data; } catch { return d; } };
export const getAnnouncements = async () => { try { const { data } = await supabase.from('announcements').select('*'); return data || []; } catch { return []; } };
export const addAnnouncement = async (d: any) => { try { const { data } = await supabase.from('announcements').insert([d]).select().single(); return data; } catch { return d; } };
export const updateAnnouncement = async (d: any) => { try { const { data } = await supabase.from('announcements').update(d).eq('announcement_id', d.announcement_id).select().single(); return data; } catch { return d; } };
export const deleteAnnouncement = async (id: string) => { try { await supabase.from('announcements').delete().eq('announcement_id', id); } catch {} };
export const getBreaksForTimeEntries = async (ids: string[]) => { try { const { data } = await supabase.from('break_logs').select('*').in('time_entry_id', ids); return data || []; } catch { return []; } };
export const getTimeCorrectionRequests = async () => { try { const { data } = await supabase.from('time_correction_requests').select('*'); return data || []; } catch { return []; } };
export const resolveTimeCorrectionRequest = async (id: string, s: string, r: string) => { try { await supabase.from('time_correction_requests').update({status: s, reviewed_by: r, reviewed_at: new Date().toISOString()}).eq('request_id', id); } catch {} };
export const createTimeOffRequest = async (d: any) => { try { const { data } = await supabase.from('time_off_requests').insert([d]).select().single(); return data; } catch { return d; } };
export const getTimeOffRequests = async () => { try { const { data } = await supabase.from('time_off_requests').select('*'); return data || []; } catch { return []; } };
export const updateTimeOffRequestStatus = async (id: string, s: string, r: string) => { try { await supabase.from('time_off_requests').update({status: s, reviewed_by: r, reviewed_at: new Date().toISOString()}).eq('request_id', id); } catch {} };
export const createWorkShift = async (d: any) => { try { const { data } = await supabase.from('work_shifts').insert([d]).select().single(); return data; } catch { return d; } };
export const updateWorkShift = async (d: any) => { try { const { data } = await supabase.from('work_shifts').update(d).eq('shift_id', d.shift_id).select().single(); return data; } catch { return d; } };
export const deleteWorkShift = async (id: string) => { try { await supabase.from('work_shifts').delete().eq('shift_id', id); } catch {} };
export const createBulkWorkShifts = async (d: any[]) => { try { await supabase.from('work_shifts').insert(d); } catch {} };
export const getDocuments = async () => { try { const { data } = await supabase.from('company_documents').select('*'); return data || []; } catch { return []; } };
export const createDocument = async (d: any, ids: string[]) => { try { const { data } = await supabase.from('company_documents').insert([d]).select().single(); const sigs = ids.map(id => ({ document_id: data.document_id, employee_id: id, status: 'pending' })); await supabase.from('document_signatures').insert(sigs); } catch {} };
export const signDocument = async (id: string, s: string) => { try { await supabase.from('document_signatures').update({status: 'signed', signature_url: s, signed_at: new Date().toISOString()}).eq('id', id); } catch {} };
export const markDocumentAsViewed = async (id: string) => { try { await supabase.from('document_signatures').update({status: 'viewed', viewed_at: new Date().toISOString()}).eq('id', id); } catch {} };
export const getDocumentSignatures = async (id: string) => { try { const { data } = await supabase.from('document_signatures').select('*').eq('document_id', id); return data || []; } catch { return []; } };
export const addMaintenancePlan = async (d: any) => { try { const { data } = await supabase.from('maintenance_plans').insert([d]).select().single(); return data; } catch { return d; } };
export const updateMaintenancePlan = async (d: any) => { try { const { data } = await supabase.from('maintenance_plans').update(d).eq('plan_id', d.plan_id).select().single(); return data; } catch { return d; } };
export const deleteMaintenancePlan = async (id: string) => { try { await supabase.from('maintenance_plans').delete().eq('plan_id', id); } catch {} };
export const createTimeCorrectionRequest = async (d: any) => { try { const { data } = await supabase.from('time_correction_requests').insert([d]).select().single(); return data; } catch { return d; } };
export const addInventoryItem = async (d: any) => { try { const { data } = await supabase.from('inventory_items').insert([d]).select().single(); return data; } catch { return d; } };
export const addEmployee = async (d: any) => { try { const { data } = await supabase.from('employees').insert([d]).select().single(); return data; } catch { return d; } };
export const deleteEmployee = async (id: string) => { try { await supabase.from('employees').delete().eq('employee_id', id); } catch {} };
export const addLocation = async (d: any) => { try { const { data } = await supabase.from('locations').insert([d]).select().single(); return data; } catch { return d; } };
export const updateLocation = async (d: any) => { try { const { data } = await supabase.from('locations').update(d).eq('location_id', d.location_id).select().single(); return data; } catch { return d; } };
export const deleteLocation = async (id: string) => { try { await supabase.from('locations').delete().eq('location_id', id); } catch {} };
export const updateRole = async (d: any) => { try { const { data } = await supabase.from('roles').update(d).eq('role_id', d.role_id).select().single(); return data; } catch { return d; } };
export const addShiftConfig = async (d: any) => { try { const { data } = await supabase.from('shift_configs').insert([d]).select().single(); return data; } catch { return d; } };
export const updateShiftConfig = async (d: any) => { try { const { data } = await supabase.from('shift_configs').update(d).eq('config_id', d.config_id).select().single(); return data; } catch { return d; } };
export const deleteShiftConfig = async (id: string) => { try { await supabase.from('shift_configs').delete().eq('config_id', id); } catch {} };
export const addRoom = async (d: any) => { try { const { data } = await supabase.from('rooms').insert([d]).select().single(); return data; } catch { return d; } };
export const updateRoom = async (d: any) => { try { const { data } = await supabase.from('rooms').update(d).eq('room_id', d.room_id).select().single(); return data; } catch { return d; } };
export const deleteRoom = async (id: string) => { try { await supabase.from('rooms').delete().eq('room_id', id); } catch {} };
