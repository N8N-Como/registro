

export type Permission = 
  | 'manage_employees'
  | 'manage_locations'
  | 'manage_announcements'
  | 'view_reports'
  | 'manage_incidents'
  | 'manage_tasks'
  | 'access_shift_log'
  | 'schedule_tasks'
  | 'audit_records'; // New permission for inspection

export interface Role {
  role_id: string;
  name: string;
  permissions: Permission[];
}

export interface Employee {
  employee_id: string;
  first_name: string;
  last_name: string;
  pin: string;
  role_id: string;
  status: 'active' | 'inactive';
  policy_accepted: boolean;
  photo_url: string;
}

export interface Location {
  location_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export type WorkType = 'ordinaria' | 'extra' | 'guardia' | 'formacion';
export type WorkMode = 'presencial' | 'teletrabajo';

export interface TimeEntry {
  entry_id: string;
  employee_id: string;
  clock_in_time: string;
  clock_in_location_id?: string;
  clock_in_latitude?: number;
  clock_in_longitude?: number;
  clock_out_time?: string;
  clock_out_location_id?: string;
  status: 'running' | 'completed';
  // Compliance fields
  work_type?: WorkType;
  work_mode?: WorkMode;
  verified_by_photo?: string;
}

export interface BreakLog {
    break_id: string;
    time_entry_id: string;
    start_time: string;
    end_time?: string;
    break_type: string; // 'comida', 'descanso', 'personal'
}

export interface ActivityLog {
  activity_id: string;
  time_entry_id: string;
  employee_id: string;
  location_id: string;
  check_in_time: string;
  check_out_time?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
}

export interface AccessLog {
    log_id: string;
    employee_id: string;
    location_id: string;
    attempt_time: string;
    latitude: number;
    longitude: number;
    was_allowed: boolean;
    denial_reason?: string;
}

export interface Policy {
    policy_id: string;
    title: string;
    content: string;
    version: number;
}

export interface Announcement {
    announcement_id: string;
    message: string;
    created_at: string;
    created_by: string; // employee_id
    is_active: boolean;
}

export interface Room {
    room_id: string;
    name: string;
    location_id: string;
    status: 'clean' | 'dirty' | 'pending' | 'in_progress';
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
    task_id: string;
    description: string;
    room_id: string;
    location_id?: string;
    assigned_to: string; // employee_id
    due_date: string; // YYYY-MM-DD
    status: TaskStatus;
    created_at: string;
    completed_at?: string;
}

export interface TaskTimeLog {
    log_id: string;
    task_id: string;
    employee_id: string;
    start_time: string;
    end_time?: string;
    location_id: string;
}

export interface Incident {
    incident_id: string;
    description: string;
    location_id: string;
    room_id?: string;
    reported_by: string; // employee_id
    created_at: string;
    status: 'open' | 'in_progress' | 'resolved';
    priority: 'low' | 'medium' | 'high';
    assigned_to?: string; // employee_id
    photo_url?: string;
}

export interface ShiftLogEntry {
    log_id: string;
    employee_id: string;
    created_at: string;
    message: string;
    target_role_id: string; // 'all' or a role_id
    status: 'pending' | 'in_progress' | 'resolved';
}

export interface LostItem {
    item_id: string;
    description: string;
    photo_url?: string;
    found_at_location_id: string;
    found_at_room_id?: string;
    found_date: string; // ISO Date
    found_by_employee_id: string;
    status: 'pending' | 'returned';
    returned_to?: string; // Name of the person receiving the item
    returned_date?: string; // ISO Date
    returned_by_employee_id?: string;
}

export interface MonthlySignature {
    signature_id: string;
    employee_id: string;
    month: number;
    year: number;
    signature_url: string; // Base64
    signed_at: string;
}

export type TimeOffType = 'vacation' | 'sick_leave' | 'personal' | 'compensatory';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface TimeOffRequest {
    request_id: string;
    employee_id: string;
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    type: TimeOffType;
    status: TimeOffStatus;
    reason?: string;
    created_at: string;
    reviewed_by?: string;
    reviewed_at?: string;
    rejection_reason?: string;
}

export interface WorkShift {
    shift_id: string;
    employee_id: string;
    location_id?: string;
    start_time: string; // ISO DateTime
    end_time: string; // ISO DateTime
    color: string;
    notes?: string;
}