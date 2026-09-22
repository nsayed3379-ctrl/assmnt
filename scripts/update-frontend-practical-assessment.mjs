// Usage: node scripts/update-frontend-practical-assessment.mjs
//
// One-time data migration: updates the EXISTING "Frontend Developer
// Practical Assessment" (144 real invites already sent, do not delete/
// recreate it) in place with the new Order Tracking / LRU Cache task
// content, and sets duration to 150 minutes (2h30m).
//
// Safe because: 0 submissions exist against any of its 4 current tasks
// (verified before writing this script), so repurposing those 4 rows
// in place - rather than deleting and re-inserting - can't orphan any
// candidate's actual submitted work. Two new task rows are added for
// the submission pieces that don't fit the platform's one-field-per-task
// model (Task 1 needs a live URL AND a GitHub URL; Task 2 needs a GitHub
// URL AND a screenshot upload).
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

const ASSESSMENT_ID = "a9661474-cd29-471c-b992-ed8854e6fee0"; // "Frontend Developer Practical Assessment"

// Existing row ids, reused in place (not deleted) so nothing about the
// invites already sent against them changes.
const EXISTING = {
  uiImplementation: "fc65e94d-ca91-428b-918a-d61a20c19b35", // was "UI Implementation" / github_url
  apiIntegration: "926678ad-2e0c-419e-86bf-66dc3e396615", // was "API Integration" / link_submission
  debugging: "d34f9e54-0d19-401a-b0d4-8e7da0ead0a5", // was "Debugging Explanation" / long_answer
  quickCheck: "f57c4d7d-4a49-492e-902f-cb8d3d46f76b", // was "Quick Check" / mcq
};

const GENERAL_INSTRUCTIONS = `GENERAL INSTRUCTIONS

AI tools such as ChatGPT, Claude, Gemini, GitHub Copilot, Cursor, etc. are allowed and encouraged. We care about how you use AI as a development tool, not simply whether you use it. You may use any frontend tools, libraries, frameworks, and development tools you're comfortable with. Your submission should be your own work, and you should be able to explain the code and design decisions you submit. Backend integration is not required — mock/static data is completely acceptable. Keep your code clean, readable, and properly structured.

AI PROMPT HISTORY — MANDATORY
If you use any AI tool while completing this assessment, you must include the complete, unedited prompt history for every AI tool you use, in the exact order you sent it — every prompt, not only the important ones. No omissions, no rewrites, no combining prompts, no summarizing. Put it in your GitHub repo (e.g. an AI_PROMPT_HISTORY.md file) or link an exported/shared conversation that's accessible without login. If you used AI across multiple tasks, separate the history by task. If you didn't use AI at all, just write: "N/A — I did not use AI tools." AI usage itself will not hurt your evaluation; an incomplete, selectively edited, or misleading prompt history might.

This is the only place this requirement is stated - it is not repeated under every task, but it applies to all of them.`;

const TASK1_BRIEF = `TASK 1 — UI/UX & FRONTEND IMPLEMENTATION (star task)

Order Tracking Screen

Design and implement a modern, professional mobile Order Tracking screen for an e-commerce application.

The current application only shows simple status text (Processing / Shipped / Out for Delivery / Delivered) and users say it's hard to understand. Redesign the screen so delivery status is clear at a glance.

Requirements:
- A clear visual delivery progress/timeline
- Current order status
- Estimated delivery date/time
- Order/product summary
- A clear way to contact support
- Appropriate loading/empty/error states where relevant
- Responsive design for ~360–430px mobile widths
- Clean spacing, typography, hierarchy, and visual consistency
- Meaningful interactions such as viewing order details, contacting support, or reporting a delivery issue

Your UI must handle all three of these situations (not just the happy path):

1. Delayed Order — the estimated delivery time has passed or the order is significantly delayed. Clearly communicate the delay and provide an appropriate next step.

2. Delivered but Not Received — the system says the order was delivered, but the customer reports they didn't receive it. Provide an appropriate next step or support action.

3. Tracking Not Available Yet — the order exists but tracking info isn't available yet. Avoid presenting an empty or broken-looking screen.

Technical choices are flexible: React.js / Next.js / another frontend framework; CSS / Tailwind / CSS Modules / another styling approach; any reasonable UI/icon library. Backend integration is not required — mock data is fine.

Mandatory submission for Task 1: a live deployed URL (must work without the evaluator running anything locally), a GitHub repository URL, and a README with setup instructions.`;

const TASK2_BRIEF = `TASK 2 — ALGORITHM / PROBLEM-SOLVING

LRU Cache

Implement a Least Recently Used (LRU) Cache supporting:
  Cache(capacity)
  get(key)
  put(key, value)

Requirements:
- Cache(capacity) initializes the cache with a positive capacity.
- get(key) returns the stored value if the key exists; otherwise returns -1.
- A successful get() makes that key the most recently used.
- put(key, value) inserts a new key/value pair or updates an existing key.
- When the cache exceeds capacity, remove the least recently used entry.
- get() and put() should run in O(1) average time.

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

Mandatory submission for Task 2: push your complete implementation (source code, test/example code, README, run instructions) to a GitHub repository, AND provide at least one clear screenshot showing the actual program output — put()/get() operations, LRU eviction, and returned values. The screenshot must be from a real run of your own code, not manually written or edited.

Your README should briefly explain: which data structures you used and why, how LRU ordering is maintained, time complexity of get()/put(), space complexity, and how to run it.

Optional bonus: add TTL/expiration support. If you do, demonstrate it in your output with its own screenshot, and briefly explain how you handled expiration and any trade-offs.`;

const FINAL_CHECKLIST = `---
FINAL SUBMISSION CHECKLIST

Frontend / UI:
- Live deployed URL
- GitHub repository URL
- Delayed state
- Delivered-but-not-received state
- No-tracking-yet state
- Responsive mobile UI
- Meaningful interactions
- README

Algorithm:
- LRU Cache implementation
- O(1) average get()
- O(1) average put()
- GitHub repository
- Actual output screenshot
- README explanation
- Algorithm explanation

Optional:
- Figma design/prototype
- TTL/expiration bonus

AI:
- Complete AI prompt history, if AI was used
- Prompt history from every AI tool used
- Prompts provided in the order they were sent`;

const TASK_UPDATES = [
  {
    id: EXISTING.uiImplementation,
    title: "Task 1 — Order Tracking Screen: Live Deployed URL",
    description: `${GENERAL_INSTRUCTIONS}\n\n${TASK1_BRIEF}\n\n---\nSubmit your live deployed URL in this task. Submit your GitHub repository URL in the next task ("Task 1 — GitHub Repository").`,
    task_type: "link_submission",
    max_score: 25,
    sort_order: 1,
    required: true,
    options: null,
    correct_option_id: null,
  },
  {
    id: EXISTING.apiIntegration,
    title: "Task 1 — Order Tracking Screen: GitHub Repository",
    description: `Continuation of Task 1 (see the previous task for the full brief and the general instructions, including the AI prompt history requirement).\n\nPaste your GitHub repository URL here. It should contain the full source and a README with setup instructions. If you used AI tools, this repo must include the complete prompt history.`,
    task_type: "github_url",
    max_score: 15,
    sort_order: 2,
    required: true,
    options: null,
    correct_option_id: null,
  },
  {
    id: EXISTING.debugging,
    title: "Task 3 — Algorithm Explanation & Critical Thinking",
    description: `Briefly answer the following about your LRU Cache implementation (recommended length: 100–200 words total):\n\n1. Explain the data structure(s) you used and why you selected them.\n2. Explain the time and space complexity of your implementation.\n3. Describe one realistic situation or access pattern where your implementation could perform poorly, or where your approach has a limitation.\n4. If AI helped you solve the problem, identify one suggestion from the AI that you changed, rejected, or improved, and explain why.`,
    task_type: "long_answer",
    max_score: 15,
    sort_order: 5,
    required: true,
    options: null,
    correct_option_id: null,
  },
  {
    id: EXISTING.quickCheck,
    title: "Task 4 — Figma / UI Design (Optional)",
    description: `This task is optional and worth bonus points — skip it if your Task 1 implementation already demonstrates strong UI/UX decisions.\n\nCreate a Figma design or prototype for your Order Tracking solution. If you submit one, it must show all three required states: Delayed, Delivered but Not Received, and Tracking Not Available Yet.\n\nSet sharing permission to "Anyone with the link can view" and paste the link here.\n\n${FINAL_CHECKLIST}`,
    task_type: "link_submission",
    max_score: 10,
    sort_order: 6,
    required: false,
    options: null,
    correct_option_id: null,
  },
];

const NEW_TASKS = [
  {
    title: "Task 2 — LRU Cache: GitHub Repository",
    description: `${TASK2_BRIEF}\n\n---\nPaste your GitHub repository URL here. Upload your output screenshot(s) in the next task ("Task 2 — Output Screenshot"). If you used AI tools, include the complete prompt history for this task in the repo, clearly separated from Task 1's if you're reusing the same conversation (see General Instructions on Task 1).`,
    task_type: "github_url",
    max_score: 20,
    sort_order: 3,
    required: true,
    assessment_id: ASSESSMENT_ID,
  },
  {
    title: "Task 2 — Output Screenshot",
    description: `Upload at least one clear screenshot showing your LRU cache's actual output: put() operations, get() operations, LRU eviction, and returned values. It must be a real screenshot of your own program running — not manually written or edited results.\n\nIf you implemented the optional TTL/expiration bonus, also include a screenshot demonstrating the expiration behavior (combine multiple screenshots into one image or a short PDF if you need to upload more than one file).`,
    task_type: "file_upload",
    max_score: 10,
    sort_order: 4,
    required: true,
    assessment_id: ASSESSMENT_ID,
  },
];

const { error: durationError } = await supabase
  .from("assessments")
  .update({ duration_minutes: 150 }) // 2h30m
  .eq("id", ASSESSMENT_ID);
if (durationError) {
  console.error("Failed to update duration:", durationError.message);
  process.exit(1);
}
console.log("Set duration_minutes = 150 (2h30m).");

for (const task of TASK_UPDATES) {
  const { id, ...fields } = task;
  const { error } = await supabase.from("assessment_tasks").update(fields).eq("id", id);
  if (error) console.error(`Failed to update task "${task.title}":`, error.message);
  else console.log(`Updated task: ${task.title}`);
}

for (const task of NEW_TASKS) {
  const { error } = await supabase.from("assessment_tasks").insert(task);
  if (error) console.error(`Failed to insert task "${task.title}":`, error.message);
  else console.log(`Inserted new task: ${task.title}`);
}

console.log("\nDone. Verify with: node scripts/verify-assessment.mjs (or the admin dashboard).");
