# Documentation Reorganization Guide

## 🎯 Objective

Clean up the monorepo root and organize documentation into semantic folders for better discoverability and maintainability.

---

## 📁 New Structure

```
ai-starter-kit/
├── docs/                          # PUBLIC DOCUMENTATION
│   ├── INDEX.md                  # Documentation home
│   ├── getting-started/
│   │   ├── installation.md       # Setup & installation
│   │   ├── claude-setup.md       # Claude Desktop integration
│   │   └── agent-quickstart.md   # First multi-agent workflow
│   ├── architecture/
│   │   ├── dag-supervised-agents.md
│   │   └── agent-types.md
│   ├── guides/
│   │   ├── agent-integration.md
│   │   ├── extending-agents.md
│   │   ├── mcp-integration.md
│   │   └── plugins.md
│   ├── examples/
│   │   └── workflow-examples.md
│   └── releases/
│       └── mcp-release-summary.md
│
├── internal-strategy-docs/        # CONFIDENTIAL DOCS
│   ├── INDEX.md
│   ├── BUSINESS_PLAN.md
│   ├── SHOWCASE_WEBAPP_FOLLOWUP.md
│   ├── IMPROVEMENT_ROADMAP.md
│   ├── KILLER_APP_ROADMAP.md
│   ├── EXECUTIVE_SUMMARY.md
│   ├── IMPLEMENTATION_COMPLETE.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── COMPLETION_REPORT.md
│
├── packages/                      # MONOREPO PACKAGES
├── agents/                        # AGENT DEFINITIONS
├── template/                      # PROJECT TEMPLATES
├── scripts/                       # BUILD SCRIPTS
├── schemas/                       # JSON SCHEMAS
│
├── README.md                      # MAIN PROJECT README (kept at root)
├── BUSINESS_PLAN.md              # ← MOVE to internal-strategy-docs/
├── LICENSE
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── ...config files
```

---

## 📋 File Migration Plan

### ✅ MOVE TO `docs/getting-started/`
- [ ] `CLAUDE_SETUP.md` → `docs/getting-started/claude-setup.md`
- [ ] `AGENT_QUICKSTART.md` → `docs/getting-started/agent-quickstart.md`
- [ ] Create `docs/getting-started/installation.md` (from README section)

### ✅ MOVE TO `docs/architecture/`
- [ ] `DAG_SUPERVISED_AGENTS.md` → `docs/architecture/dag-supervised-agents.md`
- [ ] Create `docs/architecture/agent-types.md` (from EXTENDING_AGENTS.md section)

### ✅ MOVE TO `docs/guides/`
- [ ] `AGENT_INTEGRATION.md` → `docs/guides/agent-integration.md`
- [ ] `EXTENDING_AGENTS.md` → `docs/guides/extending-agents.md`
- [ ] `PLUGIN.md` → `docs/guides/plugins.md`
- [ ] Create `docs/guides/mcp-integration.md` (from MCP_RELEASE_SUMMARY.md)

### ✅ MOVE TO `docs/examples/`
- [ ] `WORKFLOW_EXAMPLES.md` → `docs/examples/workflow-examples.md`

### ✅ MOVE TO `docs/releases/`
- [ ] `MCP_RELEASE_SUMMARY.md` → `docs/releases/mcp-release-summary.md`

### ✅ MOVE TO `docs/` (rename as INDEX)
- [ ] `DOCUMENTATION_INDEX.md` → `docs/INDEX.md` (already created)

### ✅ MOVE TO `internal-strategy-docs/`
- [ ] `BUSINESS_PLAN.md` → `internal-strategy-docs/BUSINESS_PLAN.md` (already moved)
- [ ] `EXECUTIVE_SUMMARY.md` → `internal-strategy-docs/EXECUTIVE_SUMMARY.md`
- [ ] `IMPLEMENTATION_COMPLETE.md` → `internal-strategy-docs/IMPLEMENTATION_COMPLETE.md`
- [ ] `IMPLEMENTATION_SUMMARY.md` → `internal-strategy-docs/IMPLEMENTATION_SUMMARY.md`
- [ ] `IMPROVEMENT_ROADMAP.md` → `internal-strategy-docs/IMPROVEMENT_ROADMAP.md`
- [ ] `KILLER_APP_ROADMAP.md` → `internal-strategy-docs/KILLER_APP_ROADMAP.md`
- [ ] `COMPLETION_REPORT.md` → `internal-strategy-docs/COMPLETION_REPORT.md`
- [ ] `SHOWCASE_WEBAPP_FOLLOWUP.md` → `internal-strategy-docs/SHOWCASE_WEBAPP_FOLLOWUP.md`

### ❌ DELETE (Low Value / Redundant)
- [ ] None identified — all files have strategic value

### ⚠️ UPDATE (Add References)
- [ ] `README.md` — Add "📚 [Full Documentation](./docs/INDEX.md)" link
- [ ] `README.md` — Add "🔐 [Internal Strategy](./internal-strategy-docs/INDEX.md)" note (visible to team only)

---

## 🔗 Cross-References to Update

After moving files, update all internal links:

| File | Update Links |
|------|---|
| `README.md` | Point to `docs/` for all documentation |
| `docs/INDEX.md` | Already points to all guides |
| `docs/getting-started/installation.md` | Link back to `README.md` for quick start |
| `docs/guides/extending-agents.md` | Link to `docs/architecture/agent-types.md` |

---

## 📋 Benefits

✅ **Better Discoverability**
- Users find guides in logical folders
- Clear separation of concerns

✅ **SEO & Searchability**
- Organized structure helps search engines
- Better GitHubMarkdown rendering

✅ **Security**
- Sensitive strategy docs hidden in `internal-strategy-docs/`
- Not accidentally exposed in public docs

✅ **Maintainability**
- Easy to find docs for updates
- Clear ownership per folder

✅ **Scalability**
- Easy to add new docs as project grows
- Consistent structure

---

## 🗑️ Cleanup Checklist

After reorganization, verify:

- [ ] All `.md` files accounted for (no orphans)
- [ ] No broken links in docs
- [ ] Root directory has < 15 files (down from current 25+)
- [ ] `docs/` has clear navigation
- [ ] `internal-strategy-docs/` is added to `.gitignore` (optional, for private repos)
- [ ] README.md updated with doc links
- [ ] All cross-references working

---

## 🚀 Implementation Steps

1. **Create folders** (✅ DONE)
2. **Create INDEX files** (✅ DONE)
3. **Copy public docs** to `docs/` subfolder (NEXT)
4. **Copy internal docs** to `internal-strategy-docs/` (NEXT)
5. **Update all cross-references** in copied files
6. **Update README.md** to link to `docs/INDEX.md`
7. **Verify all links** work
8. **Remove original** files from root (FINAL)
9. **Commit** reorganized structure

---

## 📞 Questions?

- Check the structure in `docs/INDEX.md`
- See confidential docs in `internal-strategy-docs/INDEX.md`

---

**Last Updated**: March 5, 2026