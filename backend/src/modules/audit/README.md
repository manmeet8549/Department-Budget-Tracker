# Module: audit

**Layer:** L1  
**Iteration:** See `architecture.md` §8

## Responsibilities

> _To be filled as module is implemented._

## Owns (tables)

audit_logs (insert-only)

## Public API (`index.js` exports)

`log(tx, payload), search(filters)`

## Events emitted

_(none)_

## Version history

| Version | Status | Content |
|---|---|---|
| v1 | 🔲 Planned | v1 planned: log() writer, GET /audit-logs for SUPER_ADMIN |
