# Changelog

## 2026-09-16 — First release

Built for the MLA Intelligence Labs advanced room. Generalises the September 9
document-generation pipeline into a kit any firm can clone, design against, and
run in their own Google Workspace.

### Added
- `apps-script/Runner.gs` — the engine: claim, precheck, run steps, write back, log
- `apps-script/Steps.gs` — `fillTemplates`, `review`, `exportPdf`, `draftEmail`,
  `createCalendarEvent`, `notify`, `writeBack`, `custom`
- `apps-script/Rails.gs` — the gates: placeholder scanning, the refusal, the
  internal-notify allowlist, Drive query escaping
- `apps-script/Setup.gs` — `selfTest`, `runNow`, `installTrigger`, `removeTriggers`
- `apps-script/Config.gs` — the one file about your firm
- `apps-script/Custom.gs` — your own step types
- `.claude/skills/design-your-agent` — the interview that writes `AGENT.md`
- `.claude/skills/build-the-runner` — turns `AGENT.md` into `Config.gs` and pushes it
- `AGENT.template.md`, `CLAUDE.md`, `README.md`, `SETUP.md`
- `recipes/RECIPES.md` — fourteen jobs firms actually automate
- `test/harness.js` + `test/run.js` — the engine runs locally against fake
  Google services

### Verified
58 checks pass with `node test/run.js`:
- A ready row produces documents, PDFs, a draft, a write-back and a log line
- A missing value refuses, names the field, and leaves NO folder and NO document
- A failed review marks the row and never produces a draft
- A row is never processed twice, and a `Generated` row is never touched
- An apostrophe in a client's name is handled
- `notify` is off by default and refuses any address off the firm's domains
- A calendar deadline the row cannot supply is a refusal, not a guess
- `selfTest` catches an unfillable placeholder and names the column to add
- `GmailApp.sendEmail` appears nowhere in the repository

### Carried over from the September 9 build
Four lessons from that session are enforced here rather than remembered: the job
folder is created once before any fan out, Drive queries escape apostrophes, the
review checks completeness as well as per-document defects, and every template
is prechecked before anything is written so a refusal leaves nothing behind.
