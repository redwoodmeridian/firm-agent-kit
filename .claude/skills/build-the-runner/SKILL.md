---
name: build-the-runner
description: Use after AGENT.md exists, when someone says "build it", "make the script", "set it up in Google", "deploy it", "install it", or asks how to get the agent running in Apps Script. Turns AGENT.md into Config.gs, scaffolds the Drive files, pushes to Apps Script with clasp, and walks the person through authorizing and scheduling it.
---

# Build the runner

`AGENT.md` says what the agent is. This skill makes it run, inside the person's
own Google Workspace, on a clock.

You are writing `Config.gs` and nothing else. `Runner.gs`, `Steps.gs` and
`Rails.gs` are the engine and you do not edit them. If you find yourself wanting
to, you need a `custom` step in `Custom.gs` instead.

## 1. Read first

- `AGENT.md` — what they decided.
- `apps-script/Config.gs` — the shape you are producing.
- `recipes/RECIPES.md` — the recipe closest to their job, for the step list.
- `SETUP.md` — the install path you are about to walk them through.

## 2. The three things they must have in Drive

Ask whether these exist. If not, offer to create them and tell them what you are
creating before you create it.

1. **An intake sheet.** One row per job. A `status` column and an id column are
   required. Every other column becomes a placeholder: `client_name` becomes
   `{{CLIENT_NAME}}`.
2. **A templates folder.** One Google Doc per document, with `{{PLACEHOLDERS}}`
   in capitals and underscores. If they have a document they send today, use
   that one, exactly as it goes out, and only replace the parts that change per
   client.
3. **An output folder.** Empty. One folder per job gets created inside it.

## 3. Write Config.gs

Fill in `intake`, `output`, `profile`, `steps` and `rails` from `AGENT.md`.

Rules while you write it:

- Every placeholder in every template must be supplied by a sheet column or by
  `profile`. If it is not, either add the column or take the placeholder out.
  `selfTest()` checks this, so run it rather than reasoning about it.
- Order the steps the way the work actually happens. `review` goes after
  `fillTemplates` and before anything that leaves the folder.
- `draftEmail` last, or near it. It is the step a human picks up.
- Leave `rails.allowInternalNotify` false unless they asked for internal alerts
  and named their own domain.
- Keep `maxPerRun` small, 5 is fine, so a mistake affects five rows and not five
  hundred.

## 4. Get it into Google

Two paths. Offer `clasp` first, because you can run it for them.

**With clasp, which is the one to prefer.**

```bash
npm install -g @google/clasp
clasp login
clasp create --title "<their agent name>" --type standalone --rootDir ./apps-script
clasp push
clasp open
```

If `clasp create` fails with a message about the Apps Script API, send them to
https://script.google.com/home/usersettings and have them switch the Google
Apps Script API on. That is a single toggle and it is the only place this
usually stops.

**By hand, if clasp will not cooperate.** Tell them: open
https://script.google.com, New project, and create one file per `.gs` in
`apps-script/`, pasting each in. Six files. Then Project Settings, tick "Show
appsscript.json", and paste that too.

## 5. Make it work before you make it automatic

In the Apps Script editor, in this order, and do not skip ahead:

1. Run `selfTest`. It writes nothing. Fix whatever it names. Run it again until
   it passes.
2. Authorize when Google asks. Explain what the screen is: the script runs as
   them, inside their own account, and the warning about an unverified app is
   because they just wrote it themselves.
3. Put ONE real row in the sheet with status `New`. Run `runNow`. Look at the
   output together.
4. Deliberately blank a required field on a second row and run `runNow` again.
   Show them the refusal, and show them that no folder was created. This is the
   moment they decide whether to trust it.
5. Only now, run `installTrigger`.

## 6. Tell them how to turn it off

`removeTriggers` stops it. Nothing else changes. Say this before they walk away,
because knowing how to stop it is what makes people willing to start it.

## After it runs

Suggest they keep the refusals. Each one names a field their intake is not
collecting, and fixing the intake is worth more than any other change they can
make in the first month.
