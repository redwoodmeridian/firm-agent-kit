/**
 * Setup.gs — turn it on, turn it off, and check it before you trust it.
 *
 * Run these by hand from the Apps Script editor. Pick the function in the
 * dropdown at the top and press Run.
 */

/**
 * Check everything without writing anything.
 *
 * Run this before you install the trigger, and run it again any time you
 * change a template. It opens the sheet, opens every template, reads every
 * placeholder out of them, and tells you which ones nothing will ever fill.
 *
 * It creates nothing, sends nothing and changes nothing.
 */
function selfTest() {
  var problems = [];
  var notes = [];

  // 1. The intake sheet.
  var table;
  try {
    table = Runner.readTable_();
    notes.push('Intake sheet: ' + table.rows.length + ' data row(s), ' +
               table.headers.filter(String).length + ' column(s).');
  } catch (e) {
    problems.push('Cannot read the intake sheet: ' + e.message);
    return report_(problems, notes);
  }

  // 2. The columns the engine needs.
  ['statusColumn', 'idColumn'].forEach(function (k) {
    var name = CONFIG.intake[k];
    if (Runner.columnIndex_(table.headers, name) === -1) {
      problems.push('Missing column "' + name + '" (intake.' + k + ').');
    }
  });

  // 3. The output folder.
  try {
    var folder = DriveApp.getFolderById(CONFIG.output.documentsFolderId);
    notes.push('Output folder: ' + folder.getName());
  } catch (e) {
    problems.push('Cannot open output folder: ' + e.message);
  }

  // 4. Every placeholder in every template, against what can supply it.
  var supplied = {};
  Object.keys(CONFIG.profile || {}).forEach(function (k) { supplied[k] = 'firm profile'; });
  table.headers.forEach(function (h) {
    if (h) supplied[Runner.keyForHeader(h)] = 'column "' + h + '"';
  });
  ['_NOW', '_FOLDER_URL', '_FOLDER_ID', '_DOCUMENT_LIST'].forEach(function (k) {
    supplied[k] = 'the run itself';
  });

  var needed = {};
  (CONFIG.steps || []).forEach(function (step) {
    try {
      Steps.requiredKeysFor(step, CONFIG).forEach(function (k) {
        needed[k] = (needed[k] || []).concat([step.type]);
      });
    } catch (e) {
      problems.push('Step "' + step.type + '" could not be read: ' + e.message);
    }
  });

  Object.keys(needed).forEach(function (k) {
    if (!supplied[k]) {
      problems.push('Nothing supplies {{' + k + '}} (needed by ' + needed[k].join(', ') +
                    '). Add a column called "' + k.toLowerCase() +
                    '" to the intake sheet, or put it in CONFIG.profile.');
    }
  });
  notes.push('Placeholders needed: ' + Object.keys(needed).length +
             '. All resolvable: ' + (Object.keys(needed).every(function (k) { return !!supplied[k]; })));

  // 5. Rails that are on.
  notes.push('Client email: drafted, never sent.');
  notes.push('Internal alerts: ' +
    (CONFIG.rails && CONFIG.rails.allowInternalNotify ?
      'ON for ' + (CONFIG.rails.internalDomains || []).join(', ') : 'off'));

  return report_(problems, notes);
}

function report_(problems, notes) {
  var out = [];
  out.push(problems.length === 0 ? 'SELF TEST PASSED' : 'SELF TEST FOUND ' + problems.length + ' PROBLEM(S)');
  problems.forEach(function (p) { out.push('  problem: ' + p); });
  notes.forEach(function (n) { out.push('  ' + n); });
  var text = out.join('\n');
  Logger.log(text);
  return text;
}

/**
 * Run the whole thing once, right now, for whatever is ready.
 * This is what the trigger calls. Use it to test before you schedule it.
 */
function runNow() {
  var result = Runner.runOnce();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * Install the clock. After this, nobody has to start it.
 * Runs every CONFIG.triggerEveryMinutes minutes (1, 5, 10, 15 or 30).
 */
function installTrigger() {
  removeTriggers();
  var minutes = CONFIG.triggerEveryMinutes || 10;
  ScriptApp.newTrigger('runOnce').timeBased().everyMinutes(minutes).create();
  var msg = 'Trigger installed: runOnce every ' + minutes + ' minutes.';
  Logger.log(msg);
  return msg;
}

/** Take the clock away. The agent stops. Nothing else changes. */
function removeTriggers() {
  var all = ScriptApp.getProjectTriggers();
  all.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  var msg = 'Removed ' + all.length + ' trigger(s).';
  Logger.log(msg);
  return msg;
}
