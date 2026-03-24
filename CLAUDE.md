# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps + generate Prisma client + run migrations
npm run dev          # Start dev server with Turbopack at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all Vitest tests
npx vitest run src/components/editor/__tests__/file-tree.test.tsx  # Run a single test file
npm run db:reset     # Reset SQLite database (destructive)
```

The dev server requires `NODE_OPTIONS='--require ./node-compat.cjs'` (already included in npm scripts). Do not run `next dev` directly.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat; Claude generates files into a virtual file system; a sandboxed iframe renders a live preview.

### Data Flow

1. **Chat** (`src/app/api/chat/route.ts`) — POST endpoint using Vercel AI SDK `streamText`. Receives serialized VFS state (`files`) alongside chat `messages`. Reconstructs a `VirtualFileSystem`, runs Claude with two tools (`str_replace_editor`, `file_manager`), streams back responses, and persists to Prisma on finish.

2. **Virtual File System** (`src/lib/file-system.ts`) — In-memory tree structure (`VirtualFileSystem` class). Never writes to disk. Serializes/deserializes as `Record<string, FileNode>` for API transport and Prisma storage. Key methods: `createFileWithParents`, `replaceInFile`, `insertInFile`, `viewFile`.

3. **AI Tools** (`src/lib/tools/`) — `str_replace_editor` (create/view/str_replace/insert commands) and `file_manager` (rename/delete) wrap the VFS and are passed to `streamText`. The client mirrors tool calls via `FileSystemContext.handleToolCall` to keep the client-side VFS in sync.

4. **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`) — React context holding the client-side VFS instance. Exposes file operations and a `refreshTrigger` counter that drives preview re-renders. `handleToolCall` processes incoming AI tool calls to update the VFS in real time.

5. **Preview** (`src/components/preview/PreviewFrame.tsx` + `src/lib/transform/jsx-transformer.ts`) — On every `refreshTrigger`, transpiles all VFS files with Babel Standalone, creates blob URLs, and injects an ES module import map into an `<iframe srcdoc>`. Third-party packages resolve via `esm.sh`. Entry point is `/App.jsx` by convention.

6. **AI Generation Conventions** (`src/lib/prompts/generation.tsx`) — The system prompt instructs Claude to:
   - Always create `/App.jsx` as root entry point with a default export
   - Use Tailwind CSS for styling (Tailwind CDN is injected into preview HTML)
   - Use `@/` import alias for all local files (e.g., `@/components/Button`)
   - Never create HTML files

### Auth & Persistence

- Custom JWT auth via `jose` stored in an `httpOnly` cookie (`src/lib/auth.ts`). No NextAuth.
- Prisma + SQLite (`prisma/dev.db`). Generated client output: `src/generated/prisma`.
- The database is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database.
- Anonymous users can work without signing in; projects only persist for authenticated users.
- Middleware (`src/middleware.ts`) protects routes.
- `src/lib/anon-work-tracker.ts` tracks work done before sign-in so it can be saved on auth.

### Code Style

Use comments sparingly — only for complex or non-obvious logic.

### Key Conventions

- All AI-facing file paths use the `@/` alias for local imports (maps to `/` in the VFS).
- `VirtualFileSystem.serialize()` strips `children` Maps (not JSON-serializable); `deserializeFromNodes` rebuilds the tree from flat records sorted by path.
- The `getLanguageModel()` helper (`src/lib/provider.ts`) returns a mock provider when `ANTHROPIC_API_KEY` is absent. Mock mode limits `maxSteps` to 4.
- shadcn/ui components live in `src/components/ui/`. Add new ones with `npx shadcn add <component>`.
- Tests use Vitest + Testing Library with jsdom. Config in `vitest.config.mts`.
