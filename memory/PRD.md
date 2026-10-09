# Leverage What Matters — PRD

## Original problem statement (summary)
AI-guided thinking platform for complex challenges. Philosophy: Human thinks. AI structures. Human decides. Visible journey Focus → See → Decide → Learn, underpinned by the Leverage 8 Method (L-E-V-E-R-A-G-E). Epistemic model Known / Inferred / Unknown; never silently convert inferences to facts; system map is a working hypothesis. Conversational Guide per analysis: one question at a time, "You told me / I'm wondering / We don't know yet", proposes updates requiring confirmation. Brand: deep navy, electric blue, cyan, violet; premium, editorial, calm. Public site: Home, About, Sign in, Sign up. Phase 1 = public site, auth, dashboard, create analysis, 4-stage shell, saved analyses, basic Guide.

## User choices
GPT-5.2 via Emergent LLM key · JWT email/password + Emergent Google login · AI-generated brand visuals · basic propose-and-confirm.

## Architecture
- Backend FastAPI (modular): core.py (db, JWT, unified get_current_user for JWT cookie / Google session cookie / Bearer), models.py, routes_auth.py, routes_analyses.py, routes_guide.py (SSE streaming via emergentintegrations LlmChat, openai/gpt-5.2).
- MongoDB collections: users (user_id uuid), user_sessions (Google), login_attempts, analyses (embedded items / experiments / learnings), guide_messages (with proposals[]).
- Frontend React + shadcn + Tailwind: AuthContext, ProtectedRoute, pages (Home, About, AuthPage, AuthCallback, Dashboard, NewAnalysis, Workspace), workspace components (StageTabs, FocusStage, SeeStage+SystemMap SVG, DecideStage+ExperimentDialog, LearnStage, GuidePanel, GuideMessage, ProposalCard, ItemList, EpistemicBadge).

## Implemented (2026-06, Phase 1)
- Public Home/About with brand visuals (Ribbon 8, Emerging Path, Focused System), Leverage 8 section, philosophy statement + quote
- JWT auth (access 15m + refresh 7d httpOnly cookies, bcrypt, brute-force lockout) + Emergent Google login; demo user seeded
- Dashboard: list/search/delete analyses with epistemic counts & stage
- Workspace: Focus (focus question, framing edit, in/out of scope), See (SVG system map + 6 sections), Decide (unranked leverage, experiments CRUD + status), Learn (learning loops timeline, link back to See); stage persisted
- Guide: streaming GPT-5.2, labelled blocks, one-question card, proposals with edit/relabel → confirm/dismiss
- Tested: iteration_1 100% backend (17 tests) & frontend critical flows

## Implemented (Iteration 2)
- Relationship links: "A may influence B" between map items (Observed / To check), drawn as dashed arrows on the system map; removed with their items; included in Guide context
- Thinking timeline: `analysis_events` change log (added / revised / relabelled / removed items, links, experiments, focus & framing edits, Guide confirmations, learning loops); side sheet grouped by learning loop
- Assumption check: "How could I check this?" on Unknown/Inferred items sends a verification prompt to the Guide
- Tested: iteration_2 100% (28 backend tests + frontend flows)

## Implemented (Iteration 3)
- Guide proposals now typed: item | link | experiment. Link proposals reference existing item ids (validated, no self/duplicate); experiment proposals are always included for "How could I check this?" and become a planned Decide experiment with one tap (toast → Open Decide)
- Before/After view: map snapshot (`map_snapshots`) stored on each learning loop; compare dialog shows Before vs After (next loop or now) side by side with ringed changes + diff list; entry from See (compare button) and each Learn entry
- Tested: iteration_3 100% (38 backend tests + frontend flows)

## Backlog
- P1: revision diff view between two points in time; guide rate limiting
- P1: password reset flow; account settings
- P2: export/share analysis (PDF), templates/sample analyses, richer causal loop diagrams, multi-analysis insights
