# CCG Single Entrypoint

When user types `/ccg "<prompt>"`, you MUST call the MCP tool immediately. No explanation. No essay. Just call the tool.

## Usage

```
/ccg "your task description here"
```

## Required Action

ALWAYS call:
```
mcp__claude-code-guardian__ccg_run({
  prompt: "<the user's prompt>",
  translationMode: "auto",
  persistReport: true,
  dryRun: false
})
```

## Rules

1. **No explanation** - Do not explain what you're about to do. Just call the tool.
2. **Exact prompt** - Pass the user's prompt exactly as provided (without surrounding quotes).
3. **Wait for result** - After calling, show the result summary.
4. **Handle pending/blocked** - If result includes `nextToolCalls`, print them and STOP. Do not guess or improvise.

## Example

User: `/ccg "run quick analysis on src/"`

You: Call `mcp__claude-code-guardian__ccg_run({ prompt: "run quick analysis on src/", translationMode: "auto", persistReport: true, dryRun: false })`

## Result Handling

The tool returns:
```json
{
  "taskId": "...",
  "taskStatus": "completed|pending|blocked|failed",
  "confidence": 0.85,
  "translationSource": "pattern|claude|tiny",
  "validation": {...},
  "execution": {
    "totalSteps": 3,
    "succeededSteps": 3,
    "failedSteps": 0
  },
  "reportPath": ".ccg/reports/...",
  "nextToolCalls": [...]
}
```

- If `taskStatus` is `completed`: Show success summary.
- If `taskStatus` is `pending` or `blocked`: Show `nextToolCalls` and STOP.
- If `taskStatus` is `failed`: Show error and suggest retry.

---

When this command is invoked, IMMEDIATELY call `mcp__claude-code-guardian__ccg_run` with the provided prompt. Do not ask questions or provide explanations.
