---
name: assemblyops-roadmap-workflow
description: This skill should be used when the user asks to "plan the next feature", "check the Notion roadmap", "create or refine a GitHub issue", "move roadmap work into development", "start an AssemblyOps feature", "update the GitHub Project", "finish or release a feature", or otherwise works across Notion, GitHub Issues, GitHub Projects, branches, pull requests, and releases for AssemblyOps. It enforces the approved Notion-to-GitHub handoff and prevents workflow deviation.
---

# AssemblyOps Roadmap Workflow

Enforce the approved planning and delivery boundary:

- Use the AssemblyOps Notion workspace as the product roadmap, requirements, feature-lifecycle, and decision system.
- Use the repository Markdown files in `docs/development_docs/` as the authoritative CO/S source transcriptions.
- Use GitHub Issues for approved, development-ready implementation slices.
- Use GitHub Projects only for active execution through Todo, WIP, and Done.
- Use pull-request draft state to distinguish development from review.

Read `references/workflow-contract.md` completely before creating, editing, or moving roadmap or development work.

## Begin every workflow action

1. Read the applicable repository `AGENTS.md` instructions.
2. Identify the Notion feature or initiative that authorizes the work.
3. State the current lifecycle stage and the next permitted transition.
4. Remind the product owner to review Notion when requirements, priority, scope, decisions, dependencies, or release state may have changed.
5. Stop when the required Notion record, approval, or product decision is missing.

## Keep the systems separate

Capture broad or uncertain work in Notion. Keep future features, research, decisions, requirements traceability, release horizons, and cross-department dependencies out of the GitHub Project.

Create a GitHub issue only from a Notion feature marked `Ready for development`, and only after explicit approval of the proposed scope, acceptance criteria, and out-of-scope boundary. Treat one Notion feature as capable of producing multiple GitHub issues when separate deployable slices are required.

Use the GitHub Project for issue and PR execution only:

- Issue approved and opened: Todo
- Branch cut or draft PR opened: WIP
- PR merged: Done

Do not add project columns or parallel status labels to represent review state.

## Enforce approval gates

Draft issue content before mutation. Obtain explicit per-change approval before creating an issue, editing its title or body, changing acceptance criteria, applying labels or milestones, or deleting cards.

Discuss scope before drafting `Out of Scope` or acceptance criteria that imply a scope decision. Do not infer product scope from code, documentation, or convenience.

Allow board synchronization without additional approval only when moving existing issue and PR cards to reflect their actual Todo, WIP, or Done state.

## Emit mandatory reminders

Include a concise Notion reminder at these points:

- Before selecting the next development slice: review Current Release, Decisions Needed, and dependencies.
- Before issue creation: confirm the Notion feature is Ready for development.
- When implementation reveals new scope: capture it in Notion; do not expand the active issue.
- After merge: update implementation links and partial-delivery notes in Notion.
- Before marking Released: verify actual deployment or distribution, especially TestFlight for iOS.
- During weekly planning: review priorities, blocked decisions, sources, and the GitHub Handoff view.

Avoid repeating reminders when no transition or relevant change occurred.

## Stop severe deviations

Refuse or pause any action that would:

- Create speculative backlog issues from Captured, Needs Research, Needs Decision, Validated, or Planned features.
- Change product scope or acceptance criteria without product-owner confirmation.
- Bypass Notion because an implementation appears obvious or urgent.
- Put roadmap epics, future ideas, or research into the active GitHub Project.
- Add GitHub Project columns beyond Todo, WIP, and Done.
- Combine unrelated issues, independently deployed tiers, or extra behavior into one PR.
- Commit directly to `main`, push to the remote, squash merge, or bypass the required branch and PR workflow.
- Mark an iOS feature Released merely because code merged.
- Delete or supersede roadmap records without explicit authorization.

When a requested action conflicts with this contract, identify the exact conflict, preserve current state, and propose the smallest compliant next step. Never silently reinterpret the workflow.
