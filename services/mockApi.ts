
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
    { role_id: 'receptionist', name: 'Recepción', permissions: ['access_shift_log', 'manage_incidents', 'view_reports'] }
];

const FALLBACK_EMPLOYEES: Employee[] = [
    {
        employee_id: 'emp_admin',
        first_name: 'Admin',
        last_name: 'Sistema',
        pin: '1234',
        role_id: 'admin',
        status: 'active',
        policy_accepted: true,
        photo_url: 'https://ui-avatars.com/api/?name=Admin+Sistema&background=0D8ABC&color=fff',
        province: 'coruna',
        annual_hours_contract: 1784
    },
    {
        employee_id: 'emp_cleaner',
        first_name: 'Maria',
        last_name: 'Limpia',
        pin: '0000',
        role_id: 'cleaner',
        status: 'active',
        policy_accepted: true,
        photo_url: 'https://ui-avatars.com/api/?name=Maria+Limpia&background=F37021&color=fff',
        province: 'coruna',
        annual_hours_contract: 1784
    }
];

const FALLBACK_LOCATIONS: Location[] = [
    {
        location_id: 'loc_main',
        name: 'Hotel Central',
        address: 'Calle Principal 1',
        latitude: 40.416775,
        longitude: -3.703790,
        radius_meters: 100
    },
    {
        location_id: 'loc_beach',
        name: 'Apartamentos Playa',
        address: 'Paseo Marítimo 22',
        latitude: 40.420000,
        longitude: -3.710000,
        radius_meters: 100
    }
];

const FALLBACK_INVENTORY: InventoryItem[] = [
    // Almacén Central (Sin location_id)
    { item_id: 'inv_1', name: 'Gel de Baño (Garrafa 5L)', category: 'amenities', quantity: 10, unit: 'garrafas', min_threshold: 2, last_updated: new Date().toISOString() },
    { item_id: 'inv_2', name: 'Papel Higiénico (Industrial)', category: 'amenities', quantity: 50, unit: 'paquetes', min_threshold: 10, last_updated: new Date().toISOString() },
    
    // Hotel Central (loc_main)
    { item_id: 'inv_3', name: 'Bombillas LED E27 Cálida', category: 'maintenance', quantity: 5, unit: 'unidades', min_threshold: 10, location_id: 'loc_main', last_updated: new Date().toISOString() },
    { item_id: 'inv_4', name: 'Pilas AA', category: 'maintenance', quantity: 12, unit: 'unidades', min_threshold: 4, location_id: 'loc_main', last_updated: new Date().toISOString() },
    { item_id: 'inv_5', name: 'Amenities Kit Bienvenida', category: 'amenities', quantity: 20, unit: 'kits', min_threshold: 5, location_id: 'loc_main', last_updated: new Date().toISOString() },
    
    // Apartamentos Playa (loc_beach)
    { item_id: 'inv_6', name: 'Bombillas LED E27 Cálida', category: 'maintenance', quantity: 2, unit: 'unidades', min_threshold: 5, location_id: 'loc_beach', last_updated: new Date().toISOString() },
    { item_id: 'inv_7', name: 'Bombillas LED E14 Fina', category: 'maintenance', quantity: 8, unit: 'unidades', min_threshold: 3, location_id: 'loc_beach', last_updated: new Date().toISOString() },
    { item_id: 'inv_8', name: 'Fregasuelos Limón', category: 'cleaning', quantity: 2, unit: 'botellas', min_threshold: 2, location_id: 'loc_beach', last_updated: new Date().toISOString() }
];

// Helper to throw readable errors or fallback
const handleSupabaseError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    // Determine if it's a network/fetch error
    const isNetworkError = error.message?.includes('Failed to fetch') || error.name === 'TypeError';
    
    if (isNetworkError) {
        console.warn("Network error detected. The operation failed but application should not crash.");
        // We throw so the specific function can catch and return fallback if implemented, 
        // or let the UI handle it gracefully.
    }

    let msg = error.message || "Unknown error";
    if (error.details) msg += ` (${error.details})`;
    if (error.hint) msg += ` Hint: ${error.hint}`;
    throw new Error(msg);
};

// Helper to detect schema errors
const isSchemaError = (error: any) => {
    if (!error) return false;
    const msg = error.message?.toLowerCase() || '';
    return (
        error.code === '42703' || 
        msg.includes('column') && (msg.includes('does not exist') || msg.includes('could not find') || msg.includes('schema cache'))
    );
};

const NEW_EMPLOYEE_FIELDS = ['province', 'annual_hours_contract', 'default_location_id', 'default_start_time', 'default_end_time'];
const cleanData = (data: any, fieldsToRemove: string[]) => {
    const cleaned = { ...data };
    fieldsToRemove.forEach(f => delete cleaned[f]);
    return cleaned;
};

// --- API Functions ---

// Roles
export const getRoles = async (): Promise<Role[]> => {
    try {
        const { data, error } = await supabase.from('roles').select('*');
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.warn("Supabase unreachable (getRoles), using fallback data.");
        return FALLBACK_ROLES;
    }
};

export const updateRole = async (roleData: Role): Promise<Role> => {
    try {
        const { data, error } = await supabase
            .from('roles')
            .update({ 
                name: roleData.name,
                permissions: roleData.permissions 
            })
            .eq('role_id', roleData.role_id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch(e) {
        // Mock success
        return roleData;
    }
};

// Employees
export const getEmployees = async (): Promise<Employee[]> => {
    try {
        const { data, error } = await supabase.from('employees').select('*');
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.warn("Supabase unreachable (getEmployees), using fallback data.");
        return FALLBACK_EMPLOYEES;
    }
};

export const addEmployee = async (employeeData: Omit<Employee, 'employee_id'>): Promise<Employee> => {
    try {
        let { data, error } = await supabase.from('employees').insert([employeeData]).select().single();
        
        if (isSchemaError(error)) {
            const safeData = cleanData(employeeData, NEW_EMPLOYEE_FIELDS);
            const retry = await supabase.from('employees').insert([safeData]).select().single();
            data = retry.data;
            error = retry.error;
        }
        if (error) throw error;
        return data;
    } catch(e) {
        // Mock success
        console.warn("Simulating addEmployee success");
        return { ...employeeData, employee_id: crypto.randomUUID() } as Employee;
    }
};

export const updateEmployee = async (employeeData: Employee): Promise<Employee> => {
    try {
        let { data, error } = await supabase.from('employees').update(employeeData).eq('employee_id', employeeData.employee_id).select().single();
        if (isSchemaError(error)) {
            const safeData = cleanData(employeeData, NEW_EMPLOYEE_FIELDS);
            const retry = await supabase.from('employees').update(safeData).eq('employee_id', employeeData.employee_id).select().single();
            data = retry.data;
            error = retry.error;
        }
        if (error) throw error;
        return data;
    } catch (e) {
        return employeeData;
    }
};

export const acceptPolicy = async (employeeId: string): Promise<void> => {
    try {
        await supabase.from('employees').update({ policy_accepted: true }).eq('employee_id', employeeId);
    } catch (e) { console.warn("Simulating policy acceptance"); }
};

// Locations
export const getLocations = async (): Promise<Location[]> => {
    try {
        const { data, error } = await supabase.from('locations').select('*');
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.warn("Supabase unreachable (getLocations), using fallback data.");
        return FALLBACK_LOCATIONS;
    }
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

// Time Entries
export const getTimeEntriesForEmployee = async (employeeId: string): Promise<TimeEntry[]> => {
    try {
        const { data, error } = await supabase
            .from('time_entries')
            .select('*')
            .eq('employee_id', employeeId)
            .order('clock_in_time', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.warn("Using fallback for getTimeEntries");
        return [];
    }
};

// OPTIMIZED FUNCTION FOR DASHBOARD
export const getAllRunningTimeEntries = async (): Promise<TimeEntry[]> => {
    try {
        const { data, error } = await supabase
            .from('time_entries')
            .select('*')
            .eq('status', 'running');
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.warn("Using fallback for getAllRunningTimeEntries");
        return [];
    }
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
        // Try insert with device info
        let { data, error } = await supabase.from('time_entries').insert([newEntry]).select().single();
        
        // Fallback if DB doesn't have columns yet (graceful degradation)
        if (isSchemaError(error)) {
            const safeEntry = cleanData(newEntry, ['device_id', 'device_info']);
            const retry = await supabase.from('time_entries').insert([safeEntry]).select().single();
            data = retry.data;
            error = retry.error;
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
        const { data, error } = await supabase
            .from('time_entries')
            .update({ clock_out_time: endTime, clock_out_location_id: locationId || null, status: 'completed' })
            .eq('entry_id', entryId)
            .select().single();
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

// Time Correction Requests (New)
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
        // 1. Get the request
        const { data: request } = await supabase.from('time_correction_requests').select('*').eq('request_id', requestId).single();
        if (!request) throw new Error("Request not found");

        // 2. Update status
        await supabase.from('time_correction_requests').update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }).eq('request_id', requestId);

        // 3. If approved, apply changes to time_entries
        if (status === 'approved') {
            if (request.correction_type === 'create_entry') {
                const startTime = `${request.requested_date}T${request.requested_clock_in}:00`;
                const endTime = request.requested_clock_out ? `${request.requested_date}T${request.requested_clock_out}:00` : undefined;
                
                await supabase.from('time_entries').insert([{
                    employee_id: request.employee_id,
                    clock_in_time: startTime,
                    clock_out_time: endTime,
                    status: endTime ? 'completed' : 'running',
                    work_type: 'ordinaria',
                    work_mode: 'presencial',
                    is_manual: true // MARK RED
                }]);
            } else if (request.correction_type === 'fix_time' && request.original_entry_id) {
                // Construct ISO strings
                const startTime = `${request.requested_date}T${request.requested_clock_in}:00`;
                const endTime = request.requested_clock_out ? `${request.requested_date}T${request.requested_clock_out}:00` : null;
                
                await supabase.from('time_entries').update({
                    clock_in_time: startTime,
                    clock_out_time: endTime,
                    is_manual: true // MARK RED
                }).eq('entry_id', request.original_entry_id);
            }
        }
    } catch(e) { 
        console.error("Error resolving correction", e);
    }
};

// Break Logs
export const getBreaksForTimeEntry = async (timeEntryId: string): Promise<BreakLog[]> => {
    if (timeEntryId.startsWith('offline-')) return [];
    try {
        const { data, error } = await supabase.from('break_logs').select('*').eq('time_entry_id', timeEntryId).order('start_time', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

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

// Activity Log
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
    const newLog = {
        time_entry_id: timeEntryId,
        employee_id: employeeId,
        location_id: locationId,
        check_in_time: new Date().toISOString(),
        check_in_latitude: latitude,
        check_in_longitude: longitude,
    };
    
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

// Policies
export const getPolicies = async (): Promise<Policy[]> => {
    try {
        const { data, error } = await supabase.from('policies').select('*');
        if (error) throw error;
        return data || [];
    } catch (e) { return []; }
};

// Announcements
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

// Rooms
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

// Tasks
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

// Incidents
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

// Shift Log
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

// Lost Items
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

// Signatures
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

// Time Off
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

// Shift Scheduler
export const getWorkShifts = async (startDate: string, endDate: string): Promise<WorkShift[]> => {
    try {
        const { data, error } = await supabase.from('work_shifts').select('*').gte('start_time', startDate).lte('end_time', endDate);
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
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

// Shift Configs
export const getShiftConfigs = async (): Promise<ShiftConfig[]> => {
    try {
        const { data, error } = await supabase.from('shift_configs').select('*');
        if (error) throw error;
        return data || [];
    } catch(e) { return []; }
};

export const addShiftConfig = async (data: any): Promise<ShiftConfig> => {
    try {
        if (data.location_id === '') data.location_id = undefined;
        const { data: created, error } = await supabase.from('shift_configs').insert([data]).select().single();
        if (error) throw error;
        return created;
    } catch(e) { return { ...data, config_id: 'mock' } as ShiftConfig; }
};

export const updateShiftConfig = async (data: ShiftConfig): Promise<ShiftConfig> => {
    try {
        if (data.location_id === '') data.location_id = undefined;
        const { data: updated, error } = await supabase.from('shift_configs').update(data).eq('config_id', data.config_id).select().single();
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

// Documents
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

// Maintenance
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
    // Mock logic already handled inside
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
                await addIncident({
                    description: `[MANTENIMIENTO] ${plan.title}: ${plan.description}`,
                    location_id: plan.location_id,
                    room_id: '',
                    priority: 'medium',
                    status: 'open',
                    reported_by: 'system',
                    type: 'preventive',
                    maintenance_plan_id: plan.plan_id,
                    due_date: plan.next_due_date
                } as any);
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

// --- INVENTORY API ---

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
    try {
        const { data, error } = await supabase.from('inventory_items').select('*');
        
        // Return FALLBACK_INVENTORY if table empty or error (demo mode)
        if (error || !data || data.length === 0) {
             // In a real app we'd just return [], but for demo we want data
             if (!data || data.length === 0) return FALLBACK_INVENTORY;
             throw error;
        }
        return data;
    } catch(e) {
        console.warn("Supabase unreachable (Inventory), using fallback data."); 
        return FALLBACK_INVENTORY; 
    }
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
    try {
        // 1. Log
        await supabase.from('stock_logs').insert([{ item_id: itemId, change_amount: changeAmount, reason, employee_id: employeeId, created_at: new Date().toISOString() }]);
        // 2. Update Quantity is handled by trigger in real DB, here we assume updateInventoryItem is called by UI or we do it here.
        // For mock simple logic:
        // This is usually done in the UI component logic for now to keep it simple with optimistic updates.
    } catch(e) { }
}

// NEW FUNCTION FOR KARDEX (Punto 3.A)
export const getStockLogs = async (itemId: string): Promise<StockLog[]> => {
    try {
        const { data, error } = await supabase.from('stock_logs').select('*').eq('item_id', itemId).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch(e) { 
        return []; 
    }
}
