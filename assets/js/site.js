(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let DATA={};
function arr(name){ return Array.isArray(DATA[name])?DATA[name]:[]; }
function settings(){ return DATA.settings||{}; }
function val(v,f=''){ return v===undefined||v===null||v===''?f:v; }
function yes(v){ return String(v||'').toUpperCase()==='YES'||v===true; }
function parseDate(d){ if(!d)return null; const m=String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); if(m)return new Date(+m[1],+m[2]-1,+m[3]); const x=new Date(d); return isNaN(x)?null:x; }
function parseTime(t){ if(!t)return {h:0,m:0}; let s=String(t).trim(); if(/^1899-12-30/.test(s)){const d=new Date(s);return {h:d.getHours(),m:d.getMinutes()};} let m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i); if(!m)return {h:0,m:0}; let h=+m[1],min=+m[2],ap=(m[3]||'').toUpperCase(); if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;return {h,m:min}; }
function eventDateTime(e){ const d=parseDate(e.Date); if(!d)return null; const t=parseTime(e.Time); d.setHours(t.h,t.m,0,0); return d; }
function dateLabel(d,opts){const x=parseDate(d);return x?x.toLocaleDateString(undefined,opts||{weekday:'short',month:'short',day:'numeric',year:'numeric'}):'';}
function daysUntil(d){const x=parseDate(d);if(!x)return '';const today=new Date();today.setHours(0,0,0,0);return Math.ceil((x-today)/86400000);}
function imageUrl(v,f='assets/img/storm-logo.svg',width){
  const raw=String(val(v,f)||'').trim();
  if(!raw)return f;
  if(!width)return raw;

  const w=Math.max(120,Math.min(1800,Math.round(Number(width)||1000)));

  try{
    const u=new URL(raw);
    const host=u.hostname.replace(/^www\./,'').toLowerCase();

    // Older Drive thumbnail format.
    if(host==='drive.google.com' && u.pathname==='/thumbnail' && u.searchParams.get('id')){
      u.searchParams.set('sz','w'+w);
      return u.toString();
    }

    // Current Storm HQ photo delivery format:
    // https://lh3.googleusercontent.com/d/FILE_ID=w1600
    // Replace an existing width suffix instead of appending a second one.
    if(host==='lh3.googleusercontent.com' && /^\/d\//.test(u.pathname)){
      const cleanPath=u.pathname.replace(/=w\d+(?:-[a-z0-9-]+)?$/i,'');
      return u.origin+cleanPath+'=w'+w;
    }
  }catch(e){}

  return raw;
}

function statForPlayer(p){
  if(!p || String(p.ShowStats||'YES').toUpperCase()==='NO') return null;
  return arr('playerStats').find(s=>String(s.PlayerID)===String(p.PlayerID))||null;
}
function statValue(v,f='—'){return v===undefined||v===null||v===''?f:String(v);}
function isPitcherPlayer(p){
  const pos=String(p?.Positions||'').trim();
  if(!pos)return false;
  return /\bpitch(?:er)?\b/i.test(pos) || /(^|[\s,;/|])P($|[\s,;/|])/i.test(pos);
}
function statThousandth(v,f='—'){
  if(v===undefined||v===null||String(v).trim()==='')return f;
  const n=Number(v);
  if(!Number.isFinite(n))return String(v);
  return n.toFixed(3).replace(/^0(?=\.)/,'');
}
function statDisplay(label,v){
  return ['AVG','OBP','OPS','SLG','FPCT'].includes(String(label||'').toUpperCase())
    ? statThousandth(v)
    : statValue(v);
}
function hasStat(v){return !(v===undefined||v===null||v==='');}
function stormInningsValue(v){
  if(v===undefined||v===null||String(v).trim()==='')return null;
  const s=String(v).trim();

  // GameChanger notation: 2.1 = 2 innings + 1 out = 2 1/3.
  const m=s.match(/^(\d+)\.([012])$/);
  if(m)return Number(m[1])+(Number(m[2])/3);

  const n=Number(s);
  return Number.isFinite(n)?n:null;
}
function stormEraValue(s){
  if(!s)return '—';
  const er=Number(s.Pit_ER);
  const ip=stormInningsValue(s.Pit_IP);

  // 2 Out Storm fall-ball ERA = (Earned Runs x 2) / Innings Pitched.
  if(Number.isFinite(er) && ip!==null && ip>0){
    return ((er*2)/ip).toFixed(3);
  }

  // Keep imported ERA only as a fallback if ER/IP are unavailable.
  return hasStat(s.Pit_ERA)?String(s.Pit_ERA):'—';
}
function playerStatLine(p){
  const s=statForPlayer(p);
  if(!s)return '';
  const batting=[['AVG',s.Bat_AVG],['OBP',s.Bat_OBP],['OPS',s.Bat_OPS],['SLG',s.Bat_SLG]];
  const pitching=[['ERA',stormEraValue(s)],['WHIP',s.Pit_WHIP],['K',s.Pit_SO],['IP',s.Pit_IP]];
  const usePitching=isPitcherPlayer(p) && [s.Pit_IP,s.Pit_ER,s.Pit_ERA,s.Pit_WHIP,s.Pit_SO].some(hasStat);
  const stats=(usePitching?pitching:batting).filter(x=>hasStat(x[1])).slice(0,4);
  if(!stats.length)return '';
  return `<div class="player-card-stats">${stats.map(([k,v])=>`<span><b>${esc(k)}</b><strong>${esc(statDisplay(k,v))}</strong></span>`).join('')}</div>`;
}
function playerStatsSection(p){
  const s=statForPlayer(p),gc=(s&&s.GameChangerURL)||p.GameChangerURL||'';
  if(!s && !gc)return '';
  const batting=s?[
    ['AVG',s.Bat_AVG],['OBP',s.Bat_OBP],['OPS',s.Bat_OPS],['SLG',s.Bat_SLG],
    ['H',s.Bat_H],['2B',s.Bat_2B],['3B',s.Bat_3B],['HR',s.Bat_HR],
    ['RBI',s.Bat_RBI],['R',s.Bat_R],['BB',s.Bat_BB],['SO',s.Bat_SO],['SB',s.Bat_SB]
  ].filter(x=>hasStat(x[1])):[];
  const pitching=(s&&isPitcherPlayer(p))?[
    ['IP',s.Pit_IP],['ERA',stormEraValue(s)],['WHIP',s.Pit_WHIP],['K',s.Pit_SO],
    ['W',s.Pit_W],['L',s.Pit_L],['BB',s.Pit_BB],['H',s.Pit_H],['ER',s.Pit_ER]
  ].filter(x=>hasStat(x[1])):[];
  const fielding=s?[
    ['FPCT',s.Fld_FPCT],['TC',s.Fld_TC],['PO',s.Fld_PO],['A',s.Fld_A],['E',s.Fld_E]
  ].filter(x=>hasStat(x[1])):[];
  const grid=(title,items)=>items.length?`<article class="glass-card storm-stat-card"><span class="kicker">${esc(title)}</span><div class="storm-stat-grid">${items.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(statDisplay(k,v))}</strong></div>`).join('')}</div></article>`:'';
  return `<section class="section storm-player-stats"><div class="shell"><div class="section-heading"><div><span class="kicker">GameChanger</span><h2>Season Stats</h2></div><p>Current season snapshot imported by the coaching staff.</p></div><div class="profile-grid">${grid('Batting',batting)}${grid('Pitching',pitching)}${grid('Fielding',fielding)}${gc?`<article class="glass-card storm-stat-card"><span class="kicker">GameChanger</span><h3>Full Player Stats</h3><p>Open this player's GameChanger page for the complete live stat view.</p><a class="button orange" href="${esc(gc)}" target="_blank" rel="noopener">View on GameChanger</a></article>`:''}</div></div></section>`;
}
function playerHighlightsSection(p){
  const vids=arr('videos').filter(v=>{
    const ids=String(v.PlayerIDs||v.PlayerID||'').split(',').map(x=>x.trim()).filter(Boolean);
    return ids.includes(String(p.PlayerID));
  });
  if(!vids.length)return '';
  return `<section class="section"><div class="shell"><div class="section-heading"><div><span class="kicker">Storm Highlights</span><h2>${esc(p.FirstName)} in Action</h2></div><p>Game clips and team moments tagged to this player.</p></div><div class="video-grid">${vids.map(v=>videoCard(v,false)).join('')}</div></div></section>`;
}
function eventHighlightsSection(eventId){
  const vids=arr('videos').filter(v=>String(v.EventID||'')===String(eventId||''));
  if(!vids.length)return '';
  return `<section class="section"><div class="shell"><div class="section-heading"><div><span class="kicker">Post-Game</span><h2>Storm Highlights</h2></div><p>Published clips and moments from this game.</p></div><div class="video-grid">${vids.map(v=>videoCard(v,false)).join('')}</div></div></section>`;
}
function injectStormEnhancementStyles(){
  if(document.getElementById('storm-stats-media-styles'))return;
  const st=document.createElement('style');
  st.id='storm-stats-media-styles';
  st.textContent=`
    body[data-page="home"] main>.section{content-visibility:auto;contain-intrinsic-size:700px}

    .gc-eye-section{position:relative;overflow:hidden}
    .gc-eye-section:before{content:"";position:absolute;width:520px;height:520px;right:-220px;top:-280px;border-radius:50%;background:radial-gradient(circle,rgba(255,107,37,.14),transparent 68%);pointer-events:none}
    .gc-eye-grid{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.18fr) minmax(310px,.82fr);gap:18px;align-items:stretch}
    .gc-eye-card{min-width:0;padding:20px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:linear-gradient(145deg,rgba(25,13,40,.97),rgba(8,6,13,.96));box-shadow:0 20px 60px rgba(0,0,0,.28)}
    .gc-eye-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
    .gc-eye-card-head h3{margin:4px 0 0;font-size:clamp(20px,2.5vw,30px)}
    .gc-live-dot{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;border:1px solid rgba(120,240,158,.38);background:rgba(120,240,158,.10);color:#bff8cf;font-size:9px;font-weight:900;letter-spacing:.12em}
    .gc-live-dot:before{content:"";width:7px;height:7px;border-radius:50%;background:#78f09e;box-shadow:0 0 12px rgba(120,240,158,.85)}
    .gc-widget-host{min-height:310px;border-radius:16px;overflow:hidden;background:#fff;color:#111}
    .gc-widget-loading{display:grid;place-items:center;min-height:310px;padding:20px;color:#5a5262;font-size:13px;font-weight:800;text-align:center}
    .gc-widget-error{display:grid;place-items:center;min-height:310px;padding:24px;text-align:center;background:linear-gradient(145deg,#fff,#f6f1f9);color:#3d3345}
    .gc-widget-error strong{display:block;margin-bottom:7px;font-size:18px}
    .gc-eye-copy{margin:-2px 0 14px;color:var(--muted);line-height:1.5}
    .gc-video-hub{display:grid;gap:10px}
    .gc-video-item{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:11px;align-items:center;padding:11px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(255,255,255,.035);text-decoration:none;color:#fff;transition:transform .18s ease,border-color .18s ease,background .18s ease}
    .gc-video-item:hover{transform:translateY(-1px);border-color:rgba(255,107,37,.48);background:rgba(255,107,37,.07)}
    .gc-video-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:linear-gradient(145deg,#ff7a2f,#8e49d7);font-size:20px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
    .gc-video-main{min-width:0}
    .gc-video-main strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}
    .gc-video-main small{display:block;margin-top:3px;color:var(--muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .gc-video-open{color:var(--orange);font-weight:900;font-size:12px}
    .gc-video-empty{padding:17px;border:1px dashed rgba(255,255,255,.15);border-radius:14px;color:var(--muted);text-align:center;font-size:12px;line-height:1.5}
    .gc-video-actions{margin-top:14px}
    @media(max-width:900px){.gc-eye-grid{grid-template-columns:1fr}.gc-widget-host,.gc-widget-loading,.gc-widget-error{min-height:280px}}
    @media(max-width:520px){.gc-eye-card{padding:14px}.gc-video-item{grid-template-columns:42px minmax(0,1fr) auto}.gc-video-icon{width:42px;height:42px}.gc-eye-card-head{align-items:center}}

    .storm-gold-badges{position:absolute;top:10px;right:10px;z-index:8;display:flex;gap:5px;align-items:center;pointer-events:none}
    .storm-gold-tornado{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;border:1px solid rgba(255,241,163,.88);background:linear-gradient(145deg,#6f4c00,#f6c845 56%,#fff0a1);box-shadow:0 3px 12px rgba(0,0,0,.38),0 0 0 2px rgba(50,23,79,.35);}
    .storm-gold-tornado svg{width:20px;height:20px;fill:#fff6bd;filter:drop-shadow(0 1px 1px rgba(96,56,0,.55))}
    .profile-photo,.player-media{position:relative}
    .profile-photo .storm-gold-badges{top:18px;right:18px;gap:7px}
    .profile-photo .storm-gold-tornado{width:38px;height:38px}
    .profile-photo .storm-gold-tornado svg{width:25px;height:25px}
    .player-card-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12)}
    .player-card-stats span{display:grid;gap:2px;min-width:0}
    .player-card-stats b{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--orange)}
    .player-card-stats strong{font-size:13px;color:#fff}
    .storm-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}
    .storm-stat-grid>div{padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.035)}
    .storm-stat-grid span{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--orange);margin-bottom:3px}
    .storm-stat-grid strong{font-size:20px;color:#fff}
    .storm-stat-card{min-height:100%}

    .storm-family-board{margin-top:22px}
    .storm-board-card{position:relative;overflow:hidden;padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:linear-gradient(145deg,rgba(19,12,31,.97),rgba(47,20,72,.91));box-shadow:0 24px 70px rgba(0,0,0,.32)}
    .storm-board-card:after{content:"";position:absolute;width:330px;height:330px;left:-160px;bottom:-190px;border-radius:50%;background:radial-gradient(circle,rgba(255,107,37,.16),transparent 69%);pointer-events:none}
    .storm-board-head{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin-bottom:18px}
    .storm-board-head h2{margin:3px 0 0;font-size:clamp(28px,4vw,46px)}
    .storm-board-head p{margin:0;color:var(--muted);max-width:560px}
    .storm-board-login{position:relative;z-index:1;display:grid;grid-template-columns:minmax(180px,1fr) minmax(150px,.55fr) auto;gap:10px;align-items:end;padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(255,255,255,.035)}
    .storm-board-field{display:grid;gap:6px}
    .storm-board-field label{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--orange)}
    .storm-board-field select,.storm-board-field input,.storm-board-compose textarea{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(0,0,0,.26);color:#fff;font:inherit;padding:11px 12px;outline:none}
    .storm-board-field select:focus,.storm-board-field input:focus,.storm-board-compose textarea:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(255,107,37,.12)}
    .storm-board-status{position:relative;z-index:1;margin-top:10px;min-height:18px;color:var(--muted);font-size:12px}
    .storm-board-status.error{color:#ff9e9e}
    .storm-board-status.success{color:#b8f7c7}
    .storm-board-shell{position:relative;z-index:1;display:none;margin-top:16px}
    .storm-board-shell.open{display:block}
    .storm-board-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
    .storm-board-who{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .storm-board-who strong{font-size:14px}
    .storm-board-live{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:rgba(142,73,215,.14);border:1px solid rgba(142,73,215,.35);font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
    .storm-board-live:before{content:"";width:7px;height:7px;border-radius:50%;background:#8ff0a4;box-shadow:0 0 10px rgba(143,240,164,.7)}
    .storm-board-actions{display:flex;gap:7px;flex-wrap:wrap}
    .storm-board-smallbtn{appearance:none;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.055);color:#fff;border-radius:999px;padding:7px 10px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}
    .storm-board-messages{display:grid;gap:9px;max-height:470px;overflow:auto;padding:3px 3px 6px}
    .storm-board-message{padding:13px 14px;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:rgba(255,255,255,.035)}
    .storm-board-message.coach{border-color:rgba(255,107,37,.42);background:linear-gradient(120deg,rgba(255,107,37,.10),rgba(255,255,255,.035))}
    .storm-board-message.pinned{box-shadow:inset 3px 0 0 var(--orange)}
    .storm-board-message-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:5px}
    .storm-board-message-head strong{font-size:13px}
    .storm-board-message-head span{color:var(--muted);font-size:10px;white-space:nowrap}
    .storm-board-message p{margin:0;color:#f6f3fb;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45}
    .storm-board-pin{font-size:10px;color:var(--orange);font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-left:7px}
    .storm-board-empty{padding:22px;text-align:center;border:1px dashed rgba(255,255,255,.14);border-radius:14px;color:var(--muted)}
    .storm-board-compose{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end;margin-top:12px}
    .storm-board-compose textarea{min-height:68px;max-height:150px;resize:vertical}
    .storm-board-closed{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(255,107,37,.1);border:1px solid rgba(255,107,37,.28);font-size:12px;color:#ffd9c8}

    .storm-board-notify{display:grid;grid-template-columns:minmax(190px,1fr) auto auto;gap:10px;align-items:end;margin:0 0 12px;padding:12px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(142,73,215,.08)}
    .storm-board-notify .storm-board-field{min-width:0}
    .storm-board-notify-toggle{display:flex;align-items:center;gap:8px;min-height:42px;padding:0 4px;font-size:12px;font-weight:800;color:#f6f3fb;white-space:nowrap}
    .storm-board-notify-toggle input{width:18px;height:18px;accent-color:var(--orange)}
    .storm-board-notify-note{grid-column:1/-1;color:var(--muted);font-size:10px;line-height:1.35}

    @media(max-width:760px){
      .storm-board-head{align-items:flex-start;flex-direction:column}
      .storm-board-login{grid-template-columns:1fr}
      .storm-board-compose{grid-template-columns:1fr}
      .storm-board-notify{grid-template-columns:1fr}
      .storm-board-card{padding:18px 12px}
      .storm-board-messages{max-height:390px}
    }
    .storm-home-calendar{margin-top:22px}
    .storm-calendar-card{position:relative;overflow:hidden;padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:linear-gradient(145deg,rgba(37,17,60,.92),rgba(8,6,13,.96));box-shadow:0 24px 70px rgba(0,0,0,.32)}
    .storm-calendar-card:before{content:"";position:absolute;width:360px;height:360px;right:-160px;top:-180px;border-radius:50%;background:radial-gradient(circle,rgba(142,73,215,.24),transparent 68%);pointer-events:none}
    .storm-calendar-head{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:18px}
    .storm-calendar-head h2{margin:3px 0 0;font-size:clamp(28px,4vw,46px)}
    .storm-calendar-head p{margin:0;color:var(--muted);max-width:520px}
    .storm-calendar-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .storm-calendar-month{min-width:170px;text-align:center;font-weight:900;letter-spacing:.04em;text-transform:uppercase}
    .storm-calendar-btn{appearance:none;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.055);color:#fff;border-radius:999px;padding:9px 13px;font:inherit;font-weight:800;cursor:pointer}
    .storm-calendar-btn:hover{border-color:var(--orange);transform:translateY(-1px)}
    .storm-calendar-legend{position:relative;z-index:1;display:flex;gap:12px;flex-wrap:wrap;margin:0 0 14px}
    .storm-calendar-legend span{display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
    .storm-calendar-legend i{width:10px;height:10px;border-radius:50%;display:inline-block}
    .storm-calendar-legend .practice{background:#9b6cff}
    .storm-calendar-legend .game{background:var(--orange)}
    .storm-calendar-legend .tournament{background:#ffd166;box-shadow:0 0 12px rgba(255,209,102,.55)}
    .storm-calendar-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
    .storm-calendar-dow{padding:8px 4px;text-align:center;color:var(--muted);font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
    .storm-calendar-day{min-height:112px;padding:9px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.03);display:flex;flex-direction:column;gap:6px}
    .storm-calendar-day.is-empty{opacity:.25;background:transparent}
    .storm-calendar-day.is-today{border-color:rgba(255,107,37,.7);box-shadow:inset 0 0 0 1px rgba(255,107,37,.24)}
    .storm-calendar-day-number{font-weight:900;font-size:13px;color:#fff}
    .storm-calendar-events{display:grid;gap:5px}
    .storm-calendar-event{display:block;padding:6px 7px;border-radius:9px;text-decoration:none;color:#fff;font-size:10px;line-height:1.2;font-weight:800;border:1px solid transparent;overflow:hidden}
    .storm-calendar-event strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .storm-calendar-event small{display:block;margin-top:2px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .storm-calendar-event.practice{background:rgba(155,108,255,.18);border-color:rgba(155,108,255,.46)}
    .storm-calendar-event.game{background:rgba(255,107,37,.17);border-color:rgba(255,107,37,.48)}
    .storm-calendar-event.tournament{background:rgba(255,209,102,.14);border-color:rgba(255,209,102,.5);color:#fff7d0}
    .storm-calendar-event.cancelled{text-decoration:line-through;opacity:.55;filter:saturate(.35)}
    .storm-calendar-more{font-size:10px;color:var(--muted);font-weight:800;padding-left:2px}
    @media(max-width:800px){
      .storm-calendar-head{align-items:flex-start;flex-direction:column}
      .storm-calendar-controls{justify-content:flex-start}
      .storm-calendar-grid{gap:4px}
      .storm-calendar-day{min-height:82px;padding:6px;border-radius:11px}
      .storm-calendar-event{padding:5px;font-size:9px}
      .storm-calendar-event small{display:none}
    }
    @media(max-width:700px){
      .player-card-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
      .storm-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .storm-calendar-card{padding:16px 10px}
      .storm-calendar-dow{font-size:8px;letter-spacing:.06em}
      .storm-calendar-day{min-height:68px}
      .storm-calendar-event{font-size:8px}
      .storm-calendar-month{min-width:auto}
    }
  `;
  document.head.appendChild(st);
}
function publicBadgeForPlayer(p){return arr('playerBadges').find(b=>String(b.PlayerID)===String(p?.PlayerID))||null}
function publicGoldTornado(label){return `<span class="storm-gold-tornado" title="${esc(label)}" aria-label="${esc(label)}"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 8c5-5 21-5 26 0-4 4-22 5-26 0Z"/><path d="M6 14c5-4 17-4 21 0-4 4-17 4-21 0Z"/><path d="M10 19c4-3 11-3 14 0-3 4-11 4-14 0Z"/><path d="M14 24c2-2 6-2 7 0-1 3-5 4-7 0Z"/></svg></span>`}
function publicStormBadges(p){const b=publicBadgeForPlayer(p);if(!b)return '';const icons=[];if(b.Homework)icons.push(publicGoldTornado('Homework Complete'));if(b.Drills)icons.push(publicGoldTornado('Drills Complete'));if(b.Attendance)icons.push(publicGoldTornado('Practice + Game Present'));return icons.length?`<div class="storm-gold-badges">${icons.join('')}</div>`:''}
function playerCard(p,showStormBadges=false){ const x=val(p.CardX,50), y=val(p.CardY,35), z=val(p.CardZoom,1); return `<a class="player-card" href="player.html?id=${encodeURIComponent(p.PlayerID)}"><div class="player-media" style="--px:${x}%;--py:${y}%;--pz:${z}"><img loading="lazy" decoding="async" fetchpriority="low" src="${esc(imageUrl(p.PhotoURL,'assets/img/storm-logo.svg',640))}" alt="${esc(p.FirstName)}">${showStormBadges?publicStormBadges(p):''}</div><div class="player-shade"></div><div class="jersey">#${esc(p.Jersey)}</div><div class="player-info"><span>${esc(p.Positions||'Storm Athlete')}</span><h3>${esc(p.FirstName)}</h3><p>${esc(p.Quote||p.SeasonGoal||'Together. Tougher.')}</p>${playerStatLine(p)}</div></a>`; }
function eventTypeClass(e){return String(e.Type||'Event').toLowerCase().replace(/[^a-z0-9]+/g,'-');}
function eventCard(e){const score=(e.ScoreUs!==''&&e.ScoreUs!=null)?`<div class="score"><strong>${esc(e.ScoreUs)}-${esc(e.ScoreThem)}</strong><span>${esc(e.Result||'Final')}</span></div>`:'';return `<article class="event-card ${eventTypeClass(e)}"><div class="event-date"><strong>${esc(dateLabel(e.Date,{month:'short',day:'numeric'}))}</strong><span>${esc(e.Time||'TBD')}</span></div><div class="event-main"><span class="storm-label">${esc(e.Type||'Event')}</span><h3>${esc(e.Title||e.Opponent||'Team Event')}</h3><p>${esc(e.Opponent?`vs. ${e.Opponent} · `:'')}${esc(e.Location||'Location TBD')}${e.Field?` · ${esc(e.Field)}`:''}</p><small>${esc(e.Status||'')} ${e.ArrivalTime?` · Arrive ${esc(e.ArrivalTime)}`:''}</small></div>${score}<a class="button small" href="event-details.html?id=${encodeURIComponent(e.EventID)}">View Details</a></article>`;}
function tryoutCard(t){const d=daysUntil(t.Date);return `<article class="tryout-card"><div class="tryout-status"><span>${esc(t.Status||'Storm Watch')}</span><strong>${d>=0&&d<100?`${d} DAYS`:'10U'}</strong><small>${esc(t.AgeGroup||settings().ageGroup||'10U')}</small></div><div class="tryout-main"><span class="kicker">${esc(t.Title||'Tryout Opportunity')}</span><h3>${esc(dateLabel(t.Date))} · ${esc(t.Time||'TBD')}</h3><p>${esc(t.Description||'Come compete, learn, and see what the Storm is building.')}</p><div class="tryout-facts"><span class="pill">📍 ${esc(t.Location||'TBD')}</span>${t.PositionsWanted?`<span class="pill">🥎 ${esc(t.PositionsWanted)}</span>`:''}${t.ArrivalTime?`<span class="pill">⏱ Arrive ${esc(t.ArrivalTime)}</span>`:''}${t.WhatToBring?`<span class="pill orange">🎒 ${esc(t.WhatToBring)}</span>`:''}</div></div><div class="tryout-action"><a class="button orange" href="${esc(t.RegistrationURL||settings().interest||'#')}">Register / Interest</a></div></article>`;}
function announcementCard(a){return `<article class="glass-card"><span class="alert-level">${esc(a.AlertLevel||"Coach's Forecast")}</span><h3>${esc(a.Title||'Team Update')}</h3><p>${esc(a.Message||'')}</p>${a.ButtonURL?`<a class="text-link" href="${esc(a.ButtonURL)}">${esc(a.ButtonText||'More information')} →</a>`:''}</article>`;}
function youtubeId(v){
  const candidates=[v?.YouTubeID,v?.VideoURL];
  for(const raw of candidates){
    const s=String(raw||'').trim();
    if(!s)continue;
    if(/^[A-Za-z0-9_-]{11}$/.test(s))return s;
    const m=s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/i);
    if(m)return m[1];
    try{
      const u=new URL(s);
      const host=u.hostname.replace(/^www\./,'').toLowerCase();
      if(host==='youtube.com'||host==='m.youtube.com'){
        const id=u.searchParams.get('v');
        if(id&&/^[A-Za-z0-9_-]{11}$/.test(id))return id;
      }
    }catch(e){}
  }
  return '';
}
function videoSource(v){
  const id=youtubeId(v);
  if(id)return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  return v.VideoURL||'';
}
function videoThumb(v){
  if(v.ThumbnailURL)return v.ThumbnailURL;
  const id=youtubeId(v);
  if(id)return `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  return 'assets/img/storm-logo.svg';
}
function videoCard(v,featured=false){const src=videoSource(v);return `<article class="${featured?'featured-video-card':'video-card'}"><a class="video-thumb" href="${esc(src)}" target="_blank" rel="noopener"><img loading="lazy" decoding="async" src="${esc(videoThumb(v))}" alt="${esc(v.Title)}"><span class="play">▶</span>${featured?'<span class="featured-ribbon">Featured Broadcast</span>':''}</a><div class="video-copy"><span class="storm-label">${esc(v.Category||'Storm Channel')}</span><h3>${esc(v.Title||'Storm Video')}</h3><p>${esc(v.Description||'')}</p>${src?`<a class="button small" href="${esc(src)}" target="_blank" rel="noopener">Watch</a>`:''}</div></article>`;}
function applyBrand(){const s=settings();const root=document.documentElement;[['--purple',s.brandPrimary],['--purple2',s.brandSecondary],['--orange',s.brandAccent],['--ink',s.brandDark]].forEach(([k,v])=>{if(v)root.style.setProperty(k,v)});$$('[data-team-name]').forEach(el=>el.textContent=val(s.teamName,'2 Out Storm 10U'));$$('[data-team-short]').forEach(el=>el.textContent=val(s.teamShort,'2 Out'));$$('[data-team-tagline]').forEach(el=>el.textContent=val(s.tagline,'Together. Tougher.'));$$('[data-age-group]').forEach(el=>el.textContent=val(s.ageGroup,'10U'));$$('[data-home-field]').forEach(el=>el.textContent=val(s.homeField,'CAP'));$$('[data-brand-logo]').forEach(el=>el.src=imageUrl(s.logoURL,window.STORM_CONFIG?.fallbackLogo||'assets/img/storm-logo.svg',420));$$('[data-hero-copy]').forEach(el=>el.textContent=val(s.heroCopy,el.textContent));$$('[data-hero-image]').forEach(el=>{const u=s.heroImageURL||s.homeHeroImageURL||s.featureImageURL||'';if(u)el.src=imageUrl(u,'assets/img/storm-logo.svg',1200);});$$('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());document.title=document.title.replace('2 Out Storm 10U',val(s.teamName,'2 Out Storm 10U'));}
function wireImmediateNav(){const btn=$('.nav-toggle'),nav=$('.nav-links');if(!btn||!nav||btn.dataset.stormNavWired==='1')return;btn.dataset.stormNavWired='1';btn.addEventListener('click',e=>{const open=nav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(open));});}
function wireLinks(){$$('[data-app-link]').forEach(a=>{const page=a.dataset.appLink;a.href=StormAPI.appUrl(page);if(!StormAPI.hasApi()){a.classList.add('needs-setup');a.addEventListener('click',e=>{e.preventDefault();alert('Website backend connection needed. Paste the deployed Apps Script /exec URL into assets/js/config.js.');});}});$$('[data-form]').forEach(a=>{const u=settings()[a.dataset.form];if(u&&u!=='#')a.href=u;else{a.href='#';a.addEventListener('click',e=>{e.preventDefault();alert('This form link has not been configured yet. The coach can create/repair forms in the Coach Control Center.');});}});$$('[data-gamechanger-team]').forEach(a=>{const u=String(settings().gamechanger||'https://web.gc.com/teams/k7Ir88y2JrCI?utm_source=Web&utm_campaign=team_share_link').trim();if(u)a.href=u;});$$('[data-sms]').forEach(a=>{const phone=(settings().phone||'').replace(/[^+\d]/g,'');if(phone)a.href=`sms:${phone}?body=${encodeURIComponent(a.dataset.sms||'Hi Coach')}`;});wireImmediateNav();const key=document.body.dataset.page;const navKey={player:'team',event:'tracker',family:'shelter',coach:'shelter',guide:'shelter'}[key]||key;const current=$(`[data-nav="${navKey}"]`);if(current)current.classList.add('active');}
function upcoming(){const now=new Date();return arr('calendar').filter(e=>{const d=eventDateTime(e);return d&&d.getTime()>=now.getTime()-3600000;}).sort((a,b)=>eventDateTime(a)-eventDateTime(b));}
function publicEventIsPast(e){
  const d=parseDate(e?.Date);
  if(!d)return false;
  d.setHours(0,0,0,0);
  const today=new Date();
  today.setHours(0,0,0,0);
  return d<today;
}

let timer;
function renderCountdown(e){const box=$('#countdown');if(!box)return;clearInterval(timer);function tick(){const d=eventDateTime(e),diff=Math.max(0,d-new Date()),days=Math.floor(diff/86400000),hrs=Math.floor(diff%86400000/3600000),mins=Math.floor(diff%3600000/60000),secs=Math.floor(diff%60000/1000);box.innerHTML=[[days,'Days'],[hrs,'Hours'],[mins,'Minutes'],[secs,'Seconds']].map(x=>`<div><strong>${String(x[0]).padStart(2,'0')}</strong><span>${x[1]}</span></div>`).join('');}tick();timer=setInterval(tick,1000);}


// -----------------------------------------------------------------------------
// STORM FAMILY BOARD
// Loads NO board messages during normal homepage startup. A parent must choose a
// player and sign in first; only then are private board messages requested.
// -----------------------------------------------------------------------------
const BOARD_SESSION_KEY='stormhq_family_board_session_v1';
let BOARD_REFRESH_TIMER=null;

function boardApi(action,params){
  return new Promise((resolve,reject)=>{
    const cfg=window.STORM_CONFIG||{};
    const base=String(cfg.apiUrl||'');
    if(!/^https:\/\/script\.google\.com\/macros\/s\//.test(base) || !/\/exec(?:$|\?)/.test(base)){
      reject(new Error('Family Board connection is not configured.'));
      return;
    }
    const cb='storm_board_cb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    let done=false;
    const u=new URL(base);
    u.searchParams.set('action',action);
    u.searchParams.set('callback',cb);
    Object.entries(params||{}).forEach(([k,v])=>{
      if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v));
    });
    const finish=(err,data)=>{
      if(done)return;
      done=true;
      clearTimeout(timeout);
      try{delete window[cb];}catch(e){}
      script.remove();
      if(err)reject(err);else if(!data||data.ok===false)reject(new Error(data?.error||'Family Board request failed.'));else resolve(data);
    };
    window[cb]=data=>finish(null,data);
    script.onerror=()=>finish(new Error('Could not reach the Family Board.'));
    script.src=u.toString();
    document.head.appendChild(script);
    const timeout=setTimeout(()=>finish(new Error('Family Board request timed out.')),20000);
  });
}
function boardSavedSession(){
  try{return JSON.parse(sessionStorage.getItem(BOARD_SESSION_KEY)||'null');}catch(e){return null;}
}
function boardSaveSession(s){try{sessionStorage.setItem(BOARD_SESSION_KEY,JSON.stringify(s));}catch(e){}}
function boardClearSession(){try{sessionStorage.removeItem(BOARD_SESSION_KEY);}catch(e){} clearInterval(BOARD_REFRESH_TIMER);BOARD_REFRESH_TIMER=null;}
function boardTime(v){
  if(!v)return '';
  const d=new Date(String(v));
  if(isNaN(d))return '';
  return d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
function ensureFamilyBoard(){
  if(document.getElementById('storm-family-board'))return document.getElementById('storm-family-board');
  const main=document.querySelector('main');
  if(!main)return null;
  const section=document.createElement('section');
  section.className='section storm-family-board';
  section.id='storm-family-board';
  const players=arr('players').filter(p=>String(p.Jersey||'').trim()!=='');
  section.innerHTML=`<div class="shell"><div class="storm-board-card">
    <div class="storm-board-head">
      <div><span class="eyebrow">Inside the Storm</span><h2>Storm Family Board</h2></div>
      <p>Quick team updates, questions, and family communication. Select your player and enter your Family Board code.</p>
    </div>
    <div class="storm-board-login" data-board-login>
      <div class="storm-board-field"><label for="storm-board-player">Player</label><select id="storm-board-player" data-board-player><option value="">Choose your player…</option>${players.map(p=>`<option value="${esc(p.PlayerID)}">#${esc(p.Jersey)} ${esc(p.FirstName)}</option>`).join('')}</select></div>
      <div class="storm-board-field"><label for="storm-board-code">Family Board Code</label><input id="storm-board-code" data-board-code type="password" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="Enter code"></div>
      <button class="button orange" type="button" data-board-enter>Enter the Board</button>
    </div>
    <div class="storm-board-status" data-board-status>Board messages stay private until a family signs in.</div>
    <div class="storm-board-shell" data-board-shell>
      <div class="storm-board-toolbar">
        <div class="storm-board-who"><span class="storm-board-live">Family Board</span><strong data-board-name></strong></div>
        <div class="storm-board-actions"><button type="button" class="storm-board-smallbtn" data-board-refresh>Refresh</button><button type="button" class="storm-board-smallbtn" data-board-leave>Sign Out</button></div>
      </div>
      <div class="storm-board-notify" data-board-notify>
        <div class="storm-board-field">
          <label for="storm-board-notify-email">Board Notification Email</label>
          <input id="storm-board-notify-email" data-board-notify-email type="email" autocomplete="email" placeholder="parent@email.com">
        </div>
        <label class="storm-board-notify-toggle"><input type="checkbox" data-board-notify-enabled> Email me new posts</label>
        <button class="storm-board-smallbtn" type="button" data-board-notify-save>Save Notifications</button>
        <div class="storm-board-notify-note">Only signed-in families can change this. Your email stays private and is never shown on the Family Board.</div>
      </div>
      <div class="storm-board-messages" data-board-messages></div>
      <div class="storm-board-closed" data-board-closed style="display:none">Coach has temporarily closed parent posting. You can still read team updates.</div>
      <div class="storm-board-compose" data-board-compose>
        <textarea maxlength="500" data-board-message placeholder="Message the Storm…"></textarea>
        <button class="button orange" type="button" data-board-post>Post Message</button>
      </div>
    </div>
  </div></div>`;

  // Board should sit directly above the calendar. If calendar does not exist yet,
  // append it; the calendar renderer will then append after it.
  const cal=document.getElementById('storm-home-calendar');
  if(cal)main.insertBefore(section,cal);else main.appendChild(section);

  const status=section.querySelector('[data-board-status]');
  const setStatus=(msg,type='')=>{status.textContent=msg||'';status.className='storm-board-status'+(type?' '+type:'');};

  section.querySelector('[data-board-enter]').addEventListener('click',async()=>{
    const playerId=section.querySelector('[data-board-player]').value;
    const code=section.querySelector('[data-board-code]').value.trim();
    if(!playerId||!code){setStatus('Choose your player and enter the Family Board code.','error');return;}
    setStatus('Entering the Storm…');
    try{
      const r=await boardApi('boardLogin',{playerId,code});
      boardSaveSession({token:r.token,playerId:r.playerId,displayName:r.displayName});
      section.querySelector('[data-board-code]').value='';
      boardOpenSession(section,r);
      setStatus('Family Board connected.','success');
    }catch(e){setStatus(e.message,'error');}
  });
  section.querySelector('[data-board-code]').addEventListener('keydown',e=>{if(e.key==='Enter')section.querySelector('[data-board-enter]').click();});
  section.querySelector('[data-board-refresh]').addEventListener('click',()=>boardRefresh(section,true));
  section.querySelector('[data-board-leave]').addEventListener('click',()=>{boardClearSession();section.querySelector('[data-board-shell]').classList.remove('open');section.querySelector('[data-board-login]').style.display='grid';setStatus('Signed out of the Family Board.');});
  section.querySelector('[data-board-post]').addEventListener('click',()=>boardPost(section));
  section.querySelector('[data-board-message]').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')boardPost(section);});

  section.querySelector('[data-board-notify-save]').addEventListener('click',()=>boardSaveNotifications(section));

  const saved=boardSavedSession();
  if(saved?.token){
    section.querySelector('[data-board-login]').style.display='none';
    setStatus('Restoring your Family Board session…');
    boardRefresh(section,false).catch(()=>{});
  }
  return section;
}
function boardRenderMessages(section,messages){
  const el=section.querySelector('[data-board-messages]');
  const list=Array.isArray(messages)?messages:[];
  if(!list.length){el.innerHTML='<div class="storm-board-empty">No messages yet. Start the conversation.</div>';return;}
  const sorted=[...list].sort((a,b)=>{
    const ap=String(a.Pinned||'NO').toUpperCase()==='YES'?1:0,bp=String(b.Pinned||'NO').toUpperCase()==='YES'?1:0;
    if(ap!==bp)return bp-ap;
    return String(a.CreatedAt||'').localeCompare(String(b.CreatedAt||''));
  });
  el.innerHTML=sorted.map(m=>{
    const coach=String(m.AuthorType||'').toUpperCase()==='COACH';
    const pinned=String(m.Pinned||'NO').toUpperCase()==='YES';
    return `<article class="storm-board-message${coach?' coach':''}${pinned?' pinned':''}"><div class="storm-board-message-head"><strong>${esc(m.DisplayName||'Storm Family')}${coach?' · Coach':''}${pinned?'<span class="storm-board-pin">Pinned</span>':''}</strong><span>${esc(boardTime(m.CreatedAt))}</span></div><p>${esc(m.Message||'')}</p></article>`;
  }).join('');
  el.scrollTop=el.scrollHeight;
}
function boardOpenSession(section,r){
  section.querySelector('[data-board-login]').style.display='none';
  section.querySelector('[data-board-shell]').classList.add('open');
  section.querySelector('[data-board-name]').textContent=r.displayName||boardSavedSession()?.displayName||'Family';
  boardRenderMessages(section,r.messages||[]);
  const notifyEmail=section.querySelector('[data-board-notify-email]');
  const notifyEnabled=section.querySelector('[data-board-notify-enabled]');
  if(notifyEmail && r.notificationEmail!==undefined)notifyEmail.value=r.notificationEmail||'';
  if(notifyEnabled && r.notificationsEnabled!==undefined)notifyEnabled.checked=!!r.notificationsEnabled;
  const open=r.boardOpen!==false;
  section.querySelector('[data-board-compose]').style.display=open?'grid':'none';
  section.querySelector('[data-board-closed]').style.display=open?'none':'block';
  clearInterval(BOARD_REFRESH_TIMER);
  BOARD_REFRESH_TIMER=setInterval(()=>{if(!document.hidden)boardRefresh(section,false).catch(()=>{});},60000);
}
async function boardRefresh(section,showStatus){
  const saved=boardSavedSession();
  if(!saved?.token)return;
  const status=section.querySelector('[data-board-status]');
  if(showStatus){status.textContent='Refreshing Family Board…';status.className='storm-board-status';}
  try{
    const r=await boardApi('boardMessages',{token:saved.token});
    boardOpenSession(section,r);
    if(showStatus){status.textContent='Family Board updated.';status.className='storm-board-status success';}
    return r;
  }catch(e){
    boardClearSession();
    section.querySelector('[data-board-shell]').classList.remove('open');
    section.querySelector('[data-board-login]').style.display='grid';
    status.textContent=e.message;
    status.className='storm-board-status error';
    throw e;
  }
}

async function boardSaveNotifications(section){
  const saved=boardSavedSession();
  if(!saved?.token)return;
  const email=section.querySelector('[data-board-notify-email]').value.trim();
  const enabled=section.querySelector('[data-board-notify-enabled]').checked;
  const btn=section.querySelector('[data-board-notify-save]');
  const status=section.querySelector('[data-board-status]');

  if(enabled && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
    status.textContent='Enter a valid email address to turn notifications on.';
    status.className='storm-board-status error';
    return;
  }

  btn.disabled=true;
  status.textContent='Saving notification settings…';
  status.className='storm-board-status';
  try{
    const r=await boardApi('boardNotify',{
      token:saved.token,
      email:email,
      enabled:enabled?'YES':'NO'
    });
    section.querySelector('[data-board-notify-email]').value=r.notificationEmail||'';
    section.querySelector('[data-board-notify-enabled]').checked=!!r.notificationsEnabled;
    status.textContent=r.message||'Notification settings saved.';
    status.className='storm-board-status success';
  }catch(e){
    status.textContent=e.message;
    status.className='storm-board-status error';
  }finally{
    btn.disabled=false;
  }
}

async function boardPost(section){
  const saved=boardSavedSession();
  if(!saved?.token)return;
  const box=section.querySelector('[data-board-message]');
  const btn=section.querySelector('[data-board-post]');
  const status=section.querySelector('[data-board-status]');
  const message=box.value.trim();
  if(!message){status.textContent='Type a message first.';status.className='storm-board-status error';return;}
  btn.disabled=true;
  status.textContent='Posting message…';status.className='storm-board-status';
  try{
    const r=await boardApi('boardPost',{token:saved.token,message});
    box.value='';
    boardOpenSession(section,{...r,displayName:saved.displayName});
    status.textContent='Message posted.';status.className='storm-board-status success';
  }catch(e){status.textContent=e.message;status.className='storm-board-status error';}
  finally{btn.disabled=false;}
}

let HOME_CALENDAR_CURSOR=null;

function calendarEventKind(e){
  const t=String(e?.Type||'').toLowerCase();
  if(t.includes('tournament'))return 'tournament';
  if(t.includes('game'))return 'game';
  return 'practice';
}
function calendarMonthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function ensureHomeCalendar(){
  if(document.getElementById('storm-home-calendar'))return document.getElementById('storm-home-calendar');
  const main=document.querySelector('main');
  if(!main)return null;
  const section=document.createElement('section');
  section.className='section storm-home-calendar';
  section.id='storm-home-calendar';
  section.innerHTML=`<div class="shell">
    <div class="storm-calendar-card">
      <div class="storm-calendar-head">
        <div>
          <span class="eyebrow">Storm Schedule</span>
          <h2>Team Calendar</h2>
          <p>Practices, games, and tournaments from the same schedule that powers Storm Tracker and Family Availability.</p>
        </div>
        <div class="storm-calendar-controls">
          <button class="storm-calendar-btn" type="button" data-cal-prev aria-label="Previous month">‹</button>
          <div class="storm-calendar-month" data-cal-month></div>
          <button class="storm-calendar-btn" type="button" data-cal-next aria-label="Next month">›</button>
          <button class="storm-calendar-btn" type="button" data-cal-today>Today</button>
        </div>
      </div>
      <div class="storm-calendar-legend">
        <span><i class="practice"></i>Practice</span>
        <span><i class="game"></i>Game</span>
        <span><i class="tournament"></i>Tournament</span>
      </div>
      <div class="storm-calendar-grid" data-cal-grid></div>
    </div>
  </div>`;

  // Keep all existing homepage content exactly where it is and place the calendar last.
  main.appendChild(section);

  section.querySelector('[data-cal-prev]').addEventListener('click',()=>{
    const d=HOME_CALENDAR_CURSOR||new Date();
    HOME_CALENDAR_CURSOR=new Date(d.getFullYear(),d.getMonth()-1,1);
    drawHomeCalendar();
  });
  section.querySelector('[data-cal-next]').addEventListener('click',()=>{
    const d=HOME_CALENDAR_CURSOR||new Date();
    HOME_CALENDAR_CURSOR=new Date(d.getFullYear(),d.getMonth()+1,1);
    drawHomeCalendar();
  });
  section.querySelector('[data-cal-today]').addEventListener('click',()=>{
    const n=new Date();
    HOME_CALENDAR_CURSOR=new Date(n.getFullYear(),n.getMonth(),1);
    drawHomeCalendar();
  });
  return section;
}
function drawHomeCalendar(){
  const section=ensureHomeCalendar();
  if(!section)return;
  if(!HOME_CALENDAR_CURSOR){
    const now=new Date();
    HOME_CALENDAR_CURSOR=new Date(now.getFullYear(),now.getMonth(),1);
  }
  const cursor=HOME_CALENDAR_CURSOR;
  const year=cursor.getFullYear(),month=cursor.getMonth();
  const monthStart=new Date(year,month,1);
  const nextMonth=new Date(year,month+1,1);
  const daysInMonth=new Date(year,month+1,0).getDate();
  const startOffset=monthStart.getDay();
  const today=new Date();
  const events=arr('calendar')
    .map(e=>({e,d:parseDate(e.Date)}))
    .filter(x=>x.d && x.d>=monthStart && x.d<nextMonth && !publicEventIsPast(x.e))
    .sort((a,b)=>a.d-b.d || eventDateTime(a.e)-eventDateTime(b.e));

  const byDay={};
  events.forEach(({e,d})=>{
    const day=d.getDate();
    (byDay[day]||(byDay[day]=[])).push(e);
  });

  const monthLabel=section.querySelector('[data-cal-month]');
  if(monthLabel)monthLabel.textContent=cursor.toLocaleDateString(undefined,{month:'long',year:'numeric'});

  const cells=[];
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>cells.push(`<div class="storm-calendar-dow">${d}</div>`));
  for(let i=0;i<startOffset;i++)cells.push('<div class="storm-calendar-day is-empty" aria-hidden="true"></div>');

  for(let day=1;day<=daysInMonth;day++){
    const list=byDay[day]||[];
    const isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day;
    const visible=list.slice(0,3).map(e=>{
      const kind=calendarEventKind(e);
      const cancelled=/cancel/i.test(String(e.Status||''));
      const title=e.Opponent&&kind==='game'?`vs. ${e.Opponent}`:(e.Title||e.Type||'Team Event');
      return `<a class="storm-calendar-event ${kind}${cancelled?' cancelled':''}" href="event-details.html?id=${encodeURIComponent(e.EventID)}" title="${esc(title)}">
        <strong>${esc(title)}</strong>
        <small>${esc(e.Time||'TBD')}${e.Field?` · ${esc(e.Field)}`:''}</small>
      </a>`;
    }).join('');
    const more=list.length>3?`<div class="storm-calendar-more">+${list.length-3} more</div>`:'';
    cells.push(`<div class="storm-calendar-day${isToday?' is-today':''}">
      <div class="storm-calendar-day-number">${day}</div>
      <div class="storm-calendar-events">${visible}${more}</div>
    </div>`);
  }

  const totalCells=startOffset+daysInMonth;
  const tail=(7-(totalCells%7))%7;
  for(let i=0;i<tail;i++)cells.push('<div class="storm-calendar-day is-empty" aria-hidden="true"></div>');

  const grid=section.querySelector('[data-cal-grid]');
  if(grid)grid.innerHTML=cells.join('');
}

let HOME_RENDER_TOKEN=0;

function runWhenIdle(fn,timeout=500){
  if('requestIdleCallback' in window){
    requestIdleCallback(()=>fn(),{timeout});
  }else{
    setTimeout(fn,0);
  }
}

function renderHomeCritical(){
  const next=upcoming()[0];
  const n=$('#next-impact');

  if(n){
    n.innerHTML=next
      ? `<div class="impact-date"><strong>${esc(dateLabel(next.Date,{month:'short',day:'numeric'}))}</strong><span>${esc(next.Time||'TBD')}</span></div><div class="impact-main"><span class="kicker">${esc(next.Status||'Next Impact')}</span><h3>${esc(next.Title||next.Type)}</h3><p>${esc(next.Opponent?`vs. ${next.Opponent} · `:'')}${esc(next.Location||'Location TBD')}${next.Field?` · ${esc(next.Field)}`:''}</p><div class="impact-meta">${next.ArrivalTime?`<span class="pill">Arrive ${esc(next.ArrivalTime)}</span>`:''}${next.Uniform?`<span class="pill">${esc(next.Uniform)}</span>`:''}<span class="pill orange">${esc(next.Type||'Event')}</span></div></div><a class="button primary" href="event-details.html?id=${encodeURIComponent(next.EventID)}">View Details</a>`
      : '<div class="empty-state">No upcoming events are published yet.</div>';

    if(next)renderCountdown(next);
  }

  const announcements=arr('announcements')
    .filter(a=>String(a.Visibility||'PUBLIC').toUpperCase()!=='FAMILY')
    .slice(0,3);

  if($('#announcements')){
    $('#announcements').innerHTML=announcements.length
      ? announcements.map(announcementCard).join('')
      : '<div class="empty-state">No current Storm Warnings.</div>';
  }
}


function gameChangerTeamUrl(){
  return String(settings().gamechanger||'https://web.gc.com/teams/k7Ir88y2JrCI?utm_source=Web&utm_campaign=team_share_link').trim();
}
function isGameChangerVideo(v){
  const hay=[
    v?.SourceType,v?.SourceLabel,v?.Category,v?.VideoURL
  ].map(x=>String(x||'').toLowerCase()).join(' ');
  return hay.includes('gamechanger') || /(^|\/\/)(?:www\.)?(?:web\.)?gc\.com\//i.test(String(v?.VideoURL||''));
}
function renderGameChangerVideoHub(){
  const host=$('#gc-video-hub');
  if(!host)return;

  const vids=arr('videos')
    .filter(isGameChangerVideo)
    .sort((a,b)=>String(b.Date||'').localeCompare(String(a.Date||'')) || (Number(a.SortOrder)||99)-(Number(b.SortOrder)||99))
    .slice(0,6);

  host.innerHTML=vids.length
    ? vids.map(v=>{
        const url=String(v.VideoURL||gameChangerTeamUrl()).trim();
        const meta=[v.Date,v.Opponent,v.SourceLabel||'GameChanger'].filter(Boolean).join(' · ');
        return `<a class="gc-video-item" href="${esc(url)}" target="_blank" rel="noopener">
          <span class="gc-video-icon">▶</span>
          <span class="gc-video-main"><strong>${esc(v.Title||'GameChanger Highlight')}</strong><small>${esc(meta||'Open video in GameChanger')}</small></span>
          <span class="gc-video-open">WATCH →</span>
        </a>`;
      }).join('')
    : `<div class="gc-video-empty"><strong style="display:block;color:#fff;margin-bottom:5px">No GameChanger clips published yet.</strong>Paste a GameChanger clip/share link in <b>Coach Control Center → GameChanger & Post-Game</b> and it will appear here automatically.</div>`;
}
let GC_SCHEDULE_LOADING=false;
function initGameChangerScheduleWidget(){
  const target=document.querySelector('#gc-schedule-widget-783r');
  if(!target || target.dataset.gcReady==='1' || GC_SCHEDULE_LOADING)return;

  const start=()=>{
    try{
      if(!window.GC?.team?.schedule?.init)throw new Error('GameChanger widget did not initialize.');
      window.GC.team.schedule.init({
        target:'#gc-schedule-widget-783r',
        widgetId:'d72291ad-6f8a-43e5-ae85-0703ed7297ec',
        maxVerticalGamesVisible:4
      });
      target.dataset.gcReady='1';
      GC_SCHEDULE_LOADING=false;
    }catch(e){
      GC_SCHEDULE_LOADING=false;
      target.innerHTML=`<div class="gc-widget-error"><div><strong>GameChanger schedule unavailable.</strong><span>You can still open the official team page.</span><div style="margin-top:14px"><a class="button orange" href="${esc(gameChangerTeamUrl())}" target="_blank" rel="noopener">Open GameChanger</a></div></div></div>`;
    }
  };

  if(window.GC?.team?.schedule?.init){start();return;}

  GC_SCHEDULE_LOADING=true;
  let script=document.querySelector('script[data-storm-gc-sdk]');
  if(!script){
    script=document.createElement('script');
    script.src='https://widgets.gc.com/static/js/sdk.v1.js';
    script.async=true;
    script.dataset.stormGcSdk='1';
    script.onload=start;
    script.onerror=()=>{
      GC_SCHEDULE_LOADING=false;
      target.innerHTML=`<div class="gc-widget-error"><div><strong>Could not load GameChanger.</strong><span>The rest of The Eye is still available.</span><div style="margin-top:14px"><a class="button orange" href="${esc(gameChangerTeamUrl())}" target="_blank" rel="noopener">Open GameChanger</a></div></div></div>`;
    };
    document.head.appendChild(script);
  }else{
    script.addEventListener('load',start,{once:true});
  }
}
function renderGameChangerEye(){
  renderGameChangerVideoHub();
  initGameChangerScheduleWidget();
}

function renderHomeDeferred(token){
  if(token!==HOME_RENDER_TOKEN || document.body.dataset.page!=='home')return;

  injectStormEnhancementStyles();
  renderGameChangerEye();

  const feat=arr('videos').find(v=>yes(v.Featured))||arr('videos')[0];
  if($('#featured-video')){
    $('#featured-video').innerHTML=feat
      ? videoCard(feat,true)
      : '<div class="empty-state">Storm Channel is warming up.</div>';
  }

  if($('#players-grid')){
    $('#players-grid').innerHTML=arr('players').sort((a,b)=>(+a.SortOrder||99)-(+b.SortOrder||99)).map(p=>playerCard(p,true)).join('')||'<div class="empty-state">Roster coming soon.</div>';
  }

  const t=arr('tryouts')
    .filter(x=>!['CLOSED','COMPLETED','FULL'].includes(String(x.Status||'').toUpperCase()))
    .sort((a,b)=>parseDate(a.Date)-parseDate(b.Date))[0];

  if($('#home-tryout')){
    $('#home-tryout').innerHTML=t
      ? tryoutCard(t)
      : '<div class="empty-state">No active tryouts are posted right now. Player Interest remains open.</div>';
  }

  const w=arr('homeworkWeeks').find(x=>String(x.Status||'').toUpperCase()==='ACTIVE')||arr('homeworkWeeks')[0];
  if($('#home-homework')){
    $('#home-homework').innerHTML=w
      ? `<div class="homework-public-card"><span class="kicker">${esc(w.Title)}</span><h3>${esc(w.Theme||'The work continues.')}</h3><p>${esc(w.CoachMessage||'')}</p><div class="impact-meta"><span class="pill">Due ${esc(dateLabel(w.DueDate,{month:'short',day:'numeric'}))}</span><span class="pill orange">Parent code required to submit</span></div><div class="hero-actions"><a class="button primary" href="${StormAPI.appUrl('family')}">Open My Homework</a></div></div>`
      : '';
  }

  const pic=arr('picture')[0];
  if($('#picture-week')){
    $('#picture-week').innerHTML=pic
      ? `<div class="picture"><img loading="lazy" decoding="async" fetchpriority="low" src="${esc(imageUrl(pic.ImageURL,'assets/img/storm-logo.svg',1000))}" alt="${esc(pic.Title||'Picture of the Week')}"></div><div class="picture-copy"><span class="kicker">${esc(pic.Week||'Storm Season')}</span><h3>${esc(pic.Title||'Picture of the Week')}</h3><p>${esc(pic.Caption||'')}</p></div>`
      : '<div class="empty-state">Picture of the Week coming soon.</div>';
  }

  ensureFamilyBoard();
  drawHomeCalendar();
}

function renderHome(){
  const token=++HOME_RENDER_TOKEN;
  renderHomeCritical();
  runWhenIdle(()=>renderHomeDeferred(token),350);
}
function renderTeam(){const g=$('#players-grid');if(g)g.innerHTML=arr('players').sort((a,b)=>(+a.SortOrder||99)-(+b.SortOrder||99)).map(p=>playerCard(p,true)).join('')||'<div class="empty-state">Roster coming soon.</div>';}
function renderPlayer(){const id=new URLSearchParams(location.search).get('id');const p=arr('players').find(x=>String(x.PlayerID)===String(id))||arr('players')[0];const el=$('#player-profile');if(!p||!el){if(el)el.innerHTML='<div class="empty-state">Player profile not found.</div>';return;}const x=val(p.ProfileX,50),y=val(p.ProfileY,35),z=val(p.ProfileZoom,1);el.innerHTML=`<section class="profile-hero"><div class="profile-photo" style="--px:${x}%;--py:${y}%;--pz:${z}"><img decoding="async" fetchpriority="high" src="${esc(imageUrl(p.BackgroundURL||p.PhotoURL,'assets/img/storm-logo.svg',1400))}" alt="${esc(p.FirstName)}">${publicStormBadges(p)}</div><div class="shell profile-copy"><span class="profile-number">#${esc(p.Jersey)}</span><h1>${esc(p.FirstName)}</h1><p>${esc(p.Positions||'Storm Athlete')} · ${esc(p.BatsThrows||'')}</p></div></section><section class="section"><div class="shell profile-grid"><article class="glass-card"><span class="kicker">Her Role in the Storm</span><h3>${esc(p.Positions||'Athlete')}</h3><p>${esc(p.StrongestPart||'Development in progress.')}</p></article><article class="glass-card"><span class="kicker">Her Forecast</span><h3>Season Goal</h3><p>${esc(p.SeasonGoal||'Get better every week.')}</p></article><article class="glass-card"><span class="kicker">Player Card</span><dl class="profile-facts"><div><dt>Jersey</dt><dd>#${esc(p.Jersey)}</dd></div><div><dt>Positions</dt><dd>${esc(p.Positions||'')}</dd></div><div><dt>Bats / Throws</dt><dd>${esc(p.BatsThrows||'')}</dd></div><div><dt>Class</dt><dd>${esc(p.ClassYear||'')}</dd></div></dl></article><article class="glass-card"><span class="kicker">Storm Mindset</span><h3>“${esc(p.Quote||'Together. Tougher.')}”</h3></article></div></section>${playerStatsSection(p)}${playerHighlightsSection(p)}`;}
function renderTracker(){
  const list=$('#events-list'),filters=$('#event-filters');
  if(!list)return;

  const data=[...arr('calendar')]
    .filter(e=>!publicEventIsPast(e))
    .sort((a,b)=>eventDateTime(a)-eventDateTime(b));

  const types=['All',...new Set(data.map(e=>e.Type).filter(Boolean))];

  function draw(filter){
    const rows=data.filter(x=>filter==='All'||x.Type===filter);
    list.innerHTML=rows.map(eventCard).join('')||'<div class="empty-state">No current or upcoming events in this category.</div>';
  }

  if(filters){
    filters.innerHTML=types.map((t,i)=>`<button class="filter-chip ${i===0?'active':''}" data-filter="${esc(t)}">${esc(t)}</button>`).join('');
    filters.onclick=e=>{
      const b=e.target.closest('[data-filter]');
      if(!b)return;
      $$('.filter-chip',filters).forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      draw(b.dataset.filter);
    };
  }

  draw('All');
}
function renderEvent(){const id=new URLSearchParams(location.search).get('id'),e=arr('calendar').find(x=>String(x.EventID)===String(id));const wrap=$('#event-details');if(!wrap)return;if(!e){wrap.innerHTML='<section class="page-hero"><div class="shell"><h1>Event Not Found</h1></div></section>';return;}const roster=arr('eventRosters').filter(r=>String(r.EventID)===String(id)&&yes(r.Assigned!==undefined?r.Assigned:'YES'));const playerById=Object.fromEntries(arr('players').map(p=>[String(p.PlayerID),p]));const groups=[...new Set(roster.map(r=>r.Group||'Event Group'))];const rosterHtml=groups.length?groups.map(g=>{const rs=roster.filter(r=>(r.Group||'Event Group')===g);return `<div class="event-group"><div class="event-group-head"><span class="kicker">${esc(g)}</span><strong>${rs.length} players</strong></div><div class="event-roster-grid">${rs.map(r=>{const p=playerById[String(r.PlayerID)]||{};return `<div class="event-player"><div class="avatar"><img loading="lazy" decoding="async" fetchpriority="low" src="${esc(imageUrl(p.PhotoURL,'assets/img/storm-logo.svg',220))}" alt="${esc(p.FirstName||r.PlayerName||'Player')}"></div><div><strong>#${esc(p.Jersey||'')} ${esc(p.FirstName||r.PlayerName||'Player')}</strong><span>${esc(p.Positions||'Storm Athlete')}</span><small>${esc(r.Notes||'')}</small></div></div>`;}).join('')}</div></div>`;}).join(''):'<div class="empty-state">The event player group is visible inside the Family Portal unless the coach publishes it publicly.</div>';wrap.innerHTML=`<section class="event-detail-hero"><div class="shell event-detail-grid"><div><span class="eyebrow">${esc(e.Status||'Storm Tracker')}</span><h1>${esc(e.Title||e.Type)}${e.Opponent?`<br><span>vs. ${esc(e.Opponent)}</span>`:''}</h1><p>${esc(e.PublicNotes||e.EventNotes||'')}</p><div class="event-detail-actions"><a class="button primary" data-app-link="family" href="${StormAPI.appUrl('family',{eventId:e.EventID})}">Family Check-In</a>${String(e.Type).toLowerCase()==='game'?`<a class="button" data-app-link="lineup" href="${StormAPI.appUrl('lineup',{eventId:e.EventID})}">Coach Game Day Builder</a>`:''}${e.DirectionsURL?`<a class="button ghost" href="${esc(e.DirectionsURL)}" target="_blank">Directions</a>`:''}</div></div><div class="event-detail-facts"><div><span>Date</span><strong>${esc(dateLabel(e.Date))}</strong></div><div><span>Time</span><strong>${esc(e.Time||'TBD')}${e.EndTime?` – ${esc(e.EndTime)}`:''}</strong></div><div><span>Location</span><strong>${esc(e.Location||'TBD')}</strong></div><div><span>Field</span><strong>${esc(e.Field||'TBD')}</strong></div><div><span>Arrival</span><strong>${esc(e.ArrivalTime||'TBD')}</strong></div><div><span>Uniform</span><strong>${esc(e.Uniform||'Coach will advise')}</strong></div></div></div></section><section class="section"><div class="shell"><div class="section-heading"><div><span class="kicker">Event Group</span><h2>Who's in the Storm</h2></div><p>Coach-assigned group for this event. Availability is managed privately through each family's player code.</p></div>${rosterHtml}</div></section>${eventHighlightsSection(id)}`;wireLinks();}
function renderTryouts(){const data=arr('tryouts').sort((a,b)=>parseDate(a.Date)-parseDate(b.Date));const html=data.map(tryoutCard).join('')||'<div class="empty-state">No tryouts are currently published.</div>';if($('#tryouts-list'))$('#tryouts-list').innerHTML=html;if($('#join-tryouts'))$('#join-tryouts').innerHTML=html;}
function renderChannel(){const data=arr('videos');const feat=data.find(v=>yes(v.Featured))||data[0];if($('#featured-video'))$('#featured-video').innerHTML=feat?videoCard(feat,true):'';const cats=['All',...new Set(data.map(v=>v.Category).filter(Boolean))];const f=$('#video-filters'),g=$('#video-grid');function draw(c){if(g)g.innerHTML=data.filter(v=>c==='All'||v.Category===c).map(v=>videoCard(v,false)).join('')||'<div class="empty-state">No videos in this category.</div>';}if(f){f.innerHTML=cats.map((c,i)=>`<button class="filter-chip ${i===0?'active':''}" data-filter="${esc(c)}">${esc(c)}</button>`).join('');f.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;$$('.filter-chip',f).forEach(x=>x.classList.remove('active'));b.classList.add('active');draw(b.dataset.filter);});}draw('All');}
function renderHomework(){const w=arr('homeworkWeeks').find(x=>String(x.Status||'').toUpperCase()==='ACTIVE')||arr('homeworkWeeks')[0];const el=$('#homework-public');if(el)el.innerHTML=w?`<article class="homework-public-card"><span class="kicker">${esc(w.Title)}</span><h3>${esc(w.Theme||'The work continues.')}</h3><p>${esc(w.CoachMessage||'')}</p><div class="impact-meta"><span class="pill">Starts ${esc(dateLabel(w.StartDate,{month:'short',day:'numeric'}))}</span><span class="pill orange">Due ${esc(dateLabel(w.DueDate,{month:'short',day:'numeric'}))}</span></div><p><small>Player-specific completion, questions, and running totals are protected by the family code.</small></p><a class="button primary" href="${StormAPI.appUrl('family')}">Open My Homework</a></article>`:'<div class="empty-state">No homework week is currently published.</div>';}
function renderDevelopment(){const groups={};arr('videos').forEach(v=>{if(!groups[v.Category])groups[v.Category]=[];groups[v.Category].push(v)});const el=$('#development-grid');if(el)el.innerHTML=Object.entries(groups).map(([c,vs])=>`<article class="development-card"><span class="kicker">Storm Development</span><h3>${esc(c)}</h3><p>${esc(vs[0]?.Description||'Development resources selected by the coaching staff.')}</p><a class="text-link" href="storm-channel.html">${vs.length} video${vs.length===1?'':'s'} →</a></article>`).join('')||'<div class="empty-state">Development videos coming soon.</div>';}
function renderReports(){const s=$('#shoutouts');if(s)s.innerHTML=arr('shoutouts').map(announcementCard).join('')||'<div class="empty-state">No Storm Reports yet.</div>';const g=$('#gallery');if(g)g.innerHTML=arr('gallery').map(p=>`<article class="gallery-card"><img loading="lazy" decoding="async" fetchpriority="low" src="${esc(imageUrl(p.ImageURL,'assets/img/storm-logo.svg',900))}" alt="${esc(p.Title||'Storm photo')}"><div><h3>${esc(p.Title||'Inside the Storm')}</h3><p>${esc(p.Caption||'')}</p></div></article>`).join('')||'<div class="empty-state">Storm Gallery coming soon.</div>';}
function renderCurrentPage(){const p=document.body.dataset.page;({home:renderHome,team:renderTeam,player:renderPlayer,tracker:renderTracker,event:renderEvent,tryouts:renderTryouts,channel:renderChannel,homework:renderHomework,development:renderDevelopment,reports:renderReports,join:renderTryouts}[p]||(()=>{}))();}
function showConnectionBanner(){if(document.querySelector('.connection-banner'))return;const b=document.createElement('div');b.className='connection-banner';b.innerHTML='<strong>Storm HQ connection temporarily unavailable.</strong> Live team data is hidden until the secure backend reconnects.';document.body.insertBefore(b,document.querySelector('main'));}
function applyLiveData(data){if(!data)return;DATA=data;if(!DATA.settings&&window.STORM_FALLBACK)DATA=window.STORM_FALLBACK;applyBrand();wireLinks();renderCurrentPage();if(DATA.connectionError)showConnectionBanner();}
function init(){
  // SPEED: make navigation, branding shell, and controls usable immediately.
  // Live Google data is deliberately NOT allowed to block first paint.
  wireImmediateNav();
  DATA=window.STORM_FALLBACK||{};
  applyBrand();

  // The big calendar / Family Board enhancement CSS is below the fold on home.
  // Other pages keep the existing immediate styling behavior.
  if(document.body.dataset.page!=='home')injectStormEnhancementStyles();

  wireLinks();

  StormAPI.publicData().then(applyLiveData).catch(()=>showConnectionBanner());

  // When stale cached data is painted first, silently refresh the visible page
  // as soon as Apps Script returns newer data.
  window.addEventListener('stormhq:public-updated',e=>applyLiveData(e.detail&&e.detail.data));
}
document.addEventListener('DOMContentLoaded',init);
})();
