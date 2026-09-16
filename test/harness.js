/**
 * harness.js — run the Apps Script engine on this machine, against fake
 * Google services, so the pipeline can be tested without a browser.
 *
 * The .gs files are ordinary JavaScript. This file supplies stand-ins for
 * DriveApp, DocumentApp, SpreadsheetApp, GmailApp and friends, loads the real
 * engine unchanged, and lets a test drive it.
 *
 *   node test/run.js
 */

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'apps-script');

function makeWorld() {
  const files = new Map();   // id -> record
  const sent = [];
  const drafts = [];
  const logs = [];
  let seq = 0;
  const nextId = (p) => `${p}-${++seq}`;

  /* ---------- Drive ---------- */

  function makeFolder(name, parentId) {
    const id = nextId('folder');
    files.set(id, { id, kind: 'folder', name, parent: parentId, children: [] });
    if (parentId && files.has(parentId)) files.get(parentId).children.push(id);
    return folderApi(id);
  }

  function folderApi(id) {
    const rec = files.get(id);
    return {
      getId: () => id,
      getName: () => rec.name,
      getUrl: () => `https://drive.example/folder/${id}`,
      createFolder: (name) => makeFolder(name, id),
      getFoldersByName: (name) => {
        const hits = rec.children
          .map((c) => files.get(c))
          .filter((f) => f.kind === 'folder' && f.name === name);
        let i = 0;
        return { hasNext: () => i < hits.length, next: () => folderApi(hits[i++].id) };
      },
      createFile: (blobOrName, content, mime) => {
        if (typeof blobOrName === 'string') {
          const fid = nextId('file');
          files.set(fid, { id: fid, kind: 'file', name: blobOrName, text: content, parent: id, mime });
          rec.children.push(fid);
          return fileApi(fid);
        }
        const fid = nextId('file');
        files.set(fid, { id: fid, kind: 'file', name: blobOrName.name, text: blobOrName.text, parent: id, mime: blobOrName.mime });
        rec.children.push(fid);
        return fileApi(fid);
      }
    };
  }

  function fileApi(id) {
    const rec = files.get(id);
    return {
      getId: () => id,
      getName: () => rec.name,
      getUrl: () => `https://drive.example/file/${id}`,
      getAs: (mime) => ({ name: rec.name, text: rec.text, mime, setName(n) { this.name = n; return this; } }),
      makeCopy: (name, folder) => {
        const nid = nextId('doc');
        const parentId = folder.getId();
        files.set(nid, { id: nid, kind: 'doc', name, text: rec.text, parent: parentId });
        files.get(parentId).children.push(nid);
        return fileApi(nid);
      }
    };
  }

  const DriveApp = {
    getFileById: (id) => {
      if (!files.has(id)) throw new Error(`No file with id ${id}`);
      return fileApi(id);
    },
    getFolderById: (id) => {
      if (!files.has(id) || files.get(id).kind !== 'folder') throw new Error(`No folder with id ${id}`);
      return folderApi(id);
    }
  };

  /* ---------- Docs ---------- */

  const DocumentApp = {
    openById: (id) => {
      const rec = files.get(id);
      if (!rec) throw new Error(`No document with id ${id}`);
      const body = {
        getText: () => rec.text,
        replaceText: (pattern, replacement) => {
          rec.text = rec.text.replace(new RegExp(pattern, 'g'), replacement);
          return body;
        }
      };
      return {
        getBody: () => body,
        getHeader: () => null,
        getFooter: () => null,
        saveAndClose: () => {}
      };
    }
  };

  /* ---------- Sheets ---------- */

  const sheets = new Map();  // spreadsheetId -> Map(tabName -> grid)

  function sheetApi(ssId, tab) {
    const grid = sheets.get(ssId).get(tab);
    return {
      getDataRange: () => ({ getValues: () => grid.map((r) => r.slice()) }),
      getRange: (r, c) => ({
        setValue: (v) => {
          while (grid.length < r) grid.push([]);
          const row = grid[r - 1];
          while (row.length < c) row.push('');
          row[c - 1] = v;
        },
        getValue: () => (grid[r - 1] || [])[c - 1]
      }),
      appendRow: (vals) => grid.push(vals.slice())
    };
  }

  const SpreadsheetApp = {
    openById: (id) => {
      if (!sheets.has(id)) throw new Error(`No spreadsheet ${id}`);
      return {
        getSheetByName: (tab) => (sheets.get(id).has(tab) ? sheetApi(id, tab) : null),
        insertSheet: (tab) => { sheets.get(id).set(tab, []); return sheetApi(id, tab); }
      };
    },
    flush: () => {}
  };

  /* ---------- Mail ---------- */

  const GmailApp = {
    createDraft: (to, subject, body, options) => {
      const d = { id: nextId('draft'), to, subject, body, options: options || {} };
      drafts.push(d);
      return { getId: () => d.id };
    }
  };

  const MailApp = {
    sendEmail: (obj) => { sent.push(obj); }
  };

  /* ---------- odds and ends ---------- */

  const Utilities = {
    formatDate: (d, tz, fmt) => {
      const pad = (n) => String(n).padStart(2, '0');
      if (fmt === 'yyyy-MM-dd HH:mm') {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
  };

  const Logger = { log: (m) => logs.push(String(m)) };
  const LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
  const Session = { getScriptTimeZone: () => 'America/Los_Angeles' };
  const MimeType = { PLAIN_TEXT: 'text/plain' };
  const events = [];
  function calendarApi(id) {
    return {
      createAllDayEvent: (title, date, opts) => {
        const e = { id: nextId('event'), calendar: id, title, date, allDay: true, opts };
        events.push(e);
        return { getId: () => e.id };
      },
      createEvent: (title, start, end, opts) => {
        const e = { id: nextId('event'), calendar: id, title, date: start, end, allDay: false, opts };
        events.push(e);
        return { getId: () => e.id };
      }
    };
  }
  const CalendarApp = {
    getDefaultCalendar: () => calendarApi('default'),
    getCalendarById: (id) => calendarApi(id)
  };
  const triggers = [];
  const ScriptApp = {
    newTrigger: (fn) => ({
      timeBased: () => ({
        everyMinutes: (m) => ({ create: () => { triggers.push({ fn, minutes: m }); } })
      })
    }),
    getProjectTriggers: () => triggers.slice(),
    deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); }
  };

  /* ---------- world helpers used by the tests ---------- */

  const world = {
    files, drafts, sent, logs, triggers, events,
    rootFolder: null,
    createRoot(name) { const f = makeFolder(name, null); world.rootFolder = f; return f; },
    createTemplate(name, text) {
      const id = nextId('doc');
      files.set(id, { id, kind: 'doc', name, text, parent: null });
      return id;
    },
    createSheet(id, tab, grid) {
      if (!sheets.has(id)) sheets.set(id, new Map());
      sheets.get(id).set(tab, grid.map((r) => r.slice()));
      return id;
    },
    grid(id, tab) { return sheets.get(id).get(tab); },
    hasTab(id, tab) { return sheets.get(id).has(tab); },
    folderNames() {
      return [...files.values()].filter((f) => f.kind === 'folder' && f.parent).map((f) => f.name);
    },
    docsIn(folderName) {
      const folder = [...files.values()].find((f) => f.kind === 'folder' && f.name === folderName);
      if (!folder) return [];
      return folder.children.map((c) => files.get(c)).map((f) => f.name);
    },
    docText(name) {
      const f = [...files.values()].find((x) => x.name === name);
      return f ? f.text : null;
    }
  };

  const sandbox = {
    DriveApp, DocumentApp, SpreadsheetApp, GmailApp, MailApp,
    Utilities, Logger, LockService, Session, MimeType, ScriptApp, CalendarApp,
    console, module: undefined
  };

  return { sandbox, world };
}

/**
 * Load the engine, plus a config object supplied by the test, into one context.
 */
function loadEngine(configObject) {
  const { sandbox, world } = makeWorld();
  const context = vm.createContext(sandbox);

  // Config first: the engine closes over CONFIG.
  vm.runInContext(`var CONFIG = ${JSON.stringify(configObject)};`, context, { filename: 'Config.gs' });

  for (const file of ['Rails.gs', 'Steps.gs', 'Custom.gs', 'Runner.gs', 'Setup.gs']) {
    const code = fs.readFileSync(path.join(SRC, file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  }

  return { context, world, call: (expr) => vm.runInContext(expr, context) };
}

module.exports = { loadEngine };
