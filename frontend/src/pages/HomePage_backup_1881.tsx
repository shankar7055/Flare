# Tasks Checklist - Dashboard Layout & Sidebar Redesign

- [/] Backend Parser & Routes
  - [ ] Create `src/agent/parser.ts` with `chrono-node` as primary and Gemini as fallback
  - [ ] Add `POST /tasks/parse` route in `src/api/tasks.ts`
- [ ] Frontend SDK API Connection
  - [ ] Add `parseTask` method in `frontend/src/api/client.ts`
- [ ] Router Updates
  - [ ] Reconfigure routes in `frontend/src/App.tsx` (add `/` to `<HomePage />` and `/activity` to `<AgentActivityPage />`)
- [ ] Left Sidebar Redesign
  - [ ] Update `frontend/src/components/Layout.tsx` for new avatar, chevron, primary nav list, Recent Activity links, Calendar status pill, and Settings pinned footer
- [ ] Deep Linking Search Parameters
  - [ ] Update `frontend/src/components/AgentActivityFeed.tsx` to handle `runId` auto-expansion
- [ ] Home Page Dashboard
  - [ ] Implement `frontend/src/pages/HomePage.tsx` with greeting, attention list cards, single latest activity card, suggested agent recommendations, tasks search panel with prioritization CTA, and bottom natural language prompt bar
- [ ] Compilation & Verification
  - [ ] Compile with `npm run build`
  - [ ] Verify functionality via browser subagent
