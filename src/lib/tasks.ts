// Central place to edit the assessment task per position. Add a new key
// here and it automatically shows up in the candidate "position" dropdown.
export type TaskDefinition = {
  position: string;
  durationMinutes: number;
  instructions: string[];
};

export const TASKS: Record<string, TaskDefinition> = {
  "Frontend Developer Intern": {
    position: "Frontend Developer Intern",
    durationMinutes: 60,
    instructions: [
      "Build a small, responsive UI from scratch using any stack you're comfortable with (React/Next.js preferred).",
      "No reference design is provided - use your own judgment for layout and styling.",
      "AI tools (ChatGPT, Claude, Copilot, etc.) are allowed. Please declare what you used when you submit.",
      "Push your work to a public or private GitHub repo (invite the reviewer if private), or upload a ZIP if you prefer.",
      "You do not need to deploy it, but a live demo link is a bonus.",
    ],
  },
  "Backend Developer Intern": {
    position: "Backend Developer Intern",
    durationMinutes: 60,
    instructions: [
      "Build a small REST API from scratch using any stack you're comfortable with.",
      "No spec is provided beyond what's given verbally/in your invite email - use your own judgment.",
      "AI tools (ChatGPT, Claude, Copilot, etc.) are allowed. Please declare what you used when you submit.",
      "Push your work to a public or private GitHub repo (invite the reviewer if private), or upload a ZIP if you prefer.",
    ],
  },
};

export const DEFAULT_POSITION = "Frontend Developer Intern";

export function getTask(position: string): TaskDefinition {
  return TASKS[position] ?? TASKS[DEFAULT_POSITION];
}

export function listPositions(): string[] {
  return Object.keys(TASKS);
}
