
import { createClient } from '@supabase/supabase-js';
import { Role, Employee, Location, TimeEntry, Policy, Announcement, Room, Task, TaskTimeLog, Incident, ShiftLogEntry, ActivityLog, LostItem, AccessLog, BreakLog, WorkType, WorkMode, MonthlySignature, TimeOffRequest, WorkShift, ShiftConfig, CompanyDocument, DocumentSignature, MaintenancePlan, TimeCorrectionRequest, InventoryItem, StockLog, RoomStatus } from '../types';

const SUPABASE_URL = 'https://acinnuphpdnsrmijsbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaW5udXBocGRuc3JtaWpzYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTIyNjgsImV4cCI6MjA3ODk2ODI2OH0.DcaNxpI68W0gaGppraL9yZO6a9fHStVkU1ee4_zKbsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ensureOnline = () => { if (!navigator.onLine) throw new Error("Offline"); };

const handleError = (error: any) => {
    if (!error) return;
    if (error.code === 'PGRST204' || error.code === '42P01' || (error.message && (error.message.includes('column') || error.message.includes('table')))) {
        throw new Error(`ERROR DE ESQUEMA: Falta una columna o tabla. 1) Ejecuta el script SQL en el Editor de Supabase. 2) Ejecuta el comando SQL: NOTIFY pgrst, 'reload schema';`);
    }
    const msg = error.message || error.details || error.hint || JSON.stringify(error);
    throw new Error(msg);
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
    const { error } = await supabase.from('app_settings').upsert({ key: 'maintenance_mode', value: enabled, updated_at: new Date().toISOString() });
    if (error) handleError(error);
};

export const getClosedMonths = async () => {
    try {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'closed_months').maybeSingle();
        return (data?.value || []) as string[]; 
    } catch { return []; }
};

export const closeMonth = async (monthYear: string) => {
    ensureOnline();
    const current = await getClosedMonths();
    if (current.includes(monthYear)) return;
    const newList = [...current, monthYear];
    const { error } = await supabase.from('app_settings').upsert({ key: 'closed_months', value: newList, updated_at: new Date().toISOString() });
    if (error) handleError(error);
};

export const isDateLocked = async (date: string) => {
    const monthYear = date.substring(0, 7); 
    const closed = await getClosedMonths();
    return closed.includes(monthYear);
};

// --- DOCUMENTOS ---
export const getDocuments = async (): Promise<CompanyDocument[]> => {
    const { data, error } = await supabase.from('company_documents').select('*').order('created_at', { ascending: false });
    if (error) handleError(error);
    return data || [];
};

export const deleteDocument = async (id: string) => {
    ensureOnline();
    const { error } = await supabase.from('company_documents').delete().eq('document_id', id);
    if (error) handleError(error);
};

export const createDocument = async (d: any, ids: string[]) => { 
    ensureOnline();
    const { data, error } = await supabase.from('company_documents').insert([d]).select(); 
    if (error) handleError(error);
    if (!data || data.length === 0) throw new Error("Error al crear documento");
    const createdDoc = data[0];
    const sigs = ids.map(id => ({ document_id: createdDoc.document_id, employee_id: id, status: 'pending' })); 
    const { error: sigError } = await supabase.from('document_signatures').insert(sigs); 
    if (sigError) handleError(sigError);
    return createdDoc; 
};

export const getEmployeeDocuments = async (id: string) => {
    const { data, error } = await supabase.from('document_signatures').select('*, document:company_documents(*)').eq('employee_id', id);
    if (error) handleError(error);
    return data || [];
};

export const signDocument = async (id: string, s: string) => { 
    ensureOnline();
    const { error } = await supabase.from('document_signatures').update({status: 'signed', signature_url: s, signed_at: new Date().toISOString()}).eq('id', id); 
    if (error) handleError(error);
};

export const markDocumentAsViewed = async (id: string) => { 
    ensureOnline();
    const { error } = await supabase.from('document_signatures').update({status: 'viewed', viewed_at: new Date().toISOString()}).eq('id', id); 
    if (error) handleError(error);
};

export const getDocumentSignatures = async (id: string) => { 
    const { data, error } = await supabase.from('document_signatures').select('*').eq('document_id', id); 
    if (error) handleError(error);
    return data || []; 
};

// --- OPERACIONES ---
export const getRoles = async (): Promise<Role[]> => { const { data, error } = await supabase.from('roles').select('*'); if(error) handleError(error); return data || []; };
export const updateRole = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('roles').update(d).eq('role_id', d.role_id).select(); if (error) handleError(error); return data ? data[0] : d; };
export const getEmployees = async (): Promise<Employee[]> => { const { data, error } = await supabase.from('employees').select('*').order('first_name'); if(error) handleError(error); return data || []; };

export const addEmployee = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('employees').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateEmployee = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('employees').update(d).eq('employee_id', d.employee_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const deleteEmployee = async (id: string) => { ensureOnline(); const { error } = await supabase.from('employees').delete().eq('employee_id', id); if (error) handleError(error); };

export const acceptPolicy = async (id: string) => { ensureOnline(); const { error } = await supabase.from('employees').update({ policy_accepted: true }).eq('employee_id', id); if (error) handleError(error); };

export const getLocations = async (): Promise<Location[]> => { const { data, error } = await supabase.from('locations').select('*'); if(error) handleError(error); return data || []; };
export const addLocation = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('locations').insert([d]).select(); if (error) handleError(error); return data ? data[0] : d; };
export const updateLocation = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('locations').update(d).eq('location_id', d.location_id).select(); if (error) handleError(error); return data ? data[0] : d; };
export const deleteLocation = async (id: string) => { ensureOnline(); const { error } = await supabase.from('locations').delete().eq('location_id', id); if (error) handleError(error); };
export const getRooms = async (): Promise<Room[]> => { const { data, error } = await supabase.from('rooms').select('*').order('name'); if(error) handleError(error); return data || []; };
export const addRoom = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('rooms').insert([d]).select(); if (error) handleError(error); return data ? data[0] : d; };
export const updateRoom = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('rooms').update(d).eq('room_id', d.room_id).select(); if (error) handleError(error); return data ? data[0] : d; };
export const deleteRoom = async (id: string) => { ensureOnline(); const { error } = await supabase.from('rooms').delete().eq('room_id', id); if (error) handleError(error); };
export const updateRoomStatus = async (roomId: string, status: RoomStatus, employeeId?: string): Promise<Room> => { ensureOnline(); const { data, error } = await supabase.from('rooms').update({ status }).eq('room_id', roomId).select(); if (error) handleError(error); return data ? data[0] : null; };

// --- FICHAJES ---
export const getTimeEntriesForEmployee = async (id: string) => { const { data, error } = await supabase.from('time_entries').select('*').eq('employee_id', id).order('clock_in_time', { ascending: false }); if(error) handleError(error); return (data || []) as TimeEntry[]; };
export const getAllRunningTimeEntries = async () => { const { data, error } = await supabase.from('time_entries').select('*').eq('status', 'running'); if(error) handleError(error); return (data || []) as TimeEntry[]; };

export const clockIn = async (employeeId: string, locationId: any, lat: any, lon: any, workType: any, workMode: any, deviceData: any, customTime?: string) => { 
    ensureOnline(); 
    const payload = { 
        employee_id: employeeId, 
        clock_in_location_id: locationId || null,
        clock_in_time: customTime || new Date().toISOString(), 
        clock_in_latitude: lat || null, 
        clock_in_longitude: lon || null, 
        work_type: workType, 
        work_mode: workMode, 
        device_id: deviceData?.deviceId || null, 
        device_info: deviceData?.deviceInfo || null, 
        is_manual: !!customTime, 
        status: 'running' 
    }; 
    const { data, error } = await supabase.from('time_entries').insert([payload]).select(); 
    if (error) handleError(error); 
    return data ? data[0] : null; 
};

export const clockOut = async (id: string, l: any, isManual: boolean, t: any, deviceData?: any) => { 
    ensureOnline(); 
    const { data, error } = await supabase.from('time_entries').update({ 
        clock_out_time: t || new Date().toISOString(), 
        status: 'completed', 
        device_info: deviceData?.deviceInfo ? `OUT: ${deviceData.deviceInfo}` : undefined 
    }).eq('entry_id', id).select(); 
    if (error) handleError(error); 
    return data ? data[0] : null; 
};

// --- ACTIVITY LOGS ---
export const getActivityLogsForTimeEntry = async (entryId: string) => { const { data, error } = await supabase.from('activity_logs').select('*').eq('time_entry_id', entryId); if (error) handleError(error); return data || []; };
export const getCurrentEstablishmentStatus = async () => { const { data, error } = await supabase.from('activity_logs').select('*').is('check_out_time', null); if (error) handleError(error); return data || []; };
export const checkInToLocation = async (entryId: string, empId: string, locId: string, lat: number, lon: number) => { ensureOnline(); const { data, error } = await supabase.from('activity_logs').insert([{ time_entry_id: entryId, employee_id: empId, location_id: locId, check_in_time: new Date().toISOString(), check_in_latitude: lat, check_in_longitude: lon }]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const checkOutOfLocation = async (activityId: string) => { ensureOnline(); const { data, error } = await supabase.from('activity_logs').update({ check_out_time: new Date().toISOString() }).eq('activity_id', activityId).select(); if (error) handleError(error); return data ? data[0] : null; };

// --- BREAK LOGS ---
export const getBreaksForTimeEntry = async (entryId: string) => { const { data, error } = await supabase.from('break_logs').select('*').eq('time_entry_id', entryId); if (error) handleError(error); return data || []; };
export const getBreaksForTimeEntries = async (entryIds: string[]) => { if (entryIds.length === 0) return []; const { data, error } = await supabase.from('break_logs').select('*').in('time_entry_id', entryIds); if (error) handleError(error); return data || []; };
export const startBreak = async (entryId: string, type: string) => { ensureOnline(); const { data, error } = await supabase.from('break_logs').insert([{ time_entry_id: entryId, break_type: type, start_time: new Date().toISOString() }]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const endBreak = async (breakId: string) => { ensureOnline(); const { data, error } = await supabase.from('break_logs').update({ end_time: new Date().toISOString() }).eq('break_id', breakId).select(); if (error) handleError(error); return data ? data[0] : null; };

// --- TASKS ---
export const getTasks = async (): Promise<Task[]> => { const { data, error } = await supabase.from('tasks').select('*'); if (error) handleError(error); return data || []; };
export const addTask = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('tasks').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateTask = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('tasks').update(d).eq('task_id', d.task_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const deleteTask = async (id: string) => { ensureOnline(); const { error } = await supabase.from('tasks').delete().eq('task_id', id); if (error) handleError(error); };
export const startTask = async (taskId: string, empId: string, locId: string) => { ensureOnline(); const { error: taskErr } = await supabase.from('tasks').update({ status: 'in_progress' }).eq('task_id', taskId); if (taskErr) handleError(taskErr); const { data, error } = await supabase.from('task_time_logs').insert([{ task_id: taskId, employee_id: empId, location_id: locId, start_time: new Date().toISOString() }]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const finishTask = async (logId: string, taskId: string, inventoryUsage: any[], empId: string) => { ensureOnline(); const { error: logErr } = await supabase.from('task_time_logs').update({ end_time: new Date().toISOString() }).eq('log_id', logId); if (logErr) handleError(logErr); const { error: taskErr } = await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('task_id', taskId); if (taskErr) handleError(taskErr); if (inventoryUsage.length > 0) { for (const u of inventoryUsage) { const { data: item } = await supabase.from('inventory_items').select('quantity').eq('item_id', u.item_id).single(); if (item) { const newQty = Math.max(0, item.quantity - u.amount); await supabase.from('inventory_items').update({ quantity: newQty }).eq('item_id', u.item_id); await logStockMovement(u.item_id, -u.amount, 'Tarea finalizada', empId); } } } };
export const getActiveTaskLogForEmployee = async (id: string) => { const { data, error } = await supabase.from('task_time_logs').select('*').eq('employee_id', id).is('end_time', null).maybeSingle(); if (error) handleError(error); return data; };

// --- INVENTORY ---
export const getInventoryItems = async (): Promise<InventoryItem[]> => { const { data, error } = await supabase.from('inventory_items').select('*').order('name'); if (error) handleError(error); return data || []; };
export const addInventoryItem = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('inventory_items').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateInventoryItem = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('inventory_items').update(d).eq('item_id', d.item_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const logStockMovement = async (itemId: string, amount: number, reason: string, empId: string) => { ensureOnline(); const { error } = await supabase.from('stock_logs').insert([{ item_id: itemId, change_amount: amount, reason, employee_id: empId, created_at: new Date().toISOString() }]); if (error) handleError(error); };
export const getStockLogs = async (itemId?: string): Promise<StockLog[]> => { let query = supabase.from('stock_logs').select('*').order('created_at', { ascending: false }); if (itemId) query = query.eq('item_id', itemId); const { data, error } = await query; if (error) handleError(error); return data || []; };

// --- SHIFTS ---
export const getShiftConfigs = async (): Promise<ShiftConfig[]> => { const { data, error } = await supabase.from('shift_configs').select('*').order('code'); if (error) handleError(error); return data || []; };
export const addShiftConfig = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('shift_configs').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateShiftConfig = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('shift_configs').update(d).eq('config_id', d.config_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const deleteShiftConfig = async (id: string) => { ensureOnline(); const { error } = await supabase.from('shift_configs').delete().eq('config_id', id); if (error) handleError(error); };
export const getWorkShifts = async (start: string, end: string): Promise<WorkShift[]> => { const { data, error } = await supabase.from('work_shifts').select('*').gte('start_time', start).lte('start_time', end); if (error) handleError(error); return data || []; };
export const createWorkShift = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('work_shifts').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateWorkShift = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('work_shifts').update(d).eq('shift_id', d.shift_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const deleteWorkShift = async (id: string) => { ensureOnline(); const { error } = await supabase.from('work_shifts').delete().eq('shift_id', id); if (error) handleError(error); };

// --- INCIDENTS ---
export const getIncidents = async (): Promise<Incident[]> => { const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }); if (error) handleError(error); return data || []; };
export const addIncident = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('incidents').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateIncident = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('incidents').update(d).eq('incident_id', d.incident_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const deleteIncident = async (id: string) => { ensureOnline(); const { error } = await supabase.from('incidents').delete().eq('incident_id', id); if (error) handleError(error); };

// --- ANNOUNCEMENTS ---
export const getAnnouncements = async (): Promise<Announcement[]> => { const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }); if (error) handleError(error); return data || []; };
export const addAnnouncement = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('announcements').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateAnnouncement = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('announcements').update(d).eq('announcement_id', d.announcement_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const deleteAnnouncement = async (id: string) => { ensureOnline(); const { error } = await supabase.from('announcements').delete().eq('announcement_id', id); if (error) handleError(error); };

// --- POLICIES ---
export const getPolicies = async (): Promise<Policy[]> => { const { data, error } = await supabase.from('policies').select('*').order('version', { ascending: false }); if (error) handleError(error); return data || []; };

// --- SHIFT LOG ---
export const getShiftLog = async (): Promise<ShiftLogEntry[]> => { const { data, error } = await supabase.from('shift_log').select('*').order('created_at', { ascending: false }); if (error) handleError(error); return data || []; };
export const addShiftLogEntry = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('shift_log').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateShiftLogEntry = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('shift_log').update(d).eq('log_id', d.log_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const deleteShiftLogEntry = async (id: string) => { ensureOnline(); const { error } = await supabase.from('shift_log').delete().eq('log_id', id); if (error) handleError(error); };

// --- TIME CORRECTION REQUESTS ---
export const getTimeCorrectionRequests = async (): Promise<TimeCorrectionRequest[]> => { const { data, error } = await supabase.from('time_correction_requests').select('*').order('created_at', { ascending: false }); if (error) handleError(error); return data || []; };
export const createTimeCorrectionRequest = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('time_correction_requests').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };

// ACTUALIZACIÓN CRÍTICA: Aplica el cambio en la tabla real de fichajes al aprobar
export const resolveTimeCorrectionRequest = async (id: string, status: string, adminId: string) => { 
    ensureOnline(); 
    
    // 1. Obtener la solicitud
    const { data: request, error: reqErr } = await supabase.from('time_correction_requests').select('*').eq('request_id', id).single();
    if (reqErr) handleError(reqErr);

    // 2. Si se aprueba, actualizar o crear el fichaje real
    if (status === 'approved' && request) {
        if (request.original_entry_id) {
            // Actualizar entrada existente
            const updatePayload: any = {};
            if (request.requested_clock_in) updatePayload.clock_in_time = request.requested_clock_in;
            if (request.requested_clock_out) updatePayload.clock_out_time = request.requested_clock_out;
            updatePayload.is_manual = true;
            
            const { error: updateErr } = await supabase.from('time_entries').update(updatePayload).eq('entry_id', request.original_entry_id);
            if (updateErr) handleError(updateErr);
        } else {
            // Crear nueva entrada si no existía (ej: olvidó fichar entrada por completo)
            const insertPayload = {
                employee_id: request.employee_id,
                clock_in_time: request.requested_clock_in || `${request.requested_date}T09:00:00Z`,
                clock_out_time: request.requested_clock_out,
                status: 'completed',
                is_manual: true,
                work_type: 'ordinaria'
            };
            const { error: insertErr } = await supabase.from('time_entries').insert([insertPayload]);
            if (insertErr) handleError(insertErr);
        }
    }

    // 3. Marcar solicitud como revisada
    const { error } = await supabase.from('time_correction_requests').update({ 
        status, 
        reviewed_by: adminId, 
        reviewed_at: new Date().toISOString() 
    }).eq('request_id', id); 
    
    if (error) handleError(error); 
};

// --- MONTHLY SIGNATURES ---
export const getMonthlySignature = async (empId: string, month: number, year: number): Promise<MonthlySignature | null> => { const { data, error } = await supabase.from('monthly_signatures').select('*').eq('employee_id', empId).eq('month', month).eq('year', year).maybeSingle(); if (error) handleError(error); return data; };
export const saveMonthlySignature = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('monthly_signatures').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };

// --- TIME OFF REQUESTS ---
export const getTimeOffRequests = async (): Promise<TimeOffRequest[]> => { const { data, error } = await supabase.from('time_off_requests').select('*').order('created_at', { ascending: false }); if (error) handleError(error); return data || []; };
export const createTimeOffRequest = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('time_off_requests').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateTimeOffRequestStatus = async (id: string, status: string, adminId: string) => { ensureOnline(); const { error } = await supabase.from('time_off_requests').update({ status, reviewed_by: adminId, reviewed_at: new Date().toISOString() }).eq('request_id', id); if (error) handleError(error); };
export const deleteTimeOffRequest = async (id: string) => { ensureOnline(); const { error } = await supabase.from('time_off_requests').delete().eq('request_id', id); if (error) handleError(error); };

// --- LOST AND FOUND ---
export const getLostItems = async (): Promise<LostItem[]> => { const { data, error } = await supabase.from('lost_items').select('*').order('found_date', { ascending: false }); if (error) handleError(error); return data || []; };
export const addLostItem = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('lost_items').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateLostItem = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('lost_items').update(d).eq('item_id', d.item_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const deleteLostItem = async (id: string) => { ensureOnline(); const { error } = await supabase.from('lost_items').delete().eq('item_id', id); if (error) handleError(error); };

// --- MAINTENANCE PLANS ---
export const getMaintenancePlans = async (): Promise<MaintenancePlan[]> => { const { data, error } = await supabase.from('maintenance_plans').select('*'); if (error) handleError(error); return data || []; };
export const addMaintenancePlan = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('maintenance_plans').insert([d]).select(); if (error) handleError(error); return data ? data[0] : null; };
export const updateMaintenancePlan = async (d: any) => { ensureOnline(); const { data, error } = await supabase.from('maintenance_plans').update(d).eq('plan_id', d.plan_id).select(); if (error) handleError(error); return data ? data[0] : null; };
export const deleteMaintenancePlan = async (id: string) => { ensureOnline(); const { error } = await supabase.from('maintenance_plans').delete().eq('plan_id', id); if (error) handleError(error); };
