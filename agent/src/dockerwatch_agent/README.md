# DockerWatch Agent

Lightweight Python agent that runs on your server and ships container metrics to DockerWatch every 30 seconds.

## Install

```bash
pip install dockerwatch-agent
```

## Run

```bash
dockerwatch-agent start --api-key=YOUR_API_KEY
```

Get your API key from the DockerWatch dashboard after adding a server.

## What it collects

Per container, every 30 seconds:
- CPU usage (%)
- Memory usage + limit (bytes)
- Network I/O (rx/tx bytes)
- Disk I/O (read/write bytes)
- Container status (running/stopped/restarting)

## Run as a systemd service

```bash
dockerwatch-agent install-service --api-key=YOUR_API_KEY
systemctl enable --now dockerwatch-agent
```

## Run as a Docker sidecar

```yaml
services:
  dockerwatch-agent:
    image: dockerwatch/agent:latest
    environment:
      - DOCKERWATCH_API_KEY=YOUR_API_KEY
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped
```