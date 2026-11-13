import type { StatusValue } from "@/lib/constants";

export type Role = "student" | "staff" | "admin" | "super_admin";
export type LoginRole = "student" | "staff" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: string;
  emailVerified: boolean;
  profileImage: string | null;
  studentId: string | null;
  employeeId: string | null;
  course: string | null;
  department: string | null;
  departmentId: string | null;
  yearSemester: string | null;
  designation: string | null;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  handles_categories: string | null;
  email: string | null;
  created_at: string;
}

export interface CampusLocation {
  id: string;
  name: string;
  category: string;
  building: string | null;
  floor: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  verified: number;
  qr_slug: string;
  created_at: string;
}

export interface ComplaintImage {
  id: string;
  url: string;
  kind: "report" | "resolution";
  created_at: string;
}

export interface Complaint {
  id: string;
  complaint_code: string;
  reporter_id: string;
  anonymous: number;
  title: string;
  category: string;
  description: string;
  priority: string;
  status: StatusValue;
  location_id: string | null;
  building: string | null;
  floor: string | null;
  room_number: string | null;
  specific_location: string | null;
  lat: number | null;
  lng: number | null;
  assigned_department_id: string | null;
  assigned_staff_id: string | null;
  admin_notes: string | null;
  resolution_notes: string | null;
  rejection_reason: string | null;
  reopen_reason: string | null;
  is_demo: number;
  points_awarded: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  verified_at: string | null;
  closed_at: string | null;
  reporter_name?: string | null;
  reporter_email?: string | null;
  department_name?: string | null;
  staff_name?: string | null;
  location_name?: string | null;
  image_count?: number;
  rating?: number | null;
}

export interface StatusHistory {
  id: string;
  complaint_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_by: string | null;
  changed_by_name?: string | null;
  created_at: string;
}

export interface StaffUpdate {
  id: string;
  complaint_id: string;
  staff_id: string;
  update_type: string;
  message: string;
  image_url: string | null;
  created_at: string;
  staff_name?: string | null;
}

export interface ComplaintFeedback {
  id: string;
  complaint_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  complaint_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  status: string;
  student_id: string | null;
  employee_id: string | null;
  course: string | null;
  department: string | null;
  department_id: string | null;
  year_semester: string | null;
  designation: string | null;
  profile_image: string | null;
  email_verified: number;
  is_demo: number;
  created_at: string;
  complaint_count?: number;
}

export interface FullComplaint extends Complaint {
  images: ComplaintImage[];
  history: StatusHistory[];
  staff_updates: StaffUpdate[];
  feedback: ComplaintFeedback | null;
  assignments?: Array<{
    id: string;
    department_id: string | null;
    staff_id: string | null;
    note: string | null;
    assigned_by: string | null;
    created_at: string;
    department_name?: string | null;
    staff_name?: string | null;
  }>;
}
