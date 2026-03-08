'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME_DIR = os.homedir();
const CLAUDE_DIR = path.join(HOME_DIR, '.claude');

const getLocalClaudeDir = () => path.join(process.cwd(), '.claude');

const getMarRoot = () => path.resolve(__dirname, '..', '..');

const runCommand = (cmd, opts = {}) => {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 30000, ...opts }).trim();
  } catch {
    return null;
  }
};

const fileExists = (p) => {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
};

const readFile = (p) => {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
};

const getVersion = () => {
  const pkg = readFile(path.join(__dirname, '..', 'package.json'));
  if (pkg) {
    try { return JSON.parse(pkg).version; } catch { /* ignore */ }
  }
  return 'unknown';
};

const readSettings = (targetDir) => {
  const settingsPath = path.join(targetDir, 'settings.json');
  if (fileExists(settingsPath)) {
    const content = readFile(settingsPath);
    if (content) {
      try { return JSON.parse(content); } catch { /* start fresh */ }
    }
  }
  return {};
};

const writeSettings = (targetDir, settings) => {
  const settingsPath = path.join(targetDir, 'settings.json');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
};

const hookAlreadyConfigured = (settings, eventType, hookName) => {
  if (!settings.hooks) return false;
  const entries = settings.hooks[eventType];
  if (!Array.isArray(entries)) return false;
  return entries.some(entry =>
    entry.hooks && entry.hooks.some(h => h.command && h.command.includes(hookName))
  );
};

const configureHook = (targetDir, isLocal, { eventType, matcher, hookFile, timeout }) => {
  const settings = readSettings(targetDir);
  const hookName = path.basename(hookFile, path.extname(hookFile));

  if (hookAlreadyConfigured(settings, eventType, hookName)) {
    console.log(`  ${hookName} hook: already configured`);
    return;
  }

  const hookCmd = isLocal
    ? `"$CLAUDE_PROJECT_DIR"/.claude/hooks/${path.basename(hookFile)}`
    : `"$HOME"/.claude/hooks/${path.basename(hookFile)}`;

  if (!settings.hooks) settings.hooks = {};
  if (!Array.isArray(settings.hooks[eventType])) settings.hooks[eventType] = [];

  const entry = { matcher, hooks: [{ type: 'command', command: hookCmd }] };
  if (timeout) entry.hooks[0].timeout = timeout;

  settings.hooks[eventType].push(entry);
  writeSettings(targetDir, settings);
  console.log(`  ${hookName} hook: configured in ${isLocal ? '.claude' : '~/.claude'}/settings.json`);
};

const configureBlockNoVerify = (targetDir, isLocal) => {
  configureHook(targetDir, isLocal, {
    eventType: 'PreToolUse',
    matcher: 'Bash',
    hookFile: 'block-no-verify.sh',
  });
};

const configureBlockMainEdits = (targetDir, isLocal) => {
  const settings = readSettings(targetDir);

  const configuredMatchers = new Set();
  if (settings.hooks && Array.isArray(settings.hooks.PreToolUse)) {
    settings.hooks.PreToolUse
      .filter(entry => entry.hooks && entry.hooks.some(h => h.command && h.command.includes('block-main-edits')))
      .forEach(entry => configuredMatchers.add(entry.matcher));
  }

  const needed = ['Write', 'Edit', 'Bash'].filter(m => !configuredMatchers.has(m));

  if (needed.length === 0) {
    console.log('  block-main-edits hook: already configured');
    return;
  }

  const hookCmd = isLocal
    ? '"$CLAUDE_PROJECT_DIR"/.claude/hooks/block-main-edits.sh'
    : '"$HOME"/.claude/hooks/block-main-edits.sh';

  if (!settings.hooks) settings.hooks = {};
  if (!Array.isArray(settings.hooks.PreToolUse)) settings.hooks.PreToolUse = [];

  for (const matcher of needed) {
    settings.hooks.PreToolUse.push(
      { matcher, hooks: [{ type: 'command', command: hookCmd }] }
    );
  }

  writeSettings(targetDir, settings);
  console.log(`  block-main-edits hook: configured in ${isLocal ? '.claude' : '~/.claude'}/settings.json`);
};

const configureVerifyBranch = (targetDir, isLocal) => {
  configureHook(targetDir, isLocal, {
    eventType: 'PostToolUse',
    matcher: 'Bash',
    hookFile: 'verify-branch.sh',
  });
};

module.exports = {
  HOME_DIR,
  CLAUDE_DIR,
  getLocalClaudeDir,
  getMarRoot,
  runCommand,
  fileExists,
  readFile,
  getVersion,
  readSettings,
  writeSettings,
  configureBlockNoVerify,
  configureBlockMainEdits,
  configureVerifyBranch,
};
