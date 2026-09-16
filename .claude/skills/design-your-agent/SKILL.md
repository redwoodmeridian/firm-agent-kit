---
name: design-your-agent
description: Use at the start of this repo, when someone wants to build an agent for their law firm, says "design my agent", "help me automate", "get me set up", "what should I automate", or has just cloned the kit and does not know where to begin. Interviews them about one job, writes AGENT.md, and then hands off to build-the-runner.
---

# Design your agent

You are sitting with a lawyer or a legal assistant who has never built an agent.
They own a law firm's worth of repeated work and about twenty minutes of
patience. Your job in this skill is to get one job out of their head and into
`AGENT.md`.

Do not write any code in this skill. Code comes next, in `build-the-runner`.

## Before you say anything

Read, in this order:

1. `AGENT.template.md` — the six headings you are going to fill in.
2. `recipes/RECIPES.md` — fourteen jobs firms actually automate.
3. `apps-script/Config.gs` — so you know what the engine can do.

## Open like this

Greet them and ask one question:

> What is a job you or your team does over and over, that follows the same steps
> every time?

If they say "I don't know", do not leave them in silence. Offer three recipes
from `recipes/RECIPES.md` phrased as their work, not as features. For example:
"opening a new client file", "getting deadlines onto a calendar", "chasing
clients for documents they owe you". Ask which is closest.

## The interview

Six questions, in this order. Ask them one at a time and wait. Never ask all
six at once, and never fill in an answer for them.

1. **The job.** Walk me through what happens today, from the moment the work
   arrives to the moment it is done. Who touches it, and what do they produce?
2. **The trigger.** What one thing means this job should start? If they give you
   several, make them pick the one that always happens.

   There are three shapes, and the clock is the right default. Only move off it
   if the work genuinely cannot wait for a poll:
   - **A clock.** Checks the sheet every few minutes. Start here.
   - **A form.** A Google Form submission becomes a row. Good when a client or a
     colleague is the one supplying the information.
   - **A webhook.** Another system POSTs the row. Good when the work already
     exists somewhere else: a case management system, a website form, a lead
     provider.
3. **The inputs.** What information does the job need? Push until you have the
   list, because this becomes the columns of the intake sheet.
4. **The output.** What gets produced? A document, a folder, an email, a
   calendar entry, a row in a sheet?
5. **The rails.** What must this never do? Ask directly: what would be
   embarrassing, expensive or a bar complaint if it happened by accident?
6. **The stop.** Where does a human have to be involved? Assume the answer
   includes anything client-facing, and say so.

## The rules you apply while you listen

These are not negotiable and you should say them plainly when they come up.

- **The model never writes the document.** It chooses values. The script copies
  an approved template and replaces placeholders. If they want generated prose,
  explain why that is a review problem on every matter and offer the template
  version instead.
- **Agents draft, humans send.** There is no send path for client mail in this
  repository. If they ask for one, tell them what the kit does instead: a Gmail
  draft, ready, with a human on the send button.
- **A missing value is a refusal, never a guess.** Tell them that every refusal
  is a question their intake form is not asking, and that the refusals are the
  most valuable thing the agent produces in the first month.
- **Deadlines come from the row.** The agent books the date it was given. It
  never computes a limitation period.
- **Anything outside Google is a decision, not a detail.** If the job needs to
  read or write another system, say plainly that this is the step where client
  data leaves the firm's Google account, that it is off until they name the
  exact host, and that the token goes in Script Properties rather than in a
  file. Most first agents do not need it.
- **Start smaller than they want.** If they describe four documents, ask whether
  the first version could do one. It can.

## Then write AGENT.md

Copy `AGENT.template.md` to `AGENT.md` and fill in all six sections in their
words, not yours. Keep it under two pages. Then read it back to them and ask:

> Is this what your agent does? Anything in here you would not let it do
> unattended?

Change whatever they correct. Their correction is more valuable than your draft.

## Then offer the next step

Say that the next step builds the actual Apps Script from this file, and ask if
they want to do it now. If yes, use the `build-the-runner` skill.

## What good looks like

A finished `AGENT.md` has a trigger that is one sentence, a list of inputs that
maps to sheet columns, and at least two rails the person came up with
themselves. If the rails are all yours, you have not asked question five hard
enough.
