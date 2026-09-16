# Firm Agent Kit

Build one agent for your law firm. It runs inside your own Google Workspace, on
a clock, and it stops before anything leaves the building.

Made for the MLA Intelligence Labs advanced room.

## What it is

An engine plus an interview.

The **engine** is Google Apps Script. It watches a sheet, and when a row is
ready it fills your approved templates, checks its own work, exports PDFs, puts
an email in your drafts, writes back to the sheet and logs what it did.

The **interview** is Claude Code. You clone this repo, run `claude`, and say
"design my agent". It asks about one job you do every week, writes `AGENT.md`,
then writes the config and pushes it to Apps Script for you.

## The rules it will not break

- **The model never writes the document.** It chooses values. A script copies
  your approved Google Doc and replaces the placeholders. Same template, same
  row, same document, every time.
- **Agents draft, humans send.** There is no send path for client mail in this
  repository. That rail is enforced by what is missing, not by an instruction.
- **A missing value is a refusal, not a guess.** And a refusal leaves nothing
  behind. No folder, no half-built packet.
- **Deadlines come from the row.** The agent books the date you gave it. Working
  out what the date should be stays with the lawyer.

## Start

```bash
git clone https://github.com/redwoodmeridian/firm-agent-kit.git
cd firm-agent-kit
claude
```

Then say: **design my agent**

If you would rather read first, `SETUP.md` is the whole install, and
`recipes/RECIPES.md` is fourteen jobs firms actually automate.

## What is in here

| Path | What it is |
|---|---|
| `AGENT.template.md` | The six headings. This is the design. |
| `apps-script/Config.gs` | The only file about your firm. Claude writes it. |
| `apps-script/Runner.gs` | The engine. Do not edit. |
| `apps-script/Steps.gs` | What it can do: fill, review, PDF, draft, calendar, write back. |
| `apps-script/Rails.gs` | The gates. Do not edit. |
| `apps-script/Custom.gs` | Your own steps. |
| `apps-script/Setup.gs` | `selfTest`, `runNow`, `installTrigger`, `removeTriggers`. |
| `recipes/RECIPES.md` | Fourteen starting points. |
| `test/` | Runs the engine on this machine against fake Google services. |

## The step types

`fillTemplates`, `review`, `exportPdf`, `draftEmail`, `createCalendarEvent`,
`notify`, `writeBack`, and `custom` for anything else.

## Tests

```bash
node test/run.js
```

58 checks, no network, nothing real is touched. They exist to prove the rails:
that a refusal leaves nothing behind, that a draft is never a send, and that a
row is never processed twice.

## What this deliberately cannot do

Send mail to a client. File with a court. Move money. Sign anything.

If your idea needs one of those, the agent prepares it and a human does it.
