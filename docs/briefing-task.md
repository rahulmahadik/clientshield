# Scheduled task: 7am morning briefing

This is the prompt used by the QwenWork Scheduler task that generates Mei's
morning briefing every day at 07:00 Asia/Singapore.

## Schedule

- **Cron:** every day at 07:00 (Asia/Singapore)
- **Endpoint called:** `POST https://jpbfucnh.qwenwork.page/api/briefing/generate`

## Task prompt

> Call POST https://jpbfucnh.qwenwork.page/api/briefing/generate (no body
> needed). The endpoint reads yesterday's and today's action log from the
> ClientShield database and writes the morning briefing for the owner: one
> headline sentence, agent counts, what was stopped and why, what is waiting
> for approval, made-up figures caught, trust changes, and one recommended
> action. Confirm the response contains a briefing with a non-empty headline.

## Notes

- The briefing is stored per date; re-running on the same day replaces it.
- If the Qwen LLM key is configured, the wording is written by the model;
  otherwise a deterministic rule-based writer is used (see Settings in the
  app for the planner status).
