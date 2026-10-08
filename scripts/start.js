import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const server = new URL('.next/standalone/server.js', root);
if (!existsSync(server)) throw new Error('Run npm run build before npm start.');
cpSync(new URL('.next/static', root), new URL('.next/standalone/.next/static', root), { recursive: true });
if (existsSync(new URL('public', root))) cpSync(new URL('public', root), new URL('.next/standalone/public', root), { recursive: true });
const portIndex = process.argv.indexOf('--port');
if (portIndex !== -1) {
  const port = Number(process.argv[portIndex + 1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('--port must be between 1 and 65535.');
  process.env.PORT = String(port);
}
process.env.HOSTNAME ||= '127.0.0.1';
process.chdir(fileURLToPath(root));
await import(server.href);
