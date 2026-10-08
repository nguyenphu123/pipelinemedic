'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Boxes, Check, ChevronRight, CircleDot, Cloud, Code2, Download, FileCode2, GitBranch, HardDrive, History, KeyRound, LayoutDashboard, LoaderCircle, Plus, Save, Search, Server, Settings2, ShieldCheck, Sparkles, Trash2, Upload, X } from 'lucide-react';

const labels = { gitlab:'GitLab CI',jenkins:'Jenkins',github:'GitHub Actions',azure:'Azure Pipelines',circleci:'CircleCI',other:'Custom' };
const paths = { gitlab:'.gitlab-ci.yml',jenkins:'Jenkinsfile',github:'.github/workflows/ci.yml',azure:'azure-pipelines.yml',circleci:'.circleci/config.yml',other:'pipeline.yml' };
const templates = {
  gitlab:'stages:\n  - test\n\ntest:\n  stage: test\n  script:\n    - npm ci\n    - npm test',
  jenkins:"pipeline {\n  agent any\n  stages {\n    stage('Test') {\n      steps { sh 'npm ci && npm test' }\n    }\n  }\n}",
  github:'name: CI\non:\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci\n      - run: npm test',
  azure:'trigger:\n  - main\nsteps:\n  - script: npm ci\n  - script: npm test',
  circleci:'version: 2.1\njobs:\n  test:\n    docker:\n      - image: cimg/node:24.0\n    steps:\n      - checkout\n      - run: npm ci\n      - run: npm test',
  other:'# Add your pipeline configuration here\n',
};
const emptyForm = platform => ({ name:'',platform,repositoryUrl:'',configPath:paths[platform],environment:'mixed',runnerLocation:'unknown',description:'',configText:templates[platform],enabled:true,changeNote:'Configuration updated' });

function Brand() { return <span className="brand-mark"><Activity size={23} strokeWidth={2.4}/></span>; }
function Modal({ title, close, children, wide=false }) {
  const ref=useRef(null); useEffect(()=>ref.current.showModal(),[]);
  return <dialog ref={ref} className={`modal ${wide?'modal-wide':''}`} onCancel={close} onClick={e=>{if(e.target===ref.current)close();}}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={19}/></button></div>{children}</dialog>;
}

export default function PipelinesPage() {
  const [pipelines,setPipelines]=useState([]),[selected,setSelected]=useState(null),[draft,setDraft]=useState(null);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[toast,setToast]=useState('');
  const [query,setQuery]=useState(''),[platform,setPlatform]=useState('all'),[modal,setModal]=useState(null),[createDraft,setCreateDraft]=useState(emptyForm('gitlab'));
  const [accessToken,setAccessToken]=useState(''),[tokenDraft,setTokenDraft]=useState(''); const fileRef=useRef(null);
  const headers=(jsonBody=false)=>({ ...(jsonBody?{'Content-Type':'application/json'}:{}), ...(accessToken?{Authorization:`Bearer ${accessToken}`}:{}) });
  const filtered=useMemo(()=>pipelines.filter(p=>(platform==='all'||p.platform===platform)&&`${p.name} ${p.description} ${p.configPath}`.toLowerCase().includes(query.toLowerCase())),[pipelines,platform,query]);
  const dirty=selected&&draft&&JSON.stringify({...selected,versions:undefined,validation:undefined})!==JSON.stringify({...draft,versions:undefined,validation:undefined});

  useEffect(()=>{ loadPipelines(); },[accessToken]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3000);return()=>clearTimeout(t);},[toast]);
  async function api(url,options={}) { const response=await fetch(url,{...options,headers:{...headers(Boolean(options.body)),...options.headers}}); const data=response.status===204?null:await response.json(); if(!response.ok)throw new Error(data?.error||'Request failed.'); return data; }
  async function loadPipelines(preferredId) {
    setLoading(true);setError('');
    try { const data=await api('/api/pipelines');setPipelines(data.pipelines);const id=preferredId||selected?.id||data.pipelines[0]?.id;if(id)await selectPipeline(id);else{setSelected(null);setDraft(null);} }
    catch(e){setError(e.message);} finally{setLoading(false);}
  }
  async function selectPipeline(id) { try{const data=await api(`/api/pipelines/${id}`);setSelected(data.pipeline);setDraft(data.pipeline);setError('');}catch(e){setError(e.message);} }
  function edit(field,value){setDraft(current=>({...current,[field]:value}));}
  async function save() { if(!draft||saving)return;setSaving(true);setError('');try{const data=await api(`/api/pipelines/${draft.id}`,{method:'PUT',body:JSON.stringify({name:draft.name,platform:draft.platform,repositoryUrl:draft.repositoryUrl,configPath:draft.configPath,environment:draft.environment,runnerLocation:draft.runnerLocation,description:draft.description,configText:draft.configText,enabled:draft.enabled,changeNote:draft.changeNote||'Configuration updated'})});setSelected(data.pipeline);setDraft(data.pipeline);setPipelines(list=>list.map(p=>p.id===data.pipeline.id?data.pipeline:p));setToast(`Saved ${data.pipeline.name} · v${data.pipeline.version}`);}catch(e){setError(e.message);}finally{setSaving(false);} }
  async function createPipeline(e) { e.preventDefault();setSaving(true);setError('');try{const data=await api('/api/pipelines',{method:'POST',body:JSON.stringify(createDraft)});setModal(null);setCreateDraft(emptyForm('gitlab'));await loadPipelines(data.pipeline.id);setToast(`${data.pipeline.name} added to the catalog.`);}catch(e){setError(e.message);}finally{setSaving(false);} }
  async function removePipeline() { setSaving(true);try{await api(`/api/pipelines/${selected.id}`,{method:'DELETE'});setModal(null);setSelected(null);setDraft(null);await loadPipelines();setToast('Pipeline removed.');}catch(e){setError(e.message);}finally{setSaving(false);} }
  function upload(e){const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>100000){setError('Configuration files must be 100 KB or smaller.');return;}file.text().then(text=>{if(text.includes('\0'))throw new Error();edit('configText',text);edit('configPath',file.name);setToast(`Loaded ${file.name}. Save to create a revision.`);}).catch(()=>setError('Could not read this configuration file.'));}
  function download(){const url=URL.createObjectURL(new Blob([draft.configText],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download=draft.configPath.split('/').pop()||'pipeline.yml';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function setNewPlatform(value){setCreateDraft(current=>({...current,platform:value,configPath:paths[value],configText:templates[value]}));}

  return <div className="app-shell management-shell">
    <aside className="sidebar">
      <a className="brand" href="/pipelines"><Brand/><span>Pipeline<span className="brand-light">Medic</span><small>DELIVERY CONTROL PLANE</small></span></a>
      <div className="workspace-label"><span className="workspace-avatar">PM</span><span>Local workspace<small>SQLite · control plane</small></span><span className="status-dot"/></div>
      <div className="nav-caption">CONTROL PLANE</div>
      <nav aria-label="Main navigation">
        <a className="nav-item" href="/dashboard"><LayoutDashboard size={18}/><span>Dashboard</span></a>
        <a className="nav-item active" href="/pipelines"><Boxes size={18}/><span>Pipelines</span><span className="nav-count">{pipelines.length}</span></a>
        <a className="nav-item" href="/advisor"><Sparkles size={18}/><span>Advisor</span></a>
        <a className="nav-item" href="/doctor"><Activity size={18}/><span>Log sandbox</span></a>
        <button className="nav-item" onClick={()=>setModal('settings')}><Settings2 size={18}/><span>Workspace settings</span></button>
      </nav>
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={21}/><strong>Provider-safe control.</strong><p>Pipeline execution stays with your existing CI providers.</p></div><div className="sidebar-footer"><span className="version">v0.3 · CONTROL PLANE</span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><span>Control plane</span><ChevronRight size={14}/><strong>Pipelines</strong></div><div className="topbar-right"><span className="local-label"><span className="status-dot"/> Local database</span><span className="avatar">PM</span></div></header>
      <main className="management-main">
        <div className="page-heading"><div><div className="eyebrow"><span className="tiny-pulse"/> PHASE ONE · PIPELINE CATALOG</div><h1>One place for every pipeline configuration.</h1><p>Register delivery pipelines, edit their configuration and keep a local revision trail across CI providers.</p></div><button className="primary-button" onClick={()=>{setCreateDraft(emptyForm('gitlab'));setModal('create');}}><Plus size={16}/> Add pipeline</button></div>
        <div className="scope-banner"><CircleDot size={16}/><span><strong>Management scope:</strong> configuration catalog and revision history.</span><span>Run monitoring is available on the dashboard.</span><span>Evidence-linked advice is available in Advisor.</span></div>
        <div className="pipeline-workspace">
          <section className="pipeline-catalog panel" aria-label="Pipeline catalog">
            <div className="catalog-tools"><label className="search-field"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search pipelines" aria-label="Search pipelines"/></label><select value={platform} onChange={e=>setPlatform(e.target.value)} aria-label="Filter by platform"><option value="all">All providers</option>{Object.entries(labels).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></div>
            <div className="catalog-summary"><span>{filtered.length} pipeline{filtered.length===1?'':'s'}</span><span>{pipelines.filter(p=>p.enabled).length} enabled</span></div>
            <div className="pipeline-list">{loading?<div className="catalog-empty"><LoaderCircle className="spin"/>Loading catalog…</div>:filtered.length?filtered.map(item=><button key={item.id} onClick={()=>selectPipeline(item.id)} className={`pipeline-row ${selected?.id===item.id?'selected':''}`}><span className={`platform-icon ${item.platform}`}><GitBranch size={16}/></span><span className="pipeline-row-main"><strong>{item.name}</strong><small>{labels[item.platform]} · {item.configPath}</small></span><span className="pipeline-row-meta"><span className={item.enabled?'enabled':'paused'}>{item.enabled?'ENABLED':'PAUSED'}</span><small>v{item.version}</small></span></button>):<div className="catalog-empty"><Search size={20}/><strong>No pipelines found</strong><span>Change the filter or add a pipeline.</span></div>}</div>
          </section>
          <section className="config-workbench panel" aria-label="Configuration workbench">
            {!draft?<div className="workbench-empty"><FileCode2 size={32}/><h2>Select a pipeline</h2><p>Choose an item from the catalog to manage its configuration.</p></div>:<>
              <div className="workbench-heading"><div><span className="section-kicker">CONFIGURATION WORKBENCH</span><h2>{draft.name}</h2><p>{labels[draft.platform]} · {draft.configPath}</p></div><div className="workbench-actions"><button className="icon-button" onClick={download} aria-label="Download configuration"><Download size={16}/></button><button className="secondary-button danger-button" onClick={()=>setModal('delete')}><Trash2 size={14}/> Remove</button><button className="primary-button" onClick={save} disabled={!dirty||saving}>{saving?<LoaderCircle className="spin" size={15}/>:<Save size={15}/>} Save changes</button></div></div>
              <div className="detail-fields"><label>Name<input value={draft.name} onChange={e=>edit('name',e.target.value)}/></label><label>Environment<select value={draft.environment} onChange={e=>edit('environment',e.target.value)}><option value="development">Development</option><option value="staging">Staging</option><option value="production">Production</option><option value="mixed">Mixed</option></select></label><label>Runner<select value={draft.runnerLocation} onChange={e=>edit('runnerLocation',e.target.value)}><option value="on-premises">On-premises</option><option value="cloud-hosted">Cloud-hosted</option><option value="self-hosted-cloud">Self-hosted cloud</option><option value="mixed">Mixed</option><option value="unknown">Unknown</option></select></label><label className="switch-label"><input type="checkbox" checked={draft.enabled} onChange={e=>edit('enabled',e.target.checked)}/><span>Pipeline enabled</span></label><label className="wide-field">Repository URL <span>optional metadata</span><input value={draft.repositoryUrl} onChange={e=>edit('repositoryUrl',e.target.value)} placeholder="https://git.example.com/team/project"/></label><label className="wide-field">Description<input value={draft.description} onChange={e=>edit('description',e.target.value)} placeholder="What this pipeline delivers"/></label></div>
              <div className="config-toolbar"><div><FileCode2 size={15}/><input value={draft.configPath} onChange={e=>edit('configPath',e.target.value)} aria-label="Configuration path"/></div><div><span className={`validation-pill ${draft.validation?.valid?'valid':''}`}><Check size={12}/> Structural check</span><button className="icon-button" onClick={()=>fileRef.current.click()} aria-label="Upload configuration"><Upload size={15}/></button><input ref={fileRef} type="file" hidden accept=".yml,.yaml,.json,.groovy,.txt" onChange={upload}/></div></div>
              <div className="config-editor"><div className="line-gutter">{Array.from({length:Math.max(draft.configText.split('\n').length,20)},(_,i)=><span key={i}>{i+1}</span>)}</div><textarea aria-label="Pipeline configuration" spellCheck={false} maxLength={100000} value={draft.configText} onChange={e=>edit('configText',e.target.value)} onScroll={e=>{e.target.previousSibling.scrollTop=e.target.scrollTop;}}/></div>
              <div className="revision-bar"><label>Revision note<input value={draft.changeNote||''} maxLength={160} onChange={e=>edit('changeNote',e.target.value)} placeholder="What changed?"/></label><div><History size={14}/><span>Current v{draft.version}</span><span>·</span><span>{draft.versions?.length||1} saved revision{draft.versions?.length===1?'':'s'}</span></div></div>
              <p className="config-security-note"><KeyRound size={13}/> Configurations are stored as plaintext. Reference secrets from your CI provider; do not paste credential values here.</p>
              <details className="revision-history"><summary><History size={14}/> Revision history</summary>{draft.versions?.map(v=><div key={v.version}><span>v{v.version}</span><strong>{v.note}</strong><time>{new Date(v.createdAt).toLocaleString()}</time></div>)}</details>
            </>}
          </section>
        </div>
        {error&&<div className="management-error" role="alert">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}
        <footer className="main-footer"><span><Brand/> Built for the people behind the pipelines.</span><span>Configuration management · SQLite persistence · no pipeline execution</span></footer>
      </main>
    </div>
    {modal==='create'&&<Modal title="Add a pipeline" close={()=>setModal(null)} wide><form className="create-form" onSubmit={createPipeline}><div className="detail-fields"><label>Name<input required minLength={2} maxLength={80} value={createDraft.name} onChange={e=>setCreateDraft({...createDraft,name:e.target.value})} placeholder="Payments API"/></label><label>CI provider<select value={createDraft.platform} onChange={e=>setNewPlatform(e.target.value)}>{Object.entries(labels).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><label>Environment<select value={createDraft.environment} onChange={e=>setCreateDraft({...createDraft,environment:e.target.value})}><option value="development">Development</option><option value="staging">Staging</option><option value="production">Production</option><option value="mixed">Mixed</option></select></label><label>Runner<select value={createDraft.runnerLocation} onChange={e=>setCreateDraft({...createDraft,runnerLocation:e.target.value})}><option value="unknown">Unknown</option><option value="on-premises">On-premises</option><option value="cloud-hosted">Cloud-hosted</option><option value="self-hosted-cloud">Self-hosted cloud</option><option value="mixed">Mixed</option></select></label><label className="wide-field">Configuration path<input required value={createDraft.configPath} onChange={e=>setCreateDraft({...createDraft,configPath:e.target.value})}/></label><label className="wide-field">Description<input maxLength={500} value={createDraft.description} onChange={e=>setCreateDraft({...createDraft,description:e.target.value})} placeholder="What this pipeline builds and deploys"/></label></div><label className="modal-editor-label">Starting configuration<textarea spellCheck={false} maxLength={100000} value={createDraft.configText} onChange={e=>setCreateDraft({...createDraft,configText:e.target.value})}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setModal(null)}>Cancel</button><button className="primary-button" disabled={saving}>{saving?<LoaderCircle className="spin" size={15}/>:<Plus size={15}/>} Add pipeline</button></div></form></Modal>}
    {modal==='delete'&&<Modal title="Remove pipeline" close={()=>setModal(null)}><p className="modal-intro">Remove <strong>{selected?.name}</strong> and its local configuration history? This does not change or delete anything in the CI provider.</p><div className="modal-actions"><button className="secondary-button" onClick={()=>setModal(null)}>Keep pipeline</button><button className="secondary-button danger-button" disabled={saving} onClick={removePipeline}><Trash2 size={14}/> Remove locally</button></div></Modal>}
    {modal==='settings'&&<Modal title="Workspace settings" close={()=>setModal(null)}><div className="modal-hero-icon"><HardDrive size={24}/></div><p className="modal-intro">Phase one stores pipeline metadata, configuration text and revision history in the local SQLite database. It does not connect to or execute your CI pipelines.</p><div className="tool-card"><Server size={17}/><p>Set <code>PIPELINEMEDIC_DB_PATH</code> to choose the SQLite file location. Mount its directory as a container volume for persistence.</p></div><div className="access-token"><label htmlFor="pipeline-token">Workspace access token <span>optional</span></label><p>Required only when the server has <code>PIPELINEMEDIC_ACCESS_TOKEN</code> configured.</p><input id="pipeline-token" type="password" autoComplete="off" value={tokenDraft} onChange={e=>setTokenDraft(e.target.value)} placeholder="Server access token"/><button className="primary-button" onClick={()=>{setAccessToken(tokenDraft);setModal(null);}}>Apply connection</button></div></Modal>}
    {toast&&<div className="toast" role="status"><Check size={15}/>{toast}</div>}
  </div>;
}
