/**
 * run.js — proves the engine does what the rails promise.
 *
 *   node test/run.js
 *
 * These run against fake Google services (test/harness.js), so they are fast
 * and they touch nothing real. They test the thing that matters: that a
 * refusal leaves nothing behind, that a draft is never a send, and that a row
 * is never processed twice.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const { loadEngine } = require('./harness');

let passed = 0, failed = 0;
function check(name, condition, detail) {
  if (condition) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n${t}`); }

const HEADERS = ['matter_id', 'client_name', 'client_email', 'matter_type',
  'fee_amount', 'status', 'notes', 'packet_folder_url', 'generated_at'];

function baseConfig(sheetId, folderId, templateIds, overrides) {
  const cfg = {
    agentName: 'Test Agent',
    timezone: 'America/Los_Angeles',
    maxPerRun: 5,
    intake: {
      sheetId, tabName: 'Intake', idColumn: 'matter_id', statusColumn: 'status',
      readyValue: 'New', workingValue: 'Processing', doneValue: 'Generated',
      needsInfoValue: 'Needs info', failedValue: 'Needs attention', reasonColumn: 'notes'
    },
    output: { documentsFolderId: folderId, folderNameFormat: '{{MATTER_ID}} - {{CLIENT_NAME}}' },
    profile: { FIRM_NAME: 'Test Firm PLLC', FIRM_PHONE: '(000) 000-0000' },
    steps: [
      {
        type: 'fillTemplates',
        templates: [
          { key: 'engagement', docId: templateIds[0], name: '{{MATTER_ID}} - Engagement Letter' },
          { key: 'fee', docId: templateIds[1], name: '{{MATTER_ID}} - Fee Agreement' }
        ]
      },
      { type: 'review', checks: ['no_placeholders_left', 'all_documents_present'], expectedDocuments: 2 },
      { type: 'exportPdf' },
      {
        type: 'draftEmail', to: '{{CLIENT_EMAIL}}',
        subject: 'Your documents, {{CLIENT_NAME}}',
        body: 'Dear {{CLIENT_NAME}},\n\n{{_DOCUMENT_LIST}}\n\n{{FIRM_NAME}}'
      },
      { type: 'writeBack', columns: { packet_folder_url: '{{_FOLDER_URL}}', generated_at: '{{_NOW}}' } }
    ],
    rails: { neverInvent: true, allowInternalNotify: false, internalDomains: [] },
    logging: { tabName: 'Log' }
  };
  return Object.assign(cfg, overrides || {});
}

function setUp(rows, overrides) {
  const sheetId = 'sheet-1';
  const engine = loadEngine(baseConfig(sheetId, 'placeholder', ['t1', 't2'], overrides));
  const world = engine.world;

  const root = world.createRoot('Documents');
  const engagement = world.createTemplate('TEMPLATE - Engagement Letter',
    'ENGAGEMENT LETTER\n\nThis agreement is between {{FIRM_NAME}} and {{CLIENT_NAME}} ' +
    'regarding a {{MATTER_TYPE}} matter. The fee is {{FEE_AMOUNT}}.\n\nCall us on {{FIRM_PHONE}}.');
  const fee = world.createTemplate('TEMPLATE - Fee Agreement',
    'FEE AGREEMENT\n\n{{CLIENT_NAME}} agrees to pay {{FEE_AMOUNT}} to {{FIRM_NAME}}.');
  world.createSheet(sheetId, 'Intake', [HEADERS].concat(rows));

  // Point CONFIG at the fixtures that now exist in this world.
  engine.call(`CONFIG.output.documentsFolderId = ${JSON.stringify(root.getId())};`);
  engine.call(`CONFIG.steps[0].templates[0].docId = ${JSON.stringify(engagement)};`);
  engine.call(`CONFIG.steps[0].templates[1].docId = ${JSON.stringify(fee)};`);

  return engine;
}

function rowFor(id, name, email, type, fee, status) {
  return [id, name, email, type, fee, status, '', '', ''];
}

function statusOf(world, sheetId, id) {
  const grid = world.grid(sheetId, 'Intake');
  const row = grid.find((r) => r[0] === id);
  return row ? row[HEADERS.indexOf('status')] : null;
}
function cellOf(world, sheetId, id, col) {
  const grid = world.grid(sheetId, 'Intake');
  const row = grid.find((r) => r[0] === id);
  return row ? row[HEADERS.indexOf(col)] : null;
}

/* ------------------------------------------------------------------ */

section('1. The happy path: one ready row becomes a packet');
{
  const e = setUp([rowFor('M-001', 'Maria Alvarez', 'maria@example.com', 'Personal Injury', '$7,500.00', 'New')]);
  const out = e.call('Runner.runOnce()');
  const w = e.world;

  check('one row ran', out.ran === 1, JSON.stringify(out));
  check('status is Generated', statusOf(w, 'sheet-1', 'M-001') === 'Generated');
  check('one folder created', w.folderNames().filter((n) => n === 'M-001 - Maria Alvarez').length === 1,
    JSON.stringify(w.folderNames()));
  check('two documents in the folder',
    w.docsIn('M-001 - Maria Alvarez').filter((n) => !n.endsWith('.pdf')).length === 2,
    JSON.stringify(w.docsIn('M-001 - Maria Alvarez')));
  check('two PDFs exported',
    w.docsIn('M-001 - Maria Alvarez').filter((n) => n.endsWith('.pdf')).length === 2);
  check('placeholders were replaced',
    !w.docText('M-001 - Engagement Letter').includes('{{'),
    w.docText('M-001 - Engagement Letter'));
  check('the client name is in the document',
    w.docText('M-001 - Engagement Letter').includes('Maria Alvarez'));
  check('the firm profile filled too',
    w.docText('M-001 - Engagement Letter').includes('Test Firm PLLC'));
  check('one draft created', w.drafts.length === 1);
  check('draft is addressed to the client', w.drafts[0].to === 'maria@example.com');
  check('draft carries the PDFs', (w.drafts[0].options.attachments || []).length === 2);
  check('NOTHING was sent', w.sent.length === 0);
  check('folder url written back', String(cellOf(w, 'sheet-1', 'M-001', 'packet_folder_url')).startsWith('https://'));
  check('generated_at written back', String(cellOf(w, 'sheet-1', 'M-001', 'generated_at')).length > 0);
  check('log line written', w.hasTab('sheet-1', 'Log') && w.grid('sheet-1', 'Log').length === 2);
}

section('2. The gate: a missing value refuses and writes nothing');
{
  const e = setUp([rowFor('M-002', 'Sandra Beckett', 'sandra@example.com', 'Estate Planning', '', 'New')]);
  const out = e.call('Runner.runOnce()');
  const w = e.world;

  check('the run refused', out.results[0].status === 'refused', JSON.stringify(out.results[0]));
  check('it named the missing field', out.results[0].missing.includes('FEE_AMOUNT'),
    JSON.stringify(out.results[0].missing));
  check('status is Needs info', statusOf(w, 'sheet-1', 'M-002') === 'Needs info');
  check('the reason is in the sheet', String(cellOf(w, 'sheet-1', 'M-002', 'notes')).includes('FEE_AMOUNT'));
  check('NO folder was created', w.folderNames().filter((n) => n.startsWith('M-002')).length === 0,
    JSON.stringify(w.folderNames()));
  check('NO document was created', w.docText('M-002 - Engagement Letter') === null);
  check('NO draft was created', w.drafts.length === 0);
  check('nothing was sent', w.sent.length === 0);
  check('the refusal was logged', w.grid('sheet-1', 'Log').some((r) => String(r[2]) === 'REFUSED'));
}

section('3. A failed review stops before the row is marked done');
{
  const e = setUp([rowFor('M-003', 'Daniel Whitfield', 'dan@example.com', 'Family Law', '$3,000.00', 'New')]);
  e.call('CONFIG.steps[1].expectedDocuments = 3;');  // two are generated, so this must fail
  const out = e.call('Runner.runOnce()');
  const w = e.world;

  check('the run failed', out.results[0].status === 'failed', JSON.stringify(out.results[0]));
  check('status is Needs attention', statusOf(w, 'sheet-1', 'M-003') === 'Needs attention');
  check('the finding is in the sheet',
    String(cellOf(w, 'sheet-1', 'M-003', 'notes')).includes('expected 3 documents'));
  check('no draft went out on a failed review', w.drafts.length === 0);
  check('nothing was sent', w.sent.length === 0);
}

section('4. It never touches a row twice');
{
  const e = setUp([
    rowFor('M-004', 'Kevin O\'Donnell', 'kevin@example.com', 'Immigration', '$4,200.00', 'New'),
    rowFor('M-005', 'Angela Moss', 'angela@example.com', 'Probate', '$2,000.00', 'Generated')
  ]);
  const first = e.call('Runner.runOnce()');
  const second = e.call('Runner.runOnce()');
  const w = e.world;

  check('first run took only the New row', first.ran === 1, JSON.stringify(first.results && first.results.map(r => r.id)));
  check('second run found nothing', second.ran === 0, JSON.stringify(second));
  check('the Generated row was left alone', statusOf(w, 'sheet-1', 'M-005') === 'Generated');
  check('an apostrophe in the name is fine',
    w.docText("M-004 - Engagement Letter").includes("Kevin O'Donnell"));
  check('only one folder for that matter',
    w.folderNames().filter((n) => n.startsWith('M-004')).length === 1);
}

section('5. Rails');
{
  const e = setUp([rowFor('M-006', 'Test Client', 't@example.com', 'Probate', '$1,000.00', 'New')]);

  let threwWhenOff = false;
  try { e.call(`Rails.assertNotifyAllowed('anyone@example.com', CONFIG.rails)`); }
  catch (err) { threwWhenOff = /disabled/.test(err.message); }
  check('notify is off by default', threwWhenOff);

  let threwOffDomain = false;
  e.call(`CONFIG.rails.allowInternalNotify = true; CONFIG.rails.internalDomains = ['yourfirm.com'];`);
  try { e.call(`Rails.assertNotifyAllowed('client@gmail.com', CONFIG.rails)`); }
  catch (err) { threwOffDomain = /not on an internal domain/.test(err.message); }
  check('notify refuses a non-firm address', threwOffDomain);
  check('notify allows the firm domain',
    e.call(`Rails.assertNotifyAllowed('ops@YourFirm.com', CONFIG.rails)`) === true);

  check('a blank string counts as missing',
    e.call(`JSON.stringify(Rails.missingValues(['A','B'], {A:'', B:'x'}))`) === '["A"]');
  check('zero counts as a value',
    e.call(`JSON.stringify(Rails.missingValues(['A'], {A:0}))`) === '[]');
  check('placeholders are found',
    e.call(`JSON.stringify(Rails.placeholdersIn('hi {{A_B}} and {{C}} and {{A_B}}'))`) === '["A_B","C"]');
  check('apostrophes are escaped for Drive queries',
    e.call(`Rails.escapeQuery("O'Donnell")`) === "O\\'Donnell");
}

section('6. selfTest tells you what is missing before you turn it on');
{
  const e = setUp([rowFor('M-007', 'Someone', 's@example.com', 'Probate', '$500.00', 'New')]);
  const clean = e.call('selfTest()');
  check('a good config passes', clean.includes('SELF TEST PASSED'), clean);

  const e2 = setUp([rowFor('M-008', 'Someone', 's@example.com', 'Probate', '$500.00', 'New')]);
  e2.call(`CONFIG.steps[3].body = CONFIG.steps[3].body + ' {{NOT_A_COLUMN}}';`);
  const dirty = e2.call('selfTest()');
  check('an unfillable placeholder is caught', dirty.includes('NOT_A_COLUMN'), dirty);
  check('and it says where to put it', dirty.includes('Add a column'), dirty);
}

section('7. The trigger installs and removes');
{
  const e = setUp([rowFor('M-009', 'Someone', 's@example.com', 'Probate', '$500.00', 'New')]);
  e.call('CONFIG.triggerEveryMinutes = 10;');
  e.call('installTrigger()');
  check('one trigger installed', e.world.triggers.length === 1, JSON.stringify(e.world.triggers));
  check('it calls runOnce every 10 minutes',
    e.world.triggers[0].fn === 'runOnce' && e.world.triggers[0].minutes === 10);
  e.call('removeTriggers()');
  check('and it can be taken away', e.world.triggers.length === 0);
}

section('8. Calendar deadlines come from the row, never from a guess');
{
  const e = setUp([rowFor('M-010', 'Ruth Carver', 'ruth@example.com', 'Personal Injury', '$5,000.00', 'New')]);
  e.call(`CONFIG.steps.splice(2, 0, { type: 'createCalendarEvent', dateKey: 'DEADLINE',
    title: 'SOL — {{CLIENT_NAME}} ({{MATTER_ID}})', description: 'Matter type: {{MATTER_TYPE}}' });`);

  // No DEADLINE column at all, so the gate must refuse before anything is made.
  const refused = e.call('Runner.runOnce()');
  check('a deadline it cannot source is a refusal', refused.results[0].status === 'refused',
    JSON.stringify(refused.results[0]));
  check('and it names the field', refused.results[0].missing.includes('DEADLINE'));
  check('no event was created', e.world.events.length === 0);
  check('no folder was created', e.world.folderNames().filter((n) => n.startsWith('M-010')).length === 0);

  // Now give it the column, and it books the date it was given.
  const e2 = setUp([rowFor('M-011', 'Ruth Carver', 'ruth@example.com', 'Personal Injury', '$5,000.00', 'New')]);
  e2.call(`(function () {
    const grid = SpreadsheetApp.openById('sheet-1').getSheetByName('Intake');
  })();`);
  const w2 = e2.world;
  const grid = w2.grid('sheet-1', 'Intake');
  grid[0].push('deadline');
  grid[1].push('2027-03-14');
  e2.call(`CONFIG.steps.splice(2, 0, { type: 'createCalendarEvent', dateKey: 'DEADLINE',
    title: 'SOL — {{CLIENT_NAME}} ({{MATTER_ID}})', description: 'Matter type: {{MATTER_TYPE}}' });`);
  const ok = e2.call('Runner.runOnce()');
  check('with the column present it runs', ok.results[0].status === 'ok', JSON.stringify(ok.results[0]));
  check('one calendar event created', w2.events.length === 1, JSON.stringify(w2.events));
  check('titled from the row', w2.events[0].title === 'SOL — Ruth Carver (M-011)', w2.events[0].title);
  check('on the date the row gave it', new Date(w2.events[0].date).getFullYear() === 2027);
}

section('9. Outbound HTTP: off by default, allowlisted, secrets never in config');
{
  const e = setUp([rowFor('M-012', 'Nina Park', 'nina@example.com', 'Probate', '$1,500.00', 'New')]);
  e.call(`CONFIG.steps.push({ type: 'httpRequest', method: 'post',
    url: 'https://api.example-crm.com/matters',
    headers: { Authorization: 'Bearer {{@CRM_TOKEN}}' },
    payload: { name: '{{CLIENT_NAME}}', matter: '{{MATTER_ID}}' },
    saveAs: 'CRM_ID', jsonPath: 'id' });`);

  // Off by default: the run fails and nothing reached the network.
  const blocked = e.call('Runner.runOnce()');
  check('outbound is off by default', blocked.results[0].status === 'failed',
    JSON.stringify(blocked.results[0]));
  check('and nothing was fetched', e.world.fetches.length === 0);

  // On, but the host is not on the list.
  const e2 = setUp([rowFor('M-013', 'Nina Park', 'nina@example.com', 'Probate', '$1,500.00', 'New')]);
  e2.call(`CONFIG.rails.allowOutboundHttp = true; CONFIG.rails.allowedHosts = ['api.clio.com'];`);
  e2.call(`CONFIG.steps.push({ type: 'httpRequest', url: 'https://api.example-crm.com/matters' });`);
  const wrongHost = e2.call('Runner.runOnce()');
  check('an unlisted host is refused', wrongHost.results[0].status === 'failed' &&
    /not on the allowlist/.test(wrongHost.results[0].error), JSON.stringify(wrongHost.results[0]));
  check('and nothing was fetched', e2.world.fetches.length === 0);

  // On, listed, with the secret in Script Properties.
  const e3 = setUp([rowFor('M-014', 'Nina Park', 'nina@example.com', 'Probate', '$1,500.00', 'New')]);
  e3.world.scriptProperties.set('CRM_TOKEN', 'super-secret-value');
  e3.call(`CONFIG.rails.allowOutboundHttp = true; CONFIG.rails.allowedHosts = ['api.example-crm.com'];`);
  e3.call(`CONFIG.steps.push({ type: 'httpRequest', method: 'post',
    url: 'https://api.example-crm.com/matters',
    headers: { Authorization: 'Bearer {{@CRM_TOKEN}}' },
    payload: { name: '{{CLIENT_NAME}}' },
    saveAs: 'CRM_ID', jsonPath: 'id' });`);
  const ok = e3.call('Runner.runOnce()');
  check('an allowlisted call goes through', ok.results[0].status === 'ok', JSON.stringify(ok.results[0]));
  check('exactly one request was made', e3.world.fetches.length === 1);
  check('the secret was resolved from Script Properties',
    e3.world.fetches[0].options.headers.Authorization === 'Bearer super-secret-value');
  check('the row value reached the payload',
    e3.world.fetches[0].options.payload.includes('Nina Park'));
  check('the response body was never logged',
    !JSON.stringify(e3.world.grid('sheet-1', 'Log')).includes('ext-123'),
    JSON.stringify(e3.world.grid('sheet-1', 'Log')));

  // A missing secret is a clear error, not a header reading "undefined".
  const e4 = setUp([rowFor('M-015', 'Nina Park', 'nina@example.com', 'Probate', '$1,500.00', 'New')]);
  e4.call(`CONFIG.rails.allowOutboundHttp = true; CONFIG.rails.allowedHosts = ['api.example-crm.com'];`);
  e4.call(`CONFIG.steps.push({ type: 'httpRequest', url: 'https://api.example-crm.com/x',
    headers: { Authorization: 'Bearer {{@MISSING_TOKEN}}' } });`);
  const noSecret = e4.call('Runner.runOnce()');
  check('a missing Script Property says so by name',
    /MISSING_TOKEN/.test(noSecret.results[0].error || ''), JSON.stringify(noSecret.results[0]));

  // A 4xx from the far end is a failure, not a quiet success.
  const e5 = setUp([rowFor('M-016', 'Nina Park', 'nina@example.com', 'Probate', '$1,500.00', 'New')]);
  e5.world.setResponse(422, '{"error":"unprocessable"}');
  e5.call(`CONFIG.rails.allowOutboundHttp = true; CONFIG.rails.allowedHosts = ['api.example-crm.com'];`);
  e5.call(`CONFIG.steps.push({ type: 'httpRequest', url: 'https://api.example-crm.com/x' });`);
  const failed = e5.call('Runner.runOnce()');
  check('a 422 marks the row rather than passing',
    failed.results[0].status === 'failed' && /422/.test(failed.results[0].error),
    JSON.stringify(failed.results[0]));
}

section('10. Work can arrive from a webhook or a form, and still hits every gate');
{
  const e = setUp([]);
  e.world.scriptProperties.set('WEBHOOK_SECRET', 'shared-secret');

  // Wrong secret: rejected, nothing added.
  const bad = e.call(`doPost({ postData: { contents: JSON.stringify({ secret: 'wrong', client_name: 'X' }) } })`);
  check('a bad secret is rejected', JSON.parse(bad.text).status === 'error');
  check('and no row was added', e.world.grid('sheet-1', 'Intake').length === 1);

  // Right secret: a row lands, already marked ready.
  const good = e.call(`doPost({ postData: { contents: JSON.stringify({
    secret: 'shared-secret', matter_id: 'W-001', client_name: 'Omar Haddad',
    client_email: 'omar@example.com', matter_type: 'Immigration', fee_amount: '$3,300.00' }) } })`);
  check('a good webhook is accepted', JSON.parse(good.text).status === 'success', good.text);
  const grid = e.world.grid('sheet-1', 'Intake');
  check('one row was added', grid.length === 2, JSON.stringify(grid));
  check('the status was set to the ready value', grid[1][HEADERS.indexOf('status')] === 'New');
  check('the values landed in the right columns',
    grid[1][HEADERS.indexOf('client_name')] === 'Omar Haddad' &&
    grid[1][HEADERS.indexOf('fee_amount')] === '$3,300.00', JSON.stringify(grid[1]));

  // And the pipeline picks it up on the next run like any other row.
  const ran = e.call('Runner.runOnce()');
  check('the next run processes the webhook row', ran.ran === 1 && ran.results[0].status === 'ok',
    JSON.stringify(ran.results && ran.results[0]));
  check('it produced documents', e.world.docsIn('W-001 - Omar Haddad').length > 0);

  // A webhook missing a required value still refuses. No shortcut past the gate.
  const e2 = setUp([]);
  e2.world.scriptProperties.set('WEBHOOK_SECRET', 'shared-secret');
  e2.call(`doPost({ postData: { contents: JSON.stringify({
    secret: 'shared-secret', matter_id: 'W-002', client_name: 'No Fee',
    client_email: 'nofee@example.com', matter_type: 'Probate' }) } })`);
  const refused = e2.call('Runner.runOnce()');
  check('a webhook does not get past the gate', refused.results[0].status === 'refused',
    JSON.stringify(refused.results[0]));
  check('and left nothing behind', e2.world.folderNames().filter((n) => n.startsWith('W-002')).length === 0);

  // A form submission goes through the same door.
  const e3 = setUp([]);
  e3.call(`onFormSubmitted({ namedValues: { 'matter_id': ['F-001'], 'client_name': ['Priya Raman'],
    'client_email': ['priya@example.com'], 'matter_type': ['Family Law'], 'fee_amount': ['$2,100.00'] } })`);
  const formRan = e3.call('Runner.runOnce()');
  check('a form submission becomes a job', formRan.ran === 1 && formRan.results[0].status === 'ok',
    JSON.stringify(formRan.results && formRan.results[0]));

  // The form trigger installs.
  e3.call(`CONFIG.formId = 'form-abc'; installFormTrigger();`);
  check('the form trigger installs',
    e3.world.triggers.some((t) => t.fn === 'onFormSubmitted' && t.formId === 'form-abc'),
    JSON.stringify(e3.world.triggers));
}

section('11. There is no send path in this repository');
{
  const dir = path.join(__dirname, '..', 'apps-script');
  const offenders = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.gs')) continue;
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/GmailApp\s*\.\s*sendEmail/.test(line)) offenders.push(`${f}:${i + 1} ${line.trim()}`);
    });
  }
  check('GmailApp.sendEmail appears nowhere', offenders.length === 0, offenders.join(' | '));

  const steps = fs.readFileSync(path.join(dir, 'Steps.gs'), 'utf8');
  check('the only MailApp call is the guarded internal alert',
    (steps.match(/MailApp\.sendEmail/g) || []).length === 1);
  check('and the guard runs before it',
    steps.indexOf('Rails.assertNotifyAllowed') < steps.indexOf('MailApp.sendEmail'));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
