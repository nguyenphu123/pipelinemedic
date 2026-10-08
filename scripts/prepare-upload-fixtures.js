import { mkdir, writeFile } from 'node:fs/promises';
const directory = new URL('../.test-artifacts/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('upload.log', directory), 'TOKEN=synthetic-upload-secret\nnpm: not found\n');
await writeFile(new URL('oversized.log', directory), 'x'.repeat(100001));
await writeFile(new URL('binary.log', directory), new Uint8Array([65, 0, 66, 0, 67]));
console.log('Prepared three synthetic upload fixtures in .test-artifacts/.');
