/**
 * Webhook.gs — the other ways work arrives.
 *
 * The clock is the simplest trigger and it is where everyone should start. But
 * a row does not have to be typed by a human. It can arrive from a form, or
 * from any system on the internet that can send an HTTP request.
 *
 * Everything still funnels into the same intake sheet, and then through the
 * same pipeline, with the same gates. A webhook does not get a shortcut past
 * the rails.
 */

/**
 * The web app endpoint. Deploy this and anything can start your agent:
 * a website form, a CRM, a case management system, a lead provider, Zapier
 * itself if you are migrating off it one workflow at a time.
 *
 * Deploy: Deploy > New deployment > Web app.
 *   Execute as: Me.
 *   Who has access: Anyone.
 * Then guard it with a shared secret, because "Anyone" means anyone.
 *
 * Set WEBHOOK_SECRET under Project Settings > Script Properties, and have the
 * sender include it as "secret" in the JSON body.
 *
 *   POST https://script.google.com/macros/s/<id>/exec
 *   {"secret":"...","client_name":"Maria Alvarez","fee_amount":"$7,500.00"}
 *
 * Every key in the body that matches a column header becomes that cell. The
 * status column is set to the ready value, so the next run picks it up.
 */
function doPost(e) {
  try {
    if (!e || !e.postData) return json_({ status: 'error', message: 'no body' });

    var body = JSON.parse(e.postData.contents);

    var expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (!expected) {
      return json_({ status: 'error', message: 'WEBHOOK_SECRET is not set on this script' });
    }
    if (String(body.secret || '') !== String(expected)) {
      // Deliberately vague. An attacker learns nothing from this.
      return json_({ status: 'error', message: 'rejected' });
    }
    delete body.secret;

    var added = appendIntakeRow(body);
    return json_({ status: 'success', row: added.rowNumber, id: added.id });
  } catch (err) {
    return json_({ status: 'error', message: String(err.message).slice(0, 200) });
  }
}

/**
 * A Google Form submission. The friendliest front door for a client intake
 * questionnaire, and it needs no deployment and no secret.
 *
 * Run installFormTrigger() once, with CONFIG.formId set to the form's id.
 */
function onFormSubmitted(e) {
  var values = {};
  if (e && e.namedValues) {
    Object.keys(e.namedValues).forEach(function (question) {
      var answer = e.namedValues[question];
      values[question] = Array.isArray(answer) ? answer.join(', ') : answer;
    });
  }
  return appendIntakeRow(values);
}

/**
 * Put a row into the intake sheet from a plain object, matching keys to column
 * headers however they are spelled. "Client Name", "client_name" and
 * "CLIENT_NAME" all land in the same column.
 *
 * Nothing is validated here on purpose. The gate runs when the row is
 * processed, so a bad webhook produces a refusal you can read in the sheet
 * rather than a silent drop.
 */
function appendIntakeRow(values) {
  var cfg = CONFIG.intake;
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sh = ss.getSheetByName(cfg.tabName);
  if (!sh) throw new Error('No tab named "' + cfg.tabName + '"');

  var headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];

  var byKey = {};
  Object.keys(values || {}).forEach(function (k) {
    byKey[Runner.keyForHeader(k)] = values[k];
  });

  var row = headers.map(function (h) {
    if (!h) return '';
    var key = Runner.keyForHeader(h);
    if (key === Runner.keyForHeader(cfg.statusColumn)) return cfg.readyValue;
    return byKey[key] === undefined ? '' : byKey[key];
  });

  sh.appendRow(row);
  var rowNumber = sh.getLastRow();

  var idKey = Runner.keyForHeader(cfg.idColumn);
  return { rowNumber: rowNumber, id: byKey[idKey] || ('row ' + rowNumber) };
}

/** Run once, after setting CONFIG.formId. */
function installFormTrigger() {
  if (!CONFIG.formId) throw new Error('Set CONFIG.formId to your Google Form id first.');
  ScriptApp.newTrigger('onFormSubmitted')
    .forForm(CONFIG.formId)
    .onFormSubmit()
    .create();
  var msg = 'Form trigger installed on form ' + CONFIG.formId;
  Logger.log(msg);
  return msg;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
