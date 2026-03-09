'use strict';

const { dispatchWorker } = require('./dispatch');

const parseArgs = (argv) => {
  const args = {};
  const raw = argv.slice(3);

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    const next = raw[i + 1];

    switch (arg) {
      case '--branch':
      case '-b':
        args.branch = next; i++; break;
      case '--base':
        args.baseBranch = next; i++; break;
      case '--team':
      case '-t':
        args.teamName = next; i++; break;
      case '--name':
      case '-n':
        args.workerName = next; i++; break;
      case '--task':
        args.taskDescription = next; i++; break;
      case '--issue':
      case '-i':
        args.issueNumber = parseInt(next, 10); i++; break;
      case '--issue-title':
        args.issueTitle = next; i++; break;
      case '--context':
      case '-c':
        args.contextFiles = next.split(',').map((f) => f.trim()); i++; break;
      case '--help':
      case '-h':
        args.help = true; break;
    }
  }

  return args;
};

const printUsage = () => {
  console.log(`mar dispatch — spawn a squad worker in a new terminal tab

Usage: mar dispatch [options]

Required:
  --branch, -b <name>        Worker branch name
  --name, -n <name>          Worker name (e.g., "auth-worker")
  --task <description>       Task description / acceptance criteria

Optional:
  --base <branch>            Base branch (default: origin/main)
  --team, -t <name>          Team name (default: mar-<repo>)
  --issue, -i <number>       GitHub issue number
  --issue-title <title>      GitHub issue title
  --context, -c <files>      Comma-separated context file paths

Example:
  mar dispatch \\
    --branch feat/mar-repo-auth \\
    --name auth-worker \\
    --task "Implement JWT authentication middleware" \\
    --issue 5 \\
    --issue-title "Add auth middleware" \\
    --context "src/middleware.ts,src/auth.ts"`);
};

const run = () => {
  const args = parseArgs(process.argv);

  if (args.help) {
    printUsage();
    return;
  }

  if (!args.branch || !args.workerName || !args.taskDescription) {
    console.error('Error: --branch, --name, and --task are required.\n');
    printUsage();
    process.exit(1);
  }

  const issueRef = args.issueNumber
    ? { number: args.issueNumber, title: args.issueTitle || `Issue #${args.issueNumber}` }
    : undefined;

  dispatchWorker({
    branch: args.branch,
    baseBranch: args.baseBranch,
    teamName: args.teamName || `mar-${require('path').basename(process.cwd())}`,
    workerName: args.workerName,
    taskDescription: args.taskDescription,
    issueRef,
    contextFiles: args.contextFiles,
  });
};

module.exports = { run };
