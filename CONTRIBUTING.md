# Contributing to DockerWatch

Thanks for your interest in contributing. DockerWatch is an open source project
and contributions of all kinds are welcome.

## Ways to contribute

- **Bug reports** — open an issue with steps to reproduce
- **Feature requests** — open an issue describing the use case
- **Code** — open a PR (see below)
- **Documentation** — fix typos, improve clarity, add examples
- **Spread the word** — star the repo, share with your team

## Development setup

See the self-hosting section in the README for local setup.

## Opening a PR

1. Fork the repo
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Test locally — make sure existing functionality still works
5. Commit with a clear message: `feat: add GCP pricing table`
6. Open a PR against `main` with a description of what and why

## Commit message format

```
feat: add something new
fix: fix a bug
docs: update documentation
refactor: refactor code without behaviour change
chore: dependency updates, config changes
```

## Areas actively looking for contributions

- **Go agent** — rewrite `agent/` in Go for a single binary with zero deps
- **Cloud pricing tables** — GCP, Azure, DigitalOcean pricing in `backend/src/app/services/cost.py`
- **Kubernetes support** — pod-level metrics via kubectl/k8s API
- **Prometheus exporter** — expose a `/metrics` endpoint in Prometheus format
- **ARM support** — test and fix agent on ARM (Raspberry Pi, AWS Graviton)

## Questions

Open an issue or start a discussion. Response within 48 hours.