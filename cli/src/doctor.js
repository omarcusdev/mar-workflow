'use strict';

const fs = require('fs');
const path = require('path');
const {
  runCommand,
  fileExists,
  readFile,
  getLocalClaudeDir,
  CLAUDE_DIR,
  readSettings,
} = require('./utils');

const ok = (label) => console.log(`  [ok] ${label}`);
const fail = (label) => console.log(`  [!!] ${label}`);
const warn = (label) => console.log(`  [??] ${label}`);

const checkBinary = (name, versionCmd) => {
  const result = runCommand(versionCmd);
  if (result) {
    ok(`${name}: found`);
    return true;
  }
  fail(`${name}: not found`);
  return false;
};

const checkGhAuth = () => {
  const result = runCommand('gh auth status 2>&1');
  if (result && result.includes('Logged in')) {
    ok('GitHub CLI: authenticated');
    return true;
  }
  fail('GitHub CLI: not authenticated (run `gh auth login`)');
  return false;
};

const checkNodeVersion = () => {
  const version = runCommand('node --version 2>/dev/null');
  if (!version) {
    fail('Node.js: not found');
    return false;
  }
  const major = parseInt(version.replace('v', ''), 10);
  if (major >= 18) {
    ok(`Node.js: ${version}`);
    return true;
  }
  fail(`Node.js: ${version} (requires >=18)`);
  return false;
};

const checkDirectoryFiles = (dir, label, expectedFiles) => {
  const missing = expectedFiles.filter((f) => !fileExists(path.join(dir, f)));
  if (missing.length === 0) {
    ok(`${label}: all ${expectedFiles.length} files installed`);
    return true;
  }
  fail(`${label}: missing ${missing.join(', ')}`);
  return false;
};

const checkHooksConfigured = (settingsDir, label) => {
  const settings = readSettings(settingsDir);
  if (!settings.hooks) {
    fail(`${label}: no hooks configured`);
    return false;
  }

  const requiredHooks = ['block-main-edits', 'block-no-verify', 'verify-branch'];
  const configuredHooks = JSON.stringify(settings.hooks);
  const missing = requiredHooks.filter((h) => !configuredHooks.includes(h));

  if (missing.length === 0) {
    ok(`${label}: all hooks configured`);
    return true;
  }
  fail(`${label}: missing hooks: ${missing.join(', ')}`);
  return false;
};

const checkConfig = () => {
  const configPath = path.join(process.cwd(), 'mar.config.yaml');
  if (!fileExists(configPath)) {
    warn('mar.config.yaml: not found (run `mar init`)');
    return false;
  }

  const content = readFile(configPath);
  if (!content) {
    fail('mar.config.yaml: empty or unreadable');
    return false;
  }

  const warnings = [];

  const requiredSections = ['review', 'self_heal', 'playwright'];
  for (const section of requiredSections) {
    if (!content.includes(`${section}:`)) {
      warnings.push(`missing section: ${section}`);
    }
  }

  const strategyMatch = content.match(/strategy:\s*(\S+)/);
  if (strategyMatch && !['native', 'codex'].includes(strategyMatch[1])) {
    warnings.push(`invalid review.strategy: "${strategyMatch[1]}"`);
  }

  const enabledMatch = content.match(/enabled:\s*(\S+)/);
  if (enabledMatch && !['auto', 'true', 'false'].includes(enabledMatch[1])) {
    warnings.push(`invalid playwright.enabled: "${enabledMatch[1]}"`);
  }

  if (warnings.length === 0) {
    ok('mar.config.yaml: valid');
    return true;
  }

  for (const w of warnings) {
    warn(`mar.config.yaml: ${w}`);
  }
  return false;
};

const checkAgentTeams = () => {
  const globalSettings = readSettings(CLAUDE_DIR);
  if (globalSettings.enableAgentTeams) {
    ok('Agent Teams: enabled');
    return true;
  }
  fail('Agent Teams: not enabled in ~/.claude/settings.json');
  return false;
};

const checkPlaywright = () => {
  const configPath = path.join(process.cwd(), 'mar.config.yaml');
  const content = readFile(configPath) || '';

  if (content.includes('enabled: false')) {
    ok('Playwright: disabled (skipping check)');
    return true;
  }

  const npxResult = runCommand('npx playwright --version 2>/dev/null');
  if (npxResult) {
    ok(`Playwright: ${npxResult.trim()}`);
    return true;
  }
  warn('Playwright: not installed (frontend demos will be skipped)');
  return false;
};

const checkDevServer = () => {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (!fileExists(pkgPath)) {
    ok('Dev server: N/A (no package.json)');
    return true;
  }

  const raw = readFile(pkgPath);
  if (!raw) return true;

  try {
    const pkg = JSON.parse(raw);
    const scripts = pkg.scripts || {};
    const serverKeys = ['dev', 'start', 'serve'];
    const match = serverKeys.find((k) => scripts[k]);

    if (match) {
      ok(`Dev server: npm run ${match}`);
      return true;
    }
    warn('Dev server: no dev/start/serve script detected');
    return false;
  } catch {
    warn('Dev server: package.json parse error');
    return false;
  }
};

const run = () => {
  console.log('mar doctor — checking environment and installation\n');

  const localClaudeDir = getLocalClaudeDir();
  let passed = 0;
  let failed = 0;
  let warned = 0;

  const track = (result) => {
    if (result === true) passed++;
    else if (result === false) failed++;
    else warned++;
  };

  console.log('Environment:');
  track(checkBinary('Claude Code', 'claude --version 2>/dev/null || claude-code --version 2>/dev/null'));
  track(checkBinary('git', 'git --version 2>/dev/null'));
  track(checkBinary('gh', 'gh --version 2>/dev/null'));
  track(checkGhAuth());
  track(checkNodeVersion());

  console.log('\nInstallation:');
  track(checkDirectoryFiles(
    path.join(localClaudeDir, 'commands', 'mar'),
    'Commands',
    ['solve.md', 'status.md', '_patterns.md']
  ));
  track(checkDirectoryFiles(
    path.join(localClaudeDir, 'agents'),
    'Agents',
    ['tribe-lead.md', 'squad-worker.md', 'pr-creator.md']
  ));
  track(checkDirectoryFiles(
    path.join(localClaudeDir, 'hooks'),
    'Hooks',
    ['block-main-edits.sh', 'block-no-verify.sh', 'verify-branch.sh']
  ));

  console.log('\nConfiguration:');
  track(checkHooksConfigured(localClaudeDir, 'Local hooks'));
  track(checkConfig());
  track(checkAgentTeams());

  console.log('\nOptional:');
  track(checkPlaywright());
  track(checkDevServer());

  console.log(`\n---`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${warned} warnings`);

  if (failed > 0) {
    console.log('Run `mar init` to fix installation issues.');
    process.exit(1);
  }

  if (warned > 0) {
    console.log('All critical checks passed. Warnings are non-blocking.');
  } else {
    console.log('All checks passed.');
  }
};

module.exports = { run };
