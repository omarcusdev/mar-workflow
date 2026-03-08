'use strict';

const { execSync, execFileSync } = require('child_process');
const { runCommand } = require('./utils');

const shellQuote = (s) =>
  "'" + s.replace(/'/g, "'\\''") + "'";

const escapeApplescript = (s) =>
  s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const whichExists = (bin) => {
  try {
    execFileSync('which', [bin], { stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
};

const tmuxAvailable = () => whichExists('tmux');

const detectTerminal = () => {
  if (process.env.ITERM_SESSION_ID) return 'iterm2';
  if (process.env.GHOSTTY_RESOURCES_DIR) return 'ghostty';
  if (process.env.TMUX) return 'tmux';
  if (process.env.TERM_PROGRAM === 'iTerm.app') return 'iterm2';
  if (process.env.TERM_PROGRAM === 'ghostty') return 'ghostty';
  if (process.env.TERM_PROGRAM === 'Apple_Terminal') return 'apple_terminal';
  return 'unknown';
};

const runOsascript = (script) => {
  const result = runCommand(`osascript -e ${shellQuote(script)}`);
  if (result === null) {
    throw new Error('osascript execution failed');
  }
  return result;
};

const openAppleTerminalTab = (cmd) => {
  const script = `tell application "Terminal"
  activate
  tell application "System Events" to tell process "Terminal" to click menu item "New Tab" of menu "Shell" of menu bar 1
  delay 0.3
  do script "${escapeApplescript(cmd)}" in selected tab of front window
end tell`;
  runOsascript(script);
};

const openAppleTerminalWindow = (cmd) => {
  const script = `tell application "Terminal"
  activate
  do script "${escapeApplescript(cmd)}"
end tell`;
  runOsascript(script);
};

const openIterm2Tab = (cmd) => {
  const script = `tell application "iTerm2" to tell current window to create tab with default profile command "${escapeApplescript(cmd)}"`;
  runOsascript(script);
};

const openGhosttyTab = (cmd) => {
  const result = runCommand(`open -na Ghostty.app --args -e ${shellQuote(cmd)}`);
  if (result === null) {
    throw new Error('Failed to open Ghostty tab');
  }
};

const deriveWindowName = (cmd) => {
  const issueMatch = cmd.match(/#(\d+)/);
  if (issueMatch) return `squad-${issueMatch[1]}`;
  return 'squad';
};

const openTmuxInsideSession = (cmd) => {
  const windowName = deriveWindowName(cmd);
  const result = runCommand(`tmux new-window -n ${shellQuote(windowName)} ${shellQuote(cmd)}`);
  if (result === null) {
    throw new Error('Failed to create tmux window');
  }
};

const openTmuxNewSession = (cmd) => {
  const sessionName = 'mar';
  const windowName = deriveWindowName(cmd);
  runCommand(`tmux new-session -d -s ${shellQuote(sessionName)} 2>/dev/null`);
  const result = runCommand(
    `tmux new-window -t ${shellQuote(sessionName)} -n ${shellQuote(windowName)} ${shellQuote(cmd)}`
  );
  if (result === null) {
    throw new Error('Failed to create tmux window in session');
  }
  try {
    execSync(`tmux attach-session -t ${shellQuote(sessionName)}`, { stdio: 'inherit' });
  } catch {
    // attach may fail if already attached — acceptable
  }
};

const openTab = (cmd) => {
  const terminal = detectTerminal();

  if (terminal === 'tmux') {
    openTmuxInsideSession(cmd);
    return;
  }

  if (tmuxAvailable()) {
    openTmuxNewSession(cmd);
    return;
  }

  const nativeOpeners = {
    apple_terminal: openAppleTerminalTab,
    iterm2: openIterm2Tab,
    ghostty: openGhosttyTab,
  };

  const opener = nativeOpeners[terminal];

  if (opener) {
    opener(cmd);
    return;
  }

  console.error('Warning: tab spawning not supported in this terminal. Running in current terminal.');
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    process.exit(e.status || 1);
  }
};

const openWindow = (cmd) => {
  const terminal = detectTerminal();

  if (terminal === 'tmux') {
    openTmuxInsideSession(cmd);
    return;
  }

  if (tmuxAvailable()) {
    openTmuxNewSession(cmd);
    return;
  }

  if (terminal === 'apple_terminal') {
    openAppleTerminalWindow(cmd);
    return;
  }

  if (terminal === 'iterm2') {
    const script = `tell application "iTerm2" to create window with default profile command "${escapeApplescript(cmd)}"`;
    runOsascript(script);
    return;
  }

  if (terminal === 'ghostty') {
    openGhosttyTab(cmd);
    return;
  }

  console.error('Warning: window spawning not supported in this terminal. Running in current terminal.');
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    process.exit(e.status || 1);
  }
};

module.exports = {
  openTab,
  openWindow,
  detectTerminal,
  tmuxAvailable,
  whichExists,
  shellQuote,
  escapeApplescript,
};
