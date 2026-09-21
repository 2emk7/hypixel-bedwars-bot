'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const ENV_PATH = path.join(__dirname, '..', '.env');

/**
 * Updates `key` in the .env file to `value`, preserving every other line.
 * Appends the line if the key isn't present yet. Creates the file if it
 * doesn't exist at all.
 */
async function updateEnvFile(key, value) {
  let contents = '';
  try {
    contents = await fs.readFile(ENV_PATH, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  let updated;
  if (pattern.test(contents)) {
    updated = contents.replace(pattern, line);
  } else if (contents.length === 0) {
    updated = `${line}\n`;
  } else {
    updated = contents.endsWith('\n') ? `${contents}${line}\n` : `${contents}\n${line}\n`;
  }

  await fs.writeFile(ENV_PATH, updated, 'utf8');
}

module.exports = { updateEnvFile };
