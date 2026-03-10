#!/usr/bin/env node
/**
 * tracker-cli.js — Project Tracker CLI
 * Used by agents (e.g. Franky) to manage tasks in tasks.json
 *
 * Usage:
 *   node tracker-cli.js list [col]
 *   node tracker-cli.js add --title "Task title" [--col todo|inprogress|done] [--priority high|medium|low] [--desc "..."]
 *   node tracker-cli.js move <id> <col>
 *   node tracker-cli.js edit <id> [--title "..."] [--priority ...] [--desc "..."]
 *   node tracker-cli.js delete <id>
 *   node tracker-cli.js status
 */

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'tasks.json');
const COLS      = ['todo', 'inprogress', 'done'];
const PRIOS     = ['high', 'medium', 'low'];

// ── helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { todo: [], inprogress: [], done: [] };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { die('tasks.json is corrupt. Fix or delete it and try again.'); }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function die(msg) {
  console.error('Error:', msg);
  process.exit(1);
}

function findCard(data, id) {
  for (const col of COLS) {
    const idx = (data[col] || []).findIndex(c => c.id === id);
    if (idx !== -1) return { col, idx, card: data[col][idx] };
  }
  return null;
}

function parseArgs(argv) {
  const args = {};
  let i = 0;
  while (i < argv.length) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] || true;
      i += 2;
    } else {
      (args._ = args._ || []).push(argv[i]);
      i++;
    }
  }
  return args;
}

function colLabel(col) {
  return { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[col] || col;
}

function prioColor(p) {
  return { high: '\x1b[31m', medium: '\x1b[33m', low: '\x1b[32m' }[p] || '';
}
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';

// ── commands ──────────────────────────────────────────────────────────────────

function cmdList(args) {
  const data  = loadData();
  const colArg = (args._ || [])[0];
  const cols  = colArg ? [colArg] : COLS;

  if (colArg && !COLS.includes(colArg)) die(`Unknown column "${colArg}". Use: ${COLS.join(', ')}`);

  let any = false;
  for (const col of cols) {
    const cards = data[col] || [];
    console.log(`\n${BOLD}${colLabel(col)}${RESET} ${DIM}(${cards.length})${RESET}`);
    if (!cards.length) { console.log(`  ${DIM}(empty)${RESET}`); continue; }
    cards.forEach(c => {
      any = true;
      const pc = prioColor(c.priority);
      console.log(`  ${DIM}${c.id}${RESET}  ${pc}[${(c.priority||'medium').padEnd(6)}]${RESET}  ${c.title}`);
      if (c.desc) console.log(`             ${DIM}${c.desc}${RESET}`);
    });
  }
  console.log();
}

function cmdAdd(args) {
  const title = args.title;
  if (!title) die('--title is required');

  const col      = args.col      || 'todo';
  const priority = args.priority || 'medium';
  const desc     = args.desc     || '';

  if (!COLS.includes(col))  die(`Unknown column "${col}". Use: ${COLS.join(', ')}`);
  if (!PRIOS.includes(priority)) die(`Unknown priority "${priority}". Use: ${PRIOS.join(', ')}`);

  const data = loadData();
  const card = { id: uid(), title, desc, priority, createdAt: new Date().toISOString() };
  data[col].push(card);
  saveData(data);
  console.log(`✓ Added "${title}" to ${colLabel(col)}  ${DIM}(id: ${card.id})${RESET}`);
}

function cmdMove(args) {
  const [id, targetCol] = (args._ || []);
  if (!id || !targetCol) die('Usage: move <id> <col>');
  if (!COLS.includes(targetCol)) die(`Unknown column "${targetCol}". Use: ${COLS.join(', ')}`);

  const data   = loadData();
  const result = findCard(data, id);
  if (!result) die(`No card found with id "${id}"`);

  const { col: srcCol, idx, card } = result;
  if (srcCol === targetCol) { console.log(`Card is already in ${colLabel(targetCol)}`); return; }

  data[srcCol].splice(idx, 1);
  data[targetCol].push(card);
  saveData(data);
  console.log(`✓ Moved "${card.title}" from ${colLabel(srcCol)} → ${colLabel(targetCol)}`);
}

function cmdEdit(args) {
  const [id] = (args._ || []);
  if (!id) die('Usage: edit <id> [--title ...] [--priority ...] [--desc ...]');

  const data   = loadData();
  const result = findCard(data, id);
  if (!result) die(`No card found with id "${id}"`);

  const { card } = result;
  if (args.title)    card.title    = args.title;
  if (args.desc)     card.desc     = args.desc;
  if (args.priority) {
    if (!PRIOS.includes(args.priority)) die(`Unknown priority. Use: ${PRIOS.join(', ')}`);
    card.priority = args.priority;
  }
  card.updatedAt = new Date().toISOString();

  saveData(data);
  console.log(`✓ Updated "${card.title}"`);
}

function cmdDelete(args) {
  const [id] = (args._ || []);
  if (!id) die('Usage: delete <id>');

  const data   = loadData();
  const result = findCard(data, id);
  if (!result) die(`No card found with id "${id}"`);

  const { col, idx, card } = result;
  data[col].splice(idx, 1);
  saveData(data);
  console.log(`✓ Deleted "${card.title}" from ${colLabel(col)}`);
}

function cmdStatus() {
  const data = loadData();
  const total = COLS.reduce((n, c) => n + (data[c] || []).length, 0);
  console.log(`\n${BOLD}Project Tracker — Status${RESET}`);
  COLS.forEach(col => {
    const n = (data[col] || []).length;
    const bar = '█'.repeat(n) || DIM + '(empty)' + RESET;
    console.log(`  ${colLabel(col).padEnd(12)} ${bar}  ${n}`);
  });
  console.log(`  ${'Total'.padEnd(12)} ${total}\n`);
}

function cmdHelp() {
  console.log(`
${BOLD}tracker-cli.js${RESET} — Project Tracker CLI

${BOLD}Commands:${RESET}
  list [col]                             List tasks (optionally filter by column)
  add --title "..." [--col] [--priority] [--desc "..."]   Add a task
  move <id> <col>                        Move a task to a different column
  edit <id> [--title] [--priority] [--desc]               Edit a task
  delete <id>                            Delete a task
  status                                 Show task counts
  help                                   Show this help

${BOLD}Columns:${RESET}  todo | inprogress | done
${BOLD}Priority:${RESET} high | medium | low
`);
}

// ── main ──────────────────────────────────────────────────────────────────────

const [,, cmd, ...rest] = process.argv;
const args = parseArgs(rest);

switch (cmd) {
  case 'list':   cmdList(args);   break;
  case 'add':    cmdAdd(args);    break;
  case 'move':   cmdMove(args);   break;
  case 'edit':   cmdEdit(args);   break;
  case 'delete': cmdDelete(args); break;
  case 'status': cmdStatus();     break;
  case 'help':
  case undefined: cmdHelp();      break;
  default: die(`Unknown command "${cmd}". Run: node tracker-cli.js help`);
}
