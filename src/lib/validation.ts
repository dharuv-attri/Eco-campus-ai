import { z } from "zod";
import { PROBLEM_CATEGORIES, LOCATION_CATEGORIES } from "@/lib/constants";

const categoryValues = PROBLEM_CATEGORIES.map((c) => c.value) as [string, ...string[]];

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128)
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[a-z]/, "Include at least one lowercase letter.")
    .regex(/[0-9]/, "Include at least one number."),
  role: z.enum(["student", "staff"]).default("student"),
  studentId: z.string().trim().max(40).optional().or(z.literal("")),
  course: z.string().trim().max(120).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  departmentId: z.string().trim().max(60).optional().or(z.literal("")),
  yearSemester: z.string().trim().max(40).optional().or(z.literal("")),
  employeeId: z.string().trim().max(40).optional().or(z.literal("")),
  designation: z.string().trim().max(120).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").max(128),
  role: z.enum(["student", "staff", "admin"]).optional(),
});

export const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const recoveryVerifySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export const otpRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  purpose: z.enum(["login", "verify"]),
  role: z.enum(["student", "staff", "admin"]).optional(),
});

export const otpVerifySchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  code: z.string().trim().regex(/^\d{6,10}$/, "Enter the numeric code from your email."),
  purpose: z.enum(["login", "verify"]),
  role: z.enum(["student", "staff", "admin"]).optional(),
});

export const resetSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128)
    .regex(/[A-Z]/, "Include an uppercase letter.")
    .regex(/[a-z]/, "Include a lowercase letter.")
    .regex(/[0-9]/, "Include a number."),
});

export const adminSetupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter the administrator's name.").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128)
      .regex(/[A-Z]/, "Include at least one uppercase letter.")
      .regex(/[a-z]/, "Include at least one lowercase letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string().max(128),
    setupToken: z.string().max(512).optional().default(""),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  studentId: z.string().trim().max(40).optional().or(z.literal("")),
  course: z.string().trim().max(120).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  yearSemester: z.string().trim().max(40).optional().or(z.literal("")),
  employeeId: z.string().trim().max(40).optional().or(z.literal("")),
  designation: z.string().trim().max(120).optional().or(z.literal("")),
  profileImage: z.string().trim().max(300).optional().or(z.literal("")),
});

export const complaintSchema = z.object({
  title: z.string().trim().min(8, "Add a short, specific title.").max(160),
  category: z.enum(categoryValues),
  description: z.string().trim().min(20, "Describe the problem in at least 20 characters.").max(3000),
  priority: z.enum(["low", "medium", "high", "emergency"]).default("medium"),
  locationId: z.string().max(80).optional().or(z.literal("")),
  building: z.string().trim().max(120).optional().or(z.literal("")),
  floor: z.string().trim().max(60).optional().or(z.literal("")),
  roomNumber: z.string().trim().max(60).optional().or(z.literal("")),
  specificLocation: z.string().trim().max(240).optional().or(z.literal("")),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  anonymous: z.boolean().default(false),
  imageUrls: z.array(z.string().max(300)).max(5).default([]),
  confirmedDuplicate: z.boolean().default(false),
});

export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const reopenSchema = z.object({
  reason: z.string().trim().min(10, "Explain why the issue is not resolved.").max(1000),
});

export const staffUpdateSchema = z.object({
  action: z.enum(["start", "progress", "resolve", "request_info", "note", "archive"]),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
  resolutionNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  imageUrls: z.array(z.string().max(300)).max(5).default([]),
});

export const adminComplaintSchema = z.object({
  action: z.enum([
    "review",
    "assign",
    "priority",
    "status",
    "note",
    "reject",
    "verify",
    "close",
    "reopen",
    "restore",
    "delete_demo",
  ]),
  departmentId: z.string().max(80).optional(),
  staffId: z.string().max(80).optional(),
  priority: z.enum(["low", "medium", "high", "emergency"]).optional(),
  status: z.string().max(40).optional(),
  note: z.string().trim().max(2000).optional(),
  reason: z.string().trim().max(1000).optional(),
});

export const userAdminSchema = z.object({
  action: z.enum(["approve", "reject", "suspend", "reactivate", "remove", "role", "department", "reset_password"]),
  role: z.enum(["student", "staff", "admin", "super_admin"]).optional(),
  departmentId: z.string().max(80).optional().nullable(),
  reason: z.string().trim().max(500).optional(),
});

export const locationSchema = z.object({
  id: z.string().max(80).optional(),
  name: z.string().trim().min(2).max(120),
  category: z.enum(LOCATION_CATEGORIES),
  building: z.string().trim().max(120).optional().or(z.literal("")),
  floor: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  verified: z.boolean().default(false),
});

export const departmentSchema = z.object({
  id: z.string().max(80).optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  email: z.string().trim().max(160).optional().or(z.literal("")),
  handlesCategories: z.array(z.string().max(60)).max(30).default([]),
});

export const announcementSchema = z.object({
  id: z.string().max(80).optional(),
  title: z.string().trim().min(4).max(180),
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  content: z.string().trim().min(10).max(10000),
  category: z.string().trim().max(60).default("General"),
  published: z.boolean().default(true),
});

export const articleSchema = z.object({
  id: z.string().max(80).optional(),
  title: z.string().trim().min(4).max(180),
  excerpt: z.string().trim().max(300).optional().or(z.literal("")),
  content: z.string().trim().min(10).max(20000),
  category: z.string().trim().max(60).default("Awareness"),
  readMinutes: z.number().int().min(1).max(60).default(4),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  published: z.boolean().default(true),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1, "Type a question.").max(1200),
  chatSessionId: z.string().min(6).max(80),
  language: z.enum(["en", "hi", "hinglish"]).default("en"),
});

export const quizSchema = z.object({
  quizId: z.string().min(2).max(60),
  answers: z.array(z.number().int().min(0).max(10)).min(1).max(30),
});

export const settingsSchema = z.object({
  settings: z.record(z.string(), z.string().max(20000)),
});

export const sectionsSchema = z.object({
  sections: z.array(
    z.object({
      key: z.string().max(60),
      enabled: z.boolean(),
      sortOrder: z.number().int().min(0).max(100),
    }),
  ),
});

export const greenActivitySchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  points: z.number().int().min(1).max(500),
  activityDate: z.string().max(40).optional().or(z.literal("")),
  userIds: z.array(z.string().max(80)).max(100).default([]),
});
