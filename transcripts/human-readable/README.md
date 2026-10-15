# Human-readable transcript

This human-readable log is outside the scope of the initial Granicus task and
included for the convenience of third-party reviewers.

`claude-code-session.html` is a single, self-contained page that shows the main
Claude Code session with the four subagent transcripts inline. Open it in any
browser. The **Show only user input** button at the top hides everything except
my own prompts (including mid-turn "steering" messages). Click it again to
restore the full transcript. It was generated with
[claude-code-log](https://github.com/daaain/claude-code-log) 1.7.0 from a copy
of the raw export:

    claude-code-log convert ee9f07de-7d02-4a44-94cd-06331c05accd.jsonl -o claude-code-session.html --no-cache

The only changes after generation are the scope note and the user-input toggle
at the top of the page.
The raw export in `../claude-code-session/` was not modified, and it remains the
authoritative record. claude-code-log skips a few app bookkeeping events
(`atis-latch`, `bridge-session`, `file-history-delta`, `cost-state`,
`relocated`, `pr-link`). These are not part of the conversation and are still
in the raw JSONL.
