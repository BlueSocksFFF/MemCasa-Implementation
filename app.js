/* Presentation only. All episode facts come from the Python export. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = window.MEMCASA_IMPLEMENTATION_DATA;
  if (!data?.episodes) { $('data-error').hidden = false; $('explorer').hidden = true; return; }
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const definitions = {
    D1: {name:'Later',color:'#9fc6eb',rgb:'159,198,235',theory:'Prospective memory',title:'Remember the right occasion.',description:'Hold a commitment across intervening events. Revise or cancel it when instructed, and act only when its current trigger arrives.',glyph:'↗',compiler:'Intention contract',active:['Intention'],steps:[['Commit','Bind an action to a future occasion.'],['Revise','Update the valid trigger or cancel.'],['Wait','Ignore irrelevant and obsolete cues.'],['Act on cue','Use the current commitment.']],detail:'IntentionTask tracks identity, status and trigger validity. This example revises its device cue.',start:3},
    D2: {name:'Before',color:'#e8b79d',rgb:'232,183,157',theory:'Episodic memory',title:'Remember the particular event.',description:'Keep occurrences distinct, incorporate corrections, and retrieve the requested historical configuration when asked to restore it.',glyph:'↶',compiler:'Evidence contract',active:['History'],steps:[['Record','Retain an occurrence and its values.'],['Correct','Revise that historical record.'],['Disambiguate','Select the requested occurrence.'],['Restore','Write its corrected values.']],detail:'HistoryLedger tracks records and corrections. Correcting a record does not change the present physical world.',start:17},
    D3: {name:'Rules',color:'#b1dbb1',rgb:'177,219,177',theory:'Instruction-based learning',title:'Remember which rule applies.',description:'Maintain established instructions as they are replaced or deleted. Resolve the applicable rule for the current context.',glyph:'≋',compiler:'Rule contract',active:['Rules'],steps:[['Establish','Keep general and specific rules.'],['Revise','Replace or delete an instruction.'],['Resolve','Handle context and overrides.'],['Apply','Use the rule that remains valid.']],detail:'PreferenceLedger resolves rule versions, contextual specificity and fallback inside the runtime.',start:12},
    D4: {name:'Status',color:'#c6b1e2',rgb:'198,177,226',theory:'Working-memory updating',title:'Remember what is true now.',description:'Integrate partial observations into the latest state. Preserve unchanged fields and identify what still differs from the requested condition.',glyph:'≈',compiler:'Evidence contract',active:['State'],steps:[['Observe','Receive a partial state report.'],['Update','Replace only the supplied fields.'],['Compare','Check the current condition.'],['Respond','Act on unmet fields or wait.']],detail:'StateLedger preserves field-wise state across updates. Historical values and current state have different roles.',start:12},
    D5: {name:'Learned',color:'#dfc083',rgb:'223,192,131',theory:'Feedback-supported learning',title:'Remember what experience confirmed.',description:'Learn a configuration through ordered attempts and feedback. Retain the confirmed values and reuse them after the world changes.',glyph:'✧',compiler:'Learning contract',active:['Learning'],steps:[['Attempt','Try the current permitted field.'],['Get feedback','Receive a correction or confirmation.'],['Retain','Keep the confirmed configuration.'],['Reuse','Restore it after an external reset.']],detail:'LearningTask tracks attempts and confirmed fields. The next public feedback depends on the actual submitted action.',start:3},
    D6: {name:'Unfinished',color:'#90d4d5',rgb:'144,212,213',theory:'Memory for goals',title:'Remember where each goal stands.',description:'Keep tasks and their progress separate across interruption. Resume the correct unfinished field, or act when each independent timer becomes due.',glyph:'∥',compiler:'Learning / intention contracts',active:['Learning'],steps:[['Start','Learn a task’s ordered fields.'],['Pause','Keep its identity and progress.'],['Switch','Work on a different task.'],['Resume','Continue the actual unfinished field.']],detail:'Configuration resume reuses LearningTask. The contract fixes pause/resume windows; submitted actions determine field progress.',start:43}
  };
  const mechanisms = [['Intention','IntentionTask'],['History','HistoryLedger'],['Rules','PreferenceLedger'],['State','StateLedger'],['Learning','LearningTask']];
  const state = {demand:'D5',episode:'D5',view:'engine',turn:3,source:0,timer:null};
  const current = () => data.episodes[state.episode];
  function currentDefinition() {
    if(state.episode !== 'D6timers') return definitions[state.demand];
    return {...definitions.D6,compiler:'Intention contract',active:['Intention'],steps:[['Commit','Keep independent timed commitments.'],['Track','Preserve each timer’s identity.'],['Separate','Do not merge their target actions.'],['Act when due','Respond to each expiry.']],detail:'Independent timers reuse IntentionTask. Each timer keeps its own lifecycle, target and due action.',start:10};
  }
  function stop() { clearInterval(state.timer); state.timer = null; $('play').textContent = '▶'; $('play').setAttribute('aria-label','Play recorded episode'); }
  function selectDemand(demand, episode = demand) {
    stop(); state.demand = demand; state.episode = episode; state.source = 0;
    const def = currentDefinition(); state.turn = Math.min(def.start,current().rows.length - 1);
    $('explorer').style.setProperty('--accent',def.color); $('explorer').style.setProperty('--accent-rgb',def.rgb);
    document.querySelectorAll('[data-select]').forEach(b => {const selected=b.dataset.select===demand;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
    $('demand-theory').textContent = `${demand} / ${def.theory.toUpperCase()}`;
    $('demand-title').textContent = def.title; $('demand-description').textContent = def.description; $('demand-glyph').textContent=def.glyph;
    $('family-control').hidden = demand !== 'D6'; $('family').value = episode === 'D6timers' ? 'D6timers':'D6';
    $('contract-note').textContent=def.compiler;
    $('mechanism-bank').innerHTML=mechanisms.map(([name,module])=>`<div class="mechanism ${def.active.includes(name)?'active':''}">${name}<small>${module}</small></div>`).join('');
    $('active-path').innerHTML=def.steps.map(([title,description],i)=>`<div class="path-step"><span>${i+1}</span><strong>${escape(title)}</strong><p>${escape(description)}</p></div>`).join('');
    $('mechanism-detail').textContent=def.detail;
    $('source-select').innerHTML=current().sources.map((s,i)=>`<option value="${i}">${escape(s.label)}</option>`).join('');
    $('episode-foot').textContent=`${demand} · ${current().family.replaceAll('_',' ')} · L${current().level} · seed ${current().seed} · ${current().rows.length} turns`;
    renderGraph(); setupReplay(); renderProvenance(); saveURL();
  }
  function selectView(view) {
    if (view !== 'replay') stop();
    state.view = view;
    document.querySelectorAll('[data-view]').forEach(b=>{const selected=b.dataset.view===view;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
    ['engine','source','replay'].forEach(v=>$(`panel-${v}`).hidden=v!==view); saveURL();
  }
  // This is a layout of exported edges, not a second implementation of the graph.
  function renderGraph() {
    const source = current().sources[state.source];
    $('source-description').textContent=source.detail;
    const ranks=new Map(source.nodes.map(n=>[n.id,0]));
    for(let i=0;i<source.nodes.length;i++) for(const e of source.edges) ranks.set(e.target,Math.max(ranks.get(e.target)||0,(ranks.get(e.source)||0)+1));
    const groups=[]; for(const n of source.nodes) (groups[ranks.get(n.id)]??=[]).push(n);
    const width=Math.max(760,groups.length*225+40), height=Math.max(260,Math.max(...groups.map(g=>g?.length||0))*125+70);
    const nodeWidth=190,nodeHeight=91,positions=new Map();
    groups.forEach((group,rank)=>group.forEach((n,i)=>positions.set(n.id,{x:groups.length===1?(width-nodeWidth)/2:30+rank*(width-nodeWidth-60)/(groups.length-1),y:(height-group.length*125)/2+i*125+17})));
    const svg=$('source-graph'); svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.minWidth=`${Math.min(width,1000)}px`;
    let bypass=0;
    const paths=source.edges.map(e=>{const a=positions.get(e.source),b=positions.get(e.target);let path;
      if(ranks.get(e.target)-ranks.get(e.source)>1){
        const track=height-14-(bypass++*12),ax=a.x+nodeWidth-20,bx=b.x+20;
        path=`M${ax} ${a.y+nodeHeight} V${track-8} Q${ax} ${track} ${ax+8} ${track} H${bx-8} Q${bx} ${track} ${bx} ${track-8} V${b.y+nodeHeight}`;
      }else path=`M${a.x+nodeWidth} ${a.y+nodeHeight/2} C${a.x+nodeWidth+25} ${a.y+nodeHeight/2},${b.x-25} ${b.y+nodeHeight/2},${b.x} ${b.y+nodeHeight/2}`;
      return `<path class="graph-edge" marker-end="url(#edge-arrow)" d="${path}"/>`;}).join('');
    const nodes=source.nodes.map((n,i)=>{const p=positions.get(n.id);return `<g class="graph-node ${n.tone==='fixed'?'fixed':''}" data-node="${i}" role="button" tabindex="0" aria-label="Inspect ${escape(n.title)}" transform="translate(${p.x},${p.y})"><rect width="${nodeWidth}" height="${nodeHeight}" rx="5"/><text x="14" y="18" class="node-index">${String(i+1).padStart(2,'0')} / ${n.tone==='fixed'?'CONTRACT':'GENERATED'}</text><text x="14" y="38">${escape(n.title)}</text>${n.lines.slice(0,2).map((line,j)=>`<text x="14" y="${58+j*15}" class="node-line">${escape(line.length>29?line.slice(0,28)+'…':line)}</text>`).join('')}</g>`;}).join('');
    svg.innerHTML=`<defs><marker id="edge-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,1 L7,4 L0,7" fill="none" stroke="#88a69a"/></marker></defs>${paths}${nodes}`;
    svg.querySelectorAll('[data-node]').forEach(g=>{g.addEventListener('click',()=>inspectNode(Number(g.dataset.node)));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspectNode(Number(g.dataset.node));}});});
    inspectNode(source.nodes.findIndex(n=>n.id===source.root));
  }
  function inspectNode(index) {
    const source=current().sources[state.source], n=source.nodes[Math.max(0,index)];
    $('source-graph').querySelectorAll('[data-node]').forEach(g=>g.classList.toggle('selected',source.nodes[Number(g.dataset.node)].id===n.id));
    $('node-detail').innerHTML=`<strong>${escape(n.title)}</strong><p>${n.lines.map(escape).join(' · ')}</p><code>${escape(n.id)}</code>`;
  }
  function setupReplay() {
    const e=current(),success=e.metadata.strict_success;
    $('replay-outcome').textContent=success?'Successful test learner':'Wait-only run · task failed'; $('replay-outcome').classList.toggle('success',success);
    $('replay-meta').textContent=`${e.policy==='public_only_test_learner'?'PUBLIC-INFORMATION TEST LEARNER':'WAIT-ONLY PROCEDURAL CHECK'} · ${e.family.replaceAll('_',' ')} · L${e.level} · seed ${e.seed}`;
    $('turn-range').max=e.rows.length-1;
    $('trace-strip').innerHTML=e.rows.map((r,i)=>`<button type="button" class="${r.writes.length?'write ':''}${r.feedback?'feedback':''}" data-turn="${i}" title="Turn ${r.turn}: ${escape(r.op)}${r.writes.length?' · agent writes':''}" aria-label="Go to turn ${r.turn}, ${escape(r.op)}"></button>`).join('');
    $('moments').innerHTML=e.moments.map(m=>`<button data-moment="${m.turn}"><span>T${m.turn}</span>${escape(m.label)}</button>`).join('');
    $('trace-strip').querySelectorAll('[data-turn]').forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.turn))));
    $('moments').querySelectorAll('[data-moment]').forEach(b=>b.addEventListener('click',()=>go(current().rows.findIndex(r=>r.turn===Number(b.dataset.moment)))));
    renderTurn();
  }
  function go(turn, playing=false) { if(!playing) stop(); state.turn=Math.max(0,Math.min(current().rows.length-1,turn));renderTurn();saveURL(); }
  function renderTurn() {
    const e=current(),r=e.rows[state.turn];
    $('turn-range').value=state.turn;$('turn-range').setAttribute('aria-valuetext',`Turn ${r.turn} of ${e.rows.at(-1).turn}`);
    $('turn-count').textContent=`${r.turn} / ${e.rows.at(-1).turn}`;$('operation').textContent=r.op.replace(/^_/,'').replaceAll('_',' ').toUpperCase();
    $('prev-turn').disabled=state.turn===0;$('next-turn').disabled=state.turn===e.rows.length-1;
    $('trace-strip').querySelectorAll('[data-turn]').forEach(b=>{const active=Number(b.dataset.turn)===state.turn;b.classList.toggle('current',active);if(active)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    $('moments').querySelectorAll('[data-moment]').forEach(b=>b.classList.toggle('current',Number(b.dataset.moment)===r.turn));
    $('observation-text').textContent=r.text;$('observation-kind').textContent=r.feedback?'FEEDBACK':'PUBLIC INPUT';
    $('action-list').innerHTML=r.writes.length?r.writes.map(w=>`<div class="write-row"><span>${escape(e.names[w.device]||w.device)}<small>${escape(w.field)}</small></span><b>${escape(w.value)}</b></div>`).join(''):'<p class="wait">Wait.</p><span class="micro">No device write submitted.</span>';
    $('receipt-text').textContent=r.receipt.message;
    $('inspection-title').textContent=r.inspection.title;$('inspection-summary').textContent=r.inspection.summary;
    $('inspection-table').innerHTML=`<thead><tr>${r.inspection.columns.map(c=>`<th scope="col">${escape(c)}</th>`).join('')}</tr></thead><tbody>${r.inspection.rows.map(row=>`<tr>${row.map(c=>`<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }
  function renderProvenance() {
    const e=current(); const facts=[['Snapshot',data.snapshot.date],['Generator',data.snapshot.generator_version],['Displayed evidence',`${data.validation.displayed_examples} episodes · ${data.validation.displayed_turns} turns`],['Current episode source',e.metadata.source_path],['Current source graph identity',e.metadata.source_graph_identity],['Exact saved replay',e.metadata.exact_replay],['Fresh model calls','0'],['Concept figure','Original asset preserved byte-for-byte'],['Scope of export check','Seven saved replays and source identities; the historical full suite is not rerun by the exporter.']];
    $('provenance-list').innerHTML=facts.map(([a,b])=>`<dt>${escape(a)}</dt><dd>${escape(b)}</dd>`).join('');
  }
  function saveURL() {
    const params=new URLSearchParams({demand:state.demand,view:state.view,turn:String(state.turn)}); if(state.episode==='D6timers') params.set('family','timers');
    // replaceState keeps copied links useful without creating a history entry per turn.
    try {history.replaceState(null,'',`${location.pathname}?${params}${location.hash}`);}catch{/* Local file previews may restrict history. */}
  }
  function initTabs(selector,onSelect) {
    const buttons=[...document.querySelectorAll(selector)];
    buttons.forEach((b,index)=>b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(index+1)%buttons.length;if(e.key==='ArrowLeft')next=(index-1+buttons.length)%buttons.length;if(e.key==='Home')next=0;if(e.key==='End')next=buttons.length-1;if(next!==undefined){e.preventDefault();buttons[next].focus();onSelect(buttons[next]);}}));
  }
  document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>selectDemand(b.dataset.select)));
  document.querySelectorAll('[data-demand]').forEach(b=>b.addEventListener('click',()=>{selectDemand(b.dataset.demand);selectView('engine');$('explore').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
  initTabs('[data-select]',b=>selectDemand(b.dataset.select));initTabs('[data-view]',b=>selectView(b.dataset.view));
  $('family').addEventListener('change',()=>selectDemand('D6',$('family').value));
  $('source-select').addEventListener('change',()=>{state.source=Number($('source-select').value);renderGraph();});
  $('jump-replay').addEventListener('click',()=>selectView('replay'));
  $('turn-range').addEventListener('input',()=>go(Number($('turn-range').value)));
  $('prev-turn').addEventListener('click',()=>go(state.turn-1));$('next-turn').addEventListener('click',()=>go(state.turn+1));
  $('play').addEventListener('click',()=>{if(state.timer){stop();return;}if(state.turn===current().rows.length-1)go(0);$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Pause recorded episode');state.timer=setInterval(()=>{if(state.turn>=current().rows.length-1){stop();return;}go(state.turn+1,true);},1800);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  const dialog=$('concept-dialog');$('concept-open').addEventListener('click',()=>dialog.showModal());$('concept-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close();}});
  const params=new URLSearchParams(location.search);const requested=params.get('demand');
  selectDemand(definitions[requested]?requested:'D5',requested==='D6'&&params.get('family')==='timers'?'D6timers':definitions[requested]?requested:'D5');
  if(['engine','source','replay'].includes(params.get('view')))selectView(params.get('view'));
  if(params.has('turn')&&/^\d+$/.test(params.get('turn')))go(Number(params.get('turn')));
  $('test-count').textContent=data.validation.full_suite.passed.toLocaleString('en-US');$('cell-count').textContent=data.validation.coverage.cell_count.toLocaleString('en-US');
})();
