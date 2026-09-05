import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('public/assets');
for (const name of fs.readdirSync(root)) {
  const p = path.join(root, name);
  if (!fs.statSync(p).isFile()) continue;
  const b = fs.readFileSync(p);
  const head = b.subarray(0, 120).toString('utf8');
  console.log(`${name}: ${b.length} bytes${/<!DOCTYPE html|Attention Required|Cloudflare/i.test(head) ? '  <-- HTML/BLOQUEIO' : ''}`);
}
