'use strict';

const { runCommand, getVersion } = require('./utils');

const run = () => {
  const marVersion = getVersion();

  const claudeVersion = runCommand('claude --version 2>/dev/null') ||
                        runCommand('claude-code --version 2>/dev/null') ||
                        'not found';

  const ghVersion = runCommand('gh --version 2>/dev/null');
  const ghShort = ghVersion ? ghVersion.split('\n')[0].replace(/^gh version\s*/, 'v') : 'not found';

  console.log(`mar-workflow: v${marVersion}`);
  console.log(`claude: ${claudeVersion}`);
  console.log(`gh: ${ghShort}`);
};

module.exports = { run };
