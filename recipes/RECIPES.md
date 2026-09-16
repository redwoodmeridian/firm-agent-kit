# Recipes

Fourteen jobs that law firms actually automate in Google Workspace, in rough
order of how often firms ask for them. Each one is a starting point, not a
finished agent. Claude reads this file during the design session and suggests
the ones that fit what you described.

Every recipe uses the same engine. What changes is the trigger, the steps and
the rails.

---

## 1. New client engagement packet

**The job.** A matter is opened and somebody retypes last month's engagement
letter.

**Trigger.** A row in the intake sheet, status `New`.
**Steps.** `fillTemplates` (engagement letter, fee agreement, conflict
confirmation, welcome letter) → `review` → `exportPdf` → `draftEmail` to the
client → `writeBack`.
**Rails.** Refuse without a fee amount and payment terms. Draft, never send.

**Why it is first.** Highest volume, least judgment, and every refusal tells you
a question your intake form is not asking.

---

## 2. Deadline and limitation dates on a calendar

**The job.** Dates live in someone's head, or in a sheet nobody opens.

**Trigger.** A row whose `deadline` is filled in and status is `New`.
**Steps.** `createCalendarEvent` (the date, plus reminder events at 90, 60 and
30 days) → `writeBack` → `notify` the responsible attorney.
**Rails.** The date comes from the row. Never compute a limitation period.
Never infer a date from a matter type.

**Say this out loud.** The agent books the date you gave it. Working out what
the date should be is legal judgment and stays with the lawyer.

---

## 3. Client intake form to matter folder

**The job.** A web form is submitted and somebody makes a folder and a checklist
by hand.

**Trigger.** Google Form responses land in a sheet. Same row trigger.
**Steps.** `fillTemplates` (new matter checklist, conflict check worksheet) →
`writeBack` the folder link → `notify` intake.
**Rails.** No client email at this stage. This one is internal only.

---

## 4. Missing documents chase

**The job.** Clients owe you documents and nobody has time to chase them.

**Trigger.** A row whose `documents_outstanding` is not empty, run weekly.
**Steps.** `draftEmail` to the client listing what is missing → `writeBack` the
date chased.
**Rails.** Draft only. A chase that goes out without a human read is how a firm
emails a client who already sent the document yesterday.

---

## 5. Closing letter and file closing checklist

**The job.** Matters get finished and never properly closed.

**Trigger.** Status flips to `Closed`.
**Steps.** `fillTemplates` (closing letter, file retention memo) → `exportPdf` →
`draftEmail` → `writeBack` the closing date.
**Rails.** Refuse without a disposition and a final balance.

---

## 6. Monthly invoice preparation

**The job.** Time entries exist. Turning them into per-client invoices is a day.

**Trigger.** Run on the first of the month.
**Steps.** `custom` step to total each client's hours from the time sheet →
`fillTemplates` (invoice) → `exportPdf` → `draftEmail`.
**Rails.** Refuse if the rate is missing. Never round, never estimate hours.
Drafts only, always.

---

## 7. Trust and retainer replenishment notices

**The job.** A retainer runs low and nobody notices until the work stops.

**Trigger.** A row whose `trust_balance` is below `replenish_threshold`.
**Steps.** `fillTemplates` (replenishment notice) → `draftEmail` → `notify` the
billing attorney.
**Rails.** This one touches client funds. Draft only, no exceptions, and the
threshold lives in the sheet where a human set it.

---

## 8. Weekly matter status report

**The job.** The partner asks where everything is, every Monday.

**Trigger.** Weekly, on a clock.
**Steps.** `custom` step to summarise the matter sheet by attorney →
`fillTemplates` (status report) → `notify` each attorney internally.
**Rails.** Internal domains only. Nothing here goes outside the firm.

---

## 9. Signed document filing

**The job.** Signed PDFs land in a downloads folder with names like
`scan_0041.pdf`.

**Trigger.** A new file in a watched Drive folder.
**Steps.** `custom` step to match the file to a matter → rename to the firm
convention → move into the matter folder → `writeBack`.
**Rails.** If the matter cannot be identified with certainty, leave the file
where it is and flag it. A misfiled signed document is worse than an unfiled
one.

---

## 10. New lead acknowledgement

**The job.** A lead comes in at 7pm and hears nothing until the morning.

**Trigger.** A row in the leads sheet, status `New`.
**Steps.** `fillTemplates` (intake summary) → `draftEmail` acknowledgement →
`notify` whoever is on intake → `writeBack`.
**Rails.** Draft only. An acknowledgement that promises anything about the case
is legal advice from a machine, so the template says what you already say.

---

## 11. Estate planning document set

**The job.** A questionnaire becomes a will, a trust, powers of attorney and a
health directive.

**Trigger.** A row whose questionnaire is marked complete.
**Steps.** `fillTemplates` (the set) → `review` with `values_agree` on the
client's name and the executor → `exportPdf` → `writeBack`.
**Rails.** Refuse on any missing beneficiary, executor or asset field. This is
the recipe with the most placeholders and the most refusals, and that is
correct.

---

## 12. Court appearance preparation

**The job.** A hearing is coming and the binder gets built the night before.

**Trigger.** A hearing date within the next 7 days.
**Steps.** `fillTemplates` (appearance sheet, witness list) →
`createCalendarEvent` for the prep block → `notify` the attorney.
**Rails.** Never touch a court filing system. This builds your preparation, not
your filing.

---

## 13. Annual compliance and renewal reminders

**The job.** Entity clients have annual reports and registered agent renewals.

**Trigger.** A row whose `renewal_date` is 45 days out, checked daily.
**Steps.** `draftEmail` reminder → `createCalendarEvent` → `writeBack` the date
reminded.
**Rails.** The renewal date comes from the row, which came from the filing.

---

## 14. Onboarding a new team member

**The job.** A new paralegal needs eleven things set up and the list is in
somebody's memory.

**Trigger.** A row in a staff sheet, status `New`.
**Steps.** `fillTemplates` (onboarding checklist, equipment list) →
`createCalendarEvent` for the first week's training → `notify` the office
manager.
**Rails.** Internal only. No access is granted by this agent, it only produces
the list.

---

## What none of these do

No recipe here sends mail to a client, files with a court, moves money, or
signs anything. Those are the four things this kit deliberately cannot do. If
your idea needs one of them, the agent prepares it and a human does it.

---

# Beyond Google

The recipes above live inside Workspace. These reach outside it, using the
`httpRequest` step and the webhook endpoint. Same gates, same refusals.

## 15. Case management system in both directions

**The job.** The matter exists in Clio or Lawmatics, and the documents are made
by hand in Drive.

**Trigger.** A webhook from the case management system when a matter is opened,
or a poll of its API on a clock.
**Steps.** `fillTemplates` → `review` → `httpRequest` to write the document
links back onto the matter record → `writeBack`.
**Rails.** Allowlist exactly the one API host. Token in Script Properties, never
in the config.

## 16. Website form to acknowledged lead

**The job.** A form on the firm's site emails somebody, and that is the whole
system.

**Trigger.** The site POSTs to the web app endpoint.
**Steps.** Row lands → `fillTemplates` (intake summary) → `draftEmail`
acknowledgement → `notify` intake internally.
**Rails.** Draft only. The shared secret is required, because the endpoint is
open to the internet.

## 17. Intake alert into Slack or Teams

**The job.** New matters are noticed whenever somebody next opens the sheet.

**Trigger.** Any row reaching ready.
**Steps.** `httpRequest` POST to the incoming webhook URL.
**Rails.** Post the matter id and the type. Never the client's name or facts of
the matter into a chat tool, unless the firm has decided that is acceptable and
written it down.

## 18. Moving off Zapier one workflow at a time

**The job.** Eleven Zaps nobody fully remembers.

**How.** Point the existing Zap at your web app URL as its final step. The Zap
keeps doing the trigger, your script does the work. Then replace the trigger
itself and switch the Zap off. Nothing has to move at once.
