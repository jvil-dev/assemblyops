# AssemblyOps Notion and GitHub Workflow Contract

## System ownership

| System | Owns | Must not become |
| --- | --- | --- |
| Repository Reference Docs | Authoritative CO/S source transcriptions in `docs/development_docs/` | Product backlog or implementation tracker |
| Notion Product Roadmap | Initiatives, features, requirements, decisions, priorities, release horizons, dependencies, and release state | Daily engineering task board |
| GitHub Issues | Approved implementation slices with scope and acceptance criteria | Speculative or long-range backlog |
| GitHub Project | Active issue and PR execution in Todo, WIP, and Done | Big-picture roadmap |
| Pull requests | Implementation, verification, and review evidence for one issue | Product discovery or scope negotiation |

## Notion lifecycle

Use the lifecycle in this order where applicable:

`Captured -> Needs Research -> Needs Decision -> Validated -> Planned -> Ready for Development -> In Development -> Released`

Use `Replaced` when a successor record explicitly supersedes a feature.

- Captured: record exists but is not validated.
- Needs Research: requirement, current behavior, or feasibility remains unclear.
- Needs Decision: product direction is required.
- Validated: source and interpretation are confirmed.
- Planned: assigned to a release horizon or delivery phase.
- Ready for Development: the next implementation slice has approved scope, acceptance criteria, exclusions, and dependencies.
- In Development: at least one approved issue is active and the overall feature remains incomplete.
- Released: intended users can access the complete feature in the intended environment or distribution stage.
- Replaced: a linked successor is now the plan of record.

Skipping research or decision stages is acceptable only when they genuinely do not apply. Never skip Ready for Development before issue creation.

## Weekly selection procedure

1. Open the AssemblyOps Product Roadmap in Notion.
2. Review Current Release.
3. Review Decisions Needed and blocked dependencies.
4. Confirm source validation for candidate features.
5. Select the smallest valuable implementation slice.
6. Discuss included and excluded scope with the product owner.
7. Draft acceptance criteria and a brief design note when non-trivial.
8. Obtain explicit approval.
9. Mark the Notion feature Ready for development.
10. Create the GitHub issue and add its URL to Notion.

## GitHub issue gate

Require all of the following before issue creation:

- A corresponding Notion feature exists.
- Status is Ready for Development.
- Outcome and reason are clear.
- Applicable department, users, and tier are identified.
- Source requirement and validation status are recorded.
- Dependencies and open decisions are resolved or explicitly excluded.
- Included scope is confirmed by the product owner.
- Out-of-scope boundaries are confirmed by the product owner.
- Acceptance criteria are testable and approved.
- The slice fits one issue and one PR.

If any condition fails, keep the work in Notion and report the missing gate.

## Development lifecycle

1. Open the approved issue; add its card to Todo.
2. Cut `<type>/<issue-id>-<short-description>` from `main`.
3. Open a draft PR immediately with `Closes #<issue-id>`.
4. Add issue and PR cards to the Project; move both to WIP.
5. Build only the approved acceptance criteria.
6. Capture newly discovered scope in Notion or a separately approved issue.
7. Verify all criteria; add tests for logic-heavy behavior.
8. Mark the PR ready for review while keeping it in WIP.
9. Run the repository review checklist.
10. Merge with a merge commit; never squash.
11. Move issue and PR cards to Done.
12. Update Notion with issue/PR links and delivery notes.

## Release semantics

- Web/backend: mark Released only after the change is deployed and available as intended.
- iOS: merge is not release. Mark Released only after the tagged build passes the intended TestFlight or store distribution gate.
- Partial implementation: keep Planned or In Development and record remaining slices.
- Rollback or withdrawn release: correct Notion state and add a decision or note explaining the change.

## Product-owner reminders

Use short, actionable reminders rather than generic warnings:

- `Notion check: confirm Current release priority and unresolved decisions before selecting this slice.`
- `Notion gate: this feature must be Ready for development before an issue is created.`
- `Scope check: capture the newly discovered behavior in Notion instead of expanding this issue.`
- `Post-merge Notion update: add the implementation links and record what remains.`
- `Release check: do not mark the iOS feature Released until the tagged build reaches the intended distribution stage.`

## Deviation response

When a request would break a guardrail:

1. Do not mutate Notion, GitHub, git history, or project state.
2. Name the conflicting rule and the evidence triggering it.
3. Explain the operational risk in one or two sentences.
4. Offer the smallest compliant alternative.
5. Request explicit direction only when a product decision or new authority is required.

Do not weaken a guardrail through inference, urgency, convenience, or repeated requests. Accept workflow changes only when the product owner explicitly changes the governing repository instructions and confirms the migration plan.
