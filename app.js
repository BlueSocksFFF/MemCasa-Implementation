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
    D4: {name:'Status',color:'#c6b1e2',rgb:'198,177,226',theory:'Working-memory updating',title:'Remember what is true now.',description:'Integrate partial observations into the latest state. Preserve unchanged fields and identify what still differs from the requested condition.',glyph:'≈',compiler:'Evidence contract',active:['State'],steps:[['Observe','Receive a partial state report.'],['Update','Replace only the supplied fields.'],['Compare','Check the current condition.'],['Respond','Act on unmet fields or wait.']],detail:'Partial updates change _world field by field. StateLedger is a temporary view used when checking a request.',start:12},
    D5: {name:'Learned',color:'#dfc083',rgb:'223,192,131',theory:'Feedback-supported learning',title:'Remember what experience confirmed.',description:'Learn a configuration through ordered attempts and feedback. Retain the confirmed values and reuse them after the world changes.',glyph:'✧',compiler:'Learning contract',active:['Learning'],steps:[['Attempt','Try the current permitted field.'],['Get feedback','Receive a correction or confirmation.'],['Retain','Keep the confirmed configuration.'],['Reuse','Restore it after an external reset.']],detail:'LearningTask tracks attempts and confirmed fields. The next public feedback depends on the actual submitted action.',start:3},
    D6: {name:'Unfinished',color:'#90d4d5',rgb:'144,212,213',theory:'Memory for goals',title:'Remember where each goal stands.',description:'Keep tasks and their progress separate across interruption. Resume the correct unfinished field, or act when each independent timer becomes due.',glyph:'∥',compiler:'Learning contract',active:['Learning'],steps:[['Start','Learn a task’s ordered fields.'],['Pause','Keep its identity and progress.'],['Switch','Work on a different task.'],['Resume','Continue the actual unfinished field.']],detail:'Configuration resume reuses LearningTask. The contract fixes pause/resume windows; submitted actions determine field progress.',start:43}
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
    renderTaskStory();
    $('source-select').innerHTML=current().sources.map((s,i)=>`<option value="${i}">${escape(s.label)}</option>`).join('');
    $('episode-foot').textContent=`${demand} · ${current().family.replaceAll('_',' ')} · L${current().level} · seed ${current().seed} · ${current().rows.length} turns`;
    renderGraph(); setupReplay(); renderProvenance(); saveURL();
  }
  const taskStories = {
    D1:{title:'Keep the revised commitment until its valid cue.',text:'The original occasion can be replaced. Remember the current commitment so that an obsolete cue is ignored and the valid cue leads to the requested action.',turns:[3,4,7],code:'IntentionTask.commit() → revise() → signal() → settle()'},
    D2:{title:'Keep the corrected version of one past occurrence.',text:'A later correction replaces a value in one specific historical occurrence. At the restoration request, retrieve that corrected record. Tracking only current device state would lose the required information.',turns:[17,18,33],code:'HistoryLedger.report() → correct() → recover()'},
    D3:{title:'Keep the instruction that is still applicable.',text:'A special rule is replaced, then deleted. The later request must use the remaining applicable rule. Remembering the latest value alone is not enough; its scope and validity matter.',turns:[9,12,15,16],code:'PreferenceLedger.replace_rule() → delete_rule() → resolve()'},
    D4:{title:'Keep the latest value of each field.',text:'Partial updates replace only the fields they mention. At the final request, compare the reconstructed current state with the target and identify what is still unmet.',turns:[2,10,12],code:'_apply_fact() → _world → StateLedger(...).unmet()'},
    D5:{title:'Carry confirmed learning into a later request.',text:'A legal attempt can be wrong. Use the public correction, retain the confirmed fields, and reuse them after an external reset.',turns:[3,4,34,42],code:'LearningTask.attempt() → reserved feedback → reuse()'},
    D6:{title:'Keep each unfinished task’s place and learned values.',text:'Pausing one task does not erase its progress. Resume the correct unfinished field, then reuse that task’s confirmed configuration when requested.',turns:[13,14,43,123],code:'LearningTask.next_slot() → attempt() → reuse()'},
    D6timers:{title:'Keep independent commitments separate.',text:'Each timer belongs to its own target action. The first expiry does not complete the second task; each commitment must be matched to its own occasion.',turns:[10,11,34,35],code:'IntentionTask.commit() → signal() → settle()'}
  };
  function renderTaskStory() {
    const story=taskStories[state.episode],e=current();
    $('task-story').style.setProperty('--story-count',story.turns.length);
    $('task-story-title').textContent=story.title;$('task-story-explanation').textContent=story.text;
    $('task-story').innerHTML=story.turns.map(turn=>{const r=e.rows.find(row=>row.turn===turn),m=e.moments.find(moment=>moment.turn===turn);const writes=r.writes.length?r.writes.slice(0,2).map(w=>`${e.names[w.device]||w.device} · ${w.field} = ${w.value}`).join('; ')+(r.writes.length>2?` (+${r.writes.length-2} more fields)`:''):'Wait — no device write.';return `<li><span class="story-turn">T${turn}</span><h5>${escape(m?.label||r.op)}</h5><p>${escape(r.text.length>190?r.text.slice(0,187)+'…':r.text)}</p><div class="story-action"><span>ACTUAL ACTION</span><p>${escape(writes)}</p></div><button data-story-turn="${turn}">Inspect this turn ↗</button></li>`;}).join('');
    $('task-story-result').textContent=e.policy==='public_only_test_learner'?'Public-information test learner · task succeeded. This is a saved software example.':'Wait-only procedural run · task failed as expected. The timeline shows the memory requirement and the actual waiting actions.';
    $('task-code-detail').innerHTML=`<code>${escape(story.code)}</code><p>${escape(currentDefinition().detail)}</p><p>These operations share EpisodeSession. The task’s event operations and action roles select the relevant behavior.</p>`;
    $('task-story').querySelectorAll('[data-story-turn]').forEach(button=>button.addEventListener('click',()=>{selectView('replay');go(e.rows.findIndex(row=>row.turn===Number(button.dataset.storyTurn)));}));
  }
  const engineFacts={
    compile:{title:'Compile the family contract, then generate values',file:'benchmark/generated_plan.py · compile_generated_plan()',input:'Configuration: dimension, family, variant, level and seed.',output:'A bounded episode plan, sampled preferences/world values, and a typed source graph.',detail:'The generator calls compile_episode_plan() internally. It selects one of four existing contract compilers: intention_plan, evidence_plan, rule_plan or learning_plan. The six task definitions stay fixed.'},
    source:{title:'Resolve where each generated event comes from',file:'benchmark/generated_plan.py · production_trace() / materialize_node()',input:'Typed producers and references between their outputs.',output:'Private goals, world snapshots, selected observations, rendered public text and assembled events.',detail:'Examples of actual producer paths: sample_facts → select_goal, and sample_facts → world_snapshot → observe → render → assemble_event. These source dependencies are distinct from the actual execution event graph.'},
    admit:{title:'Reject an invalid episode before running it',file:'benchmark/generation_admission.py · admit_generated_plan()',input:'The generated plan and its source graph.',output:'An admission report, or rejection with a reason.',detail:'Checks include types, scopes, reserved windows, lifecycle, dependencies and target visibility. This check does not call the generator to rebuild the answer.'},
    session:{title:'Initialize the shared interpreter',file:'benchmark/episode_runtime.py · EpisodeSession(plan)',input:'One admitted plan.',output:'An ordered _agenda, _world, _history, _preferences, _intentions and _tasks.',detail:'The session owns these private states. It dispatches by event operation and action role, not by choosing a separate engine for D1–D6.'},
    advance:{title:'Take the next reserved event',file:'benchmark/episode_runtime.py · advance()',input:'The next item in _agenda and the current task state.',output:'A materialized event, state updates from that event, and public {turn, text}.',detail:'production_trace() and materialize_node() resolve its source values. Report, correction, rule, state, trigger and learning operations update the relevant state. Learning feedback is emitted on its reserved later turn.'},
    observation:{title:'Expose only the public observation',file:'benchmark/episode_runtime.py · observation()',input:'The current public view prepared by advance().',output:'{turn, text}; no private target, task progress or assessment.',detail:'advance() returns this public view. observation() is its read-only accessor, including when resuming a prepared turn; it does not advance the world again.'},
    context:{title:'Select history and build the actor input',file:'baselines/memory.py · payload() → baselines/actor.py · request_spec()',input:'Current public observation, earlier public messages, and own actions/protocol receipts.',output:'A public-only request using none, raw_history, window or retrieval.',detail:'The experiment adapter calls these functions. Private plans, the source graph, unrevealed private target values and scores are excluded from the actor input.'},
    persist:{title:'Save the response before applying it',file:'execution/store.py · RunStore.call()',input:'The actor request and an offline or provider transport.',output:'A durable request and raw response in SQLite.',detail:'This is the experiment path. A received response is saved before decoding/applying it, so recovery can reuse the same response. Prepared and applied checkpoints are saved around the turn.'},
    decode:{title:'Preserve the action that was actually submitted',file:'execution/shared_episode.py · _record() → interpret()',input:'The saved raw response.',output:'Submitted writes or wait, retaining invalid attempts instead of silently converting them into a free wait.',detail:'Decode the response, check its action protocol, and call session.step(submitted). No reference action is substituted for the actor’s response.'},
    step:{title:'Apply the submitted action',file:'benchmark/episode_runtime.py · step(submitted)',input:'Writes, wait, or an invalid submitted packet; current event/action context.',output:'World/task updates and a legality receipt; private assessment is separate.',detail:'Calls attempts, query checks, intention settlement or reuse as appropriate. A legal write can still be wrong. In learning tasks, its outcome supplies correction or confirmation for a reserved later public turn.'},
    state:{title:'Update the state that this operation requires',file:'benchmark/episode_runtime.py · event op / context.role dispatch',input:'Scheduled operations from advance(), or actions from step().',output:'Updated world fields, historical records, standing rules, commitments or learning progress.',detail:'See the state branches below. StateLedger is constructed temporarily from _world for condition/unmet checks; it is not a separate persistent session store.'},
    result:{title:'Finalize the episode and save its evidence',file:'execution/shared_episode.py · _result() → RunStore.complete_episode()',input:'The completed session and its recorded actions.',output:'assessment() + public_history() + event_graph(), with the final stored result.',detail:'The experiment adapter additionally maintains SQLite requests/responses and prepared/applied checkpoints. Standalone replays use the same session without the provider/store path.'}
  };
  function renderEngineAnatomy(){
    const nodes=[['advance',150,135,'Take next event','advance()'],['observation',440,135,'Public observation','{turn, text}'],['context',740,135,'Select public history','payload() → request_spec()'],['persist',1040,135,'Request → raw response','RunStore.call()'],['decode',1040,405,'Decode submitted action','_record() → interpret()'],['step',740,405,'Apply the action','step(submitted)'],['state',440,405,'Update internal state','event op / action role'],['result',1040,625,'At episode completion','assessment() + trace + graph']];
    const edges=[['public','M174 135H416'],['public','M464 135H716'],['public','M764 135H1016'],['public','M1064 135H1125Q1145 135 1145 155V385Q1145 405 1125 405H1064'],['public','M1016 405H764'],['private','M716 405H464'],['private','M150 159V275Q150 290 165 290H265Q280 290 280 305V385Q280 405 300 405H416'],['repeat','M740 429V580Q740 600 720 600H65Q45 600 45 580V150Q45 135 65 135H126'],['private','M764 415L825 440Q840 447 840 465V605Q840 625 860 625H1016']];
    $('engine-anatomy-svg').innerHTML=`<defs>${['public','private','repeat'].map(t=>`<marker id="anatomy-arrow-${t}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M1 1L8 4.5L1 8" class="anatomy-arrow ${t}"/></marker>`).join('')}</defs><text x="120" y="40" class="map-region">SHARED SESSION</text><text x="695" y="40" class="map-region">EXPERIMENT ADAPTER / PUBLIC INPUT ONLY</text>${edges.map(([type,path])=>`<path d="${path}" class="anatomy-wire ${type}" marker-end="url(#anatomy-arrow-${type})"/>`).join('')}<text x="180" y="260" class="wire-caption">scheduled report / rule / state / trigger</text><text x="1164" y="235" class="wire-caption" transform="rotate(90 1164 235)">saved before apply</text><text x="280" y="585" class="wire-caption repeat">next reserved turn</text><text x="865" y="590" class="wire-caption">when done</text><text x="300" y="475" class="wire-caption">_world · _history · _preferences</text><text x="300" y="498" class="wire-caption">_intentions · _tasks</text>${nodes.map(([id,x,y,title,code],index)=>`<g class="anatomy-point" data-engine-node="${id}" transform="translate(${x},${y})" role="button" tabindex="0" aria-label="Inspect ${escape(engineFacts[id].title)}"><rect class="point-hit" x="-136" y="-82" width="272" height="112" fill="transparent" stroke="none"/><circle r="23"/><text class="point-number" text-anchor="middle" y="5">${index<6?index+1:index===6?'S':'✓'}</text><text class="point-title" text-anchor="middle" y="-57">${escape(title)}</text><text class="point-code" text-anchor="middle" y="-32">${escape(code)}</text></g>`).join('')}`;
    document.querySelectorAll('[data-engine-node]').forEach(node=>{node.addEventListener('click',()=>inspectEngineNode(node.dataset.engineNode));if(node.tagName.toLowerCase()==='g')node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspectEngineNode(node.dataset.engineNode);}});});
    const scroll=$('anatomy-scroll');['left','right'].forEach(direction=>$(`anatomy-${direction}`).addEventListener('click',()=>scroll.scrollBy({left:direction==='left'?-340:340,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})));
    inspectEngineNode('advance');
  }
  function inspectEngineNode(id){
    const fact=engineFacts[id];document.querySelectorAll('[data-engine-node]').forEach(n=>n.classList.toggle('selected',n.dataset.engineNode===id));
    $('engine-node-detail').innerHTML=`<div class="engine-detail-heading"><span class="micro">SELECTED IMPLEMENTATION</span><h4>${escape(fact.title)}</h4><code>${escape(fact.file)}</code></div><dl><div><dt>Input</dt><dd>${escape(fact.input)}</dd></div><div><dt>Output</dt><dd>${escape(fact.output)}</dd></div></dl><p>${escape(fact.detail)}</p>`;
  }
  function selectView(view) {
    if (view !== 'replay') stop();
    state.view = view;
    document.querySelectorAll('[data-view]').forEach(b=>{const selected=b.dataset.view===view;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
    ['engine','source','replay'].forEach(v=>$(`panel-${v}`).hidden=v!==view); requestAnimationFrame(updateGraphNavigation); saveURL();
  }
  // This is a layout of exported edges, not a second implementation of the graph.
  function renderGraph() {
    const source = current().sources[state.source];
    $('source-description').textContent=source.detail;
    const ranks=new Map(source.nodes.map(n=>[n.id,0]));
    for(let i=0;i<source.nodes.length;i++) for(const e of source.edges) ranks.set(e.target,Math.max(ranks.get(e.target)||0,(ranks.get(e.source)||0)+1));
    const groups=[]; for(const n of source.nodes) (groups[ranks.get(n.id)]??=[]).push(n);
    const width=Math.max(760,groups.length*300+60), height=Math.max(310,Math.max(...groups.map(g=>g?.length||0))*162+100);
    const nodeWidth=260,nodeHeight=124,positions=new Map();
    groups.forEach((group,rank)=>group.forEach((n,i)=>positions.set(n.id,{x:groups.length===1?(width-nodeWidth)/2:30+rank*(width-nodeWidth-60)/(groups.length-1),y:(height-group.length*162)/2+i*162+15})));
    const svg=$('source-graph'); svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.minWidth=`${width}px`;svg.style.width=`${width}px`;
    let bypass=0;
    const paths=source.edges.map(e=>{const a=positions.get(e.source),b=positions.get(e.target);let path;
      if(ranks.get(e.target)-ranks.get(e.source)>1){
        const track=height-14-(bypass++*12),ax=a.x+nodeWidth-20,bx=b.x+20;
        path=`M${ax} ${a.y+nodeHeight} V${track-8} Q${ax} ${track} ${ax+8} ${track} H${bx-8} Q${bx} ${track} ${bx} ${track-8} V${b.y+nodeHeight}`;
      }else path=`M${a.x+nodeWidth} ${a.y+nodeHeight/2} C${a.x+nodeWidth+25} ${a.y+nodeHeight/2},${b.x-25} ${b.y+nodeHeight/2},${b.x} ${b.y+nodeHeight/2}`;
      return `<path class="graph-edge" marker-end="url(#edge-arrow)" d="${path}"/>`;}).join('');
    const nodes=source.nodes.map((n,i)=>{const p=positions.get(n.id);return `<g class="graph-node ${n.tone==='fixed'?'fixed':''}" data-node="${i}" role="button" tabindex="0" aria-label="Inspect ${escape(n.title)}" transform="translate(${p.x},${p.y})"><rect width="${nodeWidth}" height="${nodeHeight}" rx="5"/><text x="16" y="25" class="node-index">${String(i+1).padStart(2,'0')} / ${n.tone==='fixed'?'CONTRACT':'GENERATED'}</text><text x="16" y="53">${escape(n.title)}</text>${n.lines.slice(0,2).map((line,j)=>`<text x="16" y="${80+j*21}" class="node-line">${escape(line.length>29?line.slice(0,28)+'…':line)}</text>`).join('')}</g>`;}).join('');
    svg.innerHTML=`<defs><marker id="edge-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,1 L7,4 L0,7" fill="none" stroke="#88a69a"/></marker></defs>${paths}${nodes}`;
    svg.querySelectorAll('[data-node]').forEach(g=>{g.addEventListener('click',()=>inspectNode(Number(g.dataset.node)));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspectNode(Number(g.dataset.node));}});});
    $('graph-scroll').scrollLeft=0;
    inspectNode(source.nodes.findIndex(n=>n.id===source.root)); requestAnimationFrame(updateGraphNavigation);
  }
  function updateGraphNavigation() {
    const graph=$('graph-scroll'); $('graph-left').disabled=graph.scrollLeft<=1; $('graph-right').disabled=graph.scrollLeft+graph.clientWidth>=graph.scrollWidth-1;
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
  document.querySelectorAll('[data-demand]').forEach(b=>b.addEventListener('click',()=>{selectDemand(b.dataset.demand);selectView('engine');$('demand-explorer-heading').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>selectView(b.dataset.view)));
  initTabs('[data-select]',b=>selectDemand(b.dataset.select));initTabs('[data-view]',b=>selectView(b.dataset.view));
  $('family').addEventListener('change',()=>selectDemand('D6',$('family').value));
  $('source-select').addEventListener('change',()=>{state.source=Number($('source-select').value);renderGraph();});
  $('graph-scroll').addEventListener('scroll',updateGraphNavigation);window.addEventListener('resize',updateGraphNavigation);
  ['left','right'].forEach(direction=>$(`graph-${direction}`).addEventListener('click',()=>$('graph-scroll').scrollBy({left:direction==='left'?-320:320,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})));
  $('turn-range').addEventListener('input',()=>go(Number($('turn-range').value)));
  $('prev-turn').addEventListener('click',()=>go(state.turn-1));$('next-turn').addEventListener('click',()=>go(state.turn+1));
  $('play').addEventListener('click',()=>{if(state.timer){stop();return;}if(state.turn===current().rows.length-1)go(0);$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','Pause recorded episode');state.timer=setInterval(()=>{if(state.turn>=current().rows.length-1){stop();return;}go(state.turn+1,true);},1800);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  const dialog=$('concept-dialog');$('concept-open').addEventListener('click',()=>dialog.showModal());$('concept-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)dialog.close();}});
  renderEngineAnatomy();
  const params=new URLSearchParams(location.search);const requested=params.get('demand');
  selectDemand(definitions[requested]?requested:'D5',requested==='D6'&&params.get('family')==='timers'?'D6timers':definitions[requested]?requested:'D5');
  if(['engine','source','replay'].includes(params.get('view')))selectView(params.get('view'));
  if(params.has('turn')&&/^\d+$/.test(params.get('turn')))go(Number(params.get('turn')));
  $('test-count').textContent=data.validation.full_suite.passed.toLocaleString('en-US');$('cell-count').textContent=data.validation.coverage.cell_count.toLocaleString('en-US');
})();
