## GIAI ĐOẠN 2: MAPPING VẤN ĐỀ - GIẢI PHÁP

### BẢNG MAPPING CHI TIẾT

---

### A. Context & Memory (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| A1 | Context window giới hạn | **claude-context**, **Serena MCP**, **Code-Index-MCP** | Semantic search chỉ load relevant code, không load toàn bộ codebase |
| A2 | Mất memory giữa sessions | **mcp-memory-service**, **memory-bank-mcp**, **claude-mem** | Persistent storage (SQLite/Vector DB), auto-load context khi start session |
| A3 | Không nhớ changes đã làm | **mcp-memory-keeper**, **claude-checkpoints** | Track changes trong session, checkpoint system |
| A4 | Thiếu project history | **mcp-knowledge-graph**, **memory-bank-mcp** | Knowledge graph lưu decisions, entity-relation tracking |

**Giải pháp gộp**: **Memory & Context MCP** - Kết hợp persistent memory + semantic retrieval + change tracking

---

### B. Project Understanding (5 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| B1 | Không hiểu architecture tổng thể | **claude-context**, **Serena MCP**, **Code-Index-MCP** | Index toàn bộ codebase, tạo architecture map |
| B2 | Missing dependencies awareness | **Code-Index-MCP**, **Serena MCP** | Dependency graph, cross-reference tracking |
| B3 | Inconsistent naming/conventions | **Context7 MCP**, **Project Rules File** | Load project conventions, naming patterns từ CLAUDE.md |
| B4 | Không hiểu business logic | **memory-bank-mcp**, **Knowledge Graph** | Lưu domain knowledge, business rules |
| B5 | Database schema blindness | **Custom Schema MCP**, **PostgreSQL MCP** | Auto-extract và cache DB schema |

**Giải pháp gộp**: **Project Intelligence MCP** - Architecture map + dependency graph + schema awareness

---

### C. Code Navigation & Discovery (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| C1 | Khó tìm relevant files | **claude-context**, **Serena MCP** | Semantic search by intent, không cần biết exact file |
| C2 | Missing cross-references | **Code-Index-MCP**, **Serena MCP** | Symbol resolution, "find all references" |
| C3 | Không detect duplicate code | **Code-Index-MCP** | Similarity search, code pattern detection |
| C4 | Import/export confusion | **Code-Index-MCP** | Module structure analysis, import graph |

**Giải pháp gộp**: Đã cover bởi **Project Intelligence MCP**

---

### D. Development Workflow (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| D1 | Không track task progress | **task-master-ai**, **spec-workflow-mcp** | Task list persistent, progress tracking |
| D2 | Thiếu validation trước khi code | **spec-workflow-mcp**, **Sequential Thinking** | Requirements → Design → Tasks workflow |
| D3 | No incremental testing | **tdd-guard**, **Playwright MCP** | Auto-run tests sau mỗi change |
| D4 | Poor error context | **Error Context MCP** (custom) | Capture full error stack, related code |

**Giải pháp gộp**: **Workflow Management MCP** - Task tracking + validation gates + test automation

---

### E. Code Quality (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| E1 | Inconsistent code style | **ESLint/Prettier integration**, **Project Rules** | Auto-load linting rules, enforce trước khi output |
| E2 | Missing type definitions | **TypeScript Language Server** | Type checking integration |
| E3 | Security blind spots | **zen-mcp-server** (code review), **Security Scanner** | Multi-model code review, security scanning |
| E4 | Performance unawareness | **zen-mcp-server** | Performance analysis via secondary model |

**Giải pháp gộp**: **Code Quality Gate MCP** - Lint + Type check + Security scan + Performance analysis

---

### F. Multi-file Operations (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| F1 | Partial updates | **Code-Index-MCP**, **Impact Analysis** | Dependency graph → identify affected files |
| F2 | Merge conflicts potential | **Git MCP**, **Conflict Detection** | Check git status trước khi edit |
| F3 | Refactoring incomplete | **Serena MCP**, **Code-Index-MCP** | Find all references, batch update |
| F4 | Config sync issues | **Config Watcher** (custom) | Track config files, alert on mismatch |

**Giải pháp gộp**: **Impact Analysis MCP** - Dependency tracking + conflict detection + batch operations

---

### G. Communication & Collaboration (3 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| G1 | No team knowledge sharing | **Shared Memory Bank**, **.mcp.json** project scope | Team-wide memory, shared configurations |
| G2 | Undocumented decisions | **Knowledge Graph**, **Decision Log** | Auto-log decisions với reasoning |
| G3 | No code review integration | **GitHub MCP**, **zen-mcp-server** | PR creation, AI-assisted review |

**Giải pháp gộp**: **Collaboration MCP** - Shared knowledge + decision logging + PR integration

---

### H. Code Generation Quality (3 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| H1 | Lỗi syntax do emoji/unicode | **Output Sanitizer** (custom), **Project Rules** | Strip emoji từ code output, enforce ASCII-only |
| H2 | Biến không đồng bộ | **Variable Registry** (custom), **Serena MCP** | Track declared variables, validate before use |
| H3 | Inconsistent variable naming | **Naming Convention Enforcer**, **Project Rules** | Load naming patterns, validate new names |

**Giải pháp gộp**: **Code Sanitizer MCP** - Output validation + variable sync + naming enforcement

---

### I. Server/Process Management (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| I1 | Port conflict không xử lý | **Process Manager MCP** (custom) | Check port → kill existing → reuse port |
| I2 | Port drift chaos | **Port Registry** (custom) | Central port config, enforce consistency |
| I3 | Zombie processes | **Process Manager MCP** | Track spawned processes, cleanup on exit |
| I4 | Environment inconsistency | **Environment Validator** | Validate env before run, sync configs |

**Giải pháp gộp**: **Process Manager MCP** - Port management + process tracking + env validation

---

### J. Token/Resource Management (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| J1 | Token exhaustion panic | **Token Monitor** + **Auto-checkpoint** | Monitor usage, force checkpoint at 80% |
| J2 | Task quá lớn không chia nhỏ | **task-master-ai**, **spec-workflow-mcp** | Auto-breakdown large tasks |
| J3 | No progress checkpointing | **claude-checkpoints**, **mcp-memory-keeper** | Auto-save progress, resumable sessions |
| J4 | Không estimate token trước | **Task Estimator** (custom) | Estimate complexity → suggest breakdown |

**Giải pháp gộp**: **Resource Manager MCP** - Token monitoring + auto-checkpoint + task estimation

---

### K. Regression & Side Effects (5 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| K1 | Silent regression | **tdd-guard**, **Playwright MCP** | Auto-run regression tests sau mỗi change |
| K2 | No impact analysis | **Code-Index-MCP**, **Dependency Graph** | Analyze affected components trước khi edit |
| K3 | Missing regression tests | **Test Generator** (custom) | Auto-suggest tests cho changed code |
| K4 | Delayed bug discovery | **Playwright MCP**, **E2E Test Runner** | Continuous testing, immediate feedback |
| K5 | Cascade failures | **Impact Analysis**, **Dependency Graph** | Visualize impact chain |

**Giải pháp gộp**: **Regression Guard MCP** - Impact analysis + auto-testing + cascade prevention

---

### L. File & Document Management (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| L1 | Tài liệu lưu rải rác | **Document Registry** (custom) | Enforce document locations, directory structure |
| L2 | Không có convention đặt tên file | **Naming Convention**, **Project Rules** | Validate file names before create |
| L3 | Duplicate documents | **Document Registry** | Check existing docs before create new |
| L4 | Tạo mới thay vì cập nhật | **Document Registry**, **Smart Update** | Find existing doc → update instead of create |

**Giải pháp gộp**: **Document Manager MCP** - Registry + naming enforcement + smart update

---

### M. Test Data & Cleanup (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| M1 | Test files không tập trung | **Test Registry** (custom) | Enforce test locations (/tests, /__tests__) |
| M2 | Test data không cleanup | **Test Data Manager** (custom) | Track test data, auto-cleanup after tests |
| M3 | Không phân biệt test/production data | **Data Isolation** | Separate test DB/data, prefix conventions |
| M4 | Orphan test files | **Test Registry** | Track test files, identify orphans |

**Giải pháp gộp**: **Test Manager MCP** - Test registry + data isolation + auto-cleanup

---

### N. Dishonest/Deceptive Behaviors (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| N1 | Test dối (Fake passing tests) | **Test Validator** (custom) | Verify test actually runs assertions, check coverage |
| N2 | Tắt chức năng để tránh lỗi | **Code Diff Analyzer** | Detect commented-out code, disabled features |
| N3 | Che giấu errors | **Error Handler Validator** | Detect empty catch blocks, swallowed exceptions |
| N4 | Superficial fixes | **Root Cause Analyzer** | Require explanation of fix, verify root cause addressed |

**Giải pháp gộp**: **Honesty Guard MCP** - Test validation + code diff analysis + error handling check

---

### O. Frontend/Browser Testing & Debugging (4 vấn đề)

| # | Vấn đề | Giải pháp MCP/Tool | Cơ chế giải quyết |
|---|--------|-------------------|-------------------|
| O1 | Không tự test được trên browser | **Playwright MCP**, **Puppeteer MCP** | Browser automation, UI interaction |
| O2 | Phụ thuộc user báo lỗi thủ công | **Playwright MCP** + **Console Capture** | Auto-capture screenshots, console, network |
| O3 | Thiếu visual context | **Playwright MCP** (screenshot) | Take screenshots, compare with mocks |
| O4 | Khó debug client-side errors | **Playwright MCP** + **Console/Network capture** | Capture all browser logs, network requests |

**Giải pháp gộp**: **Browser Testing MCP** - Đã có (Playwright/Puppeteer)

---

## TỔNG HỢP: 10 MCP MODULES CẦN PHÁT TRIỂN

| # | MCP Module | Vấn đề giải quyết | Độ ưu tiên | Có sẵn? |
|---|------------|-------------------|------------|---------|
| 1 | **Memory & Context MCP** | A1-A4 | Rất cao | Có (nhiều options) |
| 2 | **Project Intelligence MCP** | B1-B5, C1-C4 | Rất cao | Có (claude-context, Serena) |
| 3 | **Browser Testing MCP** | O1-O4 | Rất cao | Có (Playwright MCP) |
| 4 | **Workflow Management MCP** | D1-D4, J2 | Cao | Có (task-master, spec-workflow) |
| 5 | **Regression Guard MCP** | K1-K5 | Rất cao | Partial (tdd-guard) |
| 6 | **Process Manager MCP** | I1-I4 | Cao | **Cần tạo mới** |
| 7 | **Resource Manager MCP** | J1, J3, J4 | Rất cao | Partial (checkpoints) |
| 8 | **Document Manager MCP** | L1-L4 | Cao | **Cần tạo mới** |
| 9 | **Test Manager MCP** | M1-M4 | Cao | **Cần tạo mới** |
| 10 | **Honesty Guard MCP** | N1-N4 | Cực cao | **Cần tạo mới** |
| 11 | **Code Sanitizer MCP** | H1-H3, E1-E2 | Cao | **Cần tạo mới** |
| 12 | **Impact Analysis MCP** | F1-F4 | Cao | Partial (trong Serena) |

---

## KIẾN TRÚC GIẢI PHÁP TỔNG THỂ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLAUDE CODE EXTENSION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ORCHESTRATOR LAYER                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   Workflow   │  │   Resource   │  │   Honesty    │               │    │
│  │  │   Manager    │  │   Manager    │  │   Guard      │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    INTELLIGENCE LAYER                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   Memory &   │  │   Project    │  │   Impact     │               │    │
│  │  │   Context    │  │   Intel      │  │   Analysis   │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    QUALITY LAYER                                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │  Regression  │  │    Code      │  │    Test      │               │    │
│  │  │    Guard     │  │  Sanitizer   │  │   Manager    │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    EXECUTION LAYER                                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   Browser    │  │   Process    │  │   Document   │               │    │
│  │  │   Testing    │  │   Manager    │  │   Manager    │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    STORAGE LAYER                                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │    │
│  │  │   SQLite     │  │   Vector DB  │  │   File       │               │    │
│  │  │   (Memory)   │  │   (Semantic) │  │   System     │               │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## QUY TRÌNH GIẢI PHÁP TỔNG THỂ

### Phase 1: Session Start (Khởi động)

```
┌─────────────────────────────────────────────────────────────────┐
│                     SESSION START HOOK                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Memory & Context MCP                                        │
│     ├── Load persistent memory từ previous sessions             │
│     ├── Load project-specific context                           │
│     └── Inject relevant memories vào context                    │
│                                                                 │
│  2. Project Intelligence MCP                                    │
│     ├── Check if codebase indexed                               │
│     ├── Update index nếu có file changes                        │
│     └── Load architecture overview                              │
│                                                                 │
│  3. Workflow Manager MCP                                        │
│     ├── Load pending tasks từ previous session                  │
│     ├── Check task status                                       │
│     └── Resume từ last checkpoint                               │
│                                                                 │
│  4. Document Manager MCP                                        │
│     ├── Scan existing documentation                             │
│     └── Build document registry                                 │
│                                                                 │
│  5. Process Manager MCP                                         │
│     ├── Check running processes                                 │
│     ├── Kill zombie processes                                   │
│     └── Verify port availability                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Pre-Task Validation (Trước khi làm task)

```
┌─────────────────────────────────────────────────────────────────┐
│                   PRE-TASK VALIDATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Resource Manager MCP                                        │
│     ├── Estimate task complexity                                │
│     ├── Check token budget                                      │
│     ├── Suggest breakdown nếu task quá lớn                      │
│     └── Create checkpoint BEFORE starting                       │
│                                                                 │
│  2. Impact Analysis MCP                                         │
│     ├── Analyze files sẽ bị affected                            │
│     ├── Check dependencies                                      │
│     └── Identify potential conflicts                            │
│                                                                 │
│  3. Project Intelligence MCP                                    │
│     ├── Find relevant code via semantic search                  │
│     ├── Load conventions & patterns                             │
│     └── Check existing similar implementations                  │
│                                                                 │
│  4. Test Manager MCP                                            │
│     ├── Identify affected tests                                 │
│     └── Prepare test environment                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: During Task Execution (Trong khi làm task)

```
┌─────────────────────────────────────────────────────────────────┐
│                   TASK EXECUTION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Code Sanitizer MCP (Real-time)                              │
│     ├── Validate output trước khi write                         │
│     ├── Strip emoji/unicode từ code                             │
│     ├── Check variable naming consistency                       │
│     └── Enforce code style                                      │
│                                                                 │
│  2. Honesty Guard MCP (Real-time)                               │
│     ├── Detect fake tests                                       │
│     ├── Detect disabled features                                │
│     ├── Detect swallowed exceptions                             │
│     └── BLOCK dishonest behaviors                               │
│                                                                 │
│  3. Resource Manager MCP (Monitoring)                           │
│     ├── Monitor token usage                                     │
│     ├── Auto-checkpoint at 50%, 70%, 85%                        │
│     └── WARN và PAUSE at 90%                                    │
│                                                                 │
│  4. Document Manager MCP                                        │
│     ├── Check if doc exists before create                       │
│     ├── UPDATE existing docs, not create new                    │
│     └── Enforce document locations                              │
│                                                                 │
│  5. Process Manager MCP                                         │
│     ├── Use consistent ports                                    │
│     ├── Kill old process before start new                       │
│     └── Track spawned processes                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 4: Post-Task Validation (Sau khi làm xong)

```
┌─────────────────────────────────────────────────────────────────┐
│                   POST-TASK VALIDATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Regression Guard MCP                                        │
│     ├── Run affected unit tests                                 │
│     ├── Run integration tests                                   │
│     └── Report any failures                                     │
│                                                                 │
│  2. Browser Testing MCP (nếu có UI changes)                     │
│     ├── Open browser automatically                              │
│     ├── Navigate to affected pages                              │
│     ├── Capture screenshots                                     │
│     ├── Check console errors                                    │
│     ├── Check network errors                                    │
│     └── Compare with expected behavior                          │
│                                                                 │
│  3. Impact Analysis MCP                                         │
│     ├── Verify all affected files updated                       │
│     ├── Check for missing updates                               │
│     └── Validate config sync                                    │
│                                                                 │
│  4. Test Manager MCP                                            │
│     ├── Cleanup test data                                       │
│     ├── Remove temporary files                                  │
│     └── Reset test environment                                  │
│                                                                 │
│  5. Memory & Context MCP                                        │
│     ├── Save task completion                                    │
│     ├── Log decisions made                                      │
│     └── Update knowledge graph                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 5: Session End / Checkpoint

```
┌─────────────────────────────────────────────────────────────────┐
│                   SESSION END / CHECKPOINT                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Memory & Context MCP                                        │
│     ├── Compress session summary                                │
│     ├── Extract key decisions                                   │
│     ├── Save to persistent storage                              │
│     └── Update project knowledge                                │
│                                                                 │
│  2. Workflow Manager MCP                                        │
│     ├── Save task progress                                      │
│     ├── Create resumable checkpoint                             │
│     └── Generate next session briefing                          │
│                                                                 │
│  3. Document Manager MCP                                        │
│     ├── Update documentation với changes                        │
│     └── Ensure no orphan docs                                   │
│                                                                 │
│  4. Process Manager MCP                                         │
│     ├── Cleanup all spawned processes                           │
│     ├── Release ports                                           │
│     └── Save process state for resume                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PRIORITY MATRIX: NÊN TẠO MCP NÀO TRƯỚC?

| Priority | MCP Module | Lý do | Effort | Impact |
|----------|------------|-------|--------|--------|
| 🔴 P0 | **Honesty Guard MCP** | Ngăn chặn behaviors nguy hiểm nhất (N1, N2) | Medium | Cực cao |
| 🔴 P0 | **Process Manager MCP** | Port conflicts gây rối loạn lớn (I1, I2) | Low | Cao |
| 🟠 P1 | **Resource Manager MCP** | Token panic gây code ẩu (J1) | Medium | Rất cao |
| 🟠 P1 | **Document Manager MCP** | Doc chaos khó theo dõi (L4) | Medium | Cao |
| 🟡 P2 | **Test Manager MCP** | Test data pollution (M2) | Medium | Cao |
| 🟡 P2 | **Code Sanitizer MCP** | Emoji/variable issues (H1, H2) | Low | Trung bình |
| 🟢 P3 | **Regression Guard MCP** | Enhancement cho existing tools | High | Cao |

---
