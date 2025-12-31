
export type Permission = 
  | 'manage_employees'
  | 'manage_locations'
  | 'manage_announcements'
  | 'view_reports'
  | 'manage_incidents'
  | 'manage_tasks'
  | 'access_shift_log'
  | 'schedule_tasks'
  | 'audit_records'
  | 'manage_documents'
  | 'manage_maintenance'
  | 'manage_inventory';

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
  province?: 'coruna' | 'pontevedra' | 'other';
  annual_hours_contract?: number;
  default_location_id?: string;
  default_start_time?: string;
  default_end_time?: string;
}

export interface Location {
  location_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export type RoomStatus = 'clean' | 'dirty' | 'pending' | 'in_progress' | 'priority_out' | 'occupied' | 'out_of_order';

export interface Room {
    room_id: string;
    name: string;
    location_id: string;
    status: RoomStatus;
    floor?: string;
    last_cleaned_at?: string;
    last_cleaned_by?: string;
    is_priority?: boolean;
    notes?: string;
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
  work_type?: WorkType;
  work_mode?: WorkMode;
  verified_by_photo?: string;
  is_manual?: boolean;
  device_id?: string;
  device_info?: string;
}

export interface TimeCorrectionRequest {
    request_id: string;
    employee_id: string;
    original_entry_id?: string;
    correction_type: 'create_entry' | 'fix_time';
    requested_date: string;
    requested_clock_in: string;
    requested_clock_out?: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    reviewed_by?: string;
    reviewed_at?: string;
}

export interface BreakLog {
    break_id: string;
    time_entry_id: string;
    start_time: string;
    end_time?: string;
    break_type: string;
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
    created_by: string;
    is_active: boolean;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface Task {
    task_id: string;
    description: string;
    room_id: string;
    location_id?: string;
    assigned_to: string;
    due_date: string;
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
    reported_by: string;
    created_at: string;
    status: 'open' | 'in_progress' | 'resolved';
    priority: 'low' | 'medium' | 'high';
    assigned_to?: string;
    photo_url?: string;
    type?: 'corrective' | 'preventive';
    maintenance_plan_id?: string;
    due_date?: string;
}

export interface ShiftLogEntry {
    log_id: string;
    employee_id: string;
    created_at: string;
    message: string;
    target_role_id: string;
    status: 'pending' | 'in_progress' | 'resolved';
}

export interface LostItem {
    item_id: string;
    description: string;
    photo_url?: string;
    found_at_location_id: string;
    found_at_room_id?: string;
    found_date: string;
    found_by_employee_id: string;
    status: 'pending' | 'returned';
    returned_to?: string;
    returned_date?: string;
    returned_by_employee_id?: string;
}

export interface MonthlySignature {
    signature_id: string;
    employee_id: string;
    month: number;
    year: number;
    signature_url: string;
    signed_at: string;
}

export type TimeOffType = 'vacation' | 'sick_leave' | 'personal' | 'compensatory';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface TimeOffRequest {
    request_id: string;
    employee_id: string;
    start_date: string;
    end_date: string;
    type: TimeOffType;
    status: TimeOffStatus;
    reason?: string;
    created_at: string;
    reviewed_by?: string;
    reviewed_at?: string;
    rejection_reason?: string;
}

export type ShiftType = 'work' | 'off' | 'vacation' | 'sick' | 'permission';

export interface ShiftConfig {
    config_id: string;
    code: string;
    name: string;
    start_time: string;
    end_time: string;
    color: string;
    location_id?: string;
}

export interface WorkShift {
    shift_id: string;
    employee_id: string;
    location_id?: string;
    start_time: string;
    end_time: string;
    color: string;
    notes?: string;
    type: ShiftType;
    shift_config_id?: string;
}

export type DocumentType = 'file' | 'link';

export interface CompanyDocument {
    document_id: string;
    title: string;
    description?: string;
    type: DocumentType;
    content_url: string;
    created_at: string;
    created_by: string;
    requires_signature: boolean;
}

export interface DocumentSignature {
    id: string;
    document_id: string;
    employee_id: string;
    status: 'pending' | 'signed' | 'viewed';
    signed_at?: string;
    signature_url?: string;
    viewed_at?: string;
}

export type Frequency = 'monthly' | 'quarterly' | 'semestral' | 'annual';

export interface MaintenancePlan {
    plan_id: string;
    title: string;
    description: string;
    location_id: string;
    frequency: Frequency;
    next_due_date: string;
    created_by: string;
    active: boolean;
}

export type InventoryCategory = 'cleaning' | 'amenities' | 'maintenance' | 'office' | 'linen';

export interface InventoryItem {
    item_id: string;
    name: string;
    category: InventoryCategory;
    quantity: number;
    unit: string;
    min_threshold: number;
    location_id?: string;
    last_updated: string;
}

export interface StockLog {
    log_id: string;
    item_id: string;
    change_amount: number;
    reason: string;
    employee_id: string;
    created_at: string;
}

// Added StockPrediction interface to resolve export error
export interface StockPrediction {
    item_id: string;
    item_name: string;
    days_left: number;
    risk_level: 'low' | 'medium' | 'high';
    recommendation: string;
}
