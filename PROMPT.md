# Prompts

You do not need to remember any commands. Clone the repo, open Claude Code in
that folder by typing `claude`, and paste one of these.

---

## Start here

Paste this. It is the only one most people need.

```
Read CLAUDE.md, AGENT.template.md and recipes/RECIPES.md in this folder.

I run a law firm and I want to automate one job using Google Apps Script,
inside my own Google Workspace.

Interview me the way design-your-agent describes: one question at a time, wait
for my answer, and do not write any code until we have agreed what the agent
does. If I cannot think of a job, suggest three from the recipes in the words a
lawyer would use.

When we are done, write AGENT.md, then build the Apps Script and walk me
through getting it running. I am not a developer, so tell me what each step
does before I do it, and tell me how to switch it off.
```

## If you already know what you want to automate

```
Read CLAUDE.md and recipes/RECIPES.md.

I want an agent that does this: <describe the job in a sentence or two>.

Interview me about the parts you still need, then build it in Apps Script and
get it running in my Google account. Ask before you create anything in my
Drive.
```

## If you want ideas before you commit

```
Read recipes/RECIPES.md.

I am a <practice area> attorney with a <number> person firm. We use Google
Workspace and <your case management system>.

Given that, which three of these recipes would save me the most time, and why
those three? Ask me anything you need in order to answer well. Do not build
anything yet.
```

## Turning your own document into a template

```
Read CLAUDE.md.

I am going to give you a document my firm sends every week. Tell me exactly
which parts should become {{PLACEHOLDERS}}, what to call each one, and what
columns my intake sheet needs. Do not rewrite my language, the wording is
already approved.
```

## When something is not working

```
Read CLAUDE.md and SETUP.md.

My agent is not doing what I expect. Here is what happened:
<paste what the sheet says, and the error from the Executions view in the Apps
Script editor>

Work out what is wrong. Remember that a refusal is usually correct and the
intake row or the template is what needs fixing.
```

## Adding a second job later

```
Read AGENT.md and Config.gs so you know what my agent already does.

I want to add: <the new thing>.

Tell me first whether this belongs in the same agent or should be its own, and
why. Then build it.
```

---

## A note on how to answer the interview

Answer like you would explain the job to a paralegal on their first morning.
Plain sentences, real details, your own words for things.

The two questions worth slowing down for:

- **What one thing means this job should start?** If you name three, the agent
  ends up with no trigger at all.
- **What must this never do?** Say the thing that would be embarrassing,
  expensive, or a bar complaint. Those answers become the rails, and the rails
  are what make it safe to leave running.
