// Usage: node scripts/consolidate-to-4-tasks.mjs
//
// One-time data migration: collapses the assessment's 6 task rows back
// down to exactly 4, using the new `fields` column so Task 1 and Task 2
// each collect multiple submission pieces (live URL + GitHub URL; GitHub
// URL + screenshot) inside a single task. Also sets
// assessments.general_instructions as its own section, separate from any
// task.
//
// Requires supabase/migrations/0002_task_fields_and_general_instructions.sql
// to have been run first (adds assessments.general_instructions and
// assessment_tasks.fields) - this script will fail loudly if it hasn't.
//
// Safe to run: verified 0 submissions exist against this assessment's
// tasks before writing this. The two rows this deletes (previously
// "Task 1 — GitHub Repository" and "Task 2 — Output Screenshot") are
// merged into their sibling row's `fields`, not lost.
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

// Rows kept (repurposed in place) vs. rows merged away.
const KEEP_TASK1 = "fc65e94d-ca91-428b-918a-d61a20c19b35"; // was "Task 1 — ...Live Deployed URL"
const DROP_TASK1_GITHUB = "926678ad-2e0c-419e-86bf-66dc3e396615"; // was "Task 1 — ...GitHub Repository"
const KEEP_TASK2 = "1ca47be0-8b86-4739-b832-b78615220a81"; // was "Task 2 — LRU Cache: GitHub Repository"
const DROP_TASK2_SCREENSHOT = "4c625640-7a46-4158-b41f-951362b32d94"; // was "Task 2 — Output Screenshot"
const KEEP_TASK3 = "d34f9e54-0d19-401a-b0d4-8e7da0ead0a5";
const KEEP_TASK4 = "f57c4d7d-4a49-492e-902f-cb8d3d46f76b";

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

// Fail-fast: stop at the first error instead of continuing (a prior run of
// this script continued past two failed updates into the deletes below,
// which then ran anyway - harmless here since both merged-away rows had 0
// submissions, but this ordering is the actual fix for that).
async function step(label, promise) {
  const { error } = await promise;
  if (error) {
    console.error(`✗ ${label}:`, error.message);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
}

await step(
  "Set general_instructions",
  supabase.from("assessments").update({ general_instructions: GENERAL_INSTRUCTIONS }).eq("id", ASSESSMENT_ID)
);

await step(
  "Merge into Task 1",
  supabase
    .from("assessment_tasks")
    .update({
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
    })
    .eq("id", KEEP_TASK1)
);

await step(
  "Merge into Task 2",
  supabase
    .from("assessment_tasks")
    .update({
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
    })
    .eq("id", KEEP_TASK2)
);

await step(
  "Update Task 3",
  supabase
    .from("assessment_tasks")
    .update({
      title: "Task 3 — Algorithm Explanation & Critical Thinking",
      description: TASK3_DESCRIPTION,
      task_type: "long_answer",
      fields: null,
      max_score: 15,
      sort_order: 3,
      required: true,
    })
    .eq("id", KEEP_TASK3)
);

await step(
  "Update Task 4",
  supabase
    .from("assessment_tasks")
    .update({
      title: "Task 4 — Figma / UI Design (Optional)",
      description: TASK4_DESCRIPTION,
      task_type: "link_submission",
      fields: null,
      options: null,
      correct_option_id: null,
      max_score: 10,
      sort_order: 4,
      required: false,
    })
    .eq("id", KEEP_TASK4)
);

await step("Delete merged-away Task 1 GitHub row (no-op if already gone)", supabase.from("assessment_tasks").delete().eq("id", DROP_TASK1_GITHUB));
await step("Delete merged-away Task 2 Screenshot row (no-op if already gone)", supabase.from("assessment_tasks").delete().eq("id", DROP_TASK2_SCREENSHOT));

console.log("\nDone - assessment now has exactly 4 tasks.");
