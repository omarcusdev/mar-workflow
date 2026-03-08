'use strict';

const fs = require('fs');
const path = require('path');

const FRONTEND_FILE_PATTERNS = [
  /\.tsx$/,
  /\.jsx$/,
  /\.vue$/,
  /\.svelte$/,
  /\.html$/,
  /\.css$/,
  /\.scss$/,
];

const DEV_SERVER_SCRIPT_KEYS = ['dev', 'start', 'serve'];

const DEFAULT_PORT = 3000;

const readPackageJson = (projectDir) => {
  try {
    const raw = fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const extractPortFromCommand = (command) => {
  const portFlagMatch = command.match(/(?:--port|--PORT|-p)\s+(\d+)/);
  if (portFlagMatch) {
    return parseInt(portFlagMatch[1], 10);
  }

  const envPortMatch = command.match(/PORT=(\d+)/);
  if (envPortMatch) {
    return parseInt(envPortMatch[1], 10);
  }

  return DEFAULT_PORT;
};

const detectDevServer = (projectDir) => {
  const packageJson = readPackageJson(projectDir);
  if (!packageJson || !packageJson.scripts) {
    return null;
  }

  const matchingKey = DEV_SERVER_SCRIPT_KEYS.find(
    (key) => packageJson.scripts[key]
  );

  if (!matchingKey) {
    return null;
  }

  const command = packageJson.scripts[matchingKey];
  const port = extractPortFromCommand(command);

  return { command, port };
};

const detectFrontendChanges = (diffOutput) =>
  diffOutput
    .split('\n')
    .filter((line) => line.startsWith('diff --git') || line.startsWith('+++'))
    .some((line) =>
      FRONTEND_FILE_PATTERNS.some((pattern) => pattern.test(line))
    );

const generatePlaywrightConfig = (options = {}) => ({
  use: {
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    baseURL: options.baseURL || 'http://localhost:3000',
    headless: true,
  },
  outputDir: options.videoDir || '.mar/videos',
});

const generateRouteCode = ({ method, url, response }) => {
  const methodUpper = method.toUpperCase();
  const serializedResponse = JSON.stringify(response);
  return [
    `await page.route('${url}', (route, request) => {`,
    `  if (request.method() === '${methodUpper}') {`,
    `    return route.fulfill({`,
    `      status: 200,`,
    `      contentType: 'application/json',`,
    `      body: JSON.stringify(${serializedResponse})`,
    `    });`,
    `  }`,
    `  return route.continue();`,
    `});`,
  ].join('\n');
};

const generateMockRoutes = (apiCalls) =>
  apiCalls.map(generateRouteCode).join('\n\n');

module.exports = {
  detectDevServer,
  detectFrontendChanges,
  generatePlaywrightConfig,
  generateMockRoutes,
  extractPortFromCommand,
};
