'use strict';

const fs = require('fs');
const path = require('path');
const {
  getMarRoot,
  getLocalClaudeDir,
  CLAUDE_DIR,
  runCommand,
  fileExists,
  readFile,
  configureBlockNoVerify,
  configureBlockMainEdits,
  configureVerifyBranch,
  readSettings,
  writeSettings,
} = require('./utils');

const STACK_DETECTORS = [
  { name: 'node', indicator: 'package.json', label: 'Node.js' },
  { name: 'go', indicator: 'go.mod', label: 'Go' },
  { name: 'python', indicator: 'pyproject.toml', label: 'Python' },
  { name: 'python', indicator: 'requirements.txt', label: 'Python' },
  { name: 'rust', indicator: 'Cargo.toml', label: 'Rust' },
];

const TEST_FRAMEWORK_DETECTORS = [
  { name: 'jest', check: (pkg) => hasDep(pkg, 'jest') },
  { name: 'vitest', check: (pkg) => hasDep(pkg, 'vitest') },
  { name: 'mocha', check: (pkg) => hasDep(pkg, 'mocha') },
  { name: 'pytest', check: () => fileExists('pytest.ini') || fileExists('pyproject.toml') },
  { name: 'go test', check: () => fileExists('go.mod') },
  { name: 'cargo test', check: () => fileExists('Cargo.toml') },
];

const hasDep = (pkg, name) => {
  if (!pkg) return false;
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return Boolean(deps[name]);
};

const readPackageJson = () => {
  const raw = readFile(path.join(process.cwd(), 'package.json'));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

const detectStack = () => {
  const cwd = process.cwd();
  for (const { name, indicator, label } of STACK_DETECTORS) {
    if (fileExists(path.join(cwd, indicator))) {
      return { name, label };
    }
  }
  return { name: 'unknown', label: 'Unknown' };
};

const detectTestFramework = () => {
  const pkg = readPackageJson();
  for (const { name, check } of TEST_FRAMEWORK_DETECTORS) {
    if (check(pkg)) return name;
  }
  return null;
};

const detectPlaywright = () => {
  const pkg = readPackageJson();
  if (hasDep(pkg, '@playwright/test') || hasDep(pkg, 'playwright')) return true;
  const npxCheck = runCommand('npx playwright --version 2>/dev/null');
  return npxCheck !== null;
};

const detectDevServer = () => {
  const pkg = readPackageJson();
  if (!pkg || !pkg.scripts) return null;
  const keys = ['dev', 'start', 'serve'];
  const match = keys.find((k) => pkg.scripts[k]);
  return match ? `npm run ${match}` : null;
};

const detectQualityGates = () => {
  const pkg = readPackageJson();
  const gates = [];

  if (pkg && pkg.scripts) {
    if (pkg.scripts.lint) gates.push({ name: 'lint', command: 'npm run lint' });
    if (pkg.scripts.test) gates.push({ name: 'test', command: 'npm run test' });
  }

  if (fileExists('Makefile')) {
    const makefile = readFile('Makefile') || '';
    if (makefile.includes('lint:') && !gates.find((g) => g.name === 'lint')) {
      gates.push({ name: 'lint', command: 'make lint' });
    }
    if (makefile.includes('test:') && !gates.find((g) => g.name === 'test')) {
      gates.push({ name: 'test', command: 'make test' });
    }
  }

  return gates;
};

const generateConfig = ({ stack, testFramework, playwrightAvailable, devServer, qualityGates }) => {
  const lines = [
    'review:',
    '  strategy: native',
    '',
    `quality_gates:`,
  ];

  if (qualityGates.length === 0) {
    lines.push('  []');
  } else {
    for (const gate of qualityGates) {
      lines.push(`  - name: "${gate.name}"`);
      lines.push(`    command: "${gate.command}"`);
    }
  }

  lines.push('');
  lines.push(`test_framework: "${testFramework || 'auto'}"`);
  lines.push('');
  lines.push('self_heal:');
  lines.push('  max_retries_per_strategy: 3');
  lines.push('  max_total_retries: 5');
  lines.push('  escalation: "needs-human"');
  lines.push('');
  lines.push('playwright:');
  lines.push(`  enabled: ${playwrightAvailable ? 'auto' : 'false'}`);
  lines.push('  mock_backend: true');
  lines.push('  video_dir: .mar/videos');
  lines.push(`  dev_server: "${devServer || ''}"`);
  lines.push('');
  lines.push('dev_environment:');
  lines.push('  ports: {}');
  lines.push('  rules: []');
  lines.push(`  start_command: "${devServer || ''}"`);
  lines.push('  stop_command: ""');

  return lines.join('\n') + '\n';
};

const copyDirectory = (srcDir, destDir) => {
  if (!fs.existsSync(srcDir)) return 0;

  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir);
  let count = 0;

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      count += copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      if (entry.endsWith('.sh')) {
        fs.chmodSync(destPath, 0o755);
      }
      count++;
    }
  }

  return count;
};

const installFiles = (marRoot, localClaudeDir) => {
  const summary = {};

  const commandsSrc = path.join(marRoot, 'commands');
  const commandsDest = path.join(localClaudeDir, 'commands');
  summary.commands = copyDirectory(commandsSrc, commandsDest);

  const agentsSrc = path.join(marRoot, 'agents');
  const agentsDest = path.join(localClaudeDir, 'agents');
  summary.agents = copyDirectory(agentsSrc, agentsDest);

  const hooksSrc = path.join(marRoot, 'hooks');
  const hooksDest = path.join(localClaudeDir, 'hooks');
  summary.hooks = copyDirectory(hooksSrc, hooksDest);

  return summary;
};

const configureHooks = (localClaudeDir) => {
  console.log('\nConfiguring hooks...');
  configureBlockMainEdits(localClaudeDir, true);
  configureBlockNoVerify(localClaudeDir, true);
  configureVerifyBranch(localClaudeDir, true);
};

const enableAgentTeams = () => {
  const globalSettings = readSettings(CLAUDE_DIR);

  if (globalSettings.enableAgentTeams) {
    console.log('\nAgent Teams: already enabled');
    return;
  }

  globalSettings.enableAgentTeams = true;
  writeSettings(CLAUDE_DIR, globalSettings);
  console.log('\nAgent Teams: enabled in ~/.claude/settings.json');
};

const run = () => {
  console.log('mar init — setting up mar-workflow\n');

  const stack = detectStack();
  const testFramework = detectTestFramework();
  const playwrightAvailable = detectPlaywright();
  const devServer = detectDevServer();
  const qualityGates = detectQualityGates();

  console.log(`Stack: ${stack.label}`);
  console.log(`Test framework: ${testFramework || 'none detected'}`);
  console.log(`Playwright: ${playwrightAvailable ? 'available' : 'not found'}`);
  console.log(`Dev server: ${devServer || 'none detected'}`);
  console.log(`Quality gates: ${qualityGates.length > 0 ? qualityGates.map((g) => g.name).join(', ') : 'none detected'}`);

  const configPath = path.join(process.cwd(), 'mar.config.yaml');
  if (fileExists(configPath)) {
    console.log('\nmar.config.yaml: already exists (keeping existing)');
  } else {
    const configContent = generateConfig({ stack, testFramework, playwrightAvailable, devServer, qualityGates });
    fs.writeFileSync(configPath, configContent);
    console.log('\nmar.config.yaml: created');
  }

  const marRoot = getMarRoot();
  const localClaudeDir = getLocalClaudeDir();

  console.log('\nInstalling files...');
  const summary = installFiles(marRoot, localClaudeDir);
  console.log(`  Commands: ${summary.commands} files`);
  console.log(`  Agents: ${summary.agents} files`);
  console.log(`  Hooks: ${summary.hooks} files`);

  configureHooks(localClaudeDir);
  enableAgentTeams();

  console.log('\n---');
  console.log('mar-workflow installed successfully.');
  console.log('Run `mar doctor` to verify the setup.');
};

module.exports = { run, detectStack, detectTestFramework, detectPlaywright, detectDevServer };
