# Build analysis presentation

This feature renders the canonical `CharacterAnalysisResult` contract without performing analysis itself.

## Boundaries

- Observed public-profile/game evidence is shown separately from community relic methodology output.
- Evidence state (`available`, `partial`, `unavailable`) and provenance are always visible in text.
- Community SRS-N/SRS-M values are labeled as community methodology, not an official HoYoverse evaluation.
- Target stats, build quality, relic scores, and recommendations are displayed only when supplied by the canonical contract.
- No fetch, scoring formula, target generation, recommendation logic, route integration, or persistence belongs in this feature.

`fixtures.ts` contains synthetic, offline demo values for tests/development only and is intentionally not exported from the feature barrel.
