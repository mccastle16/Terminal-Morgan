# PKP Prompt Patterns

## Node Setup
You are an analyst. Build the JSON per PKP schema v1 for NODE=<entity>.
Fill: node, context.picks_shovels, context.edges, signals.metrics/events, undercurrents, risks, actions.
If unsure, leave values null but keep fields. Return JSON only.

## Value-Chain Map
Map raw->processing->infra->platform->app->end_market. Include picks_shovels with weights [0,1].

## Live Monitor Rules
Convert metrics into alertable actions (rules + notify).

## News Digest
Summarize latest headlines by sentiment; update news[], signals.events[], undercurrents[].

## Cross-Domain Apply
Adapt surface terms for DOMAIN=<security|policy|sales_ops|research>, keep deep fields.
