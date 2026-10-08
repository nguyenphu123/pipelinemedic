import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';

const root=resolve(import.meta.dirname,'..'),source=join(root,'demo','frames'),prepared=join(root,'demo','prepared');
await mkdir(prepared,{recursive:true});
const width=1280,height=720;
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const cursor=(x,y)=>({input:Buffer.from(`<svg width="52" height="52" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="22" r="18" fill="#73e2b833" stroke="#73e2b8" stroke-width="2"/><circle cx="22" cy="22" r="5" fill="#effff8"/><path d="M25 27l9 10" stroke="#effff8" stroke-width="3" stroke-linecap="round"/></svg>`),left:x-22,top:y-22});
const captionSvg=(step,caption)=>Buffer.from(`<svg width="1280" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="1280" height="64" fill="#0b1012ed"/><rect x="0" width="5" height="64" fill="#73e2b8"/><text x="28" y="25" fill="#73e2b8" font-family="Segoe UI,Arial" font-size="12" font-weight="700" letter-spacing="1.4">PRODUCT DEMO · ${escape(step)}</text><text x="28" y="48" fill="#e9efed" font-family="Segoe UI,Arial" font-size="19" font-weight="600">${escape(caption)}</text><text x="1225" y="39" text-anchor="end" fill="#69777a" font-family="Consolas,monospace" font-size="11">PIPELINEMEDIC</text></svg>`);
const callout=(label,x,y)=>{
  const calloutWidth=Math.min(300,Math.max(150,label.length*8+34));
  return {input:Buffer.from(`<svg width="${calloutWidth+12}" height="52" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${calloutWidth}" height="40" rx="8" fill="#101719ee" stroke="#73e2b8"/><circle cx="18" cy="21" r="5" fill="#73e2b8"/><text x="31" y="26" fill="#effff8" font-family="Segoe UI,Arial" font-size="14" font-weight="600">${escape(label)}</text><path d="M22 41l8 10 7-10" fill="#101719" stroke="#73e2b8" stroke-linejoin="round"/></svg>`),left:x,top:y};
};
const scenes=[
  ['01-dashboard.png','01','Start from one health view across GitLab, Jenkins and GitHub Actions',9,1147,143,'3 providers • 1 health view',790,184],
  ['01-dashboard.png','02','Read the success rate, open failures and average duration together',9,868,326],
  ['01-dashboard.png','03','Use recent trends and recurring signals to choose what to investigate',9,1048,516],
  ['02-run-evidence.png','04','Open GitLab run #48 directly from the central failure inbox',9,384,303,'Failure inbox → run context',276,200],
  ['02-run-evidence.png','05','Keep the synthetic label, branch, commit and runner context visible',9,841,241],
  ['03-advisor-result.png','06','Run local rules first: the UI clearly says this result is not AI',9,1078,302,'Rules mode • no AI call',938,196],
  ['04-evidence-highlight.png','07','Follow citation L5 back to the exact denied registry operation',9,750,359,'Citation → exact log line',875,392],
  ['09-second-run.png','08','Switch providers without changing the investigation workflow',9,376,353],
  ['10-config-evidence.png','09','Compare the failed job with its matching GitHub Actions config',9,644,360],
  ['11-runtime-result.png','10','Identify a missing runtime while keeping the advice read-only',9,1077,332,'Advice only • no commands',934,205],
  ['12-runtime-highlight.png','11','Trace the finding to line 4: npm is unavailable on this runner',9,713,342],
  ['05-config-catalog.png','12','Manage provider-neutral configuration from the same control plane',9,378,402],
  ['06-config-review.png','13','Draft a configuration change and a human-readable revision note',9,684,354,'Draft stays unsaved',928,82],
  ['13-revision-history.png','14','Review saved configuration history before making another change',9,901,581],
  ['07-log-sandbox.png','15','Paste or upload a failed stage that has not been ingested yet',9,518,522],
  ['14-sandbox-result.png','16','Export the same evidence-linked diagnosis from the ad hoc sandbox',9,1050,390,'Evidence + verification steps',922,190],
  ['15-mcp-modal.png','17','Give assistants four read-only MCP tools for runs and diagnosis',9,655,360,'4 read-only MCP tools',715,128],
  ['08-dashboard-final.png','18','Keep execution with the CI provider and every repair under human control',9,86,232,'Human approval stays required',914,198],
];

async function titleCard(file,end=false){
  const eyebrow=end?'DEMO COMPLETE':'CI/CD FAILURE DOCTOR';
  const title=end?'From failed run to verified next step.':'PipelineMedic';
  const subtitle=end?'Advice stays human-controlled. Pipeline execution stays with your provider.':'A centralized control plane for pipeline health, configuration and evidence-linked advice.';
  const svg=`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101719"/><stop offset="1" stop-color="#08100d"/></linearGradient><radialGradient id="r"><stop stop-color="#73e2b8" stop-opacity=".16"/><stop offset="1" stop-color="#73e2b8" stop-opacity="0"/></radialGradient></defs><rect width="1280" height="720" fill="url(#g)"/><circle cx="980" cy="180" r="430" fill="url(#r)"/><rect x="92" y="142" width="58" height="58" rx="13" fill="#73e2b8"/><path d="M106 172h9l5-14 8 31 7-22 6 5h10" fill="none" stroke="#102a21" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><text x="92" y="255" fill="#73e2b8" font-family="Segoe UI,Arial" font-size="14" font-weight="700" letter-spacing="3">${eyebrow}</text><text x="92" y="343" fill="#f1f5f3" font-family="Segoe UI,Arial" font-size="64" font-weight="700">${title}</text><text x="92" y="405" fill="#a9b4b2" font-family="Segoe UI,Arial" font-size="22">${subtitle}</text><line x1="92" y1="480" x2="1188" y2="480" stroke="#263330"/><text x="92" y="530" fill="#7e8c89" font-family="Consolas,monospace" font-size="15">SYNTHETIC DATA · READ-ONLY OPERATIONS · NO AUTOMATIC REPAIRS</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}

const files=[];
const title=join(prepared,'00-title.png');await titleCard(title);files.push([title,5]);
let index=1;
for(const [name,step,caption,duration,x,y,note,noteX,noteY] of scenes){
  const out=join(prepared,`${String(index++).padStart(2,'0')}-${name}`);
  const base=await sharp(join(source,name)).resize(width,height,{fit:'contain',background:'#0b0f11'}).png().toBuffer();
  const overlays=[cursor(x,y),{input:captionSvg(step,caption),left:0,top:height-64}];
  if(note)overlays.push(callout(note,noteX,noteY));
  await sharp(base).composite(overlays).png().toFile(out);
  files.push([out,duration]);
}
const end=join(prepared,'99-end.png');await titleCard(end,true);files.push([end,5]);
const concat=files.flatMap(([file,duration])=>[`file '${file.replaceAll("'","'\\''")}'`,`duration ${duration}`]);
concat.push(`file '${files.at(-1)[0].replaceAll("'","'\\''")}'`);
const listFile=join(prepared,'frames.txt');await writeFile(listFile,concat.join('\n'));
const output=join(root,'demo','pipelinemedic-demo.mp4');
const result=spawnSync(ffmpegPath,['-y','-f','concat','-safe','0','-i',listFile,'-vf',`fps=30,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,'-c:v','libx264','-preset','medium','-crf','20','-movflags','+faststart',output],{stdio:'inherit'});
if(result.status!==0)throw new Error(`ffmpeg exited with status ${result.status}`);
console.log(`Wrote ${output}`);
