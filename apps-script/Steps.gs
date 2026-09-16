/**
 * Steps.gs — what the agent can actually do.
 *
 * Every step type is declared in Config.gs and executed here, in the order you
 * listed them. Add a step type by adding a function to Custom.gs and using
 * { type: 'custom', fn: 'yourFunctionName' }. You should not need to edit this
 * file to build your agent.
 */

var Steps = (function () {

  /* ---------- text ---------- */

  function render(text, values) {
    return String(text).replace(/\{\{([A-Z0-9_]+)\}\}/g, function (whole, key) {
      var v = values[key];
      return (v === undefined || v === null) ? whole : String(v);
    });
  }

  function replaceInDoc_(doc, values) {
    var targets = [doc.getBody()];
    var header = doc.getHeader();
    var footer = doc.getFooter();
    if (header) targets.push(header);
    if (footer) targets.push(footer);

    var keys = Object.keys(values);
    for (var t = 0; t < targets.length; t++) {
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.charAt(0) === '_') continue;
        var value = values[key];
        if (value === undefined || value === null) continue;
        // replaceText takes a regex string, so the braces have to be escaped.
        targets[t].replaceText('\\{\\{' + key + '\\}\\}', String(value));
      }
    }
    doc.saveAndClose();
  }

  function textOfDoc_(doc) {
    var parts = [doc.getBody().getText()];
    var header = doc.getHeader();
    var footer = doc.getFooter();
    if (header) parts.push(header.getText());
    if (footer) parts.push(footer.getText());
    return parts.join('\n');
  }

  /* ---------- what a step needs before anything is written ---------- */

  /**
   * The keys this step cannot run without. Collected for every step BEFORE the
   * first write, so a refusal leaves nothing behind.
   *
   * Keys beginning with an underscore are produced by the run itself
   * (_folderUrl, _now, _DOCUMENT_LIST) and are not expected in the intake row.
   */
  function requiredKeysFor(step, config) {
    var keys = [];

    function addFrom(text) {
      if (!text) return;
      Rails.placeholdersIn(String(text)).forEach(function (k) {
        if (k.charAt(0) !== '_') keys.push(k);
      });
    }

    if (step.type === 'fillTemplates') {
      (step.templates || []).forEach(function (tpl) {
        var doc = DocumentApp.openById(tpl.docId);
        addFrom(textOfDoc_(doc));
        addFrom(tpl.name);
      });
    } else if (step.type === 'draftEmail') {
      addFrom(step.to);
      addFrom(step.cc);
      addFrom(step.subject);
      addFrom(step.body);
    } else if (step.type === 'notify') {
      addFrom(step.subject);
      addFrom(step.body);
    } else if (step.type === 'createCalendarEvent') {
      addFrom(step.title);
      addFrom(step.description);
      if (step.dateKey) keys.push(step.dateKey);
    } else if (step.type === 'writeBack') {
      Object.keys(step.columns || {}).forEach(function (col) {
        addFrom(step.columns[col]);
      });
    }

    (step.required || []).forEach(function (k) { keys.push(k); });

    if (config && config.output && config.output.folderNameFormat &&
        step.type === 'fillTemplates') {
      addFrom(config.output.folderNameFormat);
    }

    var seen = {};
    return keys.filter(function (k) {
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  /* ---------- the steps ---------- */

  function fillTemplates(step, ctx) {
    var folder = ctx.ensureFolder();
    var made = [];
    (step.templates || []).forEach(function (tpl) {
      var name = render(tpl.name, ctx.values);
      var copy = DriveApp.getFileById(tpl.docId).makeCopy(name, folder);
      var doc = DocumentApp.openById(copy.getId());
      replaceInDoc_(doc, ctx.values);
      made.push({ id: copy.getId(), name: name, url: copy.getUrl(), key: tpl.key || name });
    });
    ctx.documents = ctx.documents.concat(made);
    ctx.values._DOCUMENT_LIST = ctx.documents.map(function (d) { return d.name; }).join('\n');
    return { documents_created: made.length };
  }

  function exportPdf(step, ctx) {
    var folder = ctx.ensureFolder();
    var made = [];
    ctx.documents.forEach(function (d) {
      var blob = DriveApp.getFileById(d.id).getAs('application/pdf').setName(d.name + '.pdf');
      var file = folder.createFile(blob);
      made.push({ id: file.getId(), name: file.getName(), blobSource: file });
    });
    ctx.pdfs = ctx.pdfs.concat(made);
    return { pdfs_created: made.length };
  }

  /**
   * The mechanical review. Not judgment, just the things a script can settle.
   * Judgment belongs to a human, or to a teammate file read by Claude at the
   * desk. This is the part that must never pass something obviously broken.
   */
  function review(step, ctx) {
    var checks = step.checks || ['no_placeholders_left', 'all_documents_present'];
    var findings = [];

    if (checks.indexOf('no_placeholders_left') !== -1) {
      ctx.documents.forEach(function (d) {
        var left = Rails.placeholdersIn(textOfDoc_(DocumentApp.openById(d.id)));
        if (left.length) {
          findings.push({
            check: 'no_placeholders_left',
            document: d.name,
            detail: 'unfilled placeholders: ' + left.join(', ')
          });
        }
      });
    }

    if (checks.indexOf('all_documents_present') !== -1) {
      var expected = step.expectedDocuments || ctx.expectedDocumentCount;
      if (expected && ctx.documents.length !== expected) {
        findings.push({
          check: 'all_documents_present',
          detail: 'expected ' + expected + ' documents, found ' + ctx.documents.length
        });
      }
    }

    if (checks.indexOf('values_present') !== -1) {
      (step.valuesPresent || []).forEach(function (key) {
        var needle = String(ctx.values[key] === undefined ? '' : ctx.values[key]).trim();
        if (!needle) return;
        ctx.documents.forEach(function (d) {
          if (textOfDoc_(DocumentApp.openById(d.id)).indexOf(needle) === -1) {
            findings.push({
              check: 'values_present',
              document: d.name,
              detail: key + ' does not appear in this document'
            });
          }
        });
      });
    }

    if (checks.indexOf('values_agree') !== -1) {
      (step.valuesAgree || []).forEach(function (key) {
        var needle = String(ctx.values[key] === undefined ? '' : ctx.values[key]).trim();
        if (!needle) return;
        var seenIn = ctx.documents.filter(function (d) {
          return textOfDoc_(DocumentApp.openById(d.id)).indexOf(needle) !== -1;
        });
        if (seenIn.length > 0 && seenIn.length !== ctx.documents.length) {
          findings.push({
            check: 'values_agree',
            detail: key + ' appears in ' + seenIn.length + ' of ' + ctx.documents.length +
                    ' documents. Where it appears it must agree.'
          });
        }
      });
    }

    ctx.reviewFindings = findings;
    if (findings.length > 0) {
      var e = new Error('Review failed: ' + findings.map(function (f) {
        return f.check + (f.document ? ' (' + f.document + ')' : '') + ' — ' + f.detail;
      }).join('; '));
      e.reviewFailed = true;
      throw e;
    }
    return { findings: 0 };
  }

  /**
   * A Gmail draft. Never a send. This is the only client-facing mail path in
   * the kit and it stops at drafts on purpose.
   */
  function draftEmail(step, ctx) {
    var options = {};
    if (step.cc) options.cc = render(step.cc, ctx.values);
    if (step.attachPdfs !== false && ctx.pdfs.length) {
      options.attachments = ctx.pdfs.map(function (p) { return p.blobSource; });
    }
    var draft = GmailApp.createDraft(
      render(step.to, ctx.values),
      render(step.subject, ctx.values),
      render(step.body, ctx.values),
      options
    );
    ctx.draftId = draft.getId();
    return { draft_created: true, attachments: (options.attachments || []).length };
  }

  /**
   * An internal alert to your own firm. Off unless you turned it on and named
   * your domains. Never a route to a client.
   */
  function notify(step, ctx) {
    var to = render(step.to, ctx.values);
    Rails.assertNotifyAllowed(to, ctx.config.rails);
    MailApp.sendEmail({
      to: to,
      subject: render(step.subject, ctx.values),
      body: render(step.body, ctx.values)
    });
    return { notified: to };
  }

  /**
   * A dated entry on a firm calendar. Deadlines are the job most worth
   * automating and the one most dangerous to guess at, so the date has to come
   * from the row. There is no "about a month from now" here.
   */
  function createCalendarEvent(step, ctx) {
    var when = ctx.values[step.dateKey];
    if (when === undefined || when === null || String(when).trim() === '') {
      throw new Error('createCalendarEvent needs ' + step.dateKey + ' and the row does not supply it.');
    }
    var date = (when instanceof Date) ? when : new Date(String(when));
    if (isNaN(date.getTime())) {
      throw new Error('createCalendarEvent could not read "' + when + '" as a date (' + step.dateKey + ').');
    }
    var calendar = step.calendarId ?
      CalendarApp.getCalendarById(step.calendarId) : CalendarApp.getDefaultCalendar();
    if (!calendar) throw new Error('No calendar with id ' + step.calendarId);

    var title = render(step.title, ctx.values);
    var options = { description: render(step.description || '', ctx.values) };
    var event = step.allDay === false ?
      calendar.createEvent(title, date, new Date(date.getTime() + (step.durationMinutes || 30) * 60000), options) :
      calendar.createAllDayEvent(title, date, options);

    ctx.events = (ctx.events || []).concat([{ id: event.getId(), title: title }]);
    return { event_created: title };
  }

  function writeBack(step, ctx) {
    var written = {};
    Object.keys(step.columns || {}).forEach(function (col) {
      var value = render(step.columns[col], ctx.values);
      ctx.setCell(col, value);
      written[col] = value;
    });
    return { columns_written: Object.keys(written).length };
  }

  function custom(step, ctx) {
    if (typeof Custom === 'undefined' || typeof Custom[step.fn] !== 'function') {
      throw new Error('Custom step "' + step.fn + '" is not defined in Custom.gs');
    }
    return Custom[step.fn](step, ctx);
  }

  return {
    render: render,
    requiredKeysFor: requiredKeysFor,
    textOfDoc_: textOfDoc_,
    fillTemplates: fillTemplates,
    exportPdf: exportPdf,
    review: review,
    draftEmail: draftEmail,
    notify: notify,
    createCalendarEvent: createCalendarEvent,
    writeBack: writeBack,
    custom: custom
  };
})();

if (typeof module !== 'undefined') module.exports = Steps;
