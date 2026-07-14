# Notion structure audit — 2026-07-13

Source: [南大生存手册](https://app.notion.com/p/24c7d60a0dda808baaf0c30129eeff3b)

## Scope

- 37 public descendant pages under the editorial root.
- 7 direct children become top-level site sections.
- 28 second-level pages and 2 third-level course pages.
- The root page itself is an editorial container and is excluded from publication count.

## Observed rich structures

Counts below come from the Notion connector’s rendered page representation, so the server-side publisher dry-run remains the authoritative block-type check.

| Structure | Observed | Current publication support | Action |
|---|---:|---|---|
| Callout | 19 tag occurrences across 10 pages | Supported only as rich text without nested child blocks | Dry-run must detect nested callout children; nested content cannot be discarded |
| File | 45 across 9 pages | Supported and mirrored | Verify MIME, size, checksum and logged-out URL; “培养方案” alone contains 26 |
| Table | 11 tag occurrences across 7 pages | Supported | Verify headers and mobile horizontal scrolling |
| Column/columns | 54 tag occurrences across 6 pages | Supported | Verify left-to-right mobile stacking and nested block order |
| Embed | 2 on “新生必看” | Non-school-map embeds degrade to explicit external links | Verify no third-party iframe remains |
| Empty block | 44 | Empty paragraphs are representable | Confirm intentional spacing is acceptable |
| Divider | 10 across 3 pages | **Not in frozen Block schema** | Publication must fail until the author removes/replaces them or a separately approved schema revision adds divider |

Divider-affected pages:

- [写在前面](https://app.notion.com/p/22c7d60a0dda80f78863efb88ba02cef): 8
- [新生必看](https://app.notion.com/p/2347d60a0dda80138505dfba8e0943e0): 1
- [校园跑&体测](https://app.notion.com/p/2597d60a0dda8091a2a1f9731fbef0a3): 1

## Release effect

The current schema correctly fails unknown blocks instead of flattening or silently dropping them. Therefore a 37-page staging publication is not yet authorized to advance the pointer. The next safe operation is a server API `--dry-run --all`, which will produce exact source block IDs and expose any synced blocks or nested constructs that the rendered connector view cannot identify.

No Notion content was modified during this audit, and no public page was made dependent on Notion access.
