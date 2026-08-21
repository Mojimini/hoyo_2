# Analysis Source Architecture

## Goal

Build analysis must be evidence-backed. The app may derive results only from explicit public-profile observations plus versioned external metadata/methodology sources. Missing targets, weights, or equipment facts remain unavailable instead of being guessed.

## Source classes

### Public profile

The existing public UID snapshot is the observation source for the player's displayed characters, stats, light cone, relics, and traces. It is not a recommendation source.

### Game metadata

StarRailRes may be adapted as a game-metadata source for character identities, property definitions, relic sets/slots, and affix metadata. Adapters must record a revision and fetch timestamp. Game metadata does not by itself imply build quality or target values.

### Community methodology

StarRailScore may be adapted as a community-methodology source for SRS relic weights and scoring inputs. Results derived from these weights must be labeled as community scoring, not official HoYoverse evaluation. The upstream project currently describes the scoring standard as still in development, so revision provenance is mandatory.

## Canonical contracts

`src/analysis/contracts/index.ts` owns the provider-neutral contracts for:

- source provenance
- available / partial / unavailable evidence
- normalized observed stats
- future target-stat ranges
- relic weight profiles
- SRS-N / SRS-M result values
- character build evidence
- character analysis result surfaces

Existing `src/types/models.ts` preview models and `src/profile/contracts/**` public-profile contracts remain unchanged.

## Fail-closed rules

1. Do not create a target stat unless a verified target source provides it.
2. Do not create a relic weight if the selected community dataset does not provide it.
3. Do not replace unknown values with zero.
4. Do not convert a partial source into an available result without recording the missing evidence.
5. All community-derived scores must carry the community source revision.
6. Build quality and recommendation remain `unavailable` until a later phase defines an explicit evidence-backed policy.

## Scoring boundary

The contracts allow normalized SRS-N / SRS-M results, but this foundation does not implement the formulas. A later engine must reproduce the selected upstream methodology from typed inputs and tests; it may not silently introduce custom weights.

## Attribution and updates

Adapters should preserve enough source metadata to identify the upstream dataset and revision used for a result. Runtime UI should surface the source name and revision when showing community-derived analysis. External data should be refreshed deliberately and validated before becoming authoritative input.
