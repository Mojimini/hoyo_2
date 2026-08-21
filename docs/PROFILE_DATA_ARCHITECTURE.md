# Phase 2 Public Profile Data Architecture

## Goal

Phase 2 introduces real Honkai: Star Rail **public showcase** data while keeping provider details out of the UI and preserving the Phase 1 mock/view-model contracts.

The first live-data boundary is intentionally UID-only. It must not request, collect, or store HoYoLAB cookies, passwords, LToken/SToken values, session tokens, or other authenticated account credentials.

## Canonical contract

`src/profile/contracts/index.ts` is the provider-neutral contract for public profile snapshots.

Provider adapters must convert raw responses into these contracts before the data reaches UI/runtime code. Pages and feature components must not depend on raw MiHoMo/Enka response shapes.

## Missing data semantics

`ProfileField<T>` deliberately distinguishes three cases:

- `available`: the provider supplied enough data to treat the value as known.
- `partial`: some value is known, but the provider response is incomplete.
- `unavailable`: the provider did not provide enough evidence to represent the value.

Do not replace `partial` or `unavailable` data with zero, empty-looking equipment, level 0, or other fabricated defaults.

For equipped light cones, `available` with `value: null` means the provider explicitly proves that no light cone is equipped. That is different from `unavailable`, which means the source did not prove either state.

## Source and freshness metadata

Every successful snapshot carries `ProfileSourceMetadata`:

- provider identifier
- requested UID
- fetch timestamp
- freshness state
- optional expiry / TTL information
- explicit `isPartial` flag

The cache/freshness layer owns freshness decisions. Provider-specific TTLs should be preserved when available instead of being discarded.

## Error boundary

Provider adapters return `ProfileFetchResult`, never raw thrown transport errors to page code. Canonical error codes cover invalid UID, not found, private/empty showcase, rate limiting, timeout, malformed response, provider outage, and unknown failures.

Provider implementations may log or retain richer internal diagnostics, but UI-facing errors must remain credential-free and provider-neutral where practical.

## Phase 2 ownership boundaries

1. **Contracts** — provider-neutral types only; no network or UI logic.
2. **Provider adapter** — public UID request + raw schema normalization.
3. **Cache/freshness** — request dedupe, TTL handling, stale/expired state.
4. **Profile source UI** — UID entry and canonical loading/error presentation; no direct fetch.
5. **Profile detail UI** — render canonical real-profile character/equipment data via props.
6. **Test foundation** — offline synthetic/redacted fixtures and contract tests.
7. **Runtime integration** — a later coordinator-owned step connects the above modules to routes and explicit mock fallback.

## Compatibility rules

- Existing `src/types/models.ts` remains the Phase 1 build/readiness view-model contract.
- Real profile contracts are additive and must not redefine build score, priority, queue stage, or recommendations.
- A future analysis layer may derive build/readiness data from real profile snapshots, but that layer is outside this contract and must be explicit and testable.
- Public showcase data can be incomplete by design; the UI must disclose partial/unavailable data instead of implying full-account visibility.
