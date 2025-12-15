# CCG Single Entrypoint

When user types `/ccg "<prompt>"`, you MUST call the MCP tool IMMEDIATELY. No explanation. No essay. ALWAYS call tool first.

## Usage

```
/ccg "your task description here"
```

## Required Action — ALWAYS CALL TOOL FIRST

**IMPORTANT:** You MUST call `mcp__claude-code-guardian__ccg_run` BEFORE any text response.

```
mcp__claude-code-guardian__ccg_run({
  prompt: "<the user's prompt>",
  translationMode: "auto",
  persistReport: true,
  dryRun: false
})
```

## Rules

1. **ALWAYS call tool first** - Do NOT explain, ask questions, or provide any text before calling the tool.
2. **Exact prompt** - Pass the user's prompt exactly as provided (without surrounding quotes).
3. **Wait for result** - After calling, interpret the result according to the Result Handling section below.
4. **FORBID pre-tool essay** - Any explanation BEFORE the tool call is FORBIDDEN.

## Example

User: `/ccg "run quick analysis on src/"`

You: *(immediately call the tool, no text before)*
```
mcp__claude-code-guardian__ccg_run({ prompt: "run quick analysis on src/", translationMode: "auto", persistReport: true, dryRun: false })
```

## Result Handling

The tool returns:
```json
{
  "taskId": "...",
  "taskStatus": "completed|pending|blocked|failed",
  "supported": true|false,
  "reason": "NO_MATCHING_PATTERN" (if unsupported),
  "confidence": 0.85,
  "translationSource": "pattern|claude|tiny",
  "validation": {...},
  "execution": {
    "stepsTotal": 3,
    "stepsCompleted": 3,
    "stepsFailed": 0
  },
  "reportPath": ".ccg/reports/...",
  "nextToolCalls": [...],
  "fallbackGuidance": {...} (if unsupported)
}
```

### After-Tool Response Logic

**Case 1: Unsupported / No Match**
If ANY of these conditions are true:
- `result.supported === false`
- `result.execution.stepsTotal === 0`
- `result.reason === "NO_MATCHING_PATTERN"`
- Error contains "No matching patterns"

Then respond with setup/config guidance and STOP:
```
This request doesn't match a known CCG task pattern.

Suggested actions:
- If you intended a CCG task, rephrase as an action on repo/code/tests/guards.
- If you intended MCP/global setup, configure outside CCG-runner.

Examples of supported prompts:
- /ccg "run guard_validate for frontend"
- /ccg "run testing_run scope=affected"
- /ccg "analyze repo and propose fix plan"
```

**Case 2: Supported - Completed**
If `taskStatus === "completed"`: Show success summary from result.

**Case 3: Supported - Pending/Blocked**
If `taskStatus === "pending"` or `"blocked"`: Show `nextToolCalls` and STOP. Do not guess or improvise.

**Case 4: Failed**
If `taskStatus === "failed"`: Show error and suggest retry.

---

When this command is invoked, IMMEDIATELY call `mcp__claude-code-guardian__ccg_run` with the provided prompt. Do NOT ask questions or provide explanations BEFORE the tool call.
