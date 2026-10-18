import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
if (git('rev-parse', '--is-shallow-repository').trim() !== 'false') throw Error('Full history required');
const refs = git('for-each-ref', '--format=%(refname) %(objectname)').trim().split('\n');
const commits = git('rev-list', '--all').trim().split('\n');
const current = new Set(git('ls-tree', '-r', '--format=%(objectname)', 'HEAD').trim().split('\n'));
const objects = new Map();
for (const commit of commits) {
  for (const entry of git('ls-tree', '-r', '-z', commit).split('\0').filter(Boolean)) {
    const match = /^(\d+) blob ([a-f0-9]+)\t([\s\S]+)$/.exec(entry);
    if (!match) continue;
    const [, , oid, path] = match;
    if (!objects.has(oid)) objects.set(oid, { path, commit });
  }
}
const findings = [];
let scanned = 0, skippedBinary = 0, skippedLarge = 0;
for (const [oid, { path, commit }] of objects) {
  const size = Number(git('cat-file', '-s', oid));
  if (size > 2 * 1024 * 1024) { skippedLarge++; continue; }
  const content = execFileSync('git', ['cat-file', 'blob', oid], { cwd: root, maxBuffer: 3 * 1024 * 1024 });
  if (content.includes(0)) { skippedBinary++; continue; }
  scanned++;
  const seen = new Set();
  const add = (rule, line, context) => {
    const key = `${rule}:${line}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ rule, path, line, blob: oid, representativeCommit: commit,
      presentInHead: current.has(oid), context, value: '[REDACTED]' });
  };
  if (/(^|\/)\.env(\.|$)/.test(path) && !path.endsWith('.example')) add('TRACKED_ENV_FILE', 1, 'review-required');
  content.toString('utf8').split(/\r?\n/).forEach((line, i) => {
    const context = /(^|\/)(test|tests|requests|docs|tools)\//.test(path) || /example|demo/i.test(path)
      ? 'test-demo-or-documentation-review' : 'review-required';
    if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)) add('PRIVATE_KEY', i + 1, context);
    if (/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16})/.test(line)) add('PROVIDER_TOKEN_PATTERN', i + 1, context);
    if (/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(line)) add('JWT_LITERAL', i + 1, context);
    if (/\b(?:mysql|postgres(?:ql)?|mongodb(?:\+srv)?):\/\/[^\s:/]+:[^\s@]+@/i.test(line)) add('CREDENTIAL_URL', i + 1, context);
    const literals = line.matchAll(/\b(?:password|passwd|pwd|secret|jwtSecret|hashSecret|apiKey|access_token|DB_PASSWORD|JWT_SECRET|VNP_HASH_SECRET|VNP_HASHSECRET)\b["']?\s*[:=]\s*(?:process\.env\.[A-Z_]+\s*(?:\|\||\?\?)\s*)?["'`]([^"'`\r\n]{6,})["'`]/gi);
    for (const m of literals) {
      const placeholder = /^(?:replace|change.?me|your[-_ ]|<|\$\{|test[-_ ]|demo[-_ ])/i.test(m[1]);
      add(placeholder ? 'PLACEHOLDER_OR_TEST_SECRET' : 'HARDCODED_CREDENTIAL_CANDIDATE', i + 1, context);
    }
  });
}
const report = {
  timestamp: new Date().toISOString(), head: git('rev-parse', 'HEAD').trim(), refs,
  reachableCommits: commits.length, uniqueBlobs: objects.size, scannedTextBlobs: scanned,
  skippedBinary, skippedLarge, findings,
  scope: 'All commits reachable from fetched local refs; unique text blobs <=2 MiB. No credential values are emitted.',
  limitations: 'Heuristic scan, not proof of absence. Binary/large blobs, unreachable/deleted remote refs, untracked files and encoded secrets are not inspected. Never tests credentials against providers.',
};
const output = resolve(root, 'docs/bm11');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'scan-redacted.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ timestamp: report.timestamp, head: report.head, reachableCommits: commits.length,
  uniqueBlobs: objects.size, scannedTextBlobs: scanned, skippedBinary, skippedLarge,
  candidates: findings.length, currentBlobCandidates: findings.filter(x => x.presentInHead).length,
  report: 'docs/bm11/scan-redacted.json' }, null, 2));
