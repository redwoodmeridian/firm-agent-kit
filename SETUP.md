# Setup

About twenty minutes, once.

## What you need

- A Google account. A Workspace account at your firm is ideal, a personal Gmail
  works for trying it out.
- [Claude Code](https://claude.com/claude-code) installed.
- Node, only if you want to run the tests.

You do **not** need a service account, an OAuth client, a Google Cloud project,
or a credit card. The script runs as you, inside your own account. That is the
whole reason this kit uses Apps Script.

## 1. Three things in Drive

Claude can make these for you during the interview. If you would rather do it by
hand:

1. **An intake sheet.** One row is one job. It needs a `status` column and an id
   column. Every other column becomes a placeholder, so `client_name` becomes
   `{{CLIENT_NAME}}` in your templates.
2. **A templates folder.** One Google Doc per document. Take the document you
   send today, exactly as it goes out, and replace only the parts that change
   per client with `{{PLACEHOLDERS}}` in capitals and underscores. Type the
   braces as plain text and do not let autocorrect curl them.
3. **An output folder.** Leave it empty.

## 2. Design the agent

```bash
claude
```

Say **design my agent**. It will ask about one job, then write `AGENT.md`.

## 3. Get the code into Google

### The easy way, which Claude can run for you

```bash
npm install -g @google/clasp
clasp login
clasp create --title "My Firm Agent" --type standalone --rootDir ./apps-script
clasp push
clasp open
```

If `clasp create` complains about the Apps Script API, open
https://script.google.com/home/usersettings and turn **Google Apps Script API**
on. One toggle, and it is almost always the only thing that stops this.

### The by-hand way

Open https://script.google.com and start a new project. Create one file for each
`.gs` in `apps-script/` and paste the contents in. Six files:

`Config.gs`, `Rails.gs`, `Steps.gs`, `Custom.gs`, `Runner.gs`, `Setup.gs`

Then Project Settings, tick **Show "appsscript.json" manifest file**, open the
editor again, and paste `apps-script/appsscript.json` over what is there.

Paste is fine. You do it once.

## 4. Check it before you trust it

In the Apps Script editor, pick the function from the dropdown at the top and
press Run.

1. **`selfTest`** — writes nothing, creates nothing. It opens your sheet and
   every template, reads every placeholder, and tells you which ones nothing
   will ever fill. Fix what it names and run it again until it passes.
2. Google will ask you to authorize. It will warn you about an unverified app.
   That app is the script you just wrote, running as you, in your own account.
3. **`runNow`** — with one real row in the sheet marked `New`. Read the output.
4. Now blank a required field on another row and run `runNow` again. It should
   refuse, name the field, and create nothing at all. Go and look at the output
   folder to confirm there is no folder for it.

Do step 4. It is the step that tells you whether to trust the thing.

## 5. Put it on the clock

**`installTrigger`** — runs every ten minutes by default. Change
`triggerEveryMinutes` in `Config.gs` if you want something else.

## 6. How to stop it

**`removeTriggers`**. The agent stops. Nothing else changes.

## Where things go wrong

**It keeps saying nothing new.** The status is not exactly your `readyValue`.
Check for a trailing space or a lowercase letter.

**Authorization loops or is refused.** A Workspace admin may have restricted
Apps Script for your domain. Ask them to allow it for your account.

**A placeholder came through as `{{SOMETHING}}`.** Nothing supplied it. Run
`selfTest`, it names the column to add.

**The trigger runs but nothing happens.** Open Executions in the left sidebar of
the Apps Script editor. Every run is logged there with its error.

**You changed a template and now it refuses.** That is correct. You added a
placeholder and no column supplies it. Add the column.

---

## Beyond the clock

Start with the clock. Add these when the work should not wait for a poll.

### A Google Form as the front door

Set `formId` in `Config.gs` to your form's id, then run **`installFormTrigger`**
once. Every submission becomes a row with the status already set to ready.

Name the form questions the same as your sheet columns and they line up on their
own.

### A webhook, so anything can start your agent

1. In the Apps Script editor: **Deploy > New deployment > Web app**.
   Execute as **Me**. Who has access **Anyone**.
2. Copy the `/exec` URL.
3. Project Settings > Script Properties, add **`WEBHOOK_SECRET`** with a long
   random value.
4. Have the sender POST JSON including that secret:

```bash
curl -X POST "https://script.google.com/macros/s/<id>/exec" \
  -H "Content-Type: application/json" \
  -d '{"secret":"<your secret>","matter_id":"M-100","client_name":"Maria Alvarez","fee_amount":"$7,500.00"}'
```

"Anyone" really does mean anyone, which is why the secret is not optional. The
endpoint rejects anything without it and tells the caller nothing about why.

A webhook row goes through exactly the same gates as one you typed. If it is
missing a fee amount, it refuses, and you read the refusal in the sheet.

### Calling something outside Google

The `httpRequest` step calls any API: your case management system, your CRM, a
notification service, your own server.

It is **off until you turn it on**, and then only for hosts you name:

```js
rails: {
  allowOutboundHttp: true,
  allowedHosts: ['api.clio.com']
}
```

https only, exact hostnames, no wildcards. This is the step that moves client
data off Google's servers, so the allowlist is the thing standing between a
typo and a disclosure.

**Secrets never go in `Config.gs`.** Put them in Project Settings > Script
Properties and reference them as `{{@TOKEN_NAME}}`. They are read at run time
and never written to a log. Response bodies are not logged either, for the same
reason.

### Quotas worth knowing

A Workspace account gets roughly 1,500 documents created, 1,500 email
recipients and 20,000 URL fetches per day. A consumer Gmail account gets far
less, 100 email recipients among them. One execution stops at 6 minutes on
consumer and 30 on Workspace, so batch long jobs and keep `maxPerRun` small.

Numbers change. The
[official quota page](https://developers.google.com/apps-script/guides/services/quotas)
is the one to trust.
