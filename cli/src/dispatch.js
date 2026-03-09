'use strict';

const fs = require('fs');
const path = require('path');
const { runCommand } = require('./utils');
const { openTab } = require('./spawn');

const WORKTREE_BASE = '.worktrees';

const createWorktree = (branch, baseBranch = 'origin/main') => {
  const projectRoot = runCommand('git rev-parse --show-toplevel');
  if (!projectRoot) throw new Error('Not in a git repository');

  const worktreePath = path.join(projectRoot, WORKTREE_BASE, branch);

  if (fs.existsSync(worktreePath)) {
    console.log(`  Worktree already exists: ${worktreePath}`);
    return worktreePath;
  }

  fs.mkdirSync(path.join(projectRoot, WORKTREE_BASE), { recursive: true });

  const result = runCommand(`git worktree add "${worktreePath}" -b "${branch}" "${baseBranch}" 2>&1`);
  if (result === null) {
    throw new Error(`Failed to create worktree for branch ${branch}`);
  }

  console.log(`  Worktree created: ${worktreePath}`);
  return worktreePath;
};

const writeWorkerPrompt = (worktreePath, prompt) => {
  const promptPath = path.join(worktreePath, '.mar-worker-prompt.md');
  fs.writeFileSync(promptPath, prompt);
  return promptPath;
};

const buildClaudeCommand = (worktreePath) => {
  const promptFile = path.join(worktreePath, '.mar-worker-prompt.md');
  return `cd "${worktreePath}" && claude -p "$(cat '${promptFile}')"`;
};

const dispatchWorker = ({ branch, baseBranch, teamName, workerName, taskDescription, issueRef, contextFiles }) => {
  console.log(`\nDispatching ${workerName}...`);

  const worktreePath = createWorktree(branch, baseBranch || 'origin/main');

  const prompt = buildWorkerPrompt({
    teamName,
    workerName,
    branch,
    baseBranch: baseBranch || 'origin/main',
    taskDescription,
    issueRef,
    contextFiles,
  });

  writeWorkerPrompt(worktreePath, prompt);

  const cmd = buildClaudeCommand(worktreePath);
  openTab(cmd);

  console.log(`  ${workerName} dispatched in new terminal tab`);

  return { worktreePath, branch, workerName };
};

const buildWorkerPrompt = ({ teamName, workerName, branch, baseBranch, taskDescription, issueRef, contextFiles }) => {
  const lines = [
    `You are a teammate in the ${teamName} squad. Your name is ${workerName}.`,
    '',
    '## Branch Verification (MANDATORY — RUN BEFORE ANYTHING ELSE)',
    'Run these commands NOW:',
    '```bash',
    'git fetch origin',
    `CURRENT=$(git branch --show-current)`,
    `echo "Current branch: $CURRENT"`,
    `echo "Expected: ${branch}"`,
    '```',
    'If mismatch: STOP and report the error.',
    '',
    '## Your Mission',
    taskDescription,
    '',
  ];

  if (issueRef) {
    lines.push(`## Issue Reference`);
    lines.push(`This task is from GitHub issue #${issueRef.number}: ${issueRef.title}`);
    lines.push(`Include "Ref #${issueRef.number}" in your commit messages.`);
    lines.push('');
  }

  if (contextFiles && contextFiles.length > 0) {
    lines.push('## Context');
    lines.push('Read CLAUDE.md first, then these files:');
    for (const f of contextFiles) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  }

  lines.push('## When Done');
  lines.push('1. Ensure all tests pass');
  lines.push('2. Push your branch');
  lines.push(`3. Create a PR referencing ${issueRef ? `#${issueRef.number}` : 'the task'}`);
  lines.push('4. Report completion: what changed, test evidence, PR URL');

  return lines.join('\n');
};

const cleanupWorktree = (branch) => {
  const projectRoot = runCommand('git rev-parse --show-toplevel');
  if (!projectRoot) return;

  const worktreePath = path.join(projectRoot, WORKTREE_BASE, branch);

  if (!fs.existsSync(worktreePath)) {
    console.log(`  Worktree not found: ${worktreePath}`);
    return;
  }

  runCommand(`git worktree remove "${worktreePath}" --force 2>&1`);
  console.log(`  Worktree removed: ${worktreePath}`);
};

const listWorktrees = () => {
  const raw = runCommand('git worktree list --porcelain');
  if (!raw) return [];

  const worktrees = [];
  let current = {};

  for (const line of raw.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) worktrees.push(current);
      current = { path: line.replace('worktree ', '') };
    } else if (line.startsWith('branch ')) {
      current.branch = line.replace('branch refs/heads/', '');
    } else if (line === 'bare') {
      current.bare = true;
    }
  }

  if (current.path) worktrees.push(current);

  return worktrees.filter((w) => !w.bare && w.path.includes(WORKTREE_BASE));
};

module.exports = {
  dispatchWorker,
  createWorktree,
  cleanupWorktree,
  listWorktrees,
  buildWorkerPrompt,
  buildClaudeCommand,
};
