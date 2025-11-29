# CLAUDE CODE GUARDIAN - MASTER IMPLEMENTATION CHECKLIST

Tài liệu này dùng để theo dõi tiến độ triển khai dự án Claude Code Guardian (CCG).
**Quy tắc:** Đánh dấu `[x]` khi hoàn thành một task.

---

## GIAI ĐOẠN 0: KHỞI TẠO DỰ ÁN (Project Skeleton)
*Mục tiêu: Thiết lập cấu trúc thư mục và môi trường.*

- [x] **Task 0.1**: Tạo cấu trúc thư mục dự án (`src/`, `core/`, `modules/`, etc.)
    - *Tham khảo:* `Implementation.md` > Section 1: PROJECT STRUCTURE
    - *Hoàn thành:* 2025-11-29
- [x] **Task 0.2**: Tạo file `package.json` với các dependencies
    - *Tham khảo:* `Implementation.md` > Section 5: PACKAGE.JSON
    - *Hoàn thành:* 2025-11-29
- [x] **Task 0.3**: Tạo file `tsconfig.json` cấu hình TypeScript
    - *Tham khảo:* `Implementation.md` > Section 6: TSCONFIG.JSON
    - *Hoàn thành:* 2025-11-29

---

## GIAI ĐOẠN 1: CORE INFRASTRUCTURE (Nền tảng cốt lõi)
*Mục tiêu: Xây dựng các lớp tiện ích dùng chung. Implement theo thứ tự phụ thuộc.*

- [x] **Task 1.1**: **Core Types** - Định nghĩa Interfaces chung (Config, Session, Memory...)
    - *Tham khảo:* `implementation_4.md` > Section 6: CORE TYPES (EXPANDED)
    - *Hoàn thành:* 2025-11-29
- [x] **Task 1.2**: **Event Bus** - Xây dựng hệ thống sự kiện (Pub/Sub)
    - *Tham khảo:* `implementation_4.md` > Section 2: EVENT BUS
    - *Hoàn thành:* 2025-11-29
- [x] **Task 1.3**: **Logger** - Hệ thống ghi log đa cấp độ
    - *Tham khảo:* `implementation_4.md` > Section 3: LOGGER
    - *Hoàn thành:* 2025-11-29
- [x] **Task 1.4**: **Utils** - Các hàm tiện ích (Token estimator, Code analyzer, Port utils)
    - *Tham khảo:* `implementation_4.md` > Section 7: CORE UTILITIES
    - *Hoàn thành:* 2025-11-29
- [x] **Task 1.5**: **Config Manager** - Quản lý load/save/validate file config
    - *Tham khảo:* `implementation_4.md` > Section 4: CONFIG MANAGER
    - *Hoàn thành:* 2025-11-29
- [x] **Task 1.6**: **State Manager** - Quản lý trạng thái Session, Token usage
    - *Tham khảo:* `implementation_4.md` > Section 5: STATE MANAGER
    - *Hoàn thành:* 2025-11-29
- [x] **Task 1.7**: **Core Index** - Export các module core
    - *Tham khảo:* `implementation_4.md` > Section 8: CORE INDEX
    - *Hoàn thành:* 2025-11-29

---

## GIAI ĐOẠN 2: BASIC MODULES & SERVER (Khung Server)
*Mục tiêu: Dựng server MCP và module Memory cơ bản.*
*Cập nhật:* 2025-11-29

- [x] **Task 2.1**: **Memory Module** - Service lưu trữ và truy xuất ký ức (SQLite)
    - *Tham khảo:* `Implementation.md` > Section 4.1: Memory Module
    - *Hoàn thành:* 2025-11-29
    - *Files:* `src/modules/memory/memory.types.ts`, `memory.service.ts`, `memory.tools.ts`, `index.ts`
- [x] **Task 2.2**: **MCP Server Setup** - Thiết lập `server.ts` và routing
    - *Tham khảo:* `Implementation.md` > Section 3: MCP SERVER SETUP
    - *Hoàn thành:* 2025-11-29
    - *Files:* `src/server.ts`
- [x] **Task 2.3**: **Server Entry** - File `src/index.ts` để khởi chạy server
    - *Tham khảo:* `Implementation.md` > Section 3: MCP SERVER SETUP (phần đầu)
    - *Hoàn thành:* 2025-11-29
    - *Files:* `src/index.ts`

---

## GIAI ĐOẠN 3: CRITICAL MODULES (Bảo vệ & Quản lý)
*Cập nhật:* 2025-11-29
*Mục tiêu: Implement các module quan trọng nhất về an toàn và quy trình.*

- [x] **Task 3.1**: **Guard Module** - Service chính để validate code
    - *Tham khảo:* `Implementation.md` > Section 4.2: Guard Module
    - *Hoàn thành:* 2025-11-29
    - *Files:* `src/modules/guard/guard.service.ts`, `guard.types.ts`, `guard.tools.ts`, `index.ts`
- [x] **Task 3.2**: **Guard Rules** - Implement rules (FakeTest, DisabledFeature...)
    - *Tham khảo:* `Implementation.md` > Section 4.2: Guard Module (phần Rules)
    - *Hoàn thành:* 2025-11-29
    - *Files:* `src/modules/guard/rules/fake-test.rule.ts`, `disabled-feature.rule.ts`, `empty-catch.rule.ts`, `emoji-code.rule.ts`
- [x] **Task 3.3**: **Process Module** - Service quản lý port và kill process zombie
    - *Tham khảo:* `Implementation.md` > Section 4.3: Process Module
    - *Hoàn thành:* 2025-11-29
    - *Files:* `src/modules/process/process.types.ts`, `process.service.ts`, `process.tools.ts`, `index.ts`

## GIAI ĐOẠN 4: ADVANCED MODULES (Tính năng nâng cao)
*Mục tiêu: Hoàn thiện các tính năng quản lý tài nguyên, workflow, test và tài liệu.*

- [ ] **Task 4.1**: **Resource Module** - Quản lý token và Checkpoint
    - *Tham khảo:* `implementation_2.md` > Section 1: RESOURCE MODULE
- [ ] **Task 4.2**: **Workflow Module** - Quản lý Task, Progress, Notes
    - *Tham khảo:* `implementation_2.md` > Section 2: WORKFLOW MODULE
- [ ] **Task 4.3**: **Testing Module** - Test runner và Browser automation
    - *Tham khảo:* `implementation_2.md` > Section 3: TESTING MODULE
- [ ] **Task 4.4**: **Documents Module** - Registry quản lý tài liệu dự án
    - *Tham khảo:* `implementation_2.md` > Section 4: DOCUMENTS MODULE

---

## GIAI ĐOẠN 5: HOOKS SYSTEM (Bộ não điều khiển)
*Mục tiêu: Kết nối logic để tự động kích hoạt các tính năng bảo vệ.*

- [ ] **Task 5.1**: **Hooks Config** - Template cấu hình `hooks.json`
    - *Tham khảo:* `implementation_3.md` > Section 2: HOOKS CONFIGURATION
- [ ] **Task 5.2**: **Hook Types & Base** - Interfaces và Abstract Class
    - *Tham khảo:* `implementation_3.md` > Section 3 & 4
- [ ] **Task 5.3**: **Session Start Hook** - Logic bắt đầu phiên
    - *Tham khảo:* `implementation_3.md` > Section 5: SESSION START HOOK
- [ ] **Task 5.4**: **Pre-Tool Call Hook** - Logic validate hành động
    - *Tham khảo:* `implementation_3.md` > Section 6: PRE-TOOL CALL HOOK
- [ ] **Task 5.5**: **Post-Tool Call Hook** - Logic kiểm tra kết quả
    - *Tham khảo:* `implementation_3.md` > Section 7: POST-TOOL CALL HOOK
- [ ] **Task 5.6**: **Session End Hook** - Logic dọn dẹp và lưu trữ
    - *Tham khảo:* `implementation_3.md` > Section 8: SESSION END HOOK
- [ ] **Task 5.7**: **Hook Router** - Điều hướng request tới Handler
    - *Tham khảo:* `implementation_3.md` > Section 9: HOOK INDEX & EXPORTS

---

## GIAI ĐOẠN 6: CLI & INTEGRATION (Hoàn thiện)
*Mục tiêu: Tạo công cụ dòng lệnh để user tương tác.*

- [ ] **Task 6.1**: **CLI Hook Command** - Lệnh gọi hooks
    - *Tham khảo:* `implementation_3.md` > Section 10: CLI HOOK COMMAND
- [ ] **Task 6.2**: **CLI Entry Point** - Lệnh `ccg init`, `ccg status`
    - *Tham khảo:* `implementation_3.md` > Section 11: UPDATED CLI ENTRY


## GIAI ĐOẠN 7: TEMPLATES & INITIALIZATION (Tài nguyên & Khởi tạo)
*Mục tiêu: Tạo các file mẫu (config, hooks, commands) và script `ccg init` để người dùng cài đặt.*

- [ ] **Task 7.1**: **Main Config Templates** - Tạo `config.template.json` và `mcp.template.json`
    - *Tham khảo:* `templates_implementation.md` > Section 2 & 4
- [ ] **Task 7.2**: **Hooks Template** - Tạo `hooks.template.json`
    - *Tham khảo:* `templates_implementation.md` > Section 3
- [ ] **Task 7.3**: **Slash Commands** - Tạo các file `.md` cho lệnh `/ccg` (dashboard, task, memory...)
    - *Tham khảo:* `templates_implementation.md` > Section 5-10
- [ ] **Task 7.4**: **Project Docs** - Tạo file `CLAUDE.md` hướng dẫn AI
    - *Tham khảo:* `templates_implementation.md` > Section 11
- [ ] **Task 7.5**: **Example Configs** - Tạo các profile config (minimal, strict, frontend)
    - *Tham khảo:* `templates_implementation.md` > Section 12
- [ ] **Task 7.6**: **JSON Schema** - Tạo schema validate config
    - *Tham khảo:* `templates_implementation.md` > Section 13
- [ ] **Task 7.7**: **Init Script** - Logic cho lệnh `ccg init` (`src/bin/init-templates.ts`)
    - *Tham khảo:* `templates_implementation.md` > Section 14

---

## HƯỚNG DẪN PROMPT CHO CLAUDE

Khi muốn Claude thực hiện một task, hãy copy prompt sau và điền thông tin tương ứng:

```text
@Claude Hãy thực hiện Task [TASK_ID]: [TÊN_NHIỆM_VỤ].
Tôi đã đánh dấu task này là đang làm trong file CHECKLIST_IMPLEMENTATION.md.

Hãy đọc nội dung chi tiết implement tại file: [TÊN_FILE_THAM_KHẢO]
Tại section: [TÊN_SECTION]

Yêu cầu:
1. Đọc kỹ thiết kế trong section đó.
2. Tạo/Cập nhật các file code tương ứng.
3. Không tự ý thay đổi kiến trúc core đã định nghĩa.

(Lưu ý: File tài liệu mới nhất là 'templates_implementation.md' cho Giai đoạn 7)
...