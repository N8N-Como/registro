
import { createClient } from '@supabase/supabase-js';
import { Role, Employee, Location, TimeEntry, Policy, Announcement, Room, Task, TaskTimeLog, Incident, ShiftLogEntry, ActivityLog, LostItem, AccessLog, BreakLog, WorkType, WorkMode, MonthlySignature, TimeOffRequest, WorkShift, ShiftConfig, CompanyDocument, DocumentSignature, MaintenancePlan } from '../types';
import { addToQueue } from './offlineManager';

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://acinnuphpdnsrmijsbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaW5udXBocGRuc3JtaWpzYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTIyNjgsImV4cCI6MjA3ODk2ODI2OH0.DcaNxpI68W0gaGppraL9yZO6a9fHStVkU1ee4_zKbsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to throw readable errors
const handleSupabaseError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    throw new Error(error.message || `An error occurred in ${context}`);
};

// --- API Functions ---

// Roles
export const getRoles = async (): Promise<Role[]> => {
    const { data, error } = await supabase.from('roles').select('*');
    if (error) handleSupabaseError(error, 'getRoles');
    return data || [];
};

export const updateRole = async (roleData: Role): Promise<Role> => {
    const { data, error } = await supabase
        .from('roles')
        .update({ 
            name: roleData.name,
            permissions: roleData.permissions 
        })
        .eq('role_id', roleData.role_id)
        .select()
        .single();
    
    if (error) handleSupabaseError(error, 'updateRole');
    return data;
};

// Employees
export const getEmployees = async (): Promise<Employee[]> => {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) handleSupabaseError(error, 'getEmployees');
    return data || [];
};

export const addEmployee = async (employeeData: Omit<Employee, 'employee_id'>): Promise<Employee> => {
    const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'addEmployee');
    return data;
};

export const updateEmployee = async (employeeData: Employee): Promise<Employee> => {
    const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('employee_id', employeeData.employee_id)
        .select()
        .single();

    if (error) handleSupabaseError(error, 'updateEmployee');
    return data;
};

export const acceptPolicy = async (employeeId: string): Promise<void> => {
    const { error } = await supabase
        .from('employees')
        .update({ policy_accepted: true })
        .eq('employee_id', employeeId);
        
    if (error) handleSupabaseError(error, 'acceptPolicy');
};

// Locations
export const getLocations = async (): Promise<Location[]> => {
    const { data, error } = await supabase.from('locations').select('*');
    if (error) handleSupabaseError(error, 'getLocations');
    return data || [];
};

export const addLocation = async (locationData: Omit<Location, 'location_id'>): Promise<Location> => {
    const { data, error } = await supabase
        .from('locations')
        .insert([locationData])
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'addLocation');
    return data;
};

export const updateLocation = async (locationData: Location): Promise<Location> => {
    const { data, error } = await supabase
        .from('locations')
        .update(locationData)
        .eq('location_id', locationData.location_id)
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'updateLocation');
    return data;
};

// Time Entries (Workday)
export const getTimeEntriesForEmployee = async (employeeId: string): Promise<TimeEntry[]> => {
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .order('clock_in_time', { ascending: false });
        
    if (error) handleSupabaseError(error, 'getTimeEntriesForEmployee');
    return data || [];
};

export const clockIn = async (
    employeeId: string, 
    locationId?: string, 
    latitude?: number, 
    longitude?: number,
    workType: WorkType = 'ordinaria',
    workMode: WorkMode = 'presencial',
    photoUrl?: string,
    isSyncing = false
): Promise<TimeEntry> => {
    const newEntry = {
        employee_id: employeeId,
        clock_in_time: new Date().toISOString(),
        clock_in_location_id: locationId || null,
        clock_in_latitude: latitude,
        clock_in_longitude: longitude,
        status: 'running',
        work_type: workType,
        work_mode: workMode,
        verified_by_photo: photoUrl
    };
    
    // Check network status manually if not syncing
    if (!isSyncing && !navigator.onLine) {
        addToQueue('CLOCK_IN', { employeeId, locationId, latitude, longitude, workType, workMode, photoUrl });
        // Return fake successful entry for optimistic UI
        return {
            ...newEntry,
            entry_id: 'offline-' + Date.now(),
            status: 'running'
        } as TimeEntry;
    }

    try {
        const { data, error } = await supabase
            .from('time_entries')
            .insert([newEntry])
            .select()
            .single();
            
        if (error) handleSupabaseError(error, 'clockIn');
        return data;
    } catch (e: any) {
        // If network error during request, add to queue
        if (!isSyncing) {
             addToQueue('CLOCK_IN', { employeeId, locationId, latitude, longitude, workType, workMode, photoUrl });
             return { ...newEntry, entry_id: 'offline-' + Date.now(), status: 'running' } as TimeEntry;
        }
        throw new Error(e.message || 'Error creating time entry');
    }
};

export const clockOut = async (entryId: string, locationId?: string, isSyncing = false, customEndTime?: string): Promise<TimeEntry> => {
    const endTime = customEndTime || new Date().toISOString();

    if (!isSyncing && !navigator.onLine) {
        addToQueue('CLOCK_OUT', { entryId, locationId, customEndTime });
        return { entry_id: entryId, status: 'completed', clock_out_time: endTime } as TimeEntry;
    }

    try {
        if (entryId.startsWith('offline-')) {
            console.warn("Attempting to clock out an offline entry directly to server. Sync logic limitation.");
        }

        const { data, error } = await supabase
            .from('time_entries')
            .update({
                clock_out_time: endTime,
                clock_out_location_id: locationId || null,
                status: 'completed'
            })
            .eq('entry_id', entryId)
            .select()
            .single();
            
        if (error) handleSupabaseError(error, 'clockOut');
        return data;
    } catch (e: any) {
        if (!isSyncing) {
            addToQueue('CLOCK_OUT', { entryId, locationId, customEndTime });
            return { entry_id: entryId, status: 'completed', clock_out_time: endTime } as TimeEntry;
        }
        throw new Error(e.message || 'Error clocking out');
    }
};

// --- BREAK MANAGEMENT (New) ---

export const getBreaksForTimeEntry = async (timeEntryId: string): Promise<BreakLog[]> => {
    // If offline id, return empty or cached
    if (timeEntryId.startsWith('offline-')) return [];

    const { data, error } = await supabase
        .from('break_logs')
        .select('*')
        .eq('time_entry_id', timeEntryId)
        .order('start_time', { ascending: true });
        
    if (error) {
        console.warn("Break logs table might be missing", error);
        return [];
    }
    return data || [];
};

export const startBreak = async (timeEntryId: string, breakType: string): Promise<BreakLog> => {
    // Basic offline handling for breaks not implemented in this version for simplicity, 
    // but follows same pattern as clockIn
    const newBreak = {
        time_entry_id: timeEntryId,
        start_time: new Date().toISOString(),
        break_type: breakType
    };

    const { data, error } = await supabase
        .from('break_logs')
        .insert([newBreak])
        .select()
        .single();

    if (error) handleSupabaseError(error, 'startBreak');
    return data;
};

export const endBreak = async (breakId: string): Promise<BreakLog> => {
    const { data, error } = await supabase
        .from('break_logs')
        .update({ end_time: new Date().toISOString() })
        .eq('break_id', breakId)
        .select()
        .single();

    if (error) handleSupabaseError(error, 'endBreak');
    return data;
};


// Activity Log (Establishment Check-in/out)
export const getActivityLogsForTimeEntry = async (timeEntryId: string): Promise<ActivityLog[]> => {
    if (timeEntryId.startsWith('offline-')) return [];

    const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('time_entry_id', timeEntryId);
        
    if (error) handleSupabaseError(error, 'getActivityLogsForTimeEntry');
    return data || [];
};

export const getCurrentEstablishmentStatus = async (): Promise<ActivityLog[]> => {
    const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .is('check_out_time', null);
    
    if (error) return [];
    return data || [];
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
        const { data, error } = await supabase
            .from('activity_logs')
            .insert([newLog])
            .select()
            .single();
            
        if (error) handleSupabaseError(error, 'checkInToLocation');
        return data;
    } catch(e: any) {
        if (!isSyncing) {
            addToQueue('CHECK_IN_LOCATION', { timeEntryId, employeeId, locationId, latitude, longitude });
            return { ...newLog, activity_id: 'offline-' + Date.now() } as ActivityLog;
        }
        throw new Error(e.message || 'Error checking in to location');
    }
};

export const checkOutOfLocation = async (activityId: string, isSyncing = false): Promise<ActivityLog> => {
    if (!isSyncing && !navigator.onLine) {
        addToQueue('CHECK_OUT_LOCATION', { activityId });
        return { activity_id: activityId, check_out_time: new Date().toISOString() } as unknown as ActivityLog;
    }

    try {
        const { data, error } = await supabase
            .from('activity_logs')
            .update({
                check_out_time: new Date().toISOString()
            })
            .eq('activity_id', activityId)
            .select()
            .single();

        if (error) handleSupabaseError(error, 'checkOutOfLocation');
        return data;
    } catch (e: any) {
        if (!isSyncing) {
            addToQueue('CHECK_OUT_LOCATION', { activityId });
            return { activity_id: activityId, check_out_time: new Date().toISOString() } as unknown as ActivityLog;
        }
        throw new Error(e.message || 'Error checking out of location');
    }
};

// Access Attempts (Security Log)
export const logAccessAttempt = async (data: Omit<AccessLog, 'log_id' | 'attempt_time'>): Promise<AccessLog> => {
    const newLog = {
        ...data,
        attempt_time: new Date().toISOString(),
    };

    const { data: created, error } = await supabase
        .from('access_logs')
        .insert([newLog])
        .select()
        .single();

    if (error) {
        console.warn("Could not save access log to Supabase:", error);
        return newLog as any;
    }
    return created;
}


// Policies
export const getPolicies = async (): Promise<Policy[]> => {
    const { data, error } = await supabase.from('policies').select('*');
    if (error) handleSupabaseError(error, 'getPolicies');
    return data || [];
};

// Announcements
export const getAnnouncements = async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) handleSupabaseError(error, 'getAnnouncements');
    return data || [];
};

export const getActiveAnnouncement = async (): Promise<Announcement | null> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
        
    if (error) {
         console.error("Error fetching active announcement", error);
         return null;
    }
    return data;
};

export const addAnnouncement = async (data: Omit<Announcement, 'announcement_id' | 'created_at'>): Promise<Announcement> => {
    const newAnnouncement = {
        ...data,
        created_at: new Date().toISOString()
    };
    
    const { data: created, error } = await supabase
        .from('announcements')
        .insert([newAnnouncement])
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'addAnnouncement');
    return created;
};

export const updateAnnouncement = async (data: Announcement): Promise<Announcement> => {
    const { data: updated, error } = await supabase
        .from('announcements')
        .update(data)
        .eq('announcement_id', data.announcement_id)
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'updateAnnouncement');
    return updated;
};

// Rooms
export const getRooms = async (): Promise<Room[]> => {
    const { data, error } = await supabase.from('rooms').select('*');
    if (error) handleSupabaseError(error, 'getRooms');
    return data || [];
};

export const addRoom = async (data: Omit<Room, 'room_id' | 'status'>): Promise<Room> => {
    const newRoom = {
        ...data,
        status: 'clean' as const
    };
    
    const { data: created, error } = await supabase
        .from('rooms')
        .insert([newRoom])
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'addRoom');
    return created;
};

export const updateRoom = async (data: Room): Promise<Room> => {
    const { data: updated, error } = await supabase
        .from('rooms')
        .update(data)
        .eq('room_id', data.room_id)
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'updateRoom');
    return updated;
};

// Tasks
export const getTasks = async (): Promise<Task[]> => {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) handleSupabaseError(error, 'getTasks');
    return data || [];
};

export const addTask = async (data: Omit<Task, 'task_id' | 'created_at' | 'completed_at'>): Promise<Task> => {
    const newTask = {
        ...data,
        created_at: new Date().toISOString()
    };
    
    const { data: created, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'addTask');
    return created;
};

export const updateTask = async (data: Task): Promise<Task> => {
    const { data: updated, error } = await supabase
        .from('tasks')
        .update(data)
        .eq('task_id', data.task_id)
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'updateTask');
    return updated;
};

// Task Time Logs
export const getTaskTimeLogs = async (): Promise<TaskTimeLog[]> => {
    const { data, error } = await supabase.from('task_time_logs').select('*');
    if (error) handleSupabaseError(error, 'getTaskTimeLogs');
    return data || [];
};

export const getActiveTaskLogForEmployee = async (employeeId: string): Promise<TaskTimeLog | null> => {
    const { data, error } = await supabase
        .from('task_time_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .is('end_time', null)
        .maybeSingle();
        
    if (error && error.code !== 'PGRST116') handleSupabaseError(error, 'getActiveTaskLogForEmployee'); 
    return data;
};

export const startTask = async (taskId: string, employeeId: string, locationId: string): Promise<TaskTimeLog> => {
    // 1. Update task status
    await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('task_id', taskId);

    // 2. Create time log
    const newLog = {
        task_id: taskId,
        employee_id: employeeId,
        start_time: new Date().toISOString(),
        location_id: locationId,
    };
    
    const { data, error } = await supabase
        .from('task_time_logs')
        .insert([newLog])
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'startTask');
    return data;
};

export const finishTask = async (logId: string, taskId: string): Promise<TaskTimeLog> => {
    // 1. Update task status
    await supabase
        .from('tasks')
        .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('task_id', taskId);
    
    // 2. Update time log
    const { data, error } = await supabase
        .from('task_time_logs')
        .update({ end_time: new Date().toISOString() })
        .eq('log_id', logId)
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'finishTask');
    return data;
};

// Incidents
export const getIncidents = async (): Promise<Incident[]> => {
    const { data, error } = await supabase.from('incidents').select('*');
    if (error) handleSupabaseError(error, 'getIncidents');
    return data || [];
};

export const addIncident = async (data: Omit<Incident, 'incident_id' | 'created_at'>): Promise<Incident> => {
    const newIncident = {
        ...data,
        type: data.type || 'corrective',
        created_at: new Date().toISOString()
    };
    
    const { data: created, error } = await supabase
        .from('incidents')
        .insert([newIncident])
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'addIncident');
    return created;
};

export const updateIncident = async (data: Incident): Promise<Incident> => {
    const { data: updated, error } = await supabase
        .from('incidents')
        .update(data)
        .eq('incident_id', data.incident_id)
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'updateIncident');
    return updated;
};

// Shift Log
export const getShiftLog = async (): Promise<ShiftLogEntry[]> => {
    const { data, error } = await supabase
        .from('shift_log')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) handleSupabaseError(error, 'getShiftLog');
    return data || [];
};

export const addShiftLogEntry = async (data: Omit<ShiftLogEntry, 'log_id' | 'created_at' | 'status'>): Promise<ShiftLogEntry> => {
    const newEntry = {
        ...data,
        created_at: new Date().toISOString(),
        status: 'pending' as const
    };
    
    const { data: created, error } = await supabase
        .from('shift_log')
        .insert([newEntry])
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'addShiftLogEntry');
    return created;
};

export const updateShiftLogEntry = async (data: ShiftLogEntry): Promise<ShiftLogEntry> => {
    const { data: updated, error } = await supabase
        .from('shift_log')
        .update(data)
        .eq('log_id', data.log_id)
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'updateShiftLogEntry');
    return updated;
};

// Lost Items
export const getLostItems = async (): Promise<LostItem[]> => {
    const { data, error } = await supabase
        .from('lost_items')
        .select('*')
        .order('found_date', { ascending: false });
    if (error) handleSupabaseError(error, 'getLostItems');
    return data || [];
};

export const addLostItem = async (data: Omit<LostItem, 'item_id' | 'found_date' | 'status'>): Promise<LostItem> => {
    const newItem = {
        ...data,
        found_date: new Date().toISOString(),
        status: 'pending' as const
    };

    const { data: created, error } = await supabase
        .from('lost_items')
        .insert([newItem])
        .select()
        .single();
    if (error) handleSupabaseError(error, 'addLostItem');
    return created;
};

export const updateLostItem = async (data: LostItem): Promise<LostItem> => {
    const { data: updated, error } = await supabase
        .from('lost_items')
        .update(data)
        .eq('item_id', data.item_id)
        .select()
        .single();
    if (error) handleSupabaseError(error, 'updateLostItem');
    return updated;
};

// --- DIGITAL SIGNATURES (Phase 1) ---

export const getMonthlySignature = async (employeeId: string, month: number, year: number): Promise<MonthlySignature | null> => {
    const { data, error } = await supabase
        .from('monthly_signatures')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching signature", error);
        return null;
    }
    return data;
};

export const saveMonthlySignature = async (employeeId: string, month: number, year: number, signatureUrl: string): Promise<MonthlySignature> => {
    const newSignature = {
        employee_id: employeeId,
        month,
        year,
        signature_url: signatureUrl,
        signed_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('monthly_signatures')
        .insert([newSignature])
        .select()
        .single();

    if (error) handleSupabaseError(error, 'saveMonthlySignature');
    return data;
};

// --- TIME OFF REQUESTS (Phase 2) ---

export const getTimeOffRequests = async (): Promise<TimeOffRequest[]> => {
    const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) handleSupabaseError(error, 'getTimeOffRequests');
    return data || [];
};

export const createTimeOffRequest = async (data: Omit<TimeOffRequest, 'request_id' | 'created_at' | 'status'>): Promise<TimeOffRequest> => {
    const newRequest = {
        ...data,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    const { data: created, error } = await supabase
        .from('time_off_requests')
        .insert([newRequest])
        .select()
        .single();

    if (error) handleSupabaseError(error, 'createTimeOffRequest');
    return created;
};

export const updateTimeOffRequestStatus = async (
    requestId: string, 
    status: 'approved' | 'rejected', 
    reviewerId: string, 
    rejectionReason?: string
): Promise<TimeOffRequest> => {
    const { data, error } = await supabase
        .from('time_off_requests')
        .update({
            status,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
            rejection_reason: rejectionReason
        })
        .eq('request_id', requestId)
        .select()
        .single();

    if (error) handleSupabaseError(error, 'updateTimeOffRequestStatus');
    return data;
};

// --- SHIFT SCHEDULER (Phase 3) ---

export const getWorkShifts = async (startDate: string, endDate: string): Promise<WorkShift[]> => {
    const { data, error } = await supabase
        .from('work_shifts')
        .select('*')
        .gte('start_time', startDate)
        .lte('end_time', endDate);
        
    if (error) {
         console.warn("Error fetching work shifts (Table might be missing):", error);
         return [];
    }
    return data || [];
};

export const createWorkShift = async (data: Omit<WorkShift, 'shift_id'>): Promise<WorkShift> => {
    const { data: created, error } = await supabase
        .from('work_shifts')
        .insert([data])
        .select()
        .single();

    if (error) handleSupabaseError(error, 'createWorkShift');
    return created;
};

export const updateWorkShift = async (data: WorkShift): Promise<WorkShift> => {
    const { data: updated, error } = await supabase
        .from('work_shifts')
        .update(data)
        .eq('shift_id', data.shift_id)
        .select()
        .single();

    if (error) handleSupabaseError(error, 'updateWorkShift');
    return updated;
};

export const deleteWorkShift = async (shiftId: string): Promise<void> => {
    const { error } = await supabase
        .from('work_shifts')
        .delete()
        .eq('shift_id', shiftId);

    if (error) handleSupabaseError(error, 'deleteWorkShift');
};

// --- SHIFT CONFIGURATIONS (New) ---

export const getShiftConfigs = async (): Promise<ShiftConfig[]> => {
    const { data, error } = await supabase.from('shift_configs').select('*');
    if (error) {
        console.warn("getShiftConfigs failed (table likely missing):", error);
        return [];
    }
    return data || [];
};

export const addShiftConfig = async (data: Omit<ShiftConfig, 'config_id'>): Promise<ShiftConfig> => {
    const { data: created, error } = await supabase
        .from('shift_configs')
        .insert([data])
        .select()
        .single();

    if (error) handleSupabaseError(error, 'addShiftConfig');
    return created;
};

export const updateShiftConfig = async (data: ShiftConfig): Promise<ShiftConfig> => {
    const { data: updated, error } = await supabase
        .from('shift_configs')
        .update(data)
        .eq('config_id', data.config_id)
        .select()
        .single();

    if (error) handleSupabaseError(error, 'updateShiftConfig');
    return updated;
};

export const deleteShiftConfig = async (configId: string): Promise<void> => {
    const { error } = await supabase
        .from('shift_configs')
        .delete()
        .eq('config_id', configId);

    if (error) handleSupabaseError(error, 'deleteShiftConfig');
};

// --- DOCUMENT MANAGEMENT (New) ---

export const getDocuments = async (): Promise<CompanyDocument[]> => {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) {
        console.warn("getDocuments failed:", error);
        return [];
    }
    return data || [];
};

export const createDocument = async (
    documentData: Omit<CompanyDocument, 'document_id' | 'created_at'>, 
    targetEmployeeIds: string[]
): Promise<CompanyDocument> => {
    // 1. Create the document
    const { data: doc, error } = await supabase
        .from('documents')
        .insert([{...documentData, created_at: new Date().toISOString()}])
        .select()
        .single();

    if (error) handleSupabaseError(error, 'createDocument');

    // 2. Create signature/status entries for each target employee
    const signaturesData = targetEmployeeIds.map(empId => ({
        document_id: doc.document_id,
        employee_id: empId,
        status: 'pending'
    }));

    if (signaturesData.length > 0) {
        const { error: sigError } = await supabase
            .from('document_signatures')
            .insert(signaturesData);
            
        if (sigError) console.error("Error creating signature entries", sigError);
    }

    return doc;
};

export const getEmployeeDocuments = async (employeeId: string): Promise<(DocumentSignature & { document: CompanyDocument })[]> => {
    const { data, error } = await supabase
        .from('document_signatures')
        .select(`
            *,
            document:documents(*)
        `)
        .eq('employee_id', employeeId);

    if (error) {
        console.warn("getEmployeeDocuments failed:", error);
        return [];
    }
    return data || [];
};

export const getDocumentSignatures = async (documentId: string): Promise<DocumentSignature[]> => {
    const { data, error } = await supabase
        .from('document_signatures')
        .select('*')
        .eq('document_id', documentId);
        
    if (error) return [];
    return data || [];
};

export const signDocument = async (signatureId: string, signatureUrl?: string): Promise<void> => {
    const updates: Partial<DocumentSignature> = {
        status: 'signed',
        signed_at: new Date().toISOString(),
        viewed_at: new Date().toISOString()
    };
    
    if (signatureUrl) {
        updates.signature_url = signatureUrl;
    }

    const { error } = await supabase
        .from('document_signatures')
        .update(updates)
        .eq('id', signatureId);

    if (error) handleSupabaseError(error, 'signDocument');
};

export const markDocumentAsViewed = async (signatureId: string): Promise<void> => {
    // Only update if not already signed/viewed
    const { error } = await supabase
        .from('document_signatures')
        .update({
            status: 'viewed',
            viewed_at: new Date().toISOString()
        })
        .eq('id', signatureId)
        .eq('status', 'pending'); // Safety check

    if (error) handleSupabaseError(error, 'markDocumentAsViewed');
};

// --- MAINTENANCE PLANS (New) ---

export const getMaintenancePlans = async (): Promise<MaintenancePlan[]> => {
    const { data, error } = await supabase.from('maintenance_plans').select('*');
    if (error) {
        // Assume table doesn't exist in mock env, return empty
        console.warn("Table maintenance_plans likely missing", error);
        return [];
    }
    return data || [];
};

export const addMaintenancePlan = async (planData: Omit<MaintenancePlan, 'plan_id'>): Promise<MaintenancePlan> => {
    const { data, error } = await supabase
        .from('maintenance_plans')
        .insert([planData])
        .select()
        .single();
    
    if (error) handleSupabaseError(error, 'addMaintenancePlan');
    return data;
};

export const updateMaintenancePlan = async (planData: MaintenancePlan): Promise<MaintenancePlan> => {
    const { data, error } = await supabase
        .from('maintenance_plans')
        .update(planData)
        .eq('plan_id', planData.plan_id)
        .select()
        .single();
        
    if (error) handleSupabaseError(error, 'updateMaintenancePlan');
    return data;
};

export const deleteMaintenancePlan = async (planId: string): Promise<void> => {
    const { error } = await supabase
        .from('maintenance_plans')
        .delete()
        .eq('plan_id', planId);
    
    if (error) handleSupabaseError(error, 'deleteMaintenancePlan');
};

// Logic to generate tasks from plans
export const checkAndGenerateMaintenanceTasks = async (): Promise<void> => {
    const plans = await getMaintenancePlans();
    const today = new Date();
    today.setHours(0,0,0,0);

    for (const plan of plans) {
        if (!plan.active) continue;

        const dueDate = new Date(plan.next_due_date);
        dueDate.setHours(0,0,0,0);
        
        // Calculate difference in days
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Generate if due within 7 days or overdue
        if (diffDays <= 7) {
            // Check if incident already exists for this plan and date (mock check)
            // Ideally Supabase constraint would handle duplicates
            
            // Create Incident
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

            // Update Next Due Date
            let nextDate = new Date(dueDate);
            switch (plan.frequency) {
                case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
                case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
                case 'semestral': nextDate.setMonth(nextDate.getMonth() + 6); break;
                case 'annual': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
            }
            
            await updateMaintenancePlan({
                ...plan,
                next_due_date: nextDate.toISOString().split('T')[0]
            });
        }
    }
};
