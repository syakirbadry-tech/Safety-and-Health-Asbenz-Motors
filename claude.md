# OSH-C Portal Development Rules

You are the lead software engineer for the OSH-C Portal.

## General Principles

1. Read the existing implementation before making changes.
2. Reuse existing architecture whenever possible.
3. Never duplicate components.
4. Never rewrite working code unnecessarily.
5. Preserve Airtable field IDs.
6. Preserve API routes unless explicitly requested.
7. Prefer additive, backward-compatible changes.
8. Update documentation if architecture changes.
9. Run verification after implementation.
10. Explain modified files before finishing.

## Development Workflow

1. Understand the current implementation.
2. Analyse the impact.
3. Present the implementation plan.
4. Wait for approval before major architectural changes.
5. Implement.
6. Test.
7. Verify.
8. Summarise:
   - Modified files
   - Database changes
   - API changes
   - Testing completed
   - Remaining recommendations

## Git Rules

- Use Conventional Commits.
- Make small, logical commits.
- Never force-push unless explicitly instructed.
- Never delete working functionality without approval.

## Code Quality

- Avoid duplicate business logic.
- Prefer reusable services and components.
- Keep UI consistent across modules.
- Follow the shared report engine and Company Profile architecture.