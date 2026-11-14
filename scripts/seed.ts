import { randomUUID } from "node:crypto";
import { one, run, all } from "../src/lib/db";
import { loadEnvConfig } from "@next/env";
import {
  AWARENESS_ARTICLES,
  DEFAULT_SECTIONS,
  DEFAULT_SETTINGS,
  DEPARTMENT_SEEDS,
  QUIZ_SEED,
} from "../src/lib/constants";

loadEnvConfig(process.cwd());

const now = new Date();
const iso = now.toISOString();
const dayMs = 24 * 60 * 60 * 1000;

function daysAgo(days: number, hour = 10) {
  const d = new Date(now.getTime() - days * dayMs);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

async function seed() {
  if (!process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
    throw new Error("Set SUPABASE_DB_URL or DATABASE_URL before seeding.");
  }
  console.log("Seeding EcoCampus AI database…");

  const departmentIds = new Map<string, string>();
  for (const dept of DEPARTMENT_SEEDS) {
    const id = `dept-${dept.slug}`;
    departmentIds.set(dept.slug, id);
    await run(
      `INSERT OR IGNORE INTO departments (id, name, slug, description, handles_categories, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      dept.name,
      dept.slug,
      dept.description,
      JSON.stringify(dept.handles),
      dept.email,
      iso,
      iso,
    );
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await run(
      "INSERT OR IGNORE INTO website_settings (key, value, updated_at) VALUES (?, ?, ?)",
      key,
      value,
      iso,
    );
  }
  for (const section of DEFAULT_SECTIONS) {
    await run(
      `INSERT OR IGNORE INTO website_sections (key, label, enabled, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      section.key,
      section.label,
      section.enabled,
      section.sort_order,
      iso,
    );
  }

  const users = [
    {
      id: "usr-demo-admin",
      email: "demo.reporter@ecocampus.local",
      name: "Campus Demo Account",
      role: "student",
      status: "active",
      department: "Campus Demo Data",
      departmentId: null,
      studentId: null,
      course: null,
      year: null,
      employeeId: null,
      designation: null,
      isDemo: 1,
    },
    {
      id: "usr-demo-staff",
      email: "staff@ecocampus.local",
      name: "Arjun Singh",
      role: "staff",
      status: "active",
      department: "Water & Plumbing",
      departmentId: "dept-water-plumbing",
      studentId: null,
      course: null,
      year: null,
      employeeId: "EMP-OPS-101",
      designation: "Maintenance Supervisor (demo)",
      isDemo: 1,
    },
    {
      id: "usr-demo-staff-2",
      email: "housekeeping@ecocampus.local",
      name: "Simran Kaur",
      role: "staff",
      status: "active",
      department: "Housekeeping & Sanitation",
      departmentId: "dept-housekeeping",
      studentId: null,
      course: null,
      year: null,
      employeeId: "EMP-OPS-102",
      designation: "Housekeeping Lead (demo)",
      isDemo: 1,
    },
    {
      id: "usr-demo-student",
      email: "student@ecocampus.local",
      name: "Riya Verma",
      role: "student",
      status: "active",
      department: "B.Tech CSE (IBM)",
      departmentId: null,
      studentId: "LTSU2026CSE001",
      course: "B.Tech Computer Science & Engineering (IBM)",
      year: "3rd year / 5th semester",
      employeeId: null,
      designation: null,
      isDemo: 1,
    },
    {
      id: "usr-demo-student-2",
      email: "aman.student@ecocampus.local",
      name: "Aman Kumar",
      role: "student",
      status: "active",
      department: "B.Tech AI & ML",
      departmentId: null,
      studentId: "LTSU2026AIML014",
      course: "B.Tech AI & Machine Learning",
      year: "2nd year / 3rd semester",
      employeeId: null,
      designation: null,
      isDemo: 1,
    },
    {
      id: "usr-demo-student-3",
      email: "nisha.student@ecocampus.local",
      name: "Nisha Rani",
      role: "student",
      status: "active",
      department: "University School of Commerce & Management",
      departmentId: null,
      studentId: "LTSU2026COM022",
      course: "BBA",
      year: "1st year / 2nd semester",
      employeeId: null,
      designation: null,
      isDemo: 1,
    },
    {
      id: "usr-demo-pending-staff",
      email: "pending.staff@ecocampus.local",
      name: "Vikram Chauhan",
      role: "staff",
      status: "pending",
      department: "Electrical Maintenance",
      departmentId: "dept-electrical",
      studentId: null,
      course: null,
      year: null,
      employeeId: "EMP-OPS-115",
      designation: "Electrician (awaiting approval)",
      isDemo: 1,
    },
  ];

  for (const user of users) {
    const existing = await one<{ id: string }>("SELECT id FROM users WHERE email = ?", user.email);
    if (existing) continue;
    await run(
      `INSERT INTO users (id, email, password_hash, role, full_name, student_id, course, department,
        department_id, year_semester, employee_id, designation, email_verified, status, provider, is_demo, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'email', ?, ?, ?)`,
      user.id,
      user.email,
      user.role,
      user.name,
      user.studentId,
      user.course,
      user.department,
      user.departmentId,
      user.year,
      user.employeeId,
      user.designation,
      user.status,
      user.isDemo,
      daysAgo(120),
      iso,
    );
  }

  const locations = [
    {
      id: "loc-campus-centre",
      name: "LTSU Campus — official map centre",
      category: "Other Campus Locations",
      building: null,
      floor: null,
      description:
        "Map centre published in LTSU's official Google Maps embed. Building-level pins require administrator verification.",
      lat: 30.991586,
      lng: 76.477097,
      verified: 1,
      slug: "ltsu-campus-centre",
    },
    { id: "loc-academic-area", name: "Academic area (pin pending verification)", category: "Academic Blocks", building: "Academic area", floor: null, description: "Generic academic area. An administrator must add a verified building pin.", lat: null, lng: null, verified: 0, slug: "academic-area" },
    { id: "loc-library", name: "Library (pin pending verification)", category: "Library", building: "Library", floor: null, description: "Campus library area. Verified coordinates can be added by an administrator.", lat: null, lng: null, verified: 0, slug: "library" },
    { id: "loc-hostel-area", name: "Hostel area (pin pending verification)", category: "Hostel Areas", building: "Hostel area", floor: null, description: "Generic hostel area for reports until exact pins are verified.", lat: null, lng: null, verified: 0, slug: "hostel-area" },
    { id: "loc-sports-area", name: "Sports area (pin pending verification)", category: "Sports Areas", building: "Sports area", floor: null, description: "Outdoor sports and recreation area.", lat: null, lng: null, verified: 0, slug: "sports-area" },
    { id: "loc-green-area", name: "Green area (pin pending verification)", category: "Green Areas", building: null, floor: null, description: "Campus green and landscaped areas.", lat: null, lng: null, verified: 0, slug: "green-area" },
    { id: "loc-parking", name: "Parking area (pin pending verification)", category: "Parking", building: null, floor: null, description: "Campus parking area.", lat: null, lng: null, verified: 0, slug: "parking" },
    { id: "loc-dining", name: "Dining / canteen area (pin pending verification)", category: "Canteen", building: null, floor: null, description: "Campus dining area.", lat: null, lng: null, verified: 0, slug: "dining-area" },
    { id: "loc-washrooms", name: "Washroom area (pin pending verification)", category: "Washrooms", building: null, floor: null, description: "Generic washroom reporting location.", lat: null, lng: null, verified: 0, slug: "washroom-area" },
  ];

  for (const loc of locations) {
    await run(
      `INSERT OR IGNORE INTO campus_locations
       (id, name, category, building, floor, description, lat, lng, verified, qr_slug, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      loc.id,
      loc.name,
      loc.category,
      loc.building,
      loc.floor,
      loc.description,
      loc.lat,
      loc.lng,
      loc.verified,
      loc.slug,
      "usr-demo-admin",
      daysAgo(90),
      iso,
    );
  }

  const existingComplaints = await one<{ count: number }>("SELECT COUNT(*) AS count FROM complaints");
  if ((existingComplaints?.count ?? 0) === 0) {
    const demo = [
      {
        id: "cmp-demo-001",
        code: "ECO-2026-00001",
        reporter: "usr-demo-student",
        title: "Dripping tap in hostel washroom",
        category: "damaged_taps",
        description:
          "The tap in the hostel washroom continues to drip even after closing it fully. A small puddle is forming on the floor, which could become slippery.",
        priority: "medium",
        status: "verified",
        location: "loc-hostel-area",
        building: "Hostel area",
        floor: "Ground floor",
        room: "Washroom",
        department: "dept-water-plumbing",
        staff: "usr-demo-staff",
        created: daysAgo(18),
        resolved: daysAgo(15),
        verifiedAt: daysAgo(14),
        resolution: "Washer replaced and tap tested. Area dried and checked for leakage.",
        adminNotes: "Verified by campus administration. Photos confirmed the repair.",
      },
      {
        id: "cmp-demo-002",
        code: "ECO-2026-00002",
        reporter: "usr-demo-student",
        title: "Lights left on in an empty classroom",
        category: "electricity_wastage",
        description:
          "Lights and fans were running in an empty classroom during the afternoon break. The room is used for afternoon lectures.",
        priority: "low",
        status: "in_progress",
        location: "loc-academic-area",
        building: "Academic area",
        floor: "First floor",
        room: "Room 104",
        department: "dept-electrical",
        staff: "usr-demo-staff",
        created: daysAgo(3),
        resolved: null,
        verifiedAt: null,
        resolution: null,
        adminNotes: null,
      },
      {
        id: "cmp-demo-003",
        code: "ECO-2026-00003",
        reporter: "usr-demo-student-2",
        title: "Overflowing dustbin near the dining area",
        category: "garbage_waste",
        description:
          "A dustbin near the dining area is overflowing and waste is spilling onto the ground. The location is close to the seating area.",
        priority: "high",
        status: "verified",
        location: "loc-dining",
        building: "Dining area",
        floor: null,
        room: null,
        department: "dept-housekeeping",
        staff: "usr-demo-staff-2",
        created: daysAgo(4),
        resolved: daysAgo(2),
        verifiedAt: daysAgo(1),
        resolution: "Bin emptied and area cleaned. Additional collection scheduled during peak hours.",
        adminNotes: "Clean-up verified on site by the environment coordinator.",
      },
      {
        id: "cmp-demo-004",
        code: "ECO-2026-00004",
        reporter: "usr-demo-student-3",
        title: "Water pooling near a rainwater harvesting pit",
        category: "rainwater_harvesting",
        description:
          "Standing water has collected around a rainwater harvesting area after rain. It has not drained for two days and mosquitoes are visible.",
        priority: "high",
        status: "assigned",
        location: "loc-green-area",
        building: "Green area",
        floor: null,
        room: null,
        department: "dept-water-plumbing",
        staff: "usr-demo-staff",
        created: daysAgo(2),
        resolved: null,
        verifiedAt: null,
        resolution: null,
        adminNotes: "Assigned for inspection.",
      },
      {
        id: "cmp-demo-005",
        code: "ECO-2026-00005",
        reporter: "usr-demo-student-2",
        title: "Plastic waste collected behind the sports area",
        category: "plastic_pollution",
        description:
          "Single-use plastic bottles and wrappers have collected behind the sports area after a recent event. There is no nearby bin.",
        priority: "medium",
        status: "under_review",
        location: "loc-sports-area",
        building: "Sports area",
        floor: null,
        room: null,
        department: null,
        staff: null,
        created: daysAgo(1),
        resolved: null,
        verifiedAt: null,
        resolution: null,
        adminNotes: null,
      },
      {
        id: "cmp-demo-006",
        code: "ECO-2026-00006",
        reporter: "usr-demo-student",
        title: "Broken light near a parking walkway",
        category: "broken_lights",
        description:
          "A walkway light near the parking area is not working. The path is dark after sunset and difficult to see.",
        priority: "high",
        status: "submitted",
        location: "loc-parking",
        building: "Parking",
        floor: null,
        room: null,
        department: null,
        staff: null,
        created: daysAgo(0, 8),
        resolved: null,
        verifiedAt: null,
        resolution: null,
        adminNotes: null,
      },
      {
        id: "cmp-demo-007",
        code: "ECO-2026-00007",
        reporter: "usr-demo-student-3",
        title: "Drain near the academic area is blocked",
        category: "blocked_drains",
        description:
          "Water is not draining near the academic area after rainfall. Leaves and debris appear to have blocked the drain grate.",
        priority: "medium",
        status: "closed",
        location: "loc-academic-area",
        building: "Academic area",
        floor: null,
        room: null,
        department: "dept-civil",
        staff: "usr-demo-staff",
        created: daysAgo(35),
        resolved: daysAgo(30),
        verifiedAt: daysAgo(29),
        resolution: "Drain cleared and grate secured. Debris removed safely.",
        adminNotes: "Closed after verification and student feedback.",
      },
      {
        id: "cmp-demo-008",
        code: "ECO-2026-00008",
        reporter: "usr-demo-student-2",
        title: "AC running in an unused room",
        category: "ac_running",
        description:
          "The air-conditioner in a seminar room has been running for several hours with the door open and no one inside.",
        priority: "low",
        status: "reopened",
        location: "loc-academic-area",
        building: "Academic area",
        floor: "Second floor",
        room: "Seminar room",
        department: "dept-electrical",
        staff: "usr-demo-staff",
        created: daysAgo(10),
        resolved: daysAgo(6),
        verifiedAt: null,
        resolution: "AC switched off and signage placed on the door.",
        adminNotes: "Student reports that the issue recurred — under review.",
      },
      {
        id: "cmp-demo-009",
        code: "ECO-2026-00009",
        reporter: "usr-demo-student",
        title: "Washroom cleanliness follow-up",
        category: "dirty_washrooms",
        description:
          "The washroom near the library required cleaning during the afternoon. The issue was reported to the housekeeping desk.",
        priority: "medium",
        status: "rejected",
        location: "loc-washrooms",
        building: "Library area",
        floor: null,
        room: "Washroom",
        department: null,
        staff: null,
        created: daysAgo(8),
        resolved: null,
        verifiedAt: null,
        resolution: null,
        adminNotes: null,
        rejection: "Duplicate of an existing housekeeping ticket already being addressed at the same location.",
      },
      {
        id: "cmp-demo-010",
        code: "ECO-2026-00010",
        reporter: "usr-demo-student-3",
        title: "Damaged sapling guard in the green area",
        category: "tree_damage",
        description:
          "A tree guard around a young sapling is bent and the sapling is leaning. It may be damaged further if not repaired.",
        priority: "medium",
        status: "verified",
        location: "loc-green-area",
        building: "Green area",
        floor: null,
        room: null,
        department: "dept-horticulture",
        staff: "usr-demo-staff-2",
        created: daysAgo(22),
        resolved: daysAgo(17),
        verifiedAt: daysAgo(16),
        resolution: "Guard straightened and reinforced. Sapling supported and watered.",
        adminNotes: "Verified on site by the horticulture lead.",
      },
    ];

    const lat = 30.991586;
    const lng = 76.477097;
    for (const item of demo) {
      await run(
        `INSERT INTO complaints
         (id, complaint_code, reporter_id, anonymous, title, category, description, priority, status,
          location_id, building, floor, room_number, specific_location, lat, lng, assigned_department_id,
          assigned_staff_id, admin_notes, resolution_notes, rejection_reason, is_demo, points_awarded,
          created_at, updated_at, resolved_at, verified_at, closed_at)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.code,
        item.reporter,
        item.title,
        item.category,
        item.description,
        item.priority,
        item.status,
        item.location,
        item.building,
        item.floor,
        item.room,
        item.building,
        lat,
        lng,
        item.department,
        item.staff,
        item.adminNotes,
        item.resolution,
        item.rejection ?? null,
        ["verified", "closed"].includes(item.status) ? 1 : 0,
        item.created,
        item.verifiedAt ?? item.resolved ?? item.created,
        item.resolved,
        item.verifiedAt,
        item.status === "closed" ? daysAgo(28) : null,
      );
    }

    const histories: Array<[string, string | null, string, string | null, string, string]> = [
      ["cmp-demo-001", null, "submitted", "Report submitted with photo evidence.", "usr-demo-student", daysAgo(18)],
      ["cmp-demo-001", "submitted", "under_review", "Report reviewed by campus administration.", "usr-demo-admin", daysAgo(17)],
      ["cmp-demo-001", "under_review", "assigned", "Assigned to Water & Plumbing.", "usr-demo-admin", daysAgo(17)],
      ["cmp-demo-001", "assigned", "in_progress", "Maintenance team started inspection.", "usr-demo-staff", daysAgo(16)],
      ["cmp-demo-001", "in_progress", "resolved", "Washer replaced and leak stopped.", "usr-demo-staff", daysAgo(15)],
      ["cmp-demo-001", "resolved", "verified", "Repair verified by administration.", "usr-demo-admin", daysAgo(14)],
      ["cmp-demo-003", null, "submitted", "Report submitted.", "usr-demo-student-2", daysAgo(4)],
      ["cmp-demo-003", "submitted", "assigned", "Assigned to Housekeeping & Sanitation.", "usr-demo-admin", daysAgo(3)],
      ["cmp-demo-003", "assigned", "in_progress", "Clean-up started.", "usr-demo-staff-2", daysAgo(3)],
      ["cmp-demo-003", "in_progress", "resolved", "Bin emptied and area cleaned.", "usr-demo-staff-2", daysAgo(2)],
      ["cmp-demo-003", "resolved", "verified", "Clean-up verified on site.", "usr-demo-admin", daysAgo(1)],
      ["cmp-demo-004", null, "submitted", "Report submitted.", "usr-demo-student-3", daysAgo(2)],
      ["cmp-demo-004", "submitted", "under_review", "Reviewed and assigned for inspection.", "usr-demo-admin", daysAgo(1)],
      ["cmp-demo-004", "under_review", "assigned", "Assigned to Water & Plumbing.", "usr-demo-admin", daysAgo(1)],
      ["cmp-demo-005", null, "submitted", "Report submitted.", "usr-demo-student-2", daysAgo(1)],
      ["cmp-demo-005", "submitted", "under_review", "Awaiting location verification.", "usr-demo-admin", daysAgo(1)],
      ["cmp-demo-006", null, "submitted", "Report submitted.", "usr-demo-student", daysAgo(0, 8)],
      ["cmp-demo-007", null, "submitted", "Report submitted.", "usr-demo-student-3", daysAgo(35)],
      ["cmp-demo-007", "submitted", "assigned", "Assigned to Civil Works.", "usr-demo-admin", daysAgo(34)],
      ["cmp-demo-007", "assigned", "in_progress", "Drain clearing started.", "usr-demo-staff", daysAgo(32)],
      ["cmp-demo-007", "in_progress", "resolved", "Drain cleared.", "usr-demo-staff", daysAgo(30)],
      ["cmp-demo-007", "resolved", "verified", "Work verified.", "usr-demo-admin", daysAgo(29)],
      ["cmp-demo-007", "verified", "closed", "Complaint closed.", "usr-demo-admin", daysAgo(28)],
      ["cmp-demo-008", null, "submitted", "Report submitted.", "usr-demo-student-2", daysAgo(10)],
      ["cmp-demo-008", "submitted", "assigned", "Assigned to Electrical Maintenance.", "usr-demo-admin", daysAgo(9)],
      ["cmp-demo-008", "assigned", "in_progress", "Inspection completed.", "usr-demo-staff", daysAgo(8)],
      ["cmp-demo-008", "in_progress", "resolved", "AC switched off and signage added.", "usr-demo-staff", daysAgo(6)],
      ["cmp-demo-008", "resolved", "reopened", "Student reports that the issue recurred.", "usr-demo-student-2", daysAgo(1)],
      ["cmp-demo-009", null, "submitted", "Report submitted.", "usr-demo-student", daysAgo(8)],
      ["cmp-demo-009", "submitted", "rejected", "Duplicate of an existing housekeeping ticket.", "usr-demo-admin", daysAgo(8)],
      ["cmp-demo-010", null, "submitted", "Report submitted.", "usr-demo-student-3", daysAgo(22)],
      ["cmp-demo-010", "submitted", "assigned", "Assigned to Horticulture & Grounds.", "usr-demo-admin", daysAgo(20)],
      ["cmp-demo-010", "assigned", "in_progress", "Sapling support work started.", "usr-demo-staff-2", daysAgo(18)],
      ["cmp-demo-010", "in_progress", "resolved", "Guard repaired and sapling supported.", "usr-demo-staff-2", daysAgo(17)],
      ["cmp-demo-010", "resolved", "verified", "Work verified on site.", "usr-demo-admin", daysAgo(16)],
    ];
    for (const h of histories) {
      await run(
        `INSERT INTO complaint_status_history (id, complaint_id, from_status, to_status, note, changed_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        h[0],
        h[1],
        h[2],
        h[3],
        h[4],
        h[5],
      );
    }

    for (const item of demo.filter((d) => d.department)) {
      await run(
        `INSERT INTO complaint_assignments (id, complaint_id, department_id, staff_id, assigned_by, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        item.id,
        item.department,
        item.staff,
        "usr-demo-admin",
        "Initial assignment (demo data).",
        item.created,
      );
    }

    await run(
      `INSERT INTO staff_updates (id, complaint_id, staff_id, update_type, message, image_url, created_at)
       VALUES (?, ?, ?, 'progress', ?, NULL, ?)`,
      randomUUID(),
      "cmp-demo-003",
      "usr-demo-staff-2",
      "Housekeeping team has emptied the bin and is cleaning the surrounding paved area.",
      daysAgo(2),
    );
    await run(
      `INSERT INTO staff_updates (id, complaint_id, staff_id, update_type, message, image_url, created_at)
       VALUES (?, ?, ?, 'resolution', ?, NULL, ?)`,
      randomUUID(),
      "cmp-demo-001",
      "usr-demo-staff",
      "Tap washer replaced. Leak stopped and floor dried.",
      daysAgo(15),
    );

    await run(
      `INSERT INTO complaint_feedback (id, complaint_id, user_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      "cmp-demo-001",
      "usr-demo-student",
      5,
      "The repair was quick and the washroom is dry now. Thank you!",
      daysAgo(13),
    );
    await run(
      `INSERT INTO complaint_feedback (id, complaint_id, user_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      "cmp-demo-007",
      "usr-demo-student-3",
      4,
      "The drain is clear now. It would help to check it before the rainy season.",
      daysAgo(27),
    );

    const pointRows = [
      ["usr-demo-student", 20, "Verified environmental report ECO-2026-00001", "cmp-demo-001", null],
      ["usr-demo-student-2", 20, "Verified environmental report ECO-2026-00003", "cmp-demo-003", null],
      ["usr-demo-student-3", 20, "Verified environmental report ECO-2026-00010", "cmp-demo-010", null],
      ["usr-demo-student", 15, "Completed Water Wisdom quiz", null, "water-wise"],
      ["usr-demo-student-2", 15, "Completed Energy Smart quiz", null, "energy-smart"],
      ["usr-demo-student-3", 15, "Completed Waste Segregation quiz", null, "waste-wise"],
    ] as const;
    for (const p of pointRows) {
      await run(
        `INSERT OR IGNORE INTO leaderboard_points (id, user_id, points, reason, complaint_id, quiz_id, is_demo, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        randomUUID(),
        p[0],
        p[1],
        p[2],
        p[3],
        p[4],
        daysAgo(5),
      );
    }
    await run(
      `INSERT OR IGNORE INTO quiz_attempts (id, quiz_id, user_id, score, total, points_awarded, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      "water-wise",
      "usr-demo-student",
      3,
      3,
      15,
      daysAgo(5),
    );

    const notifications = [
      ["usr-demo-student", "cmp-demo-001", "verified", "Your report has been verified", "ECO-2026-00001 was verified by the campus administrator. You earned 20 green points.", 0],
      ["usr-demo-student", "cmp-demo-006", "status", "Report received", "ECO-2026-00006 is now under review. We will notify you when it is assigned.", 0],
      ["usr-demo-student", "cmp-demo-001", "feedback", "Thanks for your feedback", "Your rating helps the campus team improve response quality.", 1],
      ["usr-demo-staff", "cmp-demo-004", "assignment", "New assignment", "You have been assigned ECO-2026-00004 (rainwater harvesting).", 0],
      ["usr-demo-admin", "cmp-demo-006", "report", "New report requires review", "ECO-2026-00006 was submitted from the parking area.", 0],
    ] as const;
    for (const n of notifications) {
      await run(
        `INSERT INTO notifications (id, user_id, complaint_id, type, title, message, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        n[0],
        n[1],
        n[2],
        n[3],
        n[4],
        n[5],
        daysAgo(1),
      );
    }
  } else {
    console.log("Complaints already exist — skipping complaint demo records.");
  }

  const announcements = [
    {
      id: "ann-demo-1",
      title: "Welcome to the EcoCampus AI demo workspace",
      slug: "welcome-to-ecocampus-demo",
      excerpt: "Sample records are clearly labelled. Real reports will replace demo data as the campus begins using the platform.",
      content:
        "This workspace contains sample records so that students, staff and administrators can explore the complete workflow before launch. Every demo record is labelled 'Demo'. Demo complaints use the official campus map centre as a marker, not verified building coordinates.\n\nTo start using the platform with real data, an administrator can remove demo records from Admin → Settings. Real reports are never mixed with demo records in downloads: the CSV export includes an is_demo column.",
      category: "Platform",
      demo: 1,
    },
    {
      id: "ann-demo-2",
      title: "Report with a clear location and photo",
      slug: "report-with-clear-location",
      excerpt: "Precise locations help maintenance teams respond faster. Add a building, floor and room whenever possible.",
      content:
        "A report is only as useful as its location. When you submit an environmental problem, add the building, floor, room or nearest landmark. Use the GPS button when you are on site, or pick a verified campus location.\n\nUpload up to five clear photographs. Do not put yourself or others at risk while taking a photo — especially near electrical equipment, sewage or traffic.",
      category: "Guidance",
      demo: 1,
    },
    {
      id: "ann-demo-3",
      title: "Understanding complaint statuses",
      slug: "understanding-complaint-statuses",
      excerpt: "Submitted → Under review → Assigned → In progress → Resolved → Verified → Closed.",
      content:
        "Every complaint follows a transparent timeline. 'Resolved' means staff have completed work; 'Verified' means an administrator has checked it. If the problem returns, you can request a reopen with a reason, subject to administrator review.\n\nStaff and administrators add notes at each step, and you receive an in-app notification whenever the status changes.",
      category: "Guidance",
      demo: 1,
    },
  ];
  for (const a of announcements) {
    await run(
      `INSERT OR IGNORE INTO announcements (id, title, slug, excerpt, content, category, published, is_demo, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'usr-demo-admin', ?, ?)`,
      a.id,
      a.title,
      a.slug,
      a.excerpt,
      a.content,
      a.category,
      a.demo,
      daysAgo(10),
      iso,
    );
  }

  for (const article of AWARENESS_ARTICLES) {
    await run(
      `INSERT OR IGNORE INTO environmental_articles
       (id, title, slug, excerpt, content, category, read_minutes, image_url, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)`,
      `art-${article.slug}`,
      article.title,
      article.slug,
      article.excerpt,
      article.content,
      article.category,
      article.read_minutes,
      daysAgo(30),
      iso,
    );
  }

  await run(
    `INSERT OR IGNORE INTO green_activities (id, title, description, points, activity_date, verified, is_demo, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, 1, 1, 'usr-demo-admin', ?)`,
    "act-demo-1",
    "Campus clean-up drive (demo)",
    "Sample verified clean-up activity used to demonstrate leaderboard points. Real activities are added by administrators after attendance is verified.",
    25,
    daysAgo(6, 16),
    daysAgo(10),
  );

  console.log("Seed complete.");
  console.log("Seeded demo profiles are not authentication accounts. Create the first Admin through /admin-setup.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
