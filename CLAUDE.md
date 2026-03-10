# Project Tracker

## What this is
A Kanban board with three columns: To Do, In Progress, and Done.
The data lives in `tasks.json` in this folder.
The board runs on the Mac Mini at http://100.121.59.18:2222 (always on).

## How to update tasks
Edit `~/Documents/Claude/tracker/tasks.json` directly.

### tasks.json format
```json
{
  "todo": [],
  "inprogress": [],
  "done": []
}
```

Each task object looks like this:
```json
{
  "id": "unique-id",
  "title": "Task title",
  "desc": "Optional description",
  "priority": "high|medium|low",
  "createdAt": "2026-03-10T00:00:00.000Z",
  "updatedAt": "2026-03-10T00:00:00.000Z"
}
```

To generate an id, use a short unique string like a timestamp + random chars.

## Rules
- Always read tasks.json first before making changes
- Preserve all existing tasks when writing — never wipe the file
- After writing, confirm what was changed
- The board auto-refreshes every 30 seconds so no push needed

## Franky's CLI
Franky uses `node ~/Documents/Claude/tracker/tracker-cli.js` on the Mac Mini.
Commands: add, move, edit, delete, list, status.
