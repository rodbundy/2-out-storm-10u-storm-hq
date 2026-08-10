/**
 * STORM HQ - 2 Out Storm 10U website backend
 * Google Sheet + Apps Script control plane for public site, Coach Control Center,
 * Family Portal, tryouts, homework, availability, player approval, media, and game-day lineups.
 */

const STORM_VERSION = '5.0-master';
const TZ = 'America/New_York';

const HEADERS = {
  'Website Settings': ['Key','Value','Notes'],
  'Website Players': ['Show','Approved','PlayerID','Jersey','FirstName','LastInitial','Positions','BatsThrows','ClassYear','PhotoURL','BackgroundURL','StrongestPart','SeasonGoal','FavoriteColor','FavoritePlayer','Excitement','Quote','CardX','CardY','CardZoom','ProfileX','ProfileY','ProfileZoom','SortOrder'],
  'Website Calendar': ['Show','Approved','EventID','Date','Time','EndTime','Type','Title','Opponent','Location','Field','Address','DirectionsURL','ArrivalTime','Uniform','EventNotes','PublicNotes','Status','ScoreUs','ScoreThem','Result','RosterVisibility','SortOrder'],
  'Website Announcements': ['Show','Approved','AnnouncementID','Visibility','AlertLevel','Title','Message','StartDate','EndDate','ButtonText','ButtonURL','PinToHome','SortOrder'],
  'Website Videos': ['Show','Approved','VideoID','Category','Title','Description','YouTubeID','VideoURL','ThumbnailURL','Date','EventID','PlayerID','Featured','SortOrder'],
  'Website Shoutouts': ['Show','Approved','ShoutoutID','Category','Title','Player','Message','Date','SortOrder'],
  'Website Picture of the Week': ['Show','Approved','PictureID','Title','Week','Caption','ImageURL','SubmittedBy'],
  'Website Gallery': ['Show','Approved','PhotoID','Title','Caption','ImageURL','Date','PlayerID','Category','SortOrder'],
  'Website Tryouts': ['Show','Approved','TryoutID','Date','Time','EndTime','Status','Title','Location','Field','AgeGroup','PositionsWanted','PitchersWanted','CatchersWanted','ArrivalTime','WhatToBring','Description','RegistrationURL','ContactText','Capacity','InternalNotes','SortOrder'],
  'Event Rosters': ['RosterID','EventID','PlayerID','PlayerName','Group','Assigned','Notes','UpdatedAt'],
  'Game Lineups': ['LineupRowID','EventID','Plan','PlanLabel','UseWhen','BatOrder','PlayerID','PlayerName','Jersey','Position','Starter','Notes','Inn1','Inn2','Inn3','Inn4','Inn5','Inn6','Inn7','UpdatedAt'],
  'Parent Codes': ['PlayerID','PlayerName','ParentCode','Active','LastUpdated'],
  'Availability': ['AvailabilityID','EventID','EventDate','EventTitle','PlayerID','PlayerName','Status','Notes','UpdatedAt'],
  'Homework Weeks': ['Show','Approved','WeekID','Title','Theme','CoachMessage','StartDate','DueDate','Status','BonusText','SortOrder'],
  'Homework Tasks': ['TaskID','WeekID','Title','Description','Category','Target','Unit','VideoURL','Required','SortOrder'],
  'Homework Questions': ['QuestionID','WeekID','Type','Question','Options','CorrectAnswer','Points','Explanation','SortOrder'],
  'Homework Responses': ['ResponseID','WeekID','PlayerID','PlayerName','TaskCompletionJSON','AnswersJSON','Score','MaxScore','SubmittedAt','ParentCodeMasked'],
  'Pending Players': ['SubmissionID','Timestamp','Status','PlayerID','FirstName','LastInitial','Jersey','Positions','BatsThrows','ClassYear','StrongestPart','SeasonGoal','FavoriteColor','FavoritePlayer','Excitement','Quote','ParentName','ParentEmail','ParentPhone','PhotoPermission','RawJSON','CoachNotes'],
  'Parent Photo Submissions': ['SubmissionID','PlayerID','PlayerName','ParentName','Title','Caption','ImageURL','Status','SubmittedAt','CoachNotes'],
  'Form Registry': ['FormKey','FormTitle','PublicURL','EditURL','ResponseSheet','Active','Notes'],
  'Admin Log': ['Timestamp','Action','Sheet','Key','Details']
};

const PUBLIC_MAP = {
  players: 'Website Players', calendar: 'Website Calendar', announcements: 'Website Announcements',
  videos: 'Website Videos', shoutouts: 'Website Shoutouts', picture: 'Website Picture of the Week',
  gallery: 'Website Gallery', tryouts: 'Website Tryouts', homeworkWeeks: 'Homework Weeks'
};

const KEY_FIELD = {
  'Website Settings':'Key','Website Players':'PlayerID','Website Calendar':'EventID','Website Announcements':'AnnouncementID',
  'Website Videos':'VideoID','Website Shoutouts':'ShoutoutID','Website Picture of the Week':'PictureID','Website Gallery':'PhotoID',
  'Website Tryouts':'TryoutID','Event Rosters':'RosterID','Game Lineups':'LineupRowID','Parent Codes':'PlayerID','Availability':'AvailabilityID',
  'Homework Weeks':'WeekID','Homework Tasks':'TaskID','Homework Questions':'QuestionID','Homework Responses':'ResponseID',
  'Pending Players':'SubmissionID','Parent Photo Submissions':'SubmissionID','Form Registry':'FormKey'
};

const ADMIN_EDITABLE = Object.keys(KEY_FIELD).filter(n => !['Parent Codes','Availability','Homework Responses'].includes(n));

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Storm HQ')
    .addItem('1. Initialize / Repair System', 'initializeStormHQ')
    .addItem('2. Set Coach Password', 'setCoachPassword')
    .addSeparator()
    .addItem('3. Create / Repair Google Forms', 'createStormFormSuite')
    .addItem('4. Install Form Trigger', 'installStormFormTrigger')
    .addItem('Set Accepted Player Response Tab', 'setAcceptedPlayerResponseTab')
    .addSeparator()
    .addItem('Generate Missing Parent Codes', 'generateMissingParentCodes')
    .addItem('System Health Check', 'showStormHealth')
    .addSeparator()
    .addItem('Open Coach Control Center', 'showCoachControlLink')
    .addItem('Open Family Portal', 'showFamilyPortalLink')
    .addToUi();
}

function initializeStormHQ() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(name => ensureSheet_(name));
  seedSettings_();
  seedSampleContent_();
  ensureDriveFolder_('Storm HQ - Player Photos');
  ensureDriveFolder_('Storm HQ - Team Photos');
  ensureDriveFolder_('Storm HQ - Videos');
  SpreadsheetApp.flush();
  logAdmin_('SYSTEM_INIT','System','',`Storm HQ ${STORM_VERSION}`);
  SpreadsheetApp.getUi().alert('Storm HQ is ready. Next: Set Coach Password, then Create / Repair Google Forms.');
}

function ensureSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const headers = HEADERS[name];
  const current = sh.getLastColumn() ? sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length)).getDisplayValues()[0] : [];
  const needs = headers.some((h,i) => String(current[i]||'').trim() !== h);
  if (needs) sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,headers.length).setBackground('#32174f').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
  sh.setTabColor(name.startsWith('Website') ? '#8e49d7' : (name.includes('Homework') ? '#7ccf54' : '#ff6b25'));
  return sh;
}

function seedSettings_() {
  const defaults = [
    ['teamName','2 Out Storm 10U','Public team name'],['teamShort','2 Out','Short hero name'],['tagline','Together. Tougher.','Team motto'],
    ['ageGroup','10U','Age division'],['homeField','CAP','Short home field label'],['coach','Coach Rodney','Public coach name'],
    ['phone','+18594144622','Public text number'],['email','rodbundy@yahoo.com','Public coach email'],['logoURL','assets/img/storm-logo.svg','Logo URL; upload from Coach Control Center to replace'],
    ['brandPrimary','#8e49d7','Primary purple'],['brandSecondary','#b96cff','Secondary purple'],['brandAccent','#ff6b25','Storm orange'],['brandDark','#08060d','Background'],
    ['heroCopy','Developing strong athletes, confident teammates, and a force that keeps getting stronger—one rep, one pitch, and one teammate at a time.','Homepage hero copy'],
    ['interest','https://forms.gle/4PgA83dnnVBXMo2h8','Player Interest form'],['profile','','Accepted Player form'],['message','','Private Parent Message form'],['photo','','Picture submission form'],
    ['gamechanger','','GameChanger URL'],['facebook','','Facebook URL'],['instagram','','Instagram URL'],['websiteDomain','2outstorm2035.com','Custom domain']
  ];
  const existing = rows_('Website Settings');
  const keys = new Set(existing.map(r => String(r.Key)));
  const add = defaults.filter(r => !keys.has(r[0]));
  if (add.length) ensureSheet_('Website Settings').getRange(ensureSheet_('Website Settings').getLastRow()+1,1,add.length,3).setValues(add);
}

function seedSampleContent_() {
  if (rows_('Website Players').length === 0) {
    const vals=[]; for(let i=1;i<=12;i++) vals.push(['NO','NO',`player-${String(i).padStart(2,'0')}`,i,`Player ${i}`,'',['P / INF','OF / INF','C / Utility'][i%3],'R/R','2035',`assets/img/players/player-${String(i).padStart(2,'0')}.svg`,'','Energy, effort, and coachability','Get better every week','','','10','Bring the storm.',50,35,1,50,35,1,i]);
    ensureSheet_('Website Players').getRange(2,1,vals.length,HEADERS['Website Players'].length).setValues(vals);
  }
  if (rows_('Website Announcements').length === 0) saveRowDirect_('Website Announcements',{Show:'NO',Approved:'NO',AnnouncementID:'welcome',Visibility:'PUBLIC',AlertLevel:'Storm Warning',Title:'The Storm Is Building',Message:'Your new Storm HQ is connected: schedule, homework, family information, videos, and game-day tools all live in one system.',PinToHome:'YES',SortOrder:1});
}

function setCoachPassword() {
  const ui=SpreadsheetApp.getUi();
  const r=ui.prompt('Set Coach Control Center Password','Enter a new password (8+ characters). The password itself is never stored.',ui.ButtonSet.OK_CANCEL);
  if(r.getSelectedButton()!==ui.Button.OK)return;
  const pw=r.getResponseText(); if(pw.length<8){ui.alert('Use at least 8 characters.');return;}
  PropertiesService.getScriptProperties().setProperty('COACH_PASSWORD_HASH',hash_(pw));
  ui.alert('Coach password updated. You do not need to redeploy just for a password change.');
}

function hash_(s) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)); }
function verifyPassword_(pw) { const h=PropertiesService.getScriptProperties().getProperty('COACH_PASSWORD_HASH'); return !!h && hash_(pw)===h; }
function adminLogin(password) {
  if(!verifyPassword_(password)) throw new Error('Incorrect coach password. Reset it from Google Sheet → Storm HQ → Set Coach Password.');
  const token=Utilities.getUuid().replace(/-/g,''); CacheService.getScriptCache().put('admin:'+token,'1',21600); return {ok:true,token:token,expiresHours:6,version:STORM_VERSION};
}
function requireAdmin_(token) { if(!token || CacheService.getScriptCache().get('admin:'+token)!=='1') throw new Error('Coach session expired. Sign in again.'); }

function doGet(e) {
  e=e||{parameter:{}}; const p=e.parameter||{};
  if(p.page){
    const files={admin:'Admin',family:'FamilyPortal',lineup:'LineupBuilder'}; const f=files[p.page];
    if(!f) return HtmlService.createHtmlOutput('Unknown Storm HQ page.');
    const t=HtmlService.createTemplateFromFile(f); t.appUrl=ScriptApp.getService().getUrl()||''; t.eventId=p.eventId||''; t.version=STORM_VERSION;
    return t.evaluate().setTitle(p.page==='admin'?'Coach Control Center':p.page==='family'?'My Storm Player':'Game Day Builder').addMetaTag('viewport','width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  const action=p.action||'public';
  try {
    if(action==='public') return output_(publicPayload_(),p.callback);
    return output_({ok:false,error:'Unsupported public action'},p.callback);
  } catch(err){ return output_({ok:false,error:String(err.message||err)},p.callback); }
}

function include(filename){ return HtmlService.createHtmlOutputFromFile(filename).getContent(); }
function output_(payload,callback){ const json=JSON.stringify(payload); if(callback) return ContentService.createTextOutput(`${callback}(${json});`).setMimeType(ContentService.MimeType.JAVASCRIPT); return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON); }

function publicPayload_() {
  const data={ok:true,version:STORM_VERSION,settings:getSettings_()};
  Object.keys(PUBLIC_MAP).forEach(k => data[k]=publicRows_(PUBLIC_MAP[k]));

  // Family-only coach messages must never leave the private backend in the public feed.
  data.announcements = publicRows_('Website Announcements').filter(a =>
    ['PUBLIC','BOTH'].includes(String(a.Visibility||'PUBLIC').toUpperCase())
  );

  const eventById={}; data.calendar.forEach(e=>eventById[String(e.EventID)]=e);
  data.eventRosters=rows_('Event Rosters').filter(r => String(r.Assigned||'YES').toUpperCase()==='YES' && eventById[String(r.EventID)] && String(eventById[String(r.EventID)].RosterVisibility||'FAMILY').toUpperCase()==='PUBLIC').map(serializeRecord_);
  return data;
}
function publicRows_(name){ return rows_(name).filter(r => String(r.Show||'YES').toUpperCase()==='YES' && String(r.Approved||'YES').toUpperCase()==='YES').map(serializeRecord_).sort((a,b)=>(Number(a.SortOrder)||999)-(Number(b.SortOrder)||999)); }
function getSettings_(){ const o={}; rows_('Website Settings').forEach(r=>o[String(r.Key)]=serializeValue_('Value',r.Value)); return o; }

function rows_(name) {
  const sh=ensureSheet_(name), headers=HEADERS[name], last=sh.getLastRow(); if(last<2)return [];
  const vals=sh.getRange(2,1,last-1,headers.length).getValues();
  return vals.filter(row=>row.some(v=>v!==''&&v!==null)).map(row=>{const o={};headers.forEach((h,i)=>o[h]=row[i]);return o;});
}
function serializeRecord_(r){ const o={}; Object.keys(r).forEach(k=>o[k]=serializeValue_(k,r[k])); return o; }
function serializeValue_(header,v){ if(Object.prototype.toString.call(v)==='[object Date]'){ if(/time$/i.test(header)||['Time','EndTime','ArrivalTime'].includes(header))return Utilities.formatDate(v,TZ,'h:mm a'); if(/timestamp|updatedat|submittedat|lastupdated/i.test(header))return Utilities.formatDate(v,TZ,"yyyy-MM-dd'T'HH:mm:ss"); return Utilities.formatDate(v,TZ,'yyyy-MM-dd'); } return v; }

function getAdminBootstrap(token) {
  requireAdmin_(token); const tables={}; Object.keys(HEADERS).forEach(n=>{ if(n!=='Admin Log') tables[n]=rows_(n).map(serializeRecord_); });
  return {ok:true,version:STORM_VERSION,headers:HEADERS,tables:tables,settings:getSettings_(),stats:dashboardStats_(),appUrl:ScriptApp.getService().getUrl()};
}
function dashboardStats_(){ return {players:publicRows_('Website Players').length,upcoming:publicRows_('Website Calendar').filter(e=>String(e.Date)>=Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd')).length,pending:rows_('Pending Players').filter(r=>String(r.Status||'PENDING').toUpperCase()==='PENDING').length,availability:rows_('Availability').length,activeHomework:publicRows_('Homework Weeks').filter(w=>String(w.Status).toUpperCase()==='ACTIVE').length,tryouts:publicRows_('Website Tryouts').filter(t=>!['CLOSED','COMPLETED'].includes(String(t.Status).toUpperCase())).length}; }

function adminSaveRow(token,sheetName,record) { requireAdmin_(token); if(!ADMIN_EDITABLE.includes(sheetName))throw new Error('That table is not editable from the Coach Control Center.'); const saved=saveRowDirect_(sheetName,record||{}); logAdmin_('SAVE',sheetName,String(saved[KEY_FIELD[sheetName]]||''),'Coach Control Center'); return {ok:true,record:serializeRecord_(saved)}; }
function saveRowDirect_(sheetName,record) {
  ensureSheet_(sheetName); const headers=HEADERS[sheetName], key=KEY_FIELD[sheetName]; if(!key)throw new Error('Missing key mapping.');
  const prefix={
    'Website Players':'player','Website Calendar':'event','Website Announcements':'announcement','Website Videos':'video','Website Shoutouts':'shoutout','Website Picture of the Week':'picture','Website Gallery':'photo','Website Tryouts':'tryout','Event Rosters':'roster','Game Lineups':'lineup','Availability':'availability','Homework Weeks':'week','Homework Tasks':'task','Homework Questions':'question','Homework Responses':'response','Pending Players':'submission','Parent Photo Submissions':'photo-sub','Form Registry':'form'
  }[sheetName]||'item';
  if(!record[key] && sheetName!=='Website Settings') record[key]=prefix+'-'+Utilities.getUuid().slice(0,8);
  const sh=ensureSheet_(sheetName), vals=rows_(sheetName); let rowNum=0;
  vals.some((r,i)=>{if(String(r[key])===String(record[key])){rowNum=i+2;return true;}return false;});
  if(!rowNum)rowNum=sh.getLastRow()+1;
  const old = rowNum<=sh.getLastRow()?sh.getRange(rowNum,1,1,headers.length).getValues()[0]:headers.map(()=> '');
  const merged={}; headers.forEach((h,i)=>merged[h]=(record[h]!==undefined?record[h]:old[i]));
  if(headers.includes('Show') && !merged.Show) merged.Show='YES'; if(headers.includes('Approved') && !merged.Approved)merged.Approved='YES';
  sh.getRange(rowNum,1,1,headers.length).setValues([headers.map(h=>merged[h]===undefined?'':merged[h])]); return merged;
}
function adminDeleteRow(token,sheetName,keyValue){ requireAdmin_(token); if(!ADMIN_EDITABLE.includes(sheetName))throw new Error('Not allowed.'); const key=KEY_FIELD[sheetName],sh=ensureSheet_(sheetName),data=rows_(sheetName); let row=0;data.some((r,i)=>{if(String(r[key])===String(keyValue)){row=i+2;return true;}return false;});if(row)sh.deleteRow(row);logAdmin_('DELETE',sheetName,String(keyValue),'Coach Control Center');return {ok:true}; }

function adminUploadImage(token,imageData,fileName,mimeType,purpose){ requireAdmin_(token); const folders={'player':'Storm HQ - Player Photos','team':'Storm HQ - Team Photos','logo':'Storm HQ - Brand Assets','homework':'Storm HQ - Homework Media'}; const folder=folders[purpose]||folders.team; return {ok:true,url:saveBase64File_(imageData,fileName||'storm-photo.jpg',mimeType||'image/jpeg',folder)}; }
function saveBase64File_(data,fileName,mimeType,folderName){
  const raw=String(data||'');
  const mimeFromData=(raw.match(/^data:([^;]+);base64,/)||[])[1];
  const finalMime=mimeType||mimeFromData||'image/jpeg';
  const clean=raw.replace(/^data:[^;]+;base64,/,'').replace(/ /g,'+');
  if(!clean)throw new Error('No file data received.');
  const blob=Utilities.newBlob(Utilities.base64Decode(clean),finalMime,fileName||'storm-photo.jpg');
  const file=ensureDriveFolder_(folderName).createFile(blob);
  try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  Utilities.sleep(750);
  return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(file.getId())+'&sz=w2400';
}
function ensureDriveFolder_(name){ const it=DriveApp.getFoldersByName(name); return it.hasNext()?it.next():DriveApp.createFolder(name); }

function adminSaveEventRoster(token,eventId,group,playerIds,notes){ requireAdmin_(token); eventId=String(eventId);group=group||'Event Group'; const sh=ensureSheet_('Event Rosters'); const all=rows_('Event Rosters'); const keep=all.filter(r=>!(String(r.EventID)===eventId&&String(r.Group||'Event Group')===String(group))); sh.clearContents(); sh.getRange(1,1,1,HEADERS['Event Rosters'].length).setValues([HEADERS['Event Rosters']]); const players=rows_('Website Players'),byId={};players.forEach(p=>byId[String(p.PlayerID)]=p); const now=new Date(); const rows=keep.concat((playerIds||[]).map(pid=>({RosterID:'roster-'+Utilities.getUuid().slice(0,8),EventID:eventId,PlayerID:pid,PlayerName:byId[String(pid)]?byId[String(pid)].FirstName:'',Group:group,Assigned:'YES',Notes:notes||'',UpdatedAt:now}))); if(rows.length)sh.getRange(2,1,rows.length,HEADERS['Event Rosters'].length).setValues(rows.map(r=>HEADERS['Event Rosters'].map(h=>r[h]||''))); return {ok:true,count:(playerIds||[]).length}; }

function adminHomeworkReport(token,weekId){ requireAdmin_(token); const players=publicRows_('Website Players'),responses=rows_('Homework Responses').filter(r=>!weekId||String(r.WeekID)===String(weekId)); const latest={};responses.forEach(r=>latest[String(r.PlayerID)+'|'+String(r.WeekID)]=serializeRecord_(r));const weeks=publicRows_('Homework Weeks');return {ok:true,weeks:weeks,players:players,responses:Object.values(latest)}; }
function adminAvailabilityReport(token,eventId){ requireAdmin_(token); return {ok:true,events:publicRows_('Website Calendar'),players:publicRows_('Website Players'),responses:rows_('Availability').filter(r=>!eventId||String(r.EventID)===String(eventId)).map(serializeRecord_)}; }

function generateMissingParentCodes(){ const count=generateMissingParentCodes_(); SpreadsheetApp.getUi().alert(`${count} parent code(s) created. Give each family only its own code.`); }
function generateMissingParentCodes_(){ const sh=ensureSheet_('Parent Codes'), existing=rows_('Parent Codes'), byId={};existing.forEach(r=>byId[String(r.PlayerID)]=r); let count=0; publicRows_('Website Players').forEach(p=>{if(!byId[String(p.PlayerID)]){sh.appendRow([p.PlayerID,p.FirstName,String(Math.floor(100000+Math.random()*900000)),'YES',new Date()]);count++;}});return count; }

function familyLogin(code){ const c=String(code||'').trim(),row=rows_('Parent Codes').find(r=>String(r.ParentCode)===c&&String(r.Active||'YES').toUpperCase()==='YES'); if(!row)throw new Error('That player code was not recognized. Contact the coach if you need a new code.'); const token=Utilities.getUuid().replace(/-/g,'');CacheService.getScriptCache().put('family:'+token,String(row.PlayerID),21600);return {ok:true,token:token,playerID:String(row.PlayerID),expiresHours:6}; }
function familyPlayerId_(token){ const id=token&&CacheService.getScriptCache().get('family:'+token);if(!id)throw new Error('Family session expired. Enter the player code again.');return id; }
function getFamilyDashboard(token){ const pid=familyPlayerId_(token),player=publicRows_('Website Players').find(p=>String(p.PlayerID)===pid);if(!player)throw new Error('Player profile not found.');const today=Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd');const events=publicRows_('Website Calendar').filter(e=>String(e.Date)>=today);const avail=rows_('Availability').filter(r=>String(r.PlayerID)===pid).map(serializeRecord_);const weeks=publicRows_('Homework Weeks').filter(w=>['ACTIVE','SCHEDULED'].includes(String(w.Status||'').toUpperCase()));const weekIds=new Set(weeks.map(w=>String(w.WeekID)));const tasks=rows_('Homework Tasks').filter(t=>weekIds.has(String(t.WeekID))).map(serializeRecord_);const questions=rows_('Homework Questions').filter(q=>weekIds.has(String(q.WeekID))).map(q=>{const o=serializeRecord_(q);delete o.CorrectAnswer;return o;});const responses=rows_('Homework Responses').filter(r=>String(r.PlayerID)===pid).map(serializeRecord_);const messages=publicRows_('Website Announcements').filter(a=>['FAMILY','BOTH'].includes(String(a.Visibility||'PUBLIC').toUpperCase()));const roster=rows_('Event Rosters').filter(r=>String(r.PlayerID)===pid&&String(r.Assigned||'YES').toUpperCase()==='YES').map(serializeRecord_);return {ok:true,player:player,events:events,availability:avail,weeks:weeks,tasks:tasks,questions:questions,responses:responses,messages:messages,eventRoster:roster,settings:getSettings_()}; }
function saveAvailability(token,eventId,status,notes){ const pid=familyPlayerId_(token),players=publicRows_('Website Players'),p=players.find(x=>String(x.PlayerID)===pid),event=publicRows_('Website Calendar').find(e=>String(e.EventID)===String(eventId));if(!event)throw new Error('Event not found.');if(!['READY FOR THE STORM','NOT AVAILABLE','FORECAST UNCERTAIN'].includes(String(status)))throw new Error('Invalid availability status.');const existing=rows_('Availability').find(r=>String(r.EventID)===String(eventId)&&String(r.PlayerID)===pid);const rec={AvailabilityID:existing?existing.AvailabilityID:'availability-'+Utilities.getUuid().slice(0,8),EventID:event.EventID,EventDate:event.Date,EventTitle:event.Title||event.Type,PlayerID:pid,PlayerName:p?p.FirstName:'',Status:status,Notes:notes||'',UpdatedAt:new Date()}; upsertPrivate_('Availability',rec);return {ok:true,record:serializeRecord_(rec)}; }
function submitHomework(token, weekId, taskCompletion, answers) {
  const pid = familyPlayerId_(token);
  const p = publicRows_('Website Players').find(
    x => String(x.PlayerID) === pid
  );

  const qs = rows_('Homework Questions').filter(
    q => String(q.WeekID) === String(weekId)
  );

  let score = 0;
  let max = 0;
  const ans = answers || {};

  qs.forEach(q => {
    const pts = Number(q.Points) || 1;

    // IMPORTANT:
    // FALSE is a valid answer and must not be treated as blank.
    const correctRaw = q.CorrectAnswer;
    const hasCorrectAnswer =
      correctRaw !== '' &&
      correctRaw !== null &&
      correctRaw !== undefined;

    if (hasCorrectAnswer) {
      max += pts;

      const submittedRaw =
        Object.prototype.hasOwnProperty.call(ans, q.QuestionID)
          ? ans[q.QuestionID]
          : '';

      const submittedAnswer = String(submittedRaw).trim().toLowerCase();
      const correctAnswer = String(correctRaw).trim().toLowerCase();

      if (submittedAnswer === correctAnswer) {
        score += pts;
      }
    }
  });

  const existing = rows_('Homework Responses').find(
    r =>
      String(r.WeekID) === String(weekId) &&
      String(r.PlayerID) === pid
  );

  const code = rows_('Parent Codes').find(
    r => String(r.PlayerID) === pid
  );

  const masked = code
    ? '••••' + String(code.ParentCode).slice(-2)
    : '';

  const rec = {
    ResponseID: existing
      ? existing.ResponseID
      : 'response-' + Utilities.getUuid().slice(0, 8),
    WeekID: weekId,
    PlayerID: pid,
    PlayerName: p ? p.FirstName : '',
    TaskCompletionJSON: JSON.stringify(taskCompletion || {}),
    AnswersJSON: JSON.stringify(ans),
    Score: score,
    MaxScore: max,
    SubmittedAt: new Date(),
    ParentCodeMasked: masked
  };

  upsertPrivate_('Homework Responses', rec);

  return {
    ok: true,
    score: score,
    maxScore: max,
    submittedAt: serializeValue_('SubmittedAt', rec.SubmittedAt)
  };
}
function submitFamilyPhoto(token,title,caption,imageData,fileName,mimeType,parentName){ const pid=familyPlayerId_(token),p=publicRows_('Website Players').find(x=>String(x.PlayerID)===pid);const url=saveBase64File_(imageData,fileName||'family-photo.jpg',mimeType||'image/jpeg','Storm HQ - Family Photo Submissions');const rec={SubmissionID:'photo-sub-'+Utilities.getUuid().slice(0,8),PlayerID:pid,PlayerName:p?p.FirstName:'',ParentName:parentName||'',Title:title||'Family Photo',Caption:caption||'',ImageURL:url,Status:'PENDING',SubmittedAt:new Date(),CoachNotes:''};upsertPrivate_('Parent Photo Submissions',rec);return {ok:true}; }
function upsertPrivate_(sheetName,record){ const key=KEY_FIELD[sheetName],headers=HEADERS[sheetName],sh=ensureSheet_(sheetName),data=rows_(sheetName);let row=0;data.some((r,i)=>{if(String(r[key])===String(record[key])){row=i+2;return true;}return false;});if(!row)row=sh.getLastRow()+1;sh.getRange(row,1,1,headers.length).setValues([headers.map(h=>record[h]===undefined?'':record[h])]); }

function lineupLogin(password){ return adminLogin(password); }
function getLineupBootstrap(token,eventId){ requireAdmin_(token); const events=publicRows_('Website Calendar').filter(e=>['GAME','TOURNAMENT'].includes(String(e.Type||'').toUpperCase()));const selected=eventId?events.find(e=>String(e.EventID)===String(eventId)):events[0];const rosters=rows_('Event Rosters').filter(r=>!selected||String(r.EventID)===String(selected.EventID)).map(serializeRecord_);const availability=rows_('Availability').filter(r=>!selected||String(r.EventID)===String(selected.EventID)).map(serializeRecord_);const lineups=rows_('Game Lineups').filter(r=>!selected||String(r.EventID)===String(selected.EventID)).map(serializeRecord_);return {ok:true,events:events,selected:selected,players:publicRows_('Website Players'),rosters:rosters,availability:availability,lineups:lineups,settings:getSettings_()}; }
function saveLineupPlan(token,eventId,plan,planLabel,useWhen,lineRows){ requireAdmin_(token); const sh=ensureSheet_('Game Lineups'),existing=rows_('Game Lineups').filter(r=>!(String(r.EventID)===String(eventId)&&String(r.Plan)===String(plan)));const pmap={};publicRows_('Website Players').forEach(p=>pmap[String(p.PlayerID)]=p);const now=new Date();const added=(lineRows||[]).map((r,i)=>({LineupRowID:'lineup-'+Utilities.getUuid().slice(0,8),EventID:eventId,Plan:plan,PlanLabel:planLabel||plan,UseWhen:useWhen||'',BatOrder:Number(r.BatOrder)||i+1,PlayerID:r.PlayerID,PlayerName:pmap[String(r.PlayerID)]?pmap[String(r.PlayerID)].FirstName:r.PlayerName||'',Jersey:pmap[String(r.PlayerID)]?pmap[String(r.PlayerID)].Jersey:r.Jersey||'',Position:r.Position||'',Starter:r.Starter||'YES',Notes:r.Notes||'',Inn1:r.Inn1||'',Inn2:r.Inn2||'',Inn3:r.Inn3||'',Inn4:r.Inn4||'',Inn5:r.Inn5||'',Inn6:r.Inn6||'',Inn7:r.Inn7||'',UpdatedAt:now}));const all=existing.concat(added);sh.clearContents();sh.getRange(1,1,1,HEADERS['Game Lineups'].length).setValues([HEADERS['Game Lineups']]);if(all.length)sh.getRange(2,1,all.length,HEADERS['Game Lineups'].length).setValues(all.map(r=>HEADERS['Game Lineups'].map(h=>r[h]||'')));return {ok:true,count:added.length}; }

function adminApprovePending(token,submissionId,overrides){ requireAdmin_(token); const pending=rows_('Pending Players').find(r=>String(r.SubmissionID)===String(submissionId));if(!pending)throw new Error('Pending player not found.');const o=overrides||{},pid=o.PlayerID||pending.PlayerID||('player-'+Utilities.getUuid().slice(0,6));const rec={Show:'YES',Approved:'YES',PlayerID:pid,Jersey:o.Jersey||pending.Jersey||'',FirstName:o.FirstName||pending.FirstName||'Player',LastInitial:o.LastInitial||pending.LastInitial||'',Positions:o.Positions||pending.Positions||'',BatsThrows:o.BatsThrows||pending.BatsThrows||'',ClassYear:o.ClassYear||pending.ClassYear||'',PhotoURL:o.PhotoURL||'',BackgroundURL:o.BackgroundURL||'',StrongestPart:o.StrongestPart||pending.StrongestPart||'',SeasonGoal:o.SeasonGoal||pending.SeasonGoal||'',FavoriteColor:o.FavoriteColor||pending.FavoriteColor||'',FavoritePlayer:o.FavoritePlayer||pending.FavoritePlayer||'',Excitement:o.Excitement||pending.Excitement||'',Quote:o.Quote||pending.Quote||'',CardX:50,CardY:35,CardZoom:1,ProfileX:50,ProfileY:35,ProfileZoom:1,SortOrder:o.SortOrder||99};saveRowDirect_('Website Players',rec);const psh=ensureSheet_('Pending Players'),ph=HEADERS['Pending Players'],pdata=rows_('Pending Players');let row=0;pdata.some((r,i)=>{if(String(r.SubmissionID)===String(submissionId)){row=i+2;return true;}return false;});if(row)psh.getRange(row,ph.indexOf('Status')+1).setValue('APPROVED');generateMissingParentCodes_();return {ok:true,player:rec}; }
function adminRejectPending(token,submissionId,notes){ requireAdmin_(token); const sh=ensureSheet_('Pending Players'),h=HEADERS['Pending Players'],data=rows_('Pending Players');let row=0;data.some((r,i)=>{if(String(r.SubmissionID)===String(submissionId)){row=i+2;return true;}return false;});if(row){sh.getRange(row,h.indexOf('Status')+1).setValue('REJECTED');sh.getRange(row,h.indexOf('CoachNotes')+1).setValue(notes||'');}return {ok:true}; }

function adminApproveFamilyPhoto(token,submissionId,destination){
  requireAdmin_(token);

  const photos=rows_('Parent Photo Submissions');
  const pending=photos.find(r=>String(r.SubmissionID)===String(submissionId));
  if(!pending) throw new Error('Family photo submission not found.');

  const dest=String(destination||'GALLERY').toUpperCase();
  if(!pending.ImageURL) throw new Error('This family photo has no image URL.');

  let published;

  if(dest==='PICTURE'){
    published=saveRowDirect_('Website Picture of the Week',{
      Show:'YES',
      Approved:'YES',
      PictureID:'picture-'+Utilities.getUuid().slice(0,8),
      Title:pending.Title||'Family Photo',
      Week:Utilities.formatDate(new Date(),TZ,'MMM d, yyyy'),
      Caption:pending.Caption||'',
      ImageURL:pending.ImageURL,
      SubmittedBy:pending.ParentName||pending.PlayerName||'Storm Family'
    });
  }else{
    published=saveRowDirect_('Website Gallery',{
      Show:'YES',
      Approved:'YES',
      PhotoID:'photo-'+Utilities.getUuid().slice(0,8),
      Title:pending.Title||'Family Photo',
      Caption:pending.Caption||'',
      ImageURL:pending.ImageURL,
      Date:pending.SubmittedAt||new Date(),
      PlayerID:pending.PlayerID||'',
      Category:'Family Submission',
      SortOrder:99
    });
  }

  const sh=ensureSheet_('Parent Photo Submissions');
  const h=HEADERS['Parent Photo Submissions'];
  let row=0;
  photos.some((r,i)=>{
    if(String(r.SubmissionID)===String(submissionId)){
      row=i+2;
      return true;
    }
    return false;
  });

  if(row){
    sh.getRange(row,h.indexOf('Status')+1).setValue(dest==='PICTURE'?'APPROVED_PICTURE':'APPROVED_GALLERY');
    sh.getRange(row,h.indexOf('CoachNotes')+1).setValue(dest==='PICTURE'?'Published as Picture of the Week':'Published to Storm Gallery');
  }

  logAdmin_('APPROVE_FAMILY_PHOTO','Parent Photo Submissions',String(submissionId),dest);
  return {ok:true,destination:dest,record:serializeRecord_(published)};
}

function adminRejectFamilyPhoto(token,submissionId,notes){
  requireAdmin_(token);

  const sh=ensureSheet_('Parent Photo Submissions');
  const h=HEADERS['Parent Photo Submissions'];
  const data=rows_('Parent Photo Submissions');
  let row=0;

  data.some((r,i)=>{
    if(String(r.SubmissionID)===String(submissionId)){
      row=i+2;
      return true;
    }
    return false;
  });

  if(!row) throw new Error('Family photo submission not found.');

  sh.getRange(row,h.indexOf('Status')+1).setValue('REJECTED');
  sh.getRange(row,h.indexOf('CoachNotes')+1).setValue(notes||'');
  logAdmin_('REJECT_FAMILY_PHOTO','Parent Photo Submissions',String(submissionId),notes||'');
  return {ok:true};
}

function createStormFormSuite(){ const result=createStormFormSuite_(); SpreadsheetApp.getUi().alert(`Storm forms ready. ${result.created} new form(s) created. Review Form Registry and Website Settings.`); }
function createStormFormSuite_(){ ensureSheet_('Form Registry');let created=0;const team=getSettings_().teamName||'2 Out Storm 10U';const forms=[
  {key:'PLAYER_INTEREST',title:`${team} Player Interest`,setting:'interest',build:f=>{f.setDescription(`Tell us about your athlete and your interest in ${team}.`);f.addTextItem().setTitle('Player name').setRequired(true);f.addTextItem().setTitle('Birth year').setRequired(true);f.addTextItem().setTitle('Primary positions');f.addTextItem().setTitle('Parent name').setRequired(true);f.addTextItem().setTitle('Parent email').setRequired(true);f.addTextItem().setTitle('Parent phone').setRequired(true);f.addParagraphTextItem().setTitle('Tell us about your athlete and what you are looking for in a team.');}},
  {key:'ACCEPTED_PLAYER',title:`${team} Accepted Player Information`,setting:'profile',build:f=>{f.setDescription('Welcome to the Storm. This information enters a private coach approval queue before anything is published.');f.addTextItem().setTitle('Player First Name').setRequired(true);f.addTextItem().setTitle('Player Last Initial');f.addTextItem().setTitle('Jersey Number');f.addTextItem().setTitle('Positions');f.addMultipleChoiceItem().setTitle('Bats / Throws').setChoiceValues(['R/R','R/L','L/R','L/L','Switch / R','Switch / L']);f.addTextItem().setTitle('Graduation Year');f.addParagraphTextItem().setTitle('Strongest Part of Her Game');f.addParagraphTextItem().setTitle('Season Goal');f.addTextItem().setTitle('Favorite Color');f.addTextItem().setTitle('Favorite Softball Player');f.addTextItem().setTitle('Excitement Level (1-10)');f.addTextItem().setTitle('Player Quote / Motto');f.addTextItem().setTitle('Parent Name').setRequired(true);f.addTextItem().setTitle('Parent Email').setRequired(true);f.addTextItem().setTitle('Parent Phone').setRequired(true);f.addMultipleChoiceItem().setTitle('Permission to use parent-approved player photos on the team website').setChoiceValues(['YES','NO']).setRequired(true);}},
  {key:'PRIVATE_MESSAGE',title:`${team} Private Parent Message`,setting:'message',build:f=>{f.setDescription('Send a private message to the coaching staff.');f.addTextItem().setTitle('Parent name').setRequired(true);f.addTextItem().setTitle('Player name');f.addTextItem().setTitle('Parent email').setRequired(true);f.addTextItem().setTitle('Parent phone');f.addListItem().setTitle('Message type').setChoiceValues(['Question','Attendance update','Player update','Concern','Schedule issue','Profile update','Other']);f.addParagraphTextItem().setTitle('Message').setRequired(true);}},
  {key:'PICTURE_SUBMISSION',title:`${team} Picture of the Week Submission`,setting:'photo',build:f=>{f.setDescription('Use this form for the caption/details. Actual photo upload is easiest through the private Family Portal.');f.addTextItem().setTitle('Parent name').setRequired(true);f.addTextItem().setTitle('Player name');f.addTextItem().setTitle('Photo title');f.addParagraphTextItem().setTitle('Photo caption');f.addTextItem().setTitle('Date / photo week');f.addMultipleChoiceItem().setTitle('I confirm I have permission to submit this photo for possible team website use.').setChoiceValues(['YES']).setRequired(true);}}
];
  forms.forEach(spec=>{const existing=rows_('Form Registry').find(r=>String(r.FormKey)===spec.key&&String(r.Active||'YES').toUpperCase()==='YES'&&r.PublicURL);if(existing){setSetting_(spec.setting,existing.PublicURL);return;}const ss=SpreadsheetApp.getActiveSpreadsheet(),before=new Set(ss.getSheets().map(s=>s.getName()));const f=FormApp.create(spec.title);spec.build(f);f.setConfirmationMessage(`Thank you. Your response has been received by ${team}.`);f.setDestination(FormApp.DestinationType.SPREADSHEET,ss.getId());SpreadsheetApp.flush();Utilities.sleep(1200);const after=ss.getSheets().map(s=>s.getName());const response=after.find(n=>!before.has(n))||'';saveRowDirect_('Form Registry',{FormKey:spec.key,FormTitle:spec.title,PublicURL:f.getPublishedUrl(),EditURL:f.getEditUrl(),ResponseSheet:response,Active:'YES',Notes:''});setSetting_(spec.setting,f.getPublishedUrl());if(spec.key==='ACCEPTED_PLAYER'&&response)PropertiesService.getScriptProperties().setProperty('ACCEPTED_FORM_RESPONSE_SHEET',response);created++;}); return {created:created}; }
function setSetting_(key,value){ saveRowDirect_('Website Settings',{Key:key,Value:value,Notes:'Managed by Storm HQ'}); }
function installStormFormTrigger(){ const ss=SpreadsheetApp.getActiveSpreadsheet();ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='onStormFormSubmit').forEach(t=>ScriptApp.deleteTrigger(t));ScriptApp.newTrigger('onStormFormSubmit').forSpreadsheet(ss).onFormSubmit().create();SpreadsheetApp.getUi().alert('Form trigger installed. Accepted Player submissions will enter Pending Players automatically.'); }
function setAcceptedPlayerResponseTab(){ const ui=SpreadsheetApp.getUi();const r=ui.prompt('Accepted Player Response Tab','Enter the exact Google Sheet tab name receiving Accepted Player form responses.',ui.ButtonSet.OK_CANCEL);if(r.getSelectedButton()!==ui.Button.OK)return;PropertiesService.getScriptProperties().setProperty('ACCEPTED_FORM_RESPONSE_SHEET',r.getResponseText().trim());ui.alert('Accepted Player response tab saved.'); }
function onStormFormSubmit(e){ try{const tab=e&&e.range?e.range.getSheet().getName():'';const accepted=PropertiesService.getScriptProperties().getProperty('ACCEPTED_FORM_RESPONSE_SHEET')||'';if(tab!==accepted)return;const nv=e.namedValues||{};enqueueAccepted_(nv);}catch(err){logAdmin_('FORM_ERROR','Accepted Player','',String(err.message||err));} }
function formVal_(nv,names){for(let i=0;i<names.length;i++){const k=Object.keys(nv).find(x=>x.toLowerCase()===names[i].toLowerCase());if(k)return Array.isArray(nv[k])?nv[k].join(', '):nv[k];}return '';}
function enqueueAccepted_(nv){ const rec={SubmissionID:'submission-'+Utilities.getUuid().slice(0,8),Timestamp:new Date(),Status:'PENDING',PlayerID:'',FirstName:formVal_(nv,['Player First Name','Player first name','Player name']),LastInitial:formVal_(nv,['Player Last Initial','Last initial']),Jersey:formVal_(nv,['Jersey Number','Jersey']),Positions:formVal_(nv,['Positions','Primary positions']),BatsThrows:formVal_(nv,['Bats / Throws','BatsThrows']),ClassYear:formVal_(nv,['Graduation Year','Class Year']),StrongestPart:formVal_(nv,['Strongest Part of Her Game','Strongest part']),SeasonGoal:formVal_(nv,['Season Goal']),FavoriteColor:formVal_(nv,['Favorite Color']),FavoritePlayer:formVal_(nv,['Favorite Softball Player','Favorite Player']),Excitement:formVal_(nv,['Excitement Level (1-10)','Excitement']),Quote:formVal_(nv,['Player Quote / Motto','Player Quote']),ParentName:formVal_(nv,['Parent Name','Parent name']),ParentEmail:formVal_(nv,['Parent Email','Parent email']),ParentPhone:formVal_(nv,['Parent Phone','Parent phone']),PhotoPermission:formVal_(nv,['Permission to use parent-approved player photos on the team website']),RawJSON:JSON.stringify(nv),CoachNotes:''};upsertPrivate_('Pending Players',rec); }
function importExistingAcceptedResponses(token){ if(token)requireAdmin_(token);const tab=PropertiesService.getScriptProperties().getProperty('ACCEPTED_FORM_RESPONSE_SHEET');if(!tab)throw new Error('Accepted Player response tab not configured.');const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);if(!sh)throw new Error('Response tab not found.');const vals=sh.getDataRange().getDisplayValues();if(vals.length<2)return {ok:true,count:0};const headers=vals[0],existingRaw=new Set(rows_('Pending Players').map(r=>String(r.RawJSON||'')));let count=0;vals.slice(1).forEach(row=>{const nv={};headers.forEach((h,i)=>nv[h]=[row[i]]);const raw=JSON.stringify(nv);if(!existingRaw.has(raw)){enqueueAccepted_(nv);count++;}});return {ok:true,count:count}; }


function adminCreateStormForms(token){ requireAdmin_(token); return Object.assign({ok:true}, createStormFormSuite_()); }
function adminGenerateParentCodes(token){ requireAdmin_(token); return {ok:true,count:generateMissingParentCodes_()}; }
function adminHealth(token){ requireAdmin_(token); return stormHealth_(); }

function showStormHealth(){ const h=stormHealth_();SpreadsheetApp.getUi().alert('Storm HQ Health',h.lines.join('\n'),SpreadsheetApp.getUi().ButtonSet.OK); }
function stormHealth_(){const lines=[];Object.keys(HEADERS).forEach(n=>lines.push(`${SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n)?'✓':'✗'} ${n}`));lines.push(`${PropertiesService.getScriptProperties().getProperty('COACH_PASSWORD_HASH')?'✓':'✗'} Coach password set`);lines.push(`${ScriptApp.getService().getUrl()?'✓':'!'} Web app URL ${ScriptApp.getService().getUrl()?'available':'appears after deployment'}`);lines.push(`${PropertiesService.getScriptProperties().getProperty('ACCEPTED_FORM_RESPONSE_SHEET')?'✓':'!'} Accepted Player response tab configured`);return {ok:true,lines:lines}; }
function showCoachControlLink(){showLinkDialog_('Coach Control Center',(ScriptApp.getService().getUrl()||'')+'?page=admin');}
function showFamilyPortalLink(){showLinkDialog_('Family Portal',(ScriptApp.getService().getUrl()||'')+'?page=family');}
function showLinkDialog_(title,url){const html=HtmlService.createHtmlOutput(`<div style="font:16px Arial;padding:20px"><h2>${title}</h2><p><a target="_blank" href="${url}">${url||'Deploy the web app first.'}</a></p></div>`).setWidth(520).setHeight(180);SpreadsheetApp.getUi().showModalDialog(html,title);}
function logAdmin_(action,sheet,key,details){try{ensureSheet_('Admin Log').appendRow([new Date(),action,sheet,key,details]);}catch(e){}}
function testFamilyPortalRender() {
  const t = HtmlService.createTemplateFromFile('FamilyPortal');
  t.appUrl = ScriptApp.getService().getUrl() || '';
  t.eventId = '';
  t.version = STORM_VERSION;

  const html = t.evaluate().getContent();

  Logger.log('Family Portal rendered successfully.');
  Logger.log(html.substring(0, 200));
}function testFamilyDoGetRoute() {
  const response = doGet({
    parameter: {
      page: 'family'
    }
  });

  const html = response.getContent();

  Logger.log('Family doGet route rendered successfully.');
  Logger.log(html.substring(0, 300));
}
