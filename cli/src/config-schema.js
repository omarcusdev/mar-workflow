'use strict';

const VALID_KEYS = new Set([
  'review', 'review.strategy',
  'quality_gates',
  'test_framework',
  'self_heal', 'self_heal.max_retries_per_strategy', 'self_heal.max_total_retries', 'self_heal.escalation',
  'playwright', 'playwright.enabled', 'playwright.mock_backend', 'playwright.video_dir', 'playwright.dev_server',
  'dev_environment', 'dev_environment.ports', 'dev_environment.rules', 'dev_environment.start_command', 'dev_environment.stop_command',
  'branch_prefixes', 'branch_prefixes.feature', 'branch_prefixes.fix', 'branch_prefixes.refactor',
  'commit', 'commit.co_author', 'commit.prefixes',
  'shared_files',
  'protected_paths',
]);

const VALID_REVIEW_STRATEGIES = new Set(['native', 'codex']);
const VALID_PLAYWRIGHT_ENABLED = new Set(['auto', 'true', 'false', true, false]);

const validateConfig = (config) => {
  const warnings = [];

  if (config.review && config.review.strategy && !VALID_REVIEW_STRATEGIES.has(config.review.strategy)) {
    warnings.push(`Invalid review.strategy: "${config.review.strategy}" (expected: native or codex)`);
  }

  if (config.playwright && config.playwright.enabled !== undefined && !VALID_PLAYWRIGHT_ENABLED.has(config.playwright.enabled)) {
    warnings.push(`Invalid playwright.enabled: "${config.playwright.enabled}" (expected: auto, true, or false)`);
  }

  if (config.quality_gates && !Array.isArray(config.quality_gates)) {
    warnings.push('quality_gates must be an array');
  }

  return warnings;
};

module.exports = { VALID_KEYS, validateConfig };
