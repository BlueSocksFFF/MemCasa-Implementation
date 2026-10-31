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
  // Conceptual explanations of the fixed demands, not generated episode evidence.
  const taskConcepts = {
    D1: {
      title:'Carry an intention toward the right future occasion.',
      phases:[['Earlier','Make a commitment','Bind an action to an occasion.'],['In between','Keep it current','A revision replaces the old cue; cancellation removes the obligation.'],['Later','Recognize the valid cue','An unrelated or obsolete cue is not enough.'],['Decision','Act when it is due','Match this occasion to the current commitment.']],
      bridge:'A valid commitment survives the delay',
      retain:'The intended action, its current trigger, and whether the commitment is still active.',
      question:'Is this the occasion that my current commitment refers to?',
      example:'A reminder moves to a new occasion. The old occasion must no longer trigger the action.'
    },
    D2: {
      title:'Reach back to one particular occurrence.',
      phases:[['Earlier','An event occurs','Store which occurrence happened and its values.'],['In between','Correct the record','A correction changes that occurrence, not the present device state.'],['Later','Refer to that event','A request identifies which past occurrence matters.'],['Decision','Recover its values','Retrieve the corrected record for that occurrence.']],
      bridge:'An occurrence keeps its identity across time',
      retain:'Separate historical occurrences, their identifying context, and their corrected values.',
      question:'Which past occurrence is being requested, and what is its corrected record?',
      example:'Two visits used different settings. “Restore the earlier visit” requires that visit’s record, including later corrections.'
    },
    D3: {
      title:'Carry an instruction across changing contexts.',
      phases:[['Earlier','Establish a rule','Bind an instruction to the context where it applies.'],['In between','Revise its validity','Replacement or deletion changes which instructions remain in force.'],['Now','Identify the context','A specific rule may take precedence over a general one.'],['Decision','Apply the valid rule','Resolve the instruction that applies here.']],
      bridge:'Remember scope and validity, not just a value',
      retain:'Standing instructions, their context, and which versions remain valid.',
      question:'Which established instruction still applies in this context?',
      example:'A title-specific movie setting is deleted. The surviving all-movies instruction can apply again.'
    },
    D4: {
      title:'Combine partial changes into the present.',
      phases:[['Earlier','Observe some fields','Build a state from the available observations.'],['In between','Receive a partial change','Update the mentioned fields; preserve the others.'],['Now','Reconstruct the status','Combine the latest known value of every relevant field.'],['Decision','Check what is unmet','Compare the current state with the requested condition.']],
      bridge:'Each field carries forward until it changes',
      retain:'The latest state field by field, including information omitted from later updates.',
      question:'What is true now, and which requested conditions are not yet satisfied?',
      example:'Only the brightness changes. The previously observed colour remains part of the current state.'
    },
    D5: {
      title:'Turn feedback into knowledge that can be reused.',
      phases:[['Experience','Try a setting','Attempt the current permitted field.'],['Feedback','Correct or confirm','Use the outcome to establish the confirmed configuration.'],['Later','The world changes','A reset changes the device, not what was learned.'],['Decision','Reuse the learning','Recover the configuration that experience confirmed.']],
      bridge:'Confirmed knowledge survives a change in state',
      retain:'The configuration established through feedback, distinct from the device’s current values.',
      question:'What did experience confirm works for this task?',
      example:'A confirmed setting remains the learned answer even after another event changes the device.'
    },
    D6: {
      title:'Carry each goal’s progress across interruptions.',
      phases:[['Task A','Make progress','Confirm some fields and leave others unfinished.'],['Interruption','Work on task B','Keep the two tasks and their progress separate.'],['Return to A','Find the unfinished part','Resume from A’s actual progress, not B’s.'],['Decision','Continue and complete','Work on the correct next field and retain A’s learned values.']],
      bridge:'Task identity binds what is done and what remains',
      retain:'A separate identity, confirmed values, and unfinished position for each task.',
      question:'Which goal am I resuming, and what remains to be done for that goal?',
      example:'Task A pauses halfway through a configuration. Returning to A means continuing its own next field.'
    },
    D6timers: {
      title:'Keep multiple pending goals distinct.',
      phases:[['First goal','Start timer A','Associate A with its own target action.'],['Second goal','Start timer B','Keep B pending independently of A.'],['One becomes due','Match the expiry','Identify which commitment this occasion belongs to.'],['Decision','Settle that goal','Complete the due action while retaining the other pending goal.']],
      bridge:'Each pending goal keeps its own identity and occasion',
      retain:'Each timer’s identity, intended action, and independent pending or completed status.',
      question:'Which goal is due now, and which other goals are still unfinished?',
      example:'Completing the first timer’s action does not complete the second timer’s commitment.'
    }
  };
  function renderTaskStory() {
    const concept=taskConcepts[state.episode];
    $('concept-view').innerHTML=`
      <div class="panel-heading concept-heading"><div><span class="micro">THE MEMORY DEMAND</span><h4>${escape(concept.title)}</h4></div><a class="text-link" href="#shared-engine">Shared engine ↑</a></div>
      <div class="concept-map" aria-label="Conceptual relationship across time">
        <ol class="concept-phases">${concept.phases.map(([when,title,text],i)=>`<li><span class="concept-when">${escape(when)}</span><span class="concept-dot" aria-hidden="true">${i+1}</span><h5>${escape(title)}</h5><p>${escape(text)}</p></li>`).join('')}</ol>
        <div class="concept-bridge"><span aria-hidden="true">↳</span><p>${escape(concept.bridge)}</p><span aria-hidden="true">↗</span></div>
      </div>
      <dl class="concept-meaning"><div><dt>What memory must preserve</dt><dd>${escape(concept.retain)}</dd></div><div><dt>The question at decision time</dt><dd>${escape(concept.question)}</dd></div></dl>
      <div class="concept-example"><span class="micro">IN PLAIN WORDS</span><p>${escape(concept.example)}</p></div>
      <div class="concept-foot"><span>Conceptual illustration · the recorded episode is a separate view.</span><button class="text-link" id="concept-replay">See the recorded example →</button></div>`;
    $('concept-replay').addEventListener('click',()=>{selectView('replay');go(Math.min(currentDefinition().start,current().rows.length-1));});
  }

  const engineFacts={
    constraints:{title:'Task boundaries stay fixed',input:'One of the six memory demands and a supported task family.',output:'Allowed actions, lifecycle rules, scoring conditions and reserved opportunities.',detail:'The task definition says what must be remembered. It constrains the generated episode without prescribing the agent’s answers.'},
    generate:{title:'Generate a particular situation',input:'The task boundaries, a configuration and a seed.',output:'Concrete goals, preferences, world facts, historical records and controlled public wording.',detail:'Typed producers link sampled values to the observations and events that use them. Goal types and the available event grammar still come from the supported family.'},
    validate:{title:'Check that the episode is internally consistent',input:'The generated plan and its source dependencies.',output:'An admitted episode, or rejection with a specific reason.',detail:'Checks cover types, scopes, lifecycle, timing, required evidence and hidden information. Passing these checks does not establish natural-language clarity or calibrated difficulty.'},
    prepare:{title:'Keep a schedule and state for one episode',input:'An admitted plan with its generated values.',output:'Initial state, an ordered event agenda and reserved action or feedback windows.',detail:'All six demands use this architecture. Event meanings decide which state changes; the dimension label does not choose a separate runtime.'},
    event:{title:'Introduce the next event',input:'The next reserved event, its generated sources and the current task state.',output:'A report, correction, rule revision, world update, cue or request.',detail:'An event updates only the state it concerns. A historical correction changes a report; a current-state update changes the supplied device fields.'},
    observe:{title:'Reveal the public observation',input:'The event’s public content and the permitted public history.',output:'The current message, plus the history selected by the agent’s memory method.',detail:'Private source graphs, unrevealed targets and evaluation state do not enter the agent input. Observing an event does not expose the entire environment state.'},
    agent:{title:'The agent remembers and decides',input:'Public observations, its previous actions and protocol receipts.',output:'The action it actually submits: device writes, waiting or an invalid response.',detail:'The engine accepts different memory methods. Saved examples use an offline policy; the website itself does not call a model.'},
    action:{title:'Apply the submitted action',input:'The actual action and the current permissions and task context.',output:'Allowed world changes, task progress, violations and an action-legality receipt.',detail:'A legal action may still be incorrect. The engine preserves the submitted action rather than replacing it with the expected answer.'},
    feedback:{title:'Resolve what the action means',input:'The action’s effect, the active task and its current progress.',output:'Learning correction or confirmation, commitment settlement, or a private task outcome.',detail:'In learning episodes, feedback and the next unfinished field depend on the actual attempt. Public feedback arrives within already reserved turns; the engine does not invent arbitrary new goals.'},
    continue:{title:'Carry the relevant state forward',input:'Updated state and the remaining event agenda.',output:'The next scheduled event, or a completed episode with its recorded assessment and trace.',detail:'Unchanged device fields, corrected records, valid rules, pending commitments and learned progress persist according to their own semantics.'}
  };
  function renderEngineAnatomy(){
    const nodes=[['event',180,145,'Introduce an event','report · cue · request','01'],['observe',565,145,'Reveal an observation','current message + public history','02'],['agent',960,145,'Agent remembers & acts','memory method → submitted action','03'],['action',960,470,'Apply the action','writes · wait · legality receipt','04'],['feedback',565,470,'Resolve feedback & progress','correction · confirmation · outcome','05'],['continue',180,470,'Carry state forward','next event or completion','06']];
    const edges=[['public','M207 145H538'],['public','M592 145H933'],['public','M987 145H1095Q1110 145 1110 165V450Q1110 470 1090 470H987'],['public','M933 470H592'],['repeat','M538 470H207'],['repeat','M153 470H65Q45 470 45 450V165Q45 145 65 145H153'],['private','M180 172V245Q180 260 195 260H230V285'],['private','M987 480H1125Q1134 480 1134 471V327Q1134 307 1114 307H1055']];
    const states=[['Current fields','update supplied fields'],['Historical records','correct one occurrence'],['Standing rules','revise scope & validity'],['Pending intentions','track the valid trigger'],['Learning progress','confirm · pause · resume']];
    $('engine-anatomy-svg').innerHTML=`<defs>${['public','private','repeat'].map(t=>`<marker id="anatomy-arrow-${t}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M1 1L8 4.5L1 8" class="anatomy-arrow ${t}"/></marker>`).join('')}</defs><text x="90" y="36" class="map-region">ENVIRONMENT / SHARED EPISODE</text><text x="850" y="36" class="map-region">AGENT / PUBLIC INPUT</text><path d="M790 56V209" class="visibility-boundary"/><text x="790" y="230" text-anchor="middle" class="wire-caption">public information boundary</text>${edges.map(([type,path])=>`<path d="${path}" class="anatomy-wire ${type}" marker-end="url(#anatomy-arrow-${type})"/>`).join('')}<text x="580" y="265" text-anchor="middle" class="state-strip-title">EVOLVING EPISODE STATE</text><path d="M110 307H1045" class="state-spine"/>${states.map(([title,description],i)=>`<g transform="translate(${110+i*200},307)"><circle r="4" class="state-pin"/><text class="state-name" y="31">${escape(title)}</text><text class="state-description" y="55">${escape(description)}</text></g>`).join('')}<text x="580" y="586" text-anchor="middle" class="loop-note">The schedule bounds the episode. Actual actions determine its learning progress and outcomes.</text>${nodes.map(([id,x,y,title,subtitle,num])=>`<g class="anatomy-point" data-engine-node="${id}" transform="translate(${x},${y})" role="button" tabindex="0" aria-label="Inspect ${escape(engineFacts[id].title)}"><rect class="point-hit" x="-170" y="-82" width="340" height="112" fill="transparent" stroke="none"/><circle r="26"/><text class="point-number" text-anchor="middle" y="5">${num}</text><text class="point-title" text-anchor="middle" y="-57">${escape(title)}</text><text class="point-subtitle" text-anchor="middle" y="-32">${escape(subtitle)}</text></g>`).join('')}`;
    document.querySelectorAll('[data-engine-node]').forEach(node=>{node.addEventListener('click',()=>inspectEngineNode(node.dataset.engineNode));if(node.tagName.toLowerCase()==='g')node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspectEngineNode(node.dataset.engineNode);}});});
    const scroll=$('anatomy-scroll');['left','right'].forEach(direction=>$(`anatomy-${direction}`).addEventListener('click',()=>scroll.scrollBy({left:direction==='left'?-340:340,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})));
    inspectEngineNode('feedback');
  }
  function inspectEngineNode(id){
    const fact=engineFacts[id];document.querySelectorAll('[data-engine-node]').forEach(n=>n.classList.toggle('selected',n.dataset.engineNode===id));
    $('engine-node-detail').innerHTML=`<div class="engine-detail-heading"><span class="micro">INSIDE THIS STAGE</span><h4>${escape(fact.title)}</h4><p>${escape(fact.detail)}</p></div><dl><div><dt>Receives</dt><dd>${escape(fact.input)}</dd></div><div><dt>Produces</dt><dd>${escape(fact.output)}</dd></div></dl>`;
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
