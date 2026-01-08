
import { createClient } from '@supabase/supabase-js';
import { Role, Employee, Location, TimeEntry, Policy, Announcement, Room, Task, TaskTimeLog, Incident, ShiftLogEntry, ActivityLog, LostItem, AccessLog, BreakLog, WorkType, WorkMode, MonthlySignature, TimeOffRequest, WorkShift, ShiftConfig, CompanyDocument, DocumentSignature, MaintenancePlan, TimeCorrectionRequest, InventoryItem, StockLog, RoomStatus } from '../types';

const SUPABASE_URL = 'https://acinnuphpdnsrmijsbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaW5udXBocGRuc3JtaWpzYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTIyNjgsImV4cCI6MjA3ODk2ODI2OH0.DcaNxpI68W0gaGppraL9yZO6a9fHStVkU1ee4_zKbsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- HELPER PARA MODO OFFLINE ---
const ensureOnline = () => {
    if (!navigator.onLine) throw new Error("Offline");
};

// --- MÉTODOS DE SISTEMA ---
export const getMaintenanceMode = async (): Promise<boolean> => {
    try {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
        return data?.value === true;
    } catch { return false; }
};

export const setMaintenanceMode = async (enabled: boolean) => {
    ensureOnline();
    await supabase.from('app_settings').upsert({ key: 'maintenance_mode', value: enabled, updated_at: new Date().toISOString() });
};

export const getClosedMonths = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'closed_months').maybeSingle();
    return (data?.value || []) as string[]; 
};

export const closeMonth = async (monthYear: string) => {
    ensureOnline();
    const current = await getClosedMonths();
    if (current.includes(monthYear)) return;
    const newList = [...current, monthYear];
    await supabase.from('app_settings').upsert({ key: 'closed_months', value: newList, updated_at: new Date().toISOString() });
};

export const isDateLocked = async (date: string) => {
    const monthYear = date.substring(0, 7); 
    const closed = await getClosedMonths();
    return closed.includes(monthYear);
};

// --- DOCUMENTOS ---
export const getDocuments = async (): Promise<CompanyDocument[]> => {
    const { data } = await supabase.from('company_documents').select('*').order('created_at', { ascending: false });
    return data || [];
};

export const deleteDocument = async (id: string) => {
    ensureOnline();
    await supabase.from('company_documents').delete().eq('document_id', id);
};

export const createDocument = async (d: any, ids: string[]) => { 
    ensureOnline();
    const { data, error } = await supabase.from('company_documents').insert([d]).select(); 
    if (error) throw error;
    const createdDoc = data[0];
    const sigs = ids.map(id => ({ document_id: createdDoc.document_id, employee_id: id, status: 'pending' })); 
    await supabase.from('document_signatures').insert(sigs); 
    return createdDoc; 
};

export const getEmployeeDocuments = async (id: string) => {
    const { data } = await supabase.from('document_signatures').select('*, document:company_documents(*)').eq('employee_id', id);
    return data || [];
};

export const signDocument = async (id: string, s: string) => { 
    ensureOnline();
    await supabase.from('document_signatures').update({status: 'signed', signature_url: s, signed_at: new Date().toISOString()}).eq('id', id); 
};

export const markDocumentAsViewed = async (id: string) => { 
    ensureOnline();
    await supabase.from('document_signatures').update({status: 'viewed', viewed_at: new Date().toISOString()}).eq('id', id); 
};

export const getDocumentSignatures = async (id: string) => { 
    const { data } = await supabase.from('document_signatures').select('*').eq('document_id', id); 
    return data || []; 
};

// --- OPERACIONES ---
export const getRoles = async (): Promise<Role[]> => { const { data } = await supabase.from('roles').select('*'); return data || []; };
export const updateRole = async (d: any) => { ensureOnline(); const { data } = await supabase.from('roles').update(d).eq('role_id', d.role_id).select().single(); return data; };
export const getEmployees = async (): Promise<Employee[]> => { const { data } = await supabase.from('employees').select('*').order('first_name'); return data || []; };
export const getLocations = async (): Promise<Location[]> => { const { data } = await supabase.from('locations').select('*'); return data || []; };
export const addLocation = async (d: any) => { ensureOnline(); const { data } = await supabase.from('locations').insert([d]).select().single(); return data; };
export const updateLocation = async (d: any) => { ensureOnline(); const { data } = await supabase.from('locations').update(d).eq('location_id', d.location_id).select().single(); return data; };
export const deleteLocation = async (id: string) => { ensureOnline(); await supabase.from('locations').delete().eq('location_id', id); };
export const getRooms = async (): Promise<Room[]> => { const { data } = await supabase.from('rooms').select('*'); return data || []; };
export const addRoom = async (d: any) => { ensureOnline(); const { data } = await supabase.from('rooms').insert([d]).select().single(); return data; };
export const updateRoom = async (d: any) => { ensureOnline(); const { data } = await supabase.from('rooms').update(d).eq('room_id', d.room_id).select().single(); return data; };
export const deleteRoom = async (id: string) => { ensureOnline(); await supabase.from('rooms').delete().eq('room_id', id); };
export const updateRoomStatus = async (roomId: string, status: RoomStatus, employeeId?: string): Promise<Room> => { ensureOnline(); const { data } = await supabase.from('rooms').update({ status }).eq('room_id', roomId).select().single(); return data; };

// --- FICHAJES ---
export const getTimeEntriesForEmployee = async (id: string) => { const { data } = await supabase.from('time_entries').select('*').eq('employee_id', id).order('clock_in_time', { ascending: false }); return (data || []) as TimeEntry[]; };
export const getAllRunningTimeEntries = async () => { const { data } = await supabase.from('time_entries').select('*').eq('status', 'running'); return (data || []) as TimeEntry[]; };
export const clockIn = async (employeeId: string, locationId: any, lat: any, lon: any, workType: any, workMode: any, deviceData: any, customTime?: string) => { ensureOnline(); const payload = { employee_id: employeeId, clock_in_time: customTime || new Date().toISOString(), clock_in_latitude: lat || null, clock_in_longitude: lon || null, work_type: workType, work_mode: workMode, device_id: deviceData?.deviceId || null, device_info: deviceData?.deviceInfo || null, is_manual: !!customTime, status: 'running' }; const { data } = await supabase.from('time_entries').insert([payload]).select().single(); return data; };
export const clockOut = async (id: string, l: any, isManual: boolean, t: any, deviceData?: any) => { ensureOnline(); const { data } = await supabase.from('time_entries').update({ clock_out_time: t || new Date().toISOString(), status: 'completed', device_info: deviceData?.deviceInfo ? `OUT: ${deviceData.deviceInfo}` : undefined }).eq('entry_id', id).select().single(); return data; };
export const checkInToLocation = async (timeEntryId: string, employeeId: string, locationId: string, lat: number, lon: number) => { ensureOnline(); const { data } = await supabase.from('activity_logs').insert([{ time_entry_id: timeEntryId, employee_id: employeeId, location_id: locationId, check_in_time: new Date().toISOString(), check_in_latitude: lat, check_in_longitude: lon }]).select().single(); return data; };
export const checkOutOfLocation = async (activityId: string) => { ensureOnline(); const { data } = await supabase.from('activity_logs').update({check_out_time: new Date().toISOString()}).eq('activity_id', activityId).select().single(); return data; };
export const getActivityLogsForTimeEntry = async (id: string) => { const { data } = await supabase.from('activity_logs').select('*').eq('time_entry_id', id); return (data || []) as ActivityLog[]; };

// --- INCIDENCIAS ---
export const getIncidents = async () => { const { data } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }); return data || []; };
export const addIncident = async (d: any) => { ensureOnline(); const { data } = await supabase.from('incidents').insert([d]).select(); return data![0]; };
export const updateIncident = async (d: any) => { ensureOnline(); const { data } = await supabase.from('incidents').update(d).eq('incident_id', d.incident_id).select(); return data![0]; };
export const deleteIncident = async (id: string) => { ensureOnline(); await supabase.from('incidents').delete().eq('incident_id', id); };

// --- PERSONAL ---
export const addEmployee = async (d: any) => { ensureOnline(); const { data } = await supabase.from('employees').insert([d]).select().single(); return data; };
export const updateEmployee = async (d: any) => { ensureOnline(); const { data } = await supabase.from('employees').update(d).eq('employee_id', d.employee_id).select().single(); return data; };
export const deleteEmployee = async (id: string) => { ensureOnline(); await supabase.from('employees').delete().eq('employee_id', id); };

// --- TURNOS ---
export const getWorkShifts = async (s: string, e: string) => { const { data } = await supabase.from('work_shifts').select('*').gte('start_time', s).lte('end_time', e); return (data || []) as WorkShift[]; };
export const getShiftConfigs = async () => { const { data } = await supabase.from('shift_configs').select('*').order('code'); return data || []; };
export const createWorkShift = async (d: any) => { ensureOnline(); const { data } = await supabase.from('work_shifts').insert([d]).select().single(); return data; };
export const updateWorkShift = async (d: any) => { ensureOnline(); const { data } = await supabase.from('work_shifts').update(d).eq('shift_id', d.shift_id).select().single(); return data; };
export const deleteWorkShift = async (id: string) => { ensureOnline(); await supabase.from('work_shifts').delete().eq('shift_id', id); };
export const createBulkWorkShifts = async (d: any[]) => { ensureOnline(); await supabase.from('work_shifts').insert(d); };
export const addShiftConfig = async (d: any) => { ensureOnline(); const { data } = await supabase.from('shift_configs').insert([d]).select().single(); return data; };
export const updateShiftConfig = async (d: any) => { ensureOnline(); const { data } = await supabase.from('shift_configs').update(d).eq('config_id', d.config_id).select().single(); return data; };
export const deleteShiftConfig = async (id: string) => { ensureOnline(); await supabase.from('shift_configs').delete().eq('config_id', id); };

// --- CORRECCIONES ---
export const getTimeCorrectionRequests = async () => { const { data } = await supabase.from('time_correction_requests').select('*').order('created_at', { ascending: false }); return (data || []) as TimeCorrectionRequest[]; };
export const createTimeCorrectionRequest = async (d: any) => { const locked = await isDateLocked(d.requested_date); if (locked) throw new Error("El mes está cerrado."); ensureOnline(); await supabase.from('time_correction_requests').insert([d]); return d; };
export const resolveTimeCorrectionRequest = async (id: string, status: string, reviewerId: string) => { ensureOnline(); const { data } = await supabase.from('time_correction_requests').update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }).eq('request_id', id).select().single(); return data; };

// --- OTROS ---
export const getMonthlySignature = async (id: string, m: number, y: number) => { const { data } = await supabase.from('monthly_signatures').select('*').eq('employee_id', id).eq('month', m).eq('year', y).maybeSingle(); return data; };
export const saveMonthlySignature = async (id: string, m: number, y: number, s: string) => { ensureOnline(); const { data } = await supabase.from('monthly_signatures').insert([{employee_id: id, month: m, year: y, signature_url: s, signed_at: new Date().toISOString()}]).select().single(); return data; };
export const getBreaksForTimeEntries = async (ids: string[]) => { const { data } = await supabase.from('break_logs').select('*').in('time_entry_id', ids); return data || []; };
export const startBreak = async (t: string, b: string) => { ensureOnline(); const { data } = await supabase.from('break_logs').insert([{time_entry_id: t, break_type: b, start_time: new Date().toISOString()}]).select().single(); return data; };
export const endBreak = async (id: string) => { ensureOnline(); const { data } = await supabase.from('break_logs').update({end_time: new Date().toISOString()}).eq('break_id', id).select().single(); return data; };
export const getTimeOffRequests = async () => { const { data } = await supabase.from('time_off_requests').select('*').order('created_at', { ascending: false }); return data || []; };
export const createTimeOffRequest = async (d: any) => { ensureOnline(); const { data } = await supabase.from('time_off_requests').insert([d]).select().single(); return data; };
export const updateTimeOffRequestStatus = async (id: string, s: string, r: string) => { ensureOnline(); await supabase.from('time_off_requests').update({status: s, reviewed_by: r, reviewed_at: new Date().toISOString()}).eq('request_id', id); };
export const deleteTimeOffRequest = async (id: string) => { ensureOnline(); await supabase.from('time_off_requests').delete().eq('request_id', id); };
export const getInventoryItems = async (): Promise<InventoryItem[]> => { const { data } = await supabase.from('inventory_items').select('*').order('name'); return data || []; };
export const addInventoryItem = async (d: any) => { ensureOnline(); const { data } = await supabase.from('inventory_items').insert([d]).select().single(); return data; };
export const updateInventoryItem = async (data: any) => { ensureOnline(); const { data: updated } = await supabase.from('inventory_items').update({...data, last_updated: new Date().toISOString()}).eq('item_id', data.item_id).select().single(); return updated || data; };
export const deleteInventoryItem = async (id: string) => { ensureOnline(); await supabase.from('inventory_items').delete().eq('item_id', id); };
export const logStockMovement = async (itemId: string, changeAmount: number, reason: string, employeeId: string) => { ensureOnline(); await supabase.from('stock_logs').insert([{ item_id: itemId, change_amount: changeAmount, reason, employee_id: employeeId, created_at: new Date().toISOString() }]); };
export const getStockLogs = async (itemId?: string): Promise<StockLog[]> => { let q = supabase.from('stock_logs').select('*').order('created_at', { ascending: false }); if (itemId) q = q.eq('item_id', itemId); const { data } = await q; return data || []; };
export const getShiftLog = async (): Promise<ShiftLogEntry[]> => { const { data } = await supabase.from('shift_log').select('*').order('created_at', { ascending: false }); return data || []; };
export const addShiftLogEntry = async (d: any) => { ensureOnline(); const { data } = await supabase.from('shift_log').insert([d]).select().single(); return data; };
export const updateShiftLogEntry = async (data: any) => { ensureOnline(); const { data: updated } = await supabase.from('shift_log').update(data).eq('log_id', data.log_id).select().single(); return updated; };
export const deleteShiftLogEntry = async (id: string) => { ensureOnline(); await supabase.from('shift_log').delete().eq('log_id', id); };
export const getAnnouncements = async () => { const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }); return data || []; };
export const addAnnouncement = async (d: any) => { ensureOnline(); const { data } = await supabase.from('announcements').insert([d]).select().single(); return data; };
export const updateAnnouncement = async (d: any) => { ensureOnline(); const { data: updated } = await supabase.from('announcements').update(d).eq('announcement_id', d.announcement_id).select().single(); return updated; };
export const deleteAnnouncement = async (id: string) => { ensureOnline(); await supabase.from('announcements').delete().eq('announcement_id', id); };
export const getPolicies = async () => { const { data } = await supabase.from('policies').select('*').order('version', { ascending: false }); return data || []; };
export const acceptPolicy = async (id: string) => { ensureOnline(); await supabase.from('employees').update({ policy_accepted: true }).eq('employee_id', id); };
export const getLostItems = async () => { const { data } = await supabase.from('lost_items').select('*').order('found_date', { ascending: false }); return data || []; };
export const addLostItem = async (d: any) => { ensureOnline(); const { data } = await supabase.from('lost_items').insert([d]).select().single(); return data; };
export const updateLostItem = async (d: any) => { ensureOnline(); const { data } = await supabase.from('lost_items').update(d).eq('item_id', d.item_id).select().single(); return data; };
export const deleteLostItem = async (id: string) => { ensureOnline(); await supabase.from('lost_items').delete().eq('item_id', id); };
export const getActiveTaskLogForEmployee = async (id: string) => { const { data } = await supabase.from('task_time_logs').select('*').eq('employee_id', id).is('end_time', null).maybeSingle(); return data; };
export const startTask = async (id: string, emp: string, loc: string) => { ensureOnline(); await supabase.from('tasks').update({ status: 'in_progress' }).eq('task_id', id); const { data } = await supabase.from('task_time_logs').insert([{task_id: id, employee_id: emp, start_time: new Date().toISOString(), location_id: loc}]).select().single(); return data; };
export const finishTask = async (logId: string, taskId: string, inventoryUsage: any[] = [], employeeId?: string) => { ensureOnline(); await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('task_id', taskId); const { data } = await supabase.from('task_time_logs').update({ end_time: new Date().toISOString() }).eq('log_id', logId).select().single(); return data; };
export const getTasks = async () => { const { data } = await supabase.from('tasks').select('*'); return data || []; };
export const addTask = async (d: any) => { ensureOnline(); const { data } = await supabase.from('tasks').insert([d]).select().single(); return data; };
export const updateTask = async (data: any) => { ensureOnline(); const { data: updated } = await supabase.from('tasks').update(data).eq('task_id', data.task_id).select().single(); return updated || data; };
export const deleteTask = async (id: string) => { ensureOnline(); await supabase.from('tasks').delete().eq('task_id', id); };
export const getMaintenancePlans = async () => { const { data } = await supabase.from('maintenance_plans').select('*').order('next_due_date', { ascending: true }); return data || []; };
export const addMaintenancePlan = async (d: any) => { ensureOnline(); const { data } = await supabase.from('maintenance_plans').insert([d]).select(); return data![0]; };
export const updateMaintenancePlan = async (d: any) => { ensureOnline(); const { data } = await supabase.from('maintenance_plans').update(d).eq('plan_id', d.plan_id).select(); return data![0]; };
export const deleteMaintenancePlan = async (id: string) => { ensureOnline(); await supabase.from('maintenance_plans').delete().eq('plan_id', id); };
export const logAccessAttempt = async (d: any) => { ensureOnline(); await supabase.from('access_logs').insert([d]); };
export const getCurrentEstablishmentStatus = async () => { const { data } = await supabase.from('activity_logs').select('*').is('check_out_time', null); return (data || []) as ActivityLog[]; };
export const getBreaksForTimeEntry = async (id: string) => { const { data } = await supabase.from('break_logs').select('*').eq('time_entry_id', id); return (data || []) as BreakLog[]; };
export const checkAndGenerateMaintenanceTasks = async () => { return true; };
