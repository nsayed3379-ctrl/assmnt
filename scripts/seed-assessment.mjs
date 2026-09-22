// Usage: npm run seed-assessment
// Creates the "Frontend Developer Practical Assessment" (job + assessment +
// exactly 4 tasks: Order Tracking UI, LRU Cache, written explanation,
// optional Figma) so you have something to import candidates against
// immediately. This mirrors what's currently live in production - if you
// edit the real assessment's tasks via the admin panel or Supabase
// directly, update this file to match so a fresh DB seed reproduces it.
// There is no admin UI for authoring assessments in Phase 1, this script
// (or direct SQL/Supabase table editor) is the intended way.
//
// Requires supabase/migrations/0002_task_fields_and_general_instructions.sql
// to have been run (adds assessments.general_instructions and
// assessment_tasks.fields, which Task 1 and Task 2 use to each collect
// more than one submission piece).
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const JOB_TITLE = "Junior Frontend Developer";
const ASSESSMENT_TITLE = "Frontend Developer Practical Assessment";

const GENERAL_INSTRUCTIONS = `GENERAL INSTRUCTIONS

- AI tools such as ChatGPT, Claude, Gemini, GitHub Copilot, Cursor, etc. are allowed and encouraged.
- Any frontend tools, libraries, frameworks, and development tools may be used.
- Backend integration is not required.
- Mock/static data is acceptable.
- Your submission should be your own work.
- You should understand and be able to explain your submitted code/design.
- Keep your code clean, readable, and properly structured.
- Assessment time limit is 2 hours 30 minutes.

AI PROMPT HISTORY — MANDATORY

If you use ANY AI tool during the assessment, you must submit the COMPLETE prompt history for EVERY AI tool used.

You must include:
- Every prompt, question, instruction, or request sent to AI
- In the exact order it was sent
- No omitted prompts
- No rewritten prompts
- No combined prompts
- No summarized prompts
- Prompts from every AI tool used

If possible, provide an exported/shared conversation link accessible without login. Otherwise, paste the complete prompt history into your submission.

If you did not use AI, write: "N/A — I did not use AI tools."

AI usage itself will not negatively affect your evaluation.`;

const TASK1_DESCRIPTION = `TASK 1 — ORDER TRACKING SCREEN ⭐

Design and implement a modern, professional mobile Order Tracking screen for an e-commerce application.

The current application only displays:
- Processing
- Shipped
- Out for Delivery
- Delivered

Users report that the current status is difficult to understand. Redesign and implement the experience so delivery status is clear at a glance.

Requirements:
- Clear visual delivery progress/timeline
- Current order status
- Estimated delivery date/time
- Order/product summary
- Clear way to contact support
- Appropriate loading/empty/error states where relevant
- Responsive design for approximately 360–430px mobile widths
- Clean spacing, typography, hierarchy, and visual consistency
- Meaningful interactions such as viewing order details, contacting support, or reporting a delivery issue

The UI must handle all three situations:

1. Delayed Order — the estimated delivery time has passed or the order is significantly delayed. Clearly communicate the delay and provide an appropriate next step.

2. Delivered but Not Received — the system says the order was delivered, but the customer reports they did not receive it. Provide an appropriate next step or support action.

3. Tracking Not Available Yet — the order exists, but tracking information is not available yet. Avoid an empty or broken-looking screen.

Show how the same product experience adapts to all three states.

Technical requirements are flexible: React.js / Next.js / another frontend framework; CSS / Tailwind / CSS Modules / another styling approach; any reasonable UI/icon library. Backend integration is not required — mock/static data is acceptable.

Submission (both fields below are required): a live deployed URL, accessible without the evaluator running the project locally, and a GitHub repository URL whose README contains brief setup/run instructions.`;

const TASK2_DESCRIPTION = `TASK 2 — LRU CACHE / PROBLEM-SOLVING

Implement a Least Recently Used (LRU) Cache supporting:
  Cache(capacity)
  get(key)
  put(key, value)

Requirements:
- Positive capacity
- get(key) returns the stored value if the key exists; otherwise -1
- A successful get() makes that key the most recently used
- put() inserts or updates a key/value pair
- When capacity is exceeded, remove the least recently used entry
- get() and put() should run in O(1) average time

Example:
  cache = Cache(2)
  cache.put("A", 10)
  cache.put("B", 20)
  cache.get("A")       -> 10
  cache.put("C", 30)
  cache.get("B")       -> -1
  cache.get("C")       -> 30
  cache.get("A")       -> 10

Any programming language is allowed.

Submission (both fields below are required):

GitHub Repository — should contain source code, test/example code, a README, and run instructions. The README should explain: data structures used and why, how LRU ordering is maintained, time complexity, space complexity, and how to run it.

Output Screenshot — at least one clear screenshot showing actual program output/results: put() operations, get() operations, LRU eviction, and returned values. Must show real output generated by your implementation, not manually written or edited results.

Optional bonus: TTL/expiration support. If implemented, demonstrate the expiration behavior with its own output screenshot and briefly explain your approach and any trade-offs in your README.`;

const TASK3_DESCRIPTION = `TASK 3 — ALGORITHM EXPLANATION & CRITICAL THINKING

Briefly answer the following about your LRU Cache implementation (recommended length: 100–200 words):

1. Explain the data structure(s) you used and why you selected them.
2. Explain the time and space complexity of your implementation.
3. Describe one realistic situation or access pattern where your implementation could perform poorly, or where your approach has a limitation.
4. If AI helped you solve the problem, identify one suggestion from the AI that you changed, rejected, or improved, and explain why.`;

const TASK4_DESCRIPTION = `TASK 4 — FIGMA / UI DESIGN (OPTIONAL)

This task is optional and should not prevent you from completing or submitting the mandatory tasks.

Create a Figma design or prototype for your Order Tracking solution. If you submit one, it should show all three states: Delayed Order, Delivered but Not Received, and Tracking Not Available Yet.

Set Figma sharing to "Anyone with the link can view" and paste the link here.`;

const { data: job, error: jobError } = await supabase
  .from("jobs")
  .upsert({ title: JOB_TITLE, slug: "junior-frontend-developer", is_active: true }, { onConflict: "slug" })
  .select("id")
  .single();

if (jobError) {
  console.error("Failed to create job:", jobError.message);
  process.exit(1);
}

const { data: assessment, error: assessmentError } = await supabase
  .from("assessments")
  .insert({
    job_id: job.id,
    title: ASSESSMENT_TITLE,
    duration_minutes: 150, // 2 hours 30 minutes
    hard_deadline: null, // set an ISO timestamp here if you want a hard cutoff
    status: "active",
    general_instructions: GENERAL_INSTRUCTIONS,
  })
  .select("id")
  .single();

if (assessmentError) {
  console.error("Failed to create assessment:", assessmentError.message);
  process.exit(1);
}

const TASKS = [
  {
    title: "Task 1 — Order Tracking Screen",
    description: TASK1_DESCRIPTION,
    task_type: "link_submission", // fallback/primary type; fields[] below is what actually renders
    fields: [
      { key: "liveUrl", type: "link_submission", label: "Live Deployed URL", required: true },
      { key: "githubUrl", type: "github_url", label: "GitHub Repository URL", required: true },
    ],
    max_score: 40,
    sort_order: 1,
    required: true,
  },
  {
    title: "Task 2 — LRU Cache / Problem-Solving",
    description: TASK2_DESCRIPTION,
    task_type: "github_url",
    fields: [
      { key: "githubUrl", type: "github_url", label: "GitHub Repository", required: true },
      { key: "screenshot", type: "file_upload", label: "Output Screenshot", required: true },
    ],
    max_score: 30,
    sort_order: 2,
    required: true,
  },
  {
    title: "Task 3 — Algorithm Explanation & Critical Thinking",
    description: TASK3_DESCRIPTION,
    task_type: "long_answer",
    max_score: 15,
    sort_order: 3,
    required: true,
  },
  {
    title: "Task 4 — Figma / UI Design (Optional)",
    description: TASK4_DESCRIPTION,
    task_type: "link_submission",
    max_score: 10,
    sort_order: 4,
    required: false,
  },
];

for (const task of TASKS) {
  const { error } = await supabase.from("assessment_tasks").insert({ ...task, assessment_id: assessment.id });
  if (error) console.error(`Failed to create task "${task.title}":`, error.message);
}

console.log(`Seeded assessment "${ASSESSMENT_TITLE}" - id: ${assessment.id}`);
console.log("Use this assessment in Admin -> Import Candidates.");
