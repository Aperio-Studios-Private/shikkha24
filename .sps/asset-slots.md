# Asset Slots

Media slot registry — one row per public image/video slot. The row is the
shared source of truth; the Flow prompt and the photoshoot brief are two
renderings of it. Law: `skill/sps/ASSET-SLOTS.md`. Machine check:
`bash scripts/sps-assetcheck.sh <project>` (add `--allow-unresolved` for
mid-build structure-only checks — never as a DoD pass).

## Slots

<!-- One table total, inside this ## Slots section — keep ids stable. -->
<!-- media_type: image | video. loading: eager | lazy. -->
<!-- status: prompt_ready | sent_to_user | generated | replaced | exception -->

| id | section | purpose | cms_field | media_type | ratio | min_dimensions | budget | loading | status | alt_text | provenance | depicts | release_ref | asset_path |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | |

<!-- purpose og requires min_dimensions >= 1200x630. budget: hero <= 200KB,
     inline <= 120KB — over-cap or unreadable needs
     `budget_exception (approved by <who>, <date>)` in this cell.
     provenance required (with YYYY-MM-DD date) when status is generated.
     asset_path required (and must exist in-project) when status is replaced.
     depicts: none | people | property | people+property — when not none and
     status is replaced/generated, release_ref is required. -->

## Slot details

<!-- Per slot: subject / scene / mood / constraints and the two renderings. -->

### <slot-id>

- **subject:**
- **scene:**
- **mood:**
- **constraints:** (what must NOT appear)
- **user note:** (generation feedback, rejection reasons)

#### Flow prompt

```
<structured Veo prompt — Subject / Action / Scene / Camera angle /
Camera movement / Lens / Style / Temporal / Audio / Cinematic terms.
Aspect ratio named. Negative prompts DESCRIBE the unwanted thing.>
```

#### Photoshoot brief

```
<plain language — where it goes, what to shoot, framing, min resolution,
light, location/props, shot-list order, releases, file naming, acceptance>
```

## Exceptions

<!-- status: exception rows MUST have an entry here naming the slot id, -->
<!-- an approver, and a date — the checker matches on slot id and validates -->
<!-- that the entry carries `approved by <who>` and a YYYY-MM-DD date. -->

- <slot-id> — approved by <who>, <date> — <why>
