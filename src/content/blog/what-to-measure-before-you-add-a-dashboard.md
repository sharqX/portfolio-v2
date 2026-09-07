---
title: What to measure before you add a dashboard
date: 2025-04-30
summary: Most observability setups start with a Grafana board and work backwards. Starting from the questions you need answered at 3am produces a much smaller, much more useful stack.
tags: ["Observability", "Prometheus", "Grafana"]
accent: blue
---

The first observability stack I built had eleven dashboards and no answers. Every
panel was technically correct — CPU by container, memory by container, request
count by endpoint — and none of them told me whether the application was working.

The fix was to stop asking "what can I graph?" and start asking "what would I
need to see to know something is wrong?" That question produces a much shorter
list.

## Start from the questions

For a request-driven service there are three of them, usually called the RED
method:

| Question          | Signal   | PromQL shape                                                                             |
| ----------------- | -------- | ---------------------------------------------------------------------------------------- |
| Is it being used? | Rate     | `sum(rate(http_requests_total[5m]))`                                                     |
| Is it failing?    | Errors   | `sum(rate(http_requests_total{status=~"5.."}[5m]))`                                      |
| Is it slow?       | Duration | `histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))` |

For the machines underneath, the equivalent is the USE method — utilisation,
saturation, errors — which is where `node_exporter` and `cAdvisor` earn their
place. But those are diagnostic. They tell you _why_ something broke, after RED
has told you _that_ it broke.

## Scraping

Prometheus pulls, which means the only configuration that matters is where it
looks and how often:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: node
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: containers
    static_configs:
      - targets: ["cadvisor:8080"]

  - job_name: app
    metrics_path: /metrics
    static_configs:
      - targets: ["api:3000"]
```

Fifteen seconds is a deliberate choice, not a default I left alone. It sets the
floor on how quickly an alert can fire and the ceiling on how much storage a
year of data costs. Anything faster and the series count grows without telling
me anything new.

## Precompute the expensive queries

A dashboard that takes eight seconds to load is a dashboard nobody opens during
an incident. Recording rules move that cost to scrape time:

```yaml
groups:
  - name: http
    interval: 30s
    rules:
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))

      - record: job:http_errors:ratio5m
        expr: |
          sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum by (job) (rate(http_requests_total[5m]))
```

Panels and alerts then reference `job:http_errors:ratio5m` rather than
recomputing the division every refresh.

## Alert on symptoms, not causes

This is the rule that removed most of the noise. High CPU is not an incident.
CPU high enough that requests are failing is an incident — and the second
condition is the one worth waking up for.

```yaml
- alert: ErrorBudgetBurning
  expr: job:http_errors:ratio5m > 0.02
  for: 10m
  labels:
    severity: page
  annotations:
    summary: "{{ $labels.job }} is serving over 2% 5xx"
    runbook: "https://example.internal/runbooks/http-errors"
```

The `for: 10m` clause matters as much as the threshold. Without it, a single bad
deploy that self-corrects in ninety seconds still pages someone.

> An alert without a runbook link is a request for someone to reinvent your
> debugging session at the worst possible time.

## One dashboard per question

The eleven dashboards collapsed into three:

- **Service health** — the RED panels, one row per service, nothing else.
- **Capacity** — CPU, memory, disk and network per node, for the "will this hold
  for another month?" question.
- **Deploy** — request rate and error ratio annotated with deploy timestamps, so
  a regression is attributable to a specific release without cross-referencing
  anything.

Everything else became an ad-hoc query. If a panel had not been looked at during
an actual incident, it did not survive.

## What I would change

The stack still stores everything locally on one box, which means the metrics
disappear at exactly the moment the box does. Remote write to something durable
is the obvious next step. Traces are also missing entirely: the error ratio tells
me a request failed, but not which of four services spent the time. That is the
gap I would close first.
