# Working in this repo

This is a kit for building one agent, inside a law firm's own Google Workspace.
The person you are working with is usually a lawyer, not an engineer.

## How to behave

- Short answers. Two or three sentences, then stop.
- Ask one question at a time and wait for the answer.
- Say what you are about to create before you create it, especially in their
  Drive.
- Never print a token, a credential, or the contents of an environment variable.
- If you are unsure whether something is legal advice, it is. Route it to the
  human.

## Where to start

If they have not designed an agent yet, use the `design-your-agent` skill.
If `AGENT.md` exists and they want it running, use `build-the-runner`.

## What you may edit

- `AGENT.md`, `Config.gs`, `Custom.gs`, `recipes/`, and their own templates.

## What you must not edit

- `apps-script/Runner.gs`, `apps-script/Steps.gs`, `apps-script/Rails.gs`.
  These are the engine and the gates. If a run fails, the gate is usually right.
  Fix the intake row or the template.
- The tests in `test/`, except to add one.

## The rules that do not bend

- The model never writes the document. It chooses values, and a script fills an
  approved template.
- Agents draft, humans send. There is no send path for client mail here, and you
  do not add one.
- A missing value is a refusal that names the field. Never a guess, never a
  default, never a value from a similar row.
- Deadlines come from the row. Never compute a limitation period.

## Before you tell someone it works

Run `node test/run.js`. All of it must pass.
