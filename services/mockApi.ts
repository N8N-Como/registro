
import { createClient } from '@supabase/supabase-js';
import { Role, Employee, Location, TimeEntry, Policy, Announcement, Room, Task, TaskTimeLog, Incident, ShiftLogEntry, ActivityLog } from '../types';

// --- Supabase Configuration ---
// Estas son las credenciales que me has facilitado.
const SUPABASE_URL = 'https://acinnuphpdnsrmijsbsu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaW5udXBocGRuc3JtaWpzYnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTIyNjgsImV4cCI6MjA3ODk2ODI2OH0.DcaNxpI68W0gaGppraL9yZO6a9fHStVkU1ee4_zKbsg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to generate IDs client-side (matches existing app logic)
const uid = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- API Functions ---

// Roles
export const getRoles = async (): Promise<Role[]> => {
    const { data, error } = await supabase.from('roles').select('*');
    if (error) throw error;
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
    
    if (error) throw error;
    return data;
};

// Employees
export const getEmployees = async (): Promise<Employee[]> => {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) throw error;
    return data || [];
};

export const addEmployee = async (employeeData: Omit<Employee, 'employee_id'>): Promise<Employee> => {
    // We generate ID here for consistency with the previous mock logic, 
    // though Supabase could handle UUIDs automatically.
    const newId = uid();
    const newEmployee = { ...employeeData, employee_id: newId };
    
    const { data, error } = await supabase
        .from('employees')
        .insert([newEmployee])
        .select()
        .single();
        
    if (error) throw error;
    return data;
};

export const updateEmployee = async (employeeData: Employee): Promise<Employee> => {
    const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('employee_id', employeeData.employee_id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const acceptPolicy = async (employeeId: string): Promise<void> => {
    const { error } = await supabase
        .from('employees')
        .update({ policy_accepted: true })
        .eq('employee_id', employeeId);
        
    if (error) throw error;
};

// Locations
export const getLocations = async (): Promise<Location[]> => {
    const { data, error } = await supabase.from('locations').select('*');
    if (error) throw error;
    return data || [];
};

export const addLocation = async (locationData: Omit<Location, 'location_id'>): Promise<Location> => {
    const newId = uid();
    const newLocation = { ...locationData, location_id: newId };
    
    const { data, error } = await supabase
        .from('locations')
        .insert([newLocation])
        .select()
        .single();
        
    if (error) throw error;
    return data;
};

export const updateLocation = async (locationData: Location): Promise<Location> => {
    const { data, error } = await supabase
        .from('locations')
        .update(locationData)
        .eq('location_id', locationData.location_id)
        .select()
        .single();
        
    if (error) throw error;
    return data;
};

// Time Entries (Workday)
export const getTimeEntriesForEmployee = async (employeeId: string): Promise<TimeEntry[]> => {
    const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .order('clock_in_time', { ascending: false });
        
    if (error) throw error;
    return data || [];
};

export const clockIn = async (employeeId: string, locationId?: string, latitude?: number, longitude?: number): Promise<TimeEntry> => {
    const newEntry: TimeEntry = {
        entry_id: uid(),
        employee_id: employeeId,
        clock_in_time: new Date().toISOString(),
        clock_in_location_id: locationId,
        clock_in_latitude: latitude,
        clock_in_longitude: longitude,
        status: 'running',
    };
    
    const { data, error } = await supabase
        .from('time_entries')
        .insert([newEntry])
        .select()
        .single();
        
    if (error) throw error;
    return data;
};

export const clockOut = async (entryId: string, locationId?: string): Promise<TimeEntry> => {
    const { data, error } = await supabase
        .from('time_entries')
        .update({
            clock_out_time: new Date().toISOString(),
            clock_out_location_id: locationId,
            status: 'completed'
        })
        .eq('entry_id', entryId)
        .select()
        .single();
        
    if (error) throw error;
    return data;
};

// Activity Log (Establishment Check-in/out)
export const getActivityLogsForTimeEntry = async (timeEntryId: string): Promise<ActivityLog[]> => {
    const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('time_entry_id', timeEntryId);
        
    if (error) throw error;
    return data || [];
};

export const checkInToLocation = async (timeEntryId: string, employeeId: string, locationId: string): Promise<ActivityLog> => {
    const newLog: ActivityLog = {
        activity_id: uid(),
        time_entry_id: timeEntryId,
        employee_id: employeeId,
        location_id: locationId,
        check_in_time: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
        .from('activity_logs')
        .insert([newLog])
        .select()
        .single();
        
    if (error) throw error;
    return data;
};

export const checkOutOfLocation = async (activityId: string): Promise<ActivityLog> => {
    const { data, error } = await supabase
        .from('activity_logs')
        .update({
            check_out_time: new Date().toISOString()
        })
        .eq('activity_id', activityId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Policies
export const getPolicies = async (): Promise<Policy[]> => {
    const { data, error } = await supabase.from('policies').select('*');
    if (error) throw error;
    return data || [];
};

// Announcements
export const getAnnouncements = async (): Promise<Announcement[]> => {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
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
        announcement_id: uid(),
        created_at: new Date().toISOString()
    };
    
    const { data: created, error } = await supabase
        .from('announcements')
        .insert([newAnnouncement])
        .select()
        .single();
        
    if (error) throw error;
    return created;
};

export const updateAnnouncement = async (data: Announcement): Promise<Announcement> => {
    const { data: updated, error } = await supabase
        .from('announcements')
        .update(data)
        .eq('announcement_id', data.announcement_id)
        .select()
        .single();
        
    if (error) throw error;
    return updated;
};

// Rooms
export const getRooms = async (): Promise<Room[]> => {
    const { data, error } = await supabase.from('rooms').select('*');
    if (error) throw error;
    return data || [];
};

export const addRoom = async (data: Omit<Room, 'room_id' | 'status'>): Promise<Room> => {
    const newRoom = {
        ...data,
        room_id: uid(),
        status: 'clean' as const
    };
    
    const { data: created, error } = await supabase
        .from('rooms')
        .insert([newRoom])
        .select()
        .single();
        
    if (error) throw error;
    return created;
};

export const updateRoom = async (data: Room): Promise<Room> => {
    const { data: updated, error } = await supabase
        .from('rooms')
        .update(data)
        .eq('room_id', data.room_id)
        .select()
        .single();
        
    if (error) throw error;
    return updated;
};

// Tasks
export const getTasks = async (): Promise<Task[]> => {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;
    return data || [];
};

export const addTask = async (data: Omit<Task, 'task_id' | 'created_at' | 'completed_at'>): Promise<Task> => {
    const newTask = {
        ...data,
        task_id: uid(),
        created_at: new Date().toISOString()
    };
    
    const { data: created, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()
        .single();
        
    if (error) throw error;
    return created;
};

export const updateTask = async (data: Task): Promise<Task> => {
    const { data: updated, error } = await supabase
        .from('tasks')
        .update(data)
        .eq('task_id', data.task_id)
        .select()
        .single();
        
    if (error) throw error;
    return updated;
};

// Task Time Logs
export const getTaskTimeLogs = async (): Promise<TaskTimeLog[]> => {
    const { data, error } = await supabase.from('task_time_logs').select('*');
    if (error) throw error;
    return data || [];
};

export const getActiveTaskLogForEmployee = async (employeeId: string): Promise<TaskTimeLog | null> => {
    const { data, error } = await supabase
        .from('task_time_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .is('end_time', null)
        .maybeSingle();
        
    if (error && error.code !== 'PGRST116') throw error; // Ignore 'no rows found' error
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
        log_id: uid(),
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
        
    if (error) throw error;
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
        
    if (error) throw error;
    return data;
};

// Incidents
export const getIncidents = async (): Promise<Incident[]> => {
    const { data, error } = await supabase.from('incidents').select('*');
    if (error) throw error;
    return data || [];
};

export const addIncident = async (data: Omit<Incident, 'incident_id' | 'created_at'>): Promise<Incident> => {
    const newIncident = {
        ...data,
        incident_id: uid(),
        created_at: new Date().toISOString()
    };
    
    const { data: created, error } = await supabase
        .from('incidents')
        .insert([newIncident])
        .select()
        .single();
        
    if (error) throw error;
    return created;
};

export const updateIncident = async (data: Incident): Promise<Incident> => {
    const { data: updated, error } = await supabase
        .from('incidents')
        .update(data)
        .eq('incident_id', data.incident_id)
        .select()
        .single();
        
    if (error) throw error;
    return updated;
};

// Shift Log
export const getShiftLog = async (): Promise<ShiftLogEntry[]> => {
    const { data, error } = await supabase
        .from('shift_log')
        .select('*')
        .order('created_at', { ascending: false });
        
    if (error) throw error;
    return data || [];
};

export const addShiftLogEntry = async (data: Omit<ShiftLogEntry, 'log_id' | 'created_at' | 'status'>): Promise<ShiftLogEntry> => {
    const newEntry = {
        ...data,
        log_id: uid(),
        created_at: new Date().toISOString(),
        status: 'pending' as const
    };
    
    const { data: created, error } = await supabase
        .from('shift_log')
        .insert([newEntry])
        .select()
        .single();
        
    if (error) throw error;
    return created;
};

export const updateShiftLogEntry = async (data: ShiftLogEntry): Promise<ShiftLogEntry> => {
    const { data: updated, error } = await supabase
        .from('shift_log')
        .update(data)
        .eq('log_id', data.log_id)
        .select()
        .single();
        
    if (error) throw error;
    return updated;
};
