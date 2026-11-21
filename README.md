# Stoker

A stock-opname workspace for staff, managers, and administrators. It retains
outlet and staff management, stock counts and progress saving, discrepancy and
usage reports, schedule/reminder configuration, penalty tracking, audit history,
and data exports.

## Stack and setup

Use Node.js 22 or newer and pnpm 9.15.4. The application uses Next.js 15,
React 19, TypeScript, Tailwind CSS, and Supabase authentication/database clients.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Supply an isolated development Supabase project
through `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` outside
source archives. No environment file, usable credentials, real user records,
production database export, or private portraits are included.

The original database integration remains in place and has not been remade or
replaced with local mocks. Database-backed routes and protected workflows need
appropriate development tables, policies, and authentication accounts. SQL files
under `scripts/` contain policy/trigger/function definitions, not a database dump
or user seed records. Review them against an isolated development schema before
running them.

## Checks and current limits

```sh
pnpm typecheck
pnpm build
```

The existing build configuration permits lint and TypeScript errors during a
build; run the explicit type check to inspect them. There is no standalone unit
test suite in this snapshot. Full application, build, and database behavior have
not been verified in this source edition.

Use synthetic accounts and outlet/stock records for development. Runtime logs,
exports, environment files, dependency folders, caches and build output must stay
outside shared source archives.

## License

MIT. Required adapted UI attribution is preserved in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `licenses/`.
