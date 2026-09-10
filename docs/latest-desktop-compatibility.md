# DSH Desktop 2.0.7 compatibility

This branch targets the DSH 0.1.5-rc.1 package family used by Desktop stable 2.0.7 and beta 2.0.7-beta.1. It does not change the independent ANP Identity or IM Core SDK versions.

The browser uses the renderer slot service and bundles the framework-free client store. Model availability joins the typed Remote live-provider directory, configurable-provider directory, settings description, and credential metadata. It never reads credential values.

AWiki settings and Model Proxy operations use exact authenticated Fetch routes beneath `/api/awiki-settings/` and `/api/awiki-model-proxy/`. The client sends `/api` as its channel and the remaining path as its endpoint. Each route retains the loopback authority check; trusted LAN access alone does not permit these operations. Settings mutation batches keep the caller's explicit revision and apply their final domain operation atomically.

Release candidates: AWiki 0.3.11 and Model Proxy 0.1.7, intended for publication under the dedicated `dsh-desktop` npm tag for DSH 0.1.5-rc.1. Existing `latest` and `shanghai` tags are unchanged. Desktop 2.2.0-rc.1 integrates this pair. Unit/build evidence does not substitute for actual desktop loading, persistence after reopening, or a real model request. Backend rollout and live account acceptance remain separate gates.
