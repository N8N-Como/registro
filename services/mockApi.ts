
import { createClient } from '@supabase/supabase-js';
import { Role, Employee, Location, TimeEntry, Policy, Announcement, Room, Task, TaskTimeLog, Incident, ShiftLogEntry, ActivityLog, LostItem, AccessLog, BreakLog, WorkType, WorkMode, MonthlySignature, TimeOffRequest, WorkShift, ShiftConfig, CompanyDocument, DocumentSignature, MaintenancePlan, TimeCorrectionRequest, InventoryItem, StockLog, RoomStatus } from '../types';
import { addToQueue } from './offlineManager';

const SUPABASE_URL = 'https://acinnuphpdnsrmijsbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaW5udXBocGRuc3JtaWpzYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTIyNjgsImV4cCI6MjA3ODk2ODI2OH0.DcaNxpI68W0gaGppraL9yZO6a9fHStVkU1ee4_zKbsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- LOCAL STORAGE KEYS ---
const LOCAL_CORRECTIONS_KEY = 'local_time_corrections';
const LOCAL_TIME_ENTRIES_KEY = 'local_time_entries';

const getLocalData = <T>(key: string): T[] => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const saveLocalData = <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- MÉTODOS DE CORRECCIÓN MEJORADOS ---

export const getTimeCorrectionRequests = async () => { 
    try { 
        const { data, error } = await supabase.from('time_correction_requests').select('*'); 
        if (error) throw error;
        const remote = (data || []) as TimeCorrectionRequest[];
        const local = getLocalData<TimeCorrectionRequest>(LOCAL_CORRECTIONS_KEY);
        
        const combined = [...local];
        remote.forEach(rr => {
            if (!combined.some(lr => lr.request_id === rr.request_id)) {
                combined.push(rr);
            }
        });
        
        return combined.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch { 
        return getLocalData<TimeCorrectionRequest>(LOCAL_CORRECTIONS_KEY); 
    } 
};

export const createTimeCorrectionRequest = async (d: any) => { 
    const payload: TimeCorrectionRequest = {
        request_id: d.request_id || ('req_' + Date.now() + Math.random().toString(36).substr(2, 5)),
        created_at: d.created_at || new Date().toISOString(),
        status: d.status || 'pending',
        ...d
    };
    
    try { 
        const { error } = await supabase.from('time_correction_requests').insert([payload]); 
        if (error) throw error;
        
        const local = getLocalData<TimeCorrectionRequest>(LOCAL_CORRECTIONS_KEY);
        saveLocalData(LOCAL_CORRECTIONS_KEY, local.filter(req => req.request_id !== payload.request_id));
        
        return payload;
    } catch (e: any) { 
        // Si el error es de formato (Postgres 22P02), no es "Offline", es un error real
        if (e.code === '22P02') throw e;

        const local = getLocalData<TimeCorrectionRequest>(LOCAL_CORRECTIONS_KEY);
        if (!local.some(r => r.request_id === payload.request_id)) {
            local.push(payload);
            saveLocalData(LOCAL_CORRECTIONS_KEY, local);
        }
        throw new Error("Offline");
    } 
};

export const resolveTimeCorrectionRequest = async (id: string, status: 'approved' | 'rejected', reviewerId: string) => { 
    try {
        const allRequests = await getTimeCorrectionRequests();
        const request = allRequests.find(r => r.request_id === id);
        
        if (!request) throw new Error("Solicitud no encontrada.");

        if (status === 'approved') {
            const dateStr = request.requested_date;
            
            if (request.correction_type === 'create_entry') {
                const clockInISO = `${dateStr}T${request.requested_clock_in}:00Z`;
                const clockOutISO = request.requested_clock_out && request.requested_clock_out !== '00:00' 
                    ? `${dateStr}T${request.requested_clock_out}:00Z` 
                    : null;

                await supabase.from('time_entries').insert([{
                    employee_id: request.employee_id,
                    clock_in_time: clockInISO,
                    clock_out_time: clockOutISO,
                    status: clockOutISO ? 'completed' : 'running',
                    is_manual: true,
                    work_type: 'ordinaria',
                    work_mode: 'presencial'
                }]);
            } else if (request.correction_type === 'fix_time' && request.original_entry_id) {
                // Obtener registro original para no sobreescribir datos válidos
                const { data: original } = await supabase.from('time_entries').select('*').eq('entry_id', request.original_entry_id).single();
                
                const updateData: any = { is_manual: true };
                
                // Si la solicitud trae una hora de entrada válida (!= 00:00 usualmente usado como placeholder)
                if (request.requested_clock_in && request.requested_clock_in !== '00:00') {
                    updateData.clock_in_time = `${dateStr}T${request.requested_clock_in}:00Z`;
                }
                
                // Si trae hora de salida
                if (request.requested_clock_out && request.requested_clock_out !== '00:00') {
                    updateData.clock_out_time = `${dateStr}T${request.requested_clock_out}:00Z`;
                    updateData.status = 'completed';
                }

                await supabase.from('time_entries').update(updateData).eq('entry_id', request.original_entry_id);
            }
        }

        // Actualizar solicitud
        await supabase.from('time_correction_requests').update({ 
            status, 
            reviewed_by: reviewerId, 
            reviewed_at: new Date().toISOString() 
        }).eq('request_id', id);

        // Limpiar local
        const local = getLocalData<TimeCorrectionRequest>(LOCAL_CORRECTIONS_KEY);
        saveLocalData(LOCAL_CORRECTIONS_KEY, local.filter(req => req.request_id !== id));

    } catch (e) {
        console.error("Error al resolver:", e);
        throw e;
    }
};

// --- RESTO DE MÉTODOS MANTENIDOS ---
export const getRoles = async (): Promise<Role[]> => { try { const { data } = await supabase.from('roles').select('*'); return data || []; } catch { return []; } };
export const getEmployees = async (): Promise<Employee[]> => { try { const { data } = await supabase.from('employees').select('*'); return data || []; } catch { return []; } };
export const getLocations = async (): Promise<Location[]> => { try { const { data } = await supabase.from('locations').select('*'); return data || []; } catch { return []; } };
export const getRooms = async (): Promise<Room[]> => { try { const { data } = await supabase.from('rooms').select('*'); return data || []; } catch { return []; } };
export const updateRoomStatus = async (roomId: string, status: RoomStatus, employeeId?: string): Promise<Room> => { const isClean = status === 'clean'; const now = new Date().toISOString(); const updateData: any = { status, last_cleaned_at: isClean ? now : undefined, last_cleaned_by: isClean ? (employeeId || null) : undefined, is_priority: isClean ? false : undefined }; Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]); const { data } = await supabase.from('rooms').update(updateData).eq('room_id', roomId).select().single(); return data; };
export const getTimeEntriesForEmployee = async (id: string) => { try { const { data } = await supabase.from('time_entries').select('*').eq('employee_id', id).order('clock_in_time', { ascending: false }); return (data || []) as TimeEntry[]; } catch { return []; } };
export const getAllRunningTimeEntries = async () => { try { const { data } = await supabase.from('time_entries').select('*').eq('status', 'running'); return (data || []) as TimeEntry[]; } catch { return []; } };
export const getCurrentEstablishmentStatus = async () => { try { const { data } = await supabase.from('activity_logs').select('*').is('check_out_time', null); return (data || []) as ActivityLog[]; } catch { return []; } };
export const clockIn = async (employeeId: string, locationId: any, lat: any, lon: any, workType: any, workMode: any, deviceData: any, customTime?: string) => { const entryTime = customTime || new Date().toISOString(); const payload = { employee_id: employeeId, clock_in_time: entryTime, clock_in_latitude: lat || null, clock_in_longitude: lon || null, work_type: workType, work_mode: workMode, device_id: deviceData?.deviceId || null, device_info: deviceData?.deviceInfo || null, is_manual: !!customTime, status: 'running' }; const { data } = await supabase.from('time_entries').insert([payload]).select().single(); return data; };
export const clockOut = async (id: string, l: any, isManual: boolean, t: any) => { const clockOutTime = t || new Date().toISOString(); const { data } = await supabase.from('time_entries').update({clock_out_time: clockOutTime, status: 'completed'}).eq('entry_id', id).select().single(); return data; };
export const checkInToLocation = async (timeEntryId: string, employeeId: string, locationId: string, lat: number, lon: number) => { const { data } = await supabase.from('activity_logs').insert([{ time_entry_id: timeEntryId, employee_id: employeeId, location_id: locationId, check_in_time: new Date().toISOString(), check_in_latitude: lat, check_in_longitude: lon }]).select().single(); return data; };
export const checkOutOfLocation = async (activityId: string) => { const { data } = await supabase.from('activity_logs').update({check_out_time: new Date().toISOString()}).eq('activity_id', activityId).select().single(); return data; };
export const getActivityLogsForTimeEntry = async (id: string) => { const { data } = await supabase.from('activity_logs').select('*').eq('time_entry_id', id); return (data || []) as ActivityLog[]; };
export const getActiveTaskLogForEmployee = async (id: string) => { const { data } = await supabase.from('task_time_logs').select('*').eq('employee_id', id).is('end_time', null).maybeSingle(); return data; };
export const startTask = async (id: string, emp: string, loc: string) => { await supabase.from('tasks').update({ status: 'in_progress' }).eq('task_id', id); const { data } = await supabase.from('task_time_logs').insert([{task_id: id, employee_id: emp, start_time: new Date().toISOString(), location_id: loc}]).select().single(); return data; };
export const finishTask = async (logId: string, taskId: string, inventoryUsage: any[] = [], employeeId?: string) => { await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('task_id', taskId); const { data } = await supabase.from('task_time_logs').update({ end_time: new Date().toISOString() }).eq('log_id', logId).select().single(); return data; };
export const getInventoryItems = async (): Promise<InventoryItem[]> => { const { data } = await supabase.from('inventory_items').select('*'); return data || []; };
export const addInventoryItem = async (d: any) => { const { data } = await supabase.from('inventory_items').insert([{...d, last_updated: new Date().toISOString()}]).select().single(); return data; };
export const updateInventoryItem = async (data: InventoryItem): Promise<InventoryItem> => { const { data: updated } = await supabase.from('inventory_items').update({...data, last_updated: new Date().toISOString()}).eq('item_id', data.item_id).select().single(); return updated || data; };
export const logStockMovement = async (itemId: string, changeAmount: number, reason: string, employeeId: string) => { await supabase.from('stock_logs').insert([{ item_id: itemId, change_amount: changeAmount, reason, employee_id: employeeId, created_at: new Date().toISOString() }]); };
export const getStockLogs = async (itemId?: string): Promise<StockLog[]> => { let q = supabase.from('stock_logs').select('*').order('created_at', { ascending: false }); if (itemId) q = q.eq('item_id', itemId); const { data } = await q; return data || []; };
export const getShiftLog = async (): Promise<ShiftLogEntry[]> => { const { data } = await supabase.from('shift_log').select('*').order('created_at', { ascending: false }); return data || []; };
export const addShiftLogEntry = async (d: any) => { const { data } = await supabase.from('shift_log').insert([d]).select().single(); return data; };
export const updateShiftLogEntry = async (d: any) => { const { data } = await supabase.from('shift_log').update(d).eq('log_id', d.log_id).select().single(); return data; };
export const getActiveAnnouncement = async () => { const { data } = await supabase.from('announcements').select('*').eq('is_active', true).maybeSingle(); return data; };
export const getAnnouncements = async () => { const { data } = await supabase.from('announcements').select('*'); return data || []; };
export const addAnnouncement = async (d: any) => { const { data } = await supabase.from('announcements').insert([d]).select().single(); return data; };
export const updateAnnouncement = async (d: any) => { const { data } = await supabase.from('announcements').update(d).eq('announcement_id', d.announcement_id).select().single(); return data; };
export const deleteAnnouncement = async (id: string) => { await supabase.from('announcements').delete().eq('announcement_id', id); };
export const getPolicies = async () => { const { data } = await supabase.from('policies').select('*').order('version', { ascending: false }); return data || []; };
export const acceptPolicy = async (id: string) => { await supabase.from('employees').update({ policy_accepted: true }).eq('employee_id', id); };
export const getWorkShifts = async (s: string, e: string) => { const { data } = await supabase.from('work_shifts').select('*').gte('start_time', s).lte('end_time', e); return data || []; };
export const getShiftConfigs = async () => { const { data } = await supabase.from('shift_configs').select('*'); return data || []; };
export const createWorkShift = async (d: any) => { const { data } = await supabase.from('work_shifts').insert([d]).select().single(); return data; };
export const updateWorkShift = async (d: any) => { const { data } = await supabase.from('work_shifts').update(d).eq('shift_id', d.shift_id).select().single(); return data; };
export const deleteWorkShift = async (id: string) => { await supabase.from('work_shifts').delete().eq('shift_id', id); };
export const createBulkWorkShifts = async (d: any[]) => { await supabase.from('work_shifts').insert(d); };
export const getIncidents = async () => { const { data } = await supabase.from('incidents').select('*'); return data || []; };
export const addIncident = async (d: any) => { const { data } = await supabase.from('incidents').insert([d]).select().single(); return data; };
export const updateIncident = async (d: any) => { const { data } = await supabase.from('incidents').update(d).eq('incident_id', d.incident_id).select().single(); return data; };
export const deleteIncident = async (id: string) => { await supabase.from('incidents').delete().eq('incident_id', id); };
export const getTasks = async () => { const { data } = await supabase.from('tasks').select('*'); return data || []; };
export const addTask = async (d: any) => { const { data } = await supabase.from('tasks').insert([d]).select().single(); return data; };
export const updateTask = async (d: any) => { const { data } = await supabase.from('tasks').update(d).eq('task_id', d.task_id).select().single(); return data; };
export const deleteTask = async (id: string) => { await supabase.from('tasks').delete().eq('task_id', id); };
export const getLostItems = async () => { const { data } = await supabase.from('lost_items').select('*'); return data || []; };
export const addLostItem = async (d: any) => { const { data } = await supabase.from('lost_items').insert([d]).select().single(); return data; };
export const updateLostItem = async (d: any) => { const { data } = await supabase.from('lost_items').update(d).eq('item_id', d.item_id).select().single(); return data; };
export const getMonthlySignature = async (id: string, m: number, y: number) => { const { data } = await supabase.from('monthly_signatures').select('*').eq('employee_id', id).eq('month', m).eq('year', y).maybeSingle(); return data; };
export const saveMonthlySignature = async (id: string, m: number, y: number, s: string) => { const { data } = await supabase.from('monthly_signatures').insert([{employee_id: id, month: m, year: y, signature_url: s, signed_at: new Date().toISOString()}]).select().single(); return data; };
export const getEmployeeDocuments = async (id: string) => { const { data } = await supabase.from('document_signatures').select('*, document:company_documents(*)').eq('employee_id', id); return data || []; };
export const getDocuments = async () => { const { data } = await supabase.from('company_documents').select('*'); return data || []; };
export const createDocument = async (d: any, ids: string[]) => { const { data } = await supabase.from('company_documents').insert([d]).select().single(); const sigs = ids.map(id => ({ document_id: data.document_id, employee_id: id, status: 'pending' })); await supabase.from('document_signatures').insert(sigs); };
export const signDocument = async (id: string, s: string) => { await supabase.from('document_signatures').update({status: 'signed', signature_url: s, signed_at: new Date().toISOString()}).eq('id', id); };
export const markDocumentAsViewed = async (id: string) => { await supabase.from('document_signatures').update({status: 'viewed', viewed_at: new Date().toISOString()}).eq('id', id); };
export const getDocumentSignatures = async (id: string) => { const { data } = await supabase.from('document_signatures').select('*').eq('document_id', id); return data || []; };
export const getMaintenancePlans = async () => { const { data } = await supabase.from('maintenance_plans').select('*'); return data || []; };
export const addMaintenancePlan = async (d: any) => { const { data } = await supabase.from('maintenance_plans').insert([d]).select().single(); return data; };
export const updateMaintenancePlan = async (d: any) => { const { data } = await supabase.from('maintenance_plans').update(d).eq('plan_id', d.plan_id).select().single(); return data; };
export const deleteMaintenancePlan = async (id: string) => { await supabase.from('maintenance_plans').delete().eq('plan_id', id); };
export const getBreaksForTimeEntry = async (id: string) => { const { data } = await supabase.from('break_logs').select('*').eq('time_entry_id', id); return data || []; };
export const getBreaksForTimeEntries = async (ids: string[]) => { const { data } = await supabase.from('break_logs').select('*').in('time_entry_id', ids); return data || []; };
export const startBreak = async (t: string, b: string) => { const { data } = await supabase.from('break_logs').insert([{time_entry_id: t, break_type: b, start_time: new Date().toISOString()}]).select().single(); return data; };
export const endBreak = async (id: string) => { const { data } = await supabase.from('break_logs').update({end_time: new Date().toISOString()}).eq('break_id', id).select().single(); return data; };
export const getTimeOffRequests = async () => { const { data } = await supabase.from('time_off_requests').select('*'); return data || []; };
export const createTimeOffRequest = async (d: any) => { const { data } = await supabase.from('time_off_requests').insert([d]).select().single(); return data; };
export const updateTimeOffRequestStatus = async (id: string, s: string, r: string) => { await supabase.from('time_off_requests').update({status: s, reviewed_by: r, reviewed_at: new Date().toISOString()}).eq('request_id', id); };
export const addEmployee = async (d: any) => { const { data } = await supabase.from('employees').insert([d]).select().single(); return data; };
export const updateEmployee = async (d: any) => { const { data } = await supabase.from('employees').update(d).eq('employee_id', d.employee_id).select().single(); return data; };
export const deleteEmployee = async (id: string) => { await supabase.from('employees').delete().eq('employee_id', id); };
export const addLocation = async (d: any) => { const { data } = await supabase.from('locations').insert([d]).select().single(); return data; };
export const updateLocation = async (d: any) => { const { data } = await supabase.from('locations').update(d).eq('location_id', d.location_id).select().single(); return data; };
export const deleteLocation = async (id: string) => { await supabase.from('locations').delete().eq('location_id', id); };
export const updateRole = async (d: any) => { const { data } = await supabase.from('roles').update(d).eq('role_id', d.role_id).select().single(); return data; };
export const addShiftConfig = async (d: any) => { const { data } = await supabase.from('shift_configs').insert([d]).select().single(); return data; };
export const updateShiftConfig = async (d: any) => { const { data } = await supabase.from('shift_configs').update(d).eq('config_id', d.config_id).select().single(); return data; };
export const deleteShiftConfig = async (id: string) => { await supabase.from('shift_configs').delete().eq('config_id', id); };
export const addRoom = async (d: any) => { const { data } = await supabase.from('rooms').insert([d]).select().single(); return data; };
export const updateRoom = async (d: any) => { const { data } = await supabase.from('rooms').update(d).eq('room_id', d.room_id).select().single(); return data; };
export const deleteRoom = async (id: string) => { await supabase.from('rooms').delete().eq('room_id', id); };
export const logAccessAttempt = async (d: any) => { await supabase.from('access_logs').insert([d]); };
export const checkAndGenerateMaintenanceTasks = async () => {};
