/**
 * Custom.gs — your own steps.
 *
 * Anything the built-in steps do not cover goes here, and you call it from
 * Config.gs with { type: 'custom', fn: 'nameOfYourFunction' }.
 *
 * A custom step receives (step, ctx) and can return anything.
 *
 *   ctx.values      every value for this row, keyed like {{CLIENT_NAME}}
 *   ctx.documents   what has been created so far: [{id, name, url, key}]
 *   ctx.pdfs        PDFs created so far
 *   ctx.ensureFolder()  this job's folder, created once
 *   ctx.setCell(column, value)  write back to this row
 *   ctx.id          the id of this job
 *
 * The rails still apply. Do not add a send path here. If you need a human to
 * see something, create a draft or write to the sheet.
 */

var Custom = {

  /** Example: put a plain text summary in the job folder. */
  writeSummary: function (step, ctx) {
    var folder = ctx.ensureFolder();
    var lines = [
      'Job: ' + ctx.id,
      'Created: ' + ctx.values._NOW,
      'Documents:',
      ctx.values._DOCUMENT_LIST || '(none)'
    ];
    folder.createFile('summary.txt', lines.join('\n'), MimeType.PLAIN_TEXT);
    return { summary_written: true };
  }

};

if (typeof module !== 'undefined') module.exports = Custom;
