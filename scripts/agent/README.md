# Watchtower Host Agent

Single-file Python agent that reports host metrics (CPU, memory, disk,
network, process count) to Watchtower.

Runs on the host you want to monitor. The host self-registers on its first
metrics batch — there is no "add host" button; the agent's presence *is*
registration.

## Prerequisites

- Python 3.11+
- A Watchtower project
- A **secret** project API key (`wt_sec_...`). Public keys (`wt_pub_...`)
  are rejected on `/api/v1/ingest/metrics`.

## 1. Get a secret key

In the Watchtower UI: **Settings → API Keys → Create**, pick **secret**,
copy the value shown (only shown once).

## 2. Create the config file

Config lives at `~/.watchtower/agent.toml` by default. Pass
`--config <path>` to override.

**PowerShell (Windows):**
```powershell
New-Item -ItemType Directory -Force "$HOME\.watchtower"
Copy-Item scripts\agent\example.agent.toml "$HOME\.watchtower\agent.toml"
notepad "$HOME\.watchtower\agent.toml"
```

**bash / zsh (macOS/Linux):**
```bash
mkdir -p ~/.watchtower
cp scripts/agent/example.agent.toml ~/.watchtower/agent.toml
$EDITOR ~/.watchtower/agent.toml
```

Set `dsn = "http://<watchtower-host>:8000/wt_sec_YOURKEY"` with your
actual secret key. Optionally set `hostname` (defaults to
`socket.gethostname()`) and `interval_seconds` (default `60`).

## 3. Run the agent

Dev — no install, just `uv`:

**PowerShell:**
```powershell
uv run --with psutil --with httpx python scripts\agent\watchtower_agent.py
```

**bash:**
```bash
uv run --with psutil --with httpx python scripts/agent/watchtower_agent.py
```

Or install as a package and run the console entry point (`watchtower-agent`):

```bash
pip install ./scripts/agent
watchtower-agent
```

You should see:
```
2026-07-29 17:34:02 INFO watchtower agent starting: host=web-1 interval=60s
```

Within `interval_seconds`, the host appears at `/dashboard/hosts` with an
online dot. The CPU 1h sparkline needs 2+ samples to draw.

## 4. Run as a service (production)

The agent is a foreground loop. In production, run it under a supervisor:

- **Linux (systemd):** create a unit file that calls `watchtower-agent`.
- **Windows:** use `nssm install WatchtowerAgent` pointing at
  `python.exe scripts\agent\watchtower_agent.py`.
- **macOS:** `launchd` plist.

`ponytail:` we don't ship a systemd unit yet — add when a user asks.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `agent: DSN missing project key` | DSN doesn't end in `/wt_sec_...`. Fix the `dsn = ` line. |
| `403 Forbidden — Secret key required` | Used a public key. Create a `wt_sec_...` key and retry. |
| Host list stays empty | Backend not reachable, or interval hasn't elapsed. Check the agent log; the first POST fires immediately on start. |
| Sparkline says `no data` | Fewer than 2 samples yet. Wait `2 * interval_seconds`. |
| High disk % but you don't care | Agent reports root filesystem only; multi-mount is deferred. |
