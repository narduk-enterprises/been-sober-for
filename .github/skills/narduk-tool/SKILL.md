---
name: narduk-tool
description: Run narduk-cli commands for Doppler secrets management, AI image generation, Cloudflare Workers/DNS, fleet diagnostics, Fly.io, Supabase, secrets auditing, git cleanup, and dev utilities (IP, UUID, encoding). Use when the user needs to query Doppler keys, generate images with xAI, deploy Workers, diagnose fleet apps, manage DNS, audit secrets, or perform common dev utility tasks.
---

# Narduk CLI Tool

`narduk-cli` (aliased as `narduk`) is a modular CLI toolkit for common dev workflows. It wraps Doppler, xAI-backed image generation, Cloudflare, Fly.io, Supabase, and other tools into a single binary with optional interactive TUI mode.

## Prerequisites

- The binary must already be installed. If not, run from the project root (`/Users/narduk/new-code/narduk-tools`):
  ```bash
  make install
  ```
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) authenticated via `doppler login`
- Cloudflare credentials: `CLOUDFLARE_API_TOKEN_DNS`, `CLOUDFLARE_API_TOKEN_WORKERS`, `CLOUDFLARE_ACCOUNT_ID` (or Doppler fallback via `0_global-canonical-tokens/cloudflare`)
- xAI credentials: `XAI_API_KEY` preferred, `GROK_API_KEY` accepted for compatibility, or Doppler fallback via `0_global-canonical-tokens/ai`
- `flyctl` for Fly.io commands
- `supabase` CLI for Supabase commands

## Global Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--format`, `-f` | Output format: `table`, `json`, `csv` | `table` |
| `--tui` | Launch interactive TUI mode | `false` |
| `--no-cache` | Bypass Doppler cache (still writes new results) | `false` |
| `--cache-ttl` | Doppler cache TTL (e.g. `5m`, `30s`, `1h`) | — |

## Command Reference

### Doppler — Secrets Management

Aggregate and inspect Doppler secrets across all projects.

```bash
# List all deduplicated keys
narduk-cli doppler keys
narduk-cli doppler keys --show-projects     # Show which projects use each key
narduk-cli doppler keys --format json       # JSON output
narduk-cli doppler keys --config-filter prd # Filter to a specific config
narduk-cli doppler keys --tui              # Interactive TUI browser

# Search keys by partial name
narduk-cli doppler search <query>
narduk-cli doppler search stripe --show-projects
narduk-cli doppler search stripe --config-filter prd
narduk-cli doppler search --tui            # Interactive search view

# Export all secrets
narduk-cli doppler export                  # Summary table
narduk-cli doppler export --format json    # Full JSON to stdout
narduk-cli doppler export -o file.json     # Save to file
narduk-cli doppler export --project-filter my-project
narduk-cli doppler export --tui            # Interactive export wizard

# Show cross-project secret references
narduk-cli doppler refs

# Clear the local Doppler cache
narduk-cli doppler clear-cache
```

### Cloudflare — Workers & DNS

```bash
narduk-cli cf workers                       # List all deployed Workers
narduk-cli cf zones                         # List Cloudflare zones
narduk-cli cf dns list <domain>             # List DNS records for a domain
narduk-cli cf dns upsert <domain> <type> <name> <content> [--proxied]
narduk-cli cf dns delete <domain> <type> <name> --content <content>
narduk-cli cf deploy [name]                 # Deploy a Worker
narduk-cli cf tail <name>                   # Tail Worker logs
```

### Image — AI Image Generation

Generate and save AI images locally. Provider selection defaults to xAI.
Authentication prefers `XAI_API_KEY`, then `GROK_API_KEY`, then the current
Doppler scope, then `0_global-canonical-tokens/ai`.

```bash
narduk-cli image generate "A brutalist fox logo in black ink"
narduk-cli image generate --prompt "Retro synthwave poster" --n 4 --aspect-ratio 16:9
narduk-cli image generate --prompt "Steel water bottle product shot" --output-dir ./tmp/renders
narduk-cli image models
narduk-cli image models --format json

# Root TUI includes an Image Tools submenu
narduk-cli
```

### Fleet — App Diagnostics & Deployment

Uses the deployed control-plane API as the source of truth.

```bash
narduk-cli fleet apps                       # List apps from the remote fleet registry
narduk-cli fleet status [app]               # Check live reachability + build metadata
narduk-cli fleet audit [app]                # Compare live runtime config to registry
narduk-cli fleet doctor [app]               # Run status + audit + Doppler validation
narduk-cli fleet doppler validate [app]     # Check required Doppler secrets
narduk-cli fleet doppler sync-urls [app]    # Sync SITE_URL from registry to Doppler
narduk-cli fleet doppler sync-analytics     # Sync shared analytics refs to Doppler
narduk-cli fleet ship <app> [<app>...]      # Ship selected fleet apps
narduk-cli fleet ship --all                 # Ship the full fleet catalog
narduk-cli fleet logs <app>                 # Tail Cloudflare logs for an app
```

### Fly.io — Application Management

```bash
narduk-cli fly status                       # List all apps, regions, machine counts
narduk-cli fly status <app>                 # Detailed status view
narduk-cli fly logs <app>                   # Tail recent logs
```

### DNS — macOS DNS Utilities

```bash
narduk-cli dns flush                        # Flush macOS DNS cache (prompts for sudo)
```

### LAN — HomePod / Bonjour Diagnostics

```bash
narduk-cli lan snapshot                     # Immediate LAN, DHCP, ARP, Bonjour snapshot
narduk-cli lan multicast diagnose          # Short generic multicast + gateway-jitter sample
narduk-cli lan homepod diagnose            # 5-minute Bonjour + LAN RTT sample
narduk-cli lan homepod diagnose --output-dir ./tmp/homepod-lan
narduk-cli lan homepod diagnose --skip-capture
```

Timed workflows always perform Bonjour discovery. Raw mDNS/IGMP packet capture
is attempted only when the current user can access `/dev/bpf*`; otherwise the
command records that limitation and continues with discovery and latency
checks.

### Supabase

```bash
narduk-cli supabase status                  # List linked projects
narduk-cli supabase migrations              # Show pending/applied migrations
```

### Secrets Audit

Cross-reference codebase environment variables with Doppler.

```bash
narduk-cli secrets audit <path>             # Find orphaned/missing secrets
narduk-cli secrets audit . --project app    # Audit specific project
```

### Git Cleanup

```bash
narduk-cli git cleanup                      # Delete merged branches
narduk-cli git cleanup --dry-run            # Preview deletions
```

### Utilities

```bash
narduk-cli ip                               # Show Public, Local, and Tailscale IP
narduk-cli uuid                             # Generate UUID v4
narduk-cli uuid -n 5                        # Bulk generate 5 UUIDs
narduk-cli uuid --timestamp                 # Prefix UUID with timestamp
narduk-cli encode base64 <str>              # Base64 encode
narduk-cli encode base64 -d <str>           # Base64 decode
narduk-cli encode url <str>                 # URL encode
narduk-cli encode jwt <token>               # Decode JWT header + payload
```

## When to Use Which Command

| Scenario | Command |
|----------|---------|
| Find a secret across all Doppler projects | `doppler search <name>` |
| Export secrets for a specific project | `doppler export --project-filter <name>` |
| Check if a fleet app is healthy | `fleet doctor <app>` |
| Generate images with xAI | `image generate "<prompt>"` |
| Deploy a fleet app | `fleet ship <app>` |
| Deploy a Cloudflare Worker | `cf deploy <name>` |
| Manage DNS records | `cf dns list/upsert/delete` |
| Capture a generic LAN snapshot | `lan snapshot` |
| Diagnose multicast / Bonjour jitter | `lan multicast diagnose` |
| Diagnose HomePod / Bonjour LAN behavior | `lan homepod diagnose` |
| Audit missing env vars in a codebase | `secrets audit .` |
| Clean up stale git branches | `git cleanup` |
| Decode a JWT for debugging | `encode jwt <token>` |
| Get your current IP addresses | `ip` |

## Tips

- Use `--format json` to get machine-readable output that you can parse.
- Use `--tui` to launch interactive views for Doppler commands when browsing is more useful than direct queries.
- Use the root TUI (`narduk-cli`) when you want the interactive `Image Tools` submenu instead of CLI flags.
- Fleet commands use `CONTROL_PLANE_API_KEY` (env var or Doppler fallback from `narduk-nuxt-template/prd`).
- Image commands save files locally and can list xAI image models with `narduk-cli image models`.
- The `fleet ship` command uses the local `~/new-code/template-apps/control-plane` checkout.

## Feature Requests

> [!IMPORTANT]
> If during your work you identify a task or workflow that **would benefit from a new narduk-cli command or enhancement** but doesn't currently exist, you MUST notify the user with a suggestion. Examples include:
> - A repetitive multi-step shell workflow that could be a single CLI command
> - Missing flags or output formats that would make automation easier
> - New integrations with tools the user frequently uses (e.g., Neon, GitHub Actions, etc.)
> - Improvements to existing commands (batch operations, better error messages, etc.)
>
> Frame the suggestion clearly: what the command would do, why it's useful, and a proposed invocation (e.g., `narduk-cli neon branches`).

## Development

The source lives at `/Users/narduk/new-code/narduk-tools`. After any change:

```bash
cd /Users/narduk/new-code/narduk-tools
make install   # Rebuild and install the binary
```
