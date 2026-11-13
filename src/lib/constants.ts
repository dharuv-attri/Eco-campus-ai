export const SITE = {
  name: "EcoCampus AI",
  subtitle: "Smart Environmental Management System",
  tagline: "Report. Track. Resolve. Build a Greener Campus.",
  university: "Lamrin Tech Skills University Punjab",
  universityShort: "LTSU Punjab",
  address:
    "Chandigarh–Jalandhar Highway (NH 344A), Tehsil Balachaur, District SBS Nagar, Punjab 144533, India",
  phone: "01881-270794 / 270693",
  mobile: "+91 8480005390",
  email: "info@ltsu.ac.in",
  website: "https://www.ltsu.ac.in/",
  mapCenter: { lat: 30.991586, lng: 76.477097 },
  mapZoom: 15,
  disclaimer:
    "EcoCampus AI is an independent environmental management project. It is not an officially endorsed service of Lamrin Tech Skills University Punjab unless written authorization is obtained.",
} as const;

export const PROBLEM_CATEGORIES = [
  { value: "water_leakage", label: "Water leakage", department: "water-plumbing", icon: "Droplets", urgent: false },
  { value: "water_wastage", label: "Water wastage", department: "water-plumbing", icon: "Droplet", urgent: false },
  { value: "electricity_wastage", label: "Electricity wastage", department: "electrical", icon: "Zap", urgent: false },
  { value: "broken_lights", label: "Broken lights", department: "electrical", icon: "LightbulbOff", urgent: false },
  { value: "ac_running", label: "AC left running unnecessarily", department: "electrical", icon: "Snowflake", urgent: false },
  { value: "garbage_waste", label: "Garbage & waste management", department: "housekeeping", icon: "Trash2", urgent: false },
  { value: "plastic_pollution", label: "Plastic pollution", department: "waste-management", icon: "Recycle", urgent: false },
  { value: "drainage", label: "Drainage problems", department: "civil", icon: "Waves", urgent: false },
  { value: "blocked_drains", label: "Blocked drains", department: "civil", icon: "Construction", urgent: false },
  { value: "air_pollution", label: "Air pollution", department: "environment-safety", icon: "Wind", urgent: false },
  { value: "noise_pollution", label: "Noise pollution", department: "environment-safety", icon: "Volume2", urgent: false },
  { value: "dirty_washrooms", label: "Dirty washrooms", department: "housekeeping", icon: "SprayCan", urgent: false },
  { value: "damaged_taps", label: "Damaged water taps", department: "water-plumbing", icon: "Wrench", urgent: false },
  { value: "green_area", label: "Green area maintenance", department: "horticulture", icon: "Trees", urgent: false },
  { value: "tree_damage", label: "Tree or plant damage", department: "horticulture", icon: "TreePine", urgent: false },
  { value: "sewage", label: "Sewage problems", department: "civil", icon: "AlertTriangle", urgent: true },
  { value: "solar_equipment", label: "Solar energy equipment problems", department: "electrical", icon: "Sun", urgent: false },
  { value: "rainwater_harvesting", label: "Rainwater harvesting problems", department: "water-plumbing", icon: "CloudRain", urgent: false },
  { value: "construction_waste", label: "Construction waste", department: "waste-management", icon: "HardHat", urgent: false },
  { value: "other", label: "Other environmental problem", department: "operations", icon: "CircleHelp", urgent: false },
] as const;

export type CategoryValue = (typeof PROBLEM_CATEGORIES)[number]["value"];

export const CATEGORY_MAP = Object.fromEntries(PROBLEM_CATEGORIES.map((c) => [c.value, c]));

export const PRIORITIES = [
  { value: "low", label: "Low", description: "Minor inconvenience, no immediate risk" },
  { value: "medium", label: "Medium", description: "Needs attention within a few days" },
  { value: "high", label: "High", description: "Significant waste or disruption" },
  { value: "emergency", label: "Emergency", description: "Electrical / safety hazard — stay away and call campus staff" },
] as const;

export const STATUSES = [
  "submitted",
  "under_review",
  "assigned",
  "in_progress",
  "resolved",
  "verified",
  "closed",
] as const;

export type StatusValue =
  | (typeof STATUSES)[number]
  | "rejected"
  | "reopened"
  | "archived";

export const STATUS_META: Record<
  StatusValue,
  { label: string; description: string; tone: string; step: number }
> = {
  submitted: { label: "Submitted", description: "Report received by EcoCampus AI", tone: "sky", step: 1 },
  under_review: { label: "Under review", description: "Administrator is validating the report", tone: "amber", step: 2 },
  assigned: { label: "Assigned", description: "A department and staff member have been assigned", tone: "violet", step: 3 },
  in_progress: { label: "In progress", description: "Work is currently underway", tone: "blue", step: 4 },
  resolved: { label: "Resolved", description: "Staff have completed the work, awaiting verification", tone: "emerald", step: 5 },
  verified: { label: "Verified", description: "Administrator verified the completed work", tone: "green", step: 6 },
  closed: { label: "Closed", description: "Complaint successfully closed", tone: "slate", step: 7 },
  rejected: { label: "Rejected", description: "Complaint could not be accepted — see reason", tone: "rose", step: 0 },
  reopened: { label: "Reopened", description: "Issue reported again after resolution — under review", tone: "orange", step: 1 },
  archived: { label: "Archived", description: "Report removed from active queues; history is preserved", tone: "slate", step: 0 },
};

export const LOCATION_CATEGORIES = [
  "Academic Blocks",
  "Hostel Areas",
  "Library",
  "Canteen",
  "Washrooms",
  "Parking",
  "Green Areas",
  "Sports Areas",
  "Other Campus Locations",
] as const;

export const DEPARTMENT_SEEDS = [
  {
    slug: "water-plumbing",
    name: "Water & Plumbing",
    description: "Leakages, taps, water conservation and rainwater harvesting infrastructure.",
    handles: ["water_leakage", "water_wastage", "damaged_taps", "rainwater_harvesting"],
    email: "water@ecocampus.local",
  },
  {
    slug: "electrical",
    name: "Electrical Maintenance",
    description: "Lighting, electricity wastage, air-conditioning and solar equipment.",
    handles: ["electricity_wastage", "broken_lights", "ac_running", "solar_equipment"],
    email: "electrical@ecocampus.local",
  },
  {
    slug: "housekeeping",
    name: "Housekeeping & Sanitation",
    description: "Washroom cleanliness, garbage collection and campus hygiene.",
    handles: ["garbage_waste", "dirty_washrooms"],
    email: "housekeeping@ecocampus.local",
  },
  {
    slug: "waste-management",
    name: "Waste Management",
    description: "Segregation, plastic reduction and construction waste.",
    handles: ["plastic_pollution", "construction_waste"],
    email: "waste@ecocampus.local",
  },
  {
    slug: "civil",
    name: "Civil Works",
    description: "Drains, sewage and campus civil infrastructure.",
    handles: ["drainage", "blocked_drains", "sewage"],
    email: "civil@ecocampus.local",
  },
  {
    slug: "horticulture",
    name: "Horticulture & Grounds",
    description: "Green areas, trees and landscaping.",
    handles: ["green_area", "tree_damage"],
    email: "grounds@ecocampus.local",
  },
  {
    slug: "environment-safety",
    name: "Environment & Safety",
    description: "Air quality, noise and environmental safety concerns.",
    handles: ["air_pollution", "noise_pollution"],
    email: "safety@ecocampus.local",
  },
  {
    slug: "operations",
    name: "Campus Operations",
    description: "General environmental issues and coordination.",
    handles: ["other"],
    email: "operations@ecocampus.local",
  },
] as const;

export const DEFAULT_SETTINGS: Record<string, string> = {
  site_name: "EcoCampus AI",
  site_subtitle: "Smart Environmental Management System",
  tagline: "Report. Track. Resolve. Build a Greener Campus.",
  university_name: "Lamrin Tech Skills University Punjab",
  hero_heading: "Let's Make Our Campus Cleaner, Greener & Smarter.",
  hero_description:
    "An AI-powered platform that helps students and university staff report environmental problems, track solutions, and build a sustainable campus.",
  hero_image: "",
  hero_badge: "Independent campus sustainability initiative",
  about_heading: "Built for the campus community, powered by transparency",
  about_summary:
    "EcoCampus AI gives every student and staff member a clear way to report environmental problems, follow real progress, and celebrate verified improvements. Every report is traceable from submission to closure.",
  logo_url: "",
  favicon_url: "",
  background_image: "",
  primary_color: "#14532D",
  secondary_color: "#10B981",
  background_color: "#F6FAF7",
  dark_background_color: "#0A1410",
  contact_email: "info@ltsu.ac.in",
  contact_phone: "01881-270794 / 270693",
  contact_mobile: "+91 8480005390",
  address:
    "Chandigarh–Jalandhar Highway (NH 344A), Tehsil Balachaur, District SBS Nagar, Punjab 144533, India",
  footer_text:
    "EcoCampus AI is an independent environmental management project. It is not an official Lamrin Tech Skills University Punjab service unless authorization is obtained.",
  announcement_banner: "",
  map_center_lat: "30.991586",
  map_center_lng: "76.477097",
  map_center_source:
    "Map centre from the official LTSU Google Maps embed. Building-level pins require administrator verification.",
  water_saved_liters: "",
  energy_saved_kwh: "",
  impact_metric_note: "",
  anonymous_reporting_enabled: "true",
  registration_open: "true",
  social_instagram: "https://www.instagram.com/lamrintechskillsuniversity/",
  social_linkedin: "https://www.linkedin.com/company/76645349",
  social_youtube: "https://www.youtube.com/channel/UCa-hPFUL3DypAk87S80eNwg",
};

export const DEFAULT_SECTIONS = [
  { key: "hero", label: "Hero & primary actions", enabled: 1, sort_order: 1 },
  { key: "stats", label: "Live campus statistics", enabled: 1, sort_order: 2 },
  { key: "recent_issues", label: "Recently reported issues", enabled: 1, sort_order: 3 },
  { key: "how_it_works", label: "How it works", enabled: 1, sort_order: 4 },
  { key: "map", label: "Interactive campus map", enabled: 1, sort_order: 5 },
  { key: "initiatives", label: "Sustainability initiatives", enabled: 1, sort_order: 6 },
  { key: "awareness", label: "Environmental awareness", enabled: 1, sort_order: 7 },
  { key: "achievements", label: "Platform achievements", enabled: 1, sort_order: 8 },
  { key: "contact", label: "Contact & footer", enabled: 1, sort_order: 9 },
] as const;

export const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  staff: "Staff",
  admin: "Administrator",
  super_admin: "Super administrator",
};

export const ROLE_HOME: Record<string, string> = {
  student: "/student/dashboard",
  staff: "/staff/dashboard",
  admin: "/admin/dashboard",
  super_admin: "/admin/dashboard",
};

export const COMPLAINT_OPEN_STATUSES = [
  "submitted",
  "under_review",
  "assigned",
  "in_progress",
  "reopened",
] as const;

export const AI_SUGGESTIONS = [
  "There is water leakage near my hostel. What should I do?",
  "Lights are switched on in an empty classroom.",
  "There is garbage near the canteen.",
  "The washroom water tap is broken.",
  "How can our campus save electricity?",
  "How can I track my complaint?",
];

export const QUIZ_SEED = [
  {
    id: "water-wise",
    title: "Water Wisdom",
    description: "Test your understanding of water conservation on campus.",
    points: 15,
    questions: [
      {
        q: "A tap dripping once per second can waste roughly how much water per day?",
        options: ["Less than 1 litre", "About 5 litres", "Around 15–20 litres", "Over 100 litres"],
        answer: 2,
        explanation: "Even a slow drip adds up to many litres a day. Report leaking taps promptly.",
      },
      {
        q: "What is the best first action when you see a major water leak?",
        options: ["Ignore it", "Report it and keep people away from slippery areas", "Try to repair electrical fittings nearby", "Wait for someone else"],
        answer: 1,
        explanation: "Report with a photo and location, and avoid hazardous or slippery areas.",
      },
      {
        q: "Which practice saves the most water in a hostel washroom?",
        options: ["Long showers", "Turning off taps while soaping", "Leaving taps running", "Using more buckets than needed"],
        answer: 1,
        explanation: "Turning off the tap while soaping is a simple, high-impact habit.",
      },
    ],
  },
  {
    id: "energy-smart",
    title: "Energy Smart",
    description: "Every switch matters. Check your energy awareness.",
    points: 15,
    questions: [
      {
        q: "An empty classroom has lights and fans on. What should you do?",
        options: ["Nothing", "Switch them off if safe, then report recurring wastage", "Open a window only", "Call emergency services"],
        answer: 1,
        explanation: "Switch off unused equipment when safe, and report repeated wastage through EcoCampus AI.",
      },
      {
        q: "Which of these is a renewable energy source?",
        options: ["Diesel generator", "Rooftop solar", "Coal plant", "Kerosene lamp"],
        answer: 1,
        explanation: "Solar energy is renewable and is used in many modern campuses.",
      },
      {
        q: "Why should AC units be used with doors and windows closed?",
        options: ["It looks better", "It prevents cooled air from escaping and saves energy", "It increases noise", "It is required by law"],
        answer: 1,
        explanation: "Sealing the room reduces cooling load and electricity use.",
      },
    ],
  },
  {
    id: "waste-wise",
    title: "Waste Segregation",
    description: "Know what goes where and why segregation matters.",
    points: 15,
    questions: [
      {
        q: "Which item belongs in the dry/recyclable stream?",
        options: ["Food waste", "Clean plastic bottle", "Used tissue", "Tea leaves"],
        answer: 1,
        explanation: "Clean, dry recyclables such as bottles go to the dry/recyclable stream.",
      },
      {
        q: "What is the correct order of the 3Rs?",
        options: ["Recycle, Reduce, Reuse", "Reduce, Reuse, Recycle", "Reuse, Recycle, Reduce", "Recycle, Reuse, Reduce"],
        answer: 1,
        explanation: "Preventing waste (reduce) comes before reuse and recycling.",
      },
      {
        q: "Wet waste is mainly used for which purpose?",
        options: ["Composting", "Landfill only", "Burning", "Recycling into bottles"],
        answer: 0,
        explanation: "Segregated wet waste can be composted, reducing landfill burden.",
      },
    ],
  },
];

export const AWARENESS_ARTICLES = [
  {
    slug: "water-conservation-campus",
    title: "Water conservation: small habits, measurable impact",
    category: "Water",
    excerpt:
      "From reporting dripping taps to mindful hostel routines, discover practical ways to protect every drop on campus.",
    read_minutes: 5,
    content: `Water is one of the campus's most visible resources — and one of the easiest to waste without noticing. A tap that drips once per second can waste well over 15 litres a day. Across a hostel or academic block, small leaks become significant losses.

START WITH OBSERVATION
Walk your usual route attentively. Listen for running water in empty washrooms. Check that taps close fully. Notice overflowing tanks, wet patches near pipes, and blocked drains after rain.

REPORT WHAT YOU SEE
Use EcoCampus AI to report leaks, damaged taps, water wastage and rainwater harvesting problems. Add a clear photo, the building and room, and a short description. Reports without a precise location take longer to resolve.

BUILD DAILY HABITS
Turn off the tap while soaping. Use a bucket instead of a running shower where possible. Report leaking fixtures instead of assuming someone else will. Keep drinking-water stations clean and free of waste.

SUPPORT CAMPUS SYSTEMS
Rainwater harvesting, native planting and efficient fixtures all reduce demand. When you notice a harvesting pit blocked or a tank overflowing, report it as an environmental problem — maintenance today prevents waste tomorrow.`,
  },
  {
    slug: "energy-conservation-classrooms",
    title: "Energy conservation: switching off is a collective action",
    category: "Energy",
    excerpt:
      "Empty classrooms with lights on, ACs running in unused rooms, and standby loads add up. Here is a practical checklist.",
    read_minutes: 4,
    content: `Energy waste is often invisible because the campus keeps working. A classroom left lit for an hour, a fan spinning in an empty lab, or an air-conditioner cooling a room with open windows all consume power without serving anyone.

THE LAST-PERSON RULE
The last person to leave a classroom should switch off lights, fans and projectors. If switches are locked or broken, report the issue with a photo and room number.

TEMPERATURE MATTERS
Set air-conditioners to a reasonable temperature and keep doors and windows closed. Do not block outdoor units. Report equipment that runs unnecessarily or appears faulty.

REPORT RECURRING WASTAGE
EcoCampus AI groups reports by category and location so recurring problems can be fixed at the source. A report about lights left on in an empty room is not a complaint about a person — it is a signal to improve switches, signage or routines.

THINK BEYOND ELECTRICITY
Renewable energy, daylight, natural ventilation and efficient equipment all contribute. Support campus solar installations by reporting damaged panels or equipment promptly.`,
  },
  {
    slug: "waste-segregation-guide",
    title: "Waste segregation: a five-minute guide",
    category: "Waste",
    excerpt:
      "Clean streams create value; mixed waste creates landfill. Learn the basics of wet, dry and hazardous waste.",
    read_minutes: 3,
    content: `Waste segregation works only when everyone participates. The goal is simple: keep clean materials separate so they can be recycled or composted, and keep hazardous items out of ordinary bins.

WET / BIODEGRADABLE
Food scraps, fruit peels, tea leaves, garden trimmings and soiled paper go to the wet waste stream where composting is available. Avoid plastic bags in this stream.

DRY / RECYCLABLE
Clean plastic bottles, paper, cardboard, metal cans and glass belong in dry recycling. Empty and rinse containers. Soiled paper and food wrappers are not clean recyclables.

HAZARDOUS
Batteries, e-waste, chemicals, paints, medical waste and broken glass need dedicated collection points. Never place them in ordinary bins.

WHAT YOU CAN DO
Carry a reusable bottle. Refuse single-use plastic where possible. Report overflowing bins, mixed-waste dumping and plastic pollution through EcoCampus AI. Keep the location specific so housekeeping can respond quickly.`,
  },
  {
    slug: "air-quality-and-clean-air",
    title: "Clean air begins with what we burn and move",
    category: "Air",
    excerpt:
      "Dust, smoke, vehicle idling and construction debris affect campus air quality. Learn how to spot and report issues.",
    read_minutes: 4,
    content: `Air quality problems are not always dramatic. Dust from uncovered construction material, smoke from burning waste, and vehicles idling near buildings all affect the people nearby.

SPOT THE SOURCE
Note the activity and location: burning of leaves or waste, unpaved dusty areas, generators, idling vehicles, or strong odours. Report the time as accurately as possible.

PROTECT YOURSELF
If there is visible smoke or a strong chemical smell, move away, avoid the area, and inform campus staff. People with asthma or other respiratory conditions should take particular care.

REPORT WITH DETAIL
EcoCampus AI accepts air pollution reports with photos and exact locations. Administrators can route them to the environment and safety team and coordinate with civil or housekeeping departments.

LONG-TERM IMPROVEMENTS
Covered construction material, waste segregation to prevent burning, green buffers, and encouraging walking or shared transport all help. Every verified report contributes to a cleaner campus.`,
  },
  {
    slug: "plastic-free-campus",
    title: "A plastic-free campus starts at the canteen counter",
    category: "Plastic",
    excerpt:
      "Single-use plastic is convenient for minutes and pollutes for centuries. Here are realistic alternatives.",
    read_minutes: 3,
    content: `Single-use cups, cutlery, wrappers and bottles are common on campuses because they are convenient. Reducing them requires practical alternatives, not just awareness.

CARRY AND REUSE
Keep a refillable bottle and a small cloth bag. Choose reusable cutlery when available. If your canteen offers a discount for a reusable cup, use it.

SEGREGATE CORRECTLY
Clean plastic bottles and containers belong in dry recycling. Food-soiled wrappers usually cannot be recycled and should not contaminate clean streams.

REPORT HOTSPOTS
Plastic accumulation near canteens, hostels and parking areas is a reporting category in EcoCampus AI. Include a photo and the nearest landmark.

CELEBRATE PROGRESS
Verified clean-up drives and recycling activities can earn leaderboard points. Points are awarded only after confirmation, so take part genuinely and record what was achieved.`,
  },
  {
    slug: "tree-plantation-and-green-areas",
    title: "Green areas need care after planting day",
    category: "Biodiversity",
    excerpt:
      "Plantation drives matter most when saplings survive. Simple care and timely reporting protect campus greenery.",
    read_minutes: 4,
    content: `Tree plantation is a visible, positive action. The harder work begins afterwards: watering, protection from damage, and monitoring survival through the seasons.

PROTECT YOUNG TREES
Avoid tying banners or bicycles to saplings. Keep footpaths clear. Report broken tree guards, damaged saplings, or plants that appear diseased.

REPORT, DON'T IGNORE
Use the green area maintenance and tree/plant damage categories in EcoCampus AI. A photo taken from a safe distance helps the horticulture team assess the issue.

WATER WISELY
New plants need consistent watering, but overwatering can be harmful. Report broken irrigation lines or leaking pipes near green areas as water issues as well.

JOIN VERIFIED ACTIVITIES
Participating in plantation or clean-up drives can earn green points when organizers verify attendance. Points recognize real participation — not just signing up.`,
  },
  {
    slug: "sustainable-transport",
    title: "Moving smarter: sustainable transport on and around campus",
    category: "Transport",
    excerpt:
      "Walking, cycling, shared rides and efficient planning reduce emissions and congestion.",
    read_minutes: 3,
    content: `Transport is often a major part of a campus's environmental footprint. You do not need to change everything at once; consistent choices add up.

SHORT TRIPS
Walk or cycle for short distances when safe and weather permits. Use designated paths and lighting. Report broken lights or unsafe walkways through EcoCampus AI.

SHARED MOBILITY
Coordinate shared rides for similar routes and times. Avoid idling engines while waiting. Keep vehicles maintained to reduce emissions.

CAMPUS DESIGN
Secure cycle parking, shaded walkways and accessible paths encourage low-carbon movement. If a parking or walking area has an environmental problem, report it with a precise location.

CONNECT TO AIR QUALITY
Reducing vehicle emissions supports cleaner air. Combine transport awareness with the air pollution reporting category so recurring hotspots can be addressed.`,
  },
  {
    slug: "rainwater-harvesting",
    title: "Rainwater harvesting: capturing the monsoon safely",
    category: "Water",
    excerpt:
      "Harvesting structures reduce runoff and supplement water supply — when they are maintained.",
    read_minutes: 4,
    content: `Rainwater harvesting collects and stores rain or recharges groundwater instead of letting it run off. Well-maintained systems reduce flooding and ease pressure on campus water supply.

WATCH THE SYSTEM
Check that gutters, filters, storage tanks and recharge pits are not blocked by leaves, plastic or construction debris. Standing water can become a mosquito habitat.

REPORT PROBLEMS
Use the rainwater harvesting category to report blocked inlets, damaged tanks, overflowing pits, or broken pipes. Add the building name and nearest landmark.

SAFETY FIRST
Do not open storage tanks or recharge pits. Keep children and visitors away and let trained staff inspect confined spaces.

MAINTAIN OVER TIME
A system that works in the first monsoon can fail later without cleaning. Encourage regular checks before the rainy season and after heavy storms.`,
  },
  {
    slug: "solar-energy-on-campus",
    title: "Solar equipment: clean energy still needs maintenance",
    category: "Energy",
    excerpt:
      "Dust, shade and damaged cables reduce solar output. Know what to notice and how to report it.",
    read_minutes: 3,
    content: `Solar panels convert sunlight into electricity with no fuel and no direct emissions, but they need care to perform well.

WHAT REDUCES OUTPUT
Dust and bird droppings on panels, shading from new construction or trees, damaged mounting structures, and faulty inverters or cables all reduce generation.

SAFE OBSERVATION
From the ground, look for visibly broken panels, loose wiring or damaged frames. Never climb onto a roof or touch electrical equipment. Keep others away and report immediately.

REPORT PRECISELY
Use the solar equipment category. Include the nearest building, panel area and a photo taken from a safe position. Electrical hazards should be treated as emergencies.

SUPPORT RENEWABLES
Reliable solar generation reduces fossil-fuel dependence. Timely maintenance protects both safety and the campus's clean-energy investment.`,
  },
  {
    slug: "noise-and-wellbeing",
    title: "Noise pollution: an environmental issue that affects wellbeing",
    category: "Noise",
    excerpt:
      "Loud equipment and late-night activity affect concentration and sleep. Learn how to report concerns constructively.",
    read_minutes: 3,
    content: `Noise is part of the environment. While campuses are lively places, sustained or late-night noise can affect study, sleep and wellbeing.

WHAT TO NOTE
Identify the source and time: loud speakers, generators, construction, vehicle horns, or repeated late-night activity. Avoid confrontation and do not record people without consent.

REPORT CONSTRUCTIVELY
Use EcoCampus AI's noise pollution category. Describe the issue and location without personal details. Administrators can coordinate with the responsible department.

CONSIDER CONTEXT
Exams, events and emergency maintenance may require temporary flexibility. Clear reporting helps distinguish one-off events from recurring problems.

QUIET SPACES MATTER
Libraries, study areas and hostels benefit from quiet zones. Support signage and sensible scheduling where appropriate.`,
  },
];

export const GREEN_CHALLENGES = [
  { title: "Close the loop", description: "Check three taps or switches in your block and report any problem you find.", points: 10 },
  { title: "Segregate for a day", description: "Keep your dry and wet waste separate for one full day and note the difference.", points: 10 },
  { title: "Carry your bottle", description: "Use a refillable bottle all week and avoid single-use plastic bottles.", points: 5 },
  { title: "Walk the green route", description: "Walk or cycle a trip you would normally take by vehicle, safely.", points: 5 },
  { title: "Learn and share", description: "Complete an EcoCampus quiz and share one tip with a friend.", points: 15 },
];
