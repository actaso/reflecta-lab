#!/usr/bin/env node
/*
 * CLI to manually trigger insight extraction for a specific user/session.
 * Usage: npm run trigger:insights
 */

const prompts = require('prompts');
const https = require('https');
const http = require('http');
const path = require('path');

// Load local env for CLI usage (e.g., ADMIN_MANUAL_SECRET)
try {
  // Prefer .env.local in project root; fall back to .env
  const dotenv = require('dotenv');
  const projectRoot = path.resolve(__dirname, '..');
  const localPath = path.join(projectRoot, '.env.local');
  const envPath = path.join(projectRoot, '.env');
  dotenv.config({ path: localPath });
  dotenv.config({ path: envPath });
} catch (_) {
  // dotenv is optional; script can still work if env is set externally
}

async function main() {
  try {
    console.log('\nManual Insight Extraction Trigger');
    console.log('--------------------------------');

    const { env } = await prompts({
      type: 'select',
      name: 'env',
      message: 'Environment',
      choices: [
        { title: 'local (http://localhost:3000)', value: 'local' },
        { title: 'production (https://labs.reflecta.so)', value: 'production' },
      ],
      initial: 0,
    });

    const baseUrl = env === 'production' ? 'https://labs.reflecta.so' : 'http://localhost:3000';

    const { sessionId } = await prompts([
      { type: 'text', name: 'sessionId', message: 'Session ID', validate: (v) => (v && v.trim().length > 0 ? true : 'Required') },
    ]);

    const adminSecret = process.env.ADMIN_MANUAL_SECRET;

    if (!sessionId) {
      console.error('Error: sessionId is required.');
      process.exit(1);
    }
    if (!adminSecret) {
      console.error('Error: ADMIN_MANUAL_SECRET is not set. Add it to .env.local or export it in your shell.');
      process.exit(1);
    }

    const payload = JSON.stringify({ sessionId });
    const url = new URL('/api/coaching/insightExtractor', baseUrl);

    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-admin-manual-secret': adminSecret,
      },
    };

    console.log(`\nTriggering insight extraction...\nPOST ${url.toString()}`);
    await new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
          try {
            const parsed = JSON.parse(data);
            console.log(`Status: ${res.statusCode}`);
            console.log('Response:', JSON.stringify(parsed, null, 2));
            ok ? resolve() : reject(new Error(parsed?.error || `HTTP ${res.statusCode}`));
          } catch (_) {
            console.log(`Status: ${res.statusCode}`);
            console.log('Raw response:', data);
            ok ? resolve() : reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    console.log('\n✅ Trigger completed');
  } catch (err) {
    console.error('\n❌ Trigger failed:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();


