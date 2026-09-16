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
`notify`, `httpRequest`, `writeBack`, and `custom` for anything else.

## Three ways work arrives

The clock is where everyone should start. The other two exist for when the work
should not wait for a poll.

| Trigger | What it is | Set it up with |
|---|---|---|
| **A clock** | Checks the sheet every N minutes | `installTrigger()` |
| **A form** | A Google Form submission becomes a row | `installFormTrigger()` |
| **A webhook** | Any system on the internet POSTs a row | Deploy as a web app, see `SETUP.md` |

All three land in the same sheet and go through the same gates. A webhook does
not get a shortcut past the refusal.

## Does this replace Zapier?

For a lot of what a firm uses Zapier for, yes, and there is one reason that
matters more than cost.

**Your client data never leaves your Google account.** With a third-party
automation tool, every field you pass through it, names, matter details, fee
amounts, sits on somebody else's servers under somebody else's terms. Here the
script runs inside your own Workspace, as you. For a firm holding privileged
information that is not a small difference, and it is the argument to make to a
partner who asks why not just buy the SaaS.

What you get: time triggers, form triggers, webhooks in through `doPost`, and
calls out to any API with `httpRequest`. That covers the shape of most firm
automations.

What you give up, honestly:

- **Connectors.** Zapier has thousands, pre-authenticated. Here you write the
  API call, which is what Claude Code is for, but a service with a bad API is a
  bad afternoon.
- **Runtime limits.** A single execution stops at 6 minutes on a consumer
  account, 30 on Workspace. Long jobs have to be split into batches.
- **Daily quotas.** Workspace accounts get roughly 1,500 documents created,
  1,500 email recipients, and 20,000 URL fetches a day, with consumer accounts
  well below that. The
  [official quota page](https://developers.google.com/apps-script/guides/services/quotas)
  is the only version worth trusting, because these change.
- **A dashboard.** You get the Executions view in the editor and whatever you
  log. That is less than Zapier's history, and it is why every run here writes a
  line to the Log tab.

The honest rule: if the job lives mostly in Google and touches one or two
outside services, build it here. If it fans out across fifteen SaaS products,
Zapier is still doing something for you.

## Where the model belongs

Claude designs the agent. Claude does not run inside it.

You can call Gemini or any model from Apps Script, and for a genuinely
model-shaped job, summarising a long document, that is reasonable, as a draft a
human reads. But the pipeline that produces a client's engagement letter has no
model in it, and that is the point. A template filled from a row gives the same
document every time. A model in the loop gives you something to review on every
matter.

Put the intelligence in the design. Keep the run deterministic.

## Tests

```bash
node test/run.js
```

58 checks, no network, nothing real is touched. They exist to prove the rails:
that a refusal leaves nothing behind, that a draft is never a send, and that a
row is never processed twice.

## Who made this

Built by **Irfad Imtiaz** — Director of Technology at
[My Legal Academy](https://mylegalacademy.com), and cofounder and CTO of
[Ranql](https://ranql.com) at Clearfield Labs.

Made for the MLA Intelligence Labs advanced room, where a room of lawyers builds
this kind of thing live every Wednesday.

## What this deliberately cannot do

Send mail to a client. File with a court. Move money. Sign anything.

If your idea needs one of those, the agent prepares it and a human does it.
