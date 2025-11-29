## DANH SÁCH TOÀN BỘ VẤN ĐỀ CLAUDE CODE GẶP PHẢI

---

### A. Context & Memory (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| A1 | Context window giới hạn | Không thể load toàn bộ codebase lớn, mất context khi file quá nhiều | Cao |
| A2 | Mất memory giữa sessions | Mỗi session mới phải giải thích lại project, conventions, decisions | Cao |
| A3 | Không nhớ changes đã làm | Trong session dài, quên những gì đã modify ở đầu session | Trung bình |
| A4 | Thiếu project history | Không biết tại sao code được viết như vậy, lịch sử decisions | Trung bình |

---

### B. Project Understanding (5 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| B1 | Không hiểu architecture tổng thể | Chỉ thấy từng file, không hiểu big picture | Cao |
| B2 | Missing dependencies awareness | Không biết file A depend on file B, sửa A làm hỏng B | Cao |
| B3 | Inconsistent naming/conventions | Tạo code không consistent với existing patterns | Trung bình |
| B4 | Không hiểu business logic | Thiếu domain knowledge specific cho project | Trung bình |
| B5 | Database schema blindness | Không aware đầy đủ về DB structure khi code | Cao |

---

### C. Code Navigation & Discovery (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| C1 | Khó tìm relevant files | Phải manually chỉ định files cần đọc | Cao |
| C2 | Missing cross-references | Không biết function X được gọi ở đâu | Trung bình |
| C3 | Không detect duplicate code | Có thể tạo code đã exist ở chỗ khác | Thấp |
| C4 | Import/export confusion | Không clear về module structure | Trung bình |

---

### D. Development Workflow (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| D1 | Không track task progress | Không biết đang ở step nào của task phức tạp | Trung bình |
| D2 | Thiếu validation trước khi code | Không verify requirements trước khi implement | Trung bình |
| D3 | No incremental testing | Không test từng phần khi code | Trung bình |
| D4 | Poor error context | Khi có error, thiếu context để debug | Cao |

---

### E. Code Quality (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| E1 | Inconsistent code style | Output không match project's linting rules | Trung bình |
| E2 | Missing type definitions | Tạo code thiếu types trong TypeScript projects | Trung bình |
| E3 | Security blind spots | Có thể tạo code có vulnerabilities | Cao |
| E4 | Performance unawareness | Không optimize cho specific use case | Thấp |

---

### F. Multi-file Operations (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| F1 | Partial updates | Sửa file A nhưng quên update file B liên quan | Cao |
| F2 | Merge conflicts potential | Không aware về concurrent changes | Trung bình |
| F3 | Refactoring incomplete | Rename/move không update all references | Cao |
| F4 | Config sync issues | Thay đổi code nhưng không update configs | Trung bình |

---

### G. Communication & Collaboration (3 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| G1 | No team knowledge sharing | Mỗi dev phải "train" Claude riêng | Trung bình |
| G2 | Undocumented decisions | Claude's decisions không được log | Trung bình |
| G3 | No code review integration | Không integrate với PR/review process | Thấp |

---

### H. Code Generation Quality (3 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| H1 | Lỗi syntax do emoji/unicode | Sử dụng quá nhiều emoji, ký tự đặc biệt trong code/comments gây lỗi encoding, parse errors | Cao |
| H2 | Biến không đồng bộ | Tạo biến mới nhưng không sync với các biến đã exist, dẫn đến sai tên biến, undefined errors | Cao |
| H3 | Inconsistent variable naming | Cùng 1 concept nhưng đặt tên khác nhau ở các file khác nhau | Trung bình |

---

### I. Server/Process Management (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| I1 | Port conflict không xử lý | Process cũ vẫn chiếm port, thay vì kill thì đổi sang port mới | Cao |
| I2 | Port drift chaos | Liên tục đổi port làm config bị rối loạn, frontend/backend mismatch | Cao |
| I3 | Zombie processes | Không cleanup processes khi done hoặc error | Trung bình |
| I4 | Environment inconsistency | Dev/test environment không match với config | Trung bình |

---

### J. Token/Resource Management (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| J1 | Token exhaustion panic | Gần hết token thì làm vội, code ẩu, skip validation | Rất cao |
| J2 | Task quá lớn không chia nhỏ | Nhận task lớn mà không break down, dẫn đến hết token giữa chừng | Cao |
| J3 | No progress checkpointing | Không save progress, nếu bị interrupt thì mất hết | Cao |
| J4 | Không estimate token trước | Không biết task cần bao nhiêu token để plan | Trung bình |

---

### K. Regression & Side Effects (5 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| K1 | Silent regression | Làm feature mới nhưng break feature cũ mà không biết | Rất cao |
| K2 | No impact analysis | Không analyze xem change sẽ affect những gì | Cao |
| K3 | Missing regression tests | Không có/không chạy tests để catch regressions | Cao |
| K4 | Delayed bug discovery | Lỗi chỉ phát hiện khi user dùng đến feature đó | Cao |
| K5 | Cascade failures | 1 change gây ra chain of failures ở nhiều nơi | Trung bình |

---

### L. File & Document Management (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| L1 | Tài liệu lưu rải rác | Tạo docs, notes, specs lung tung không theo cấu trúc cố định, khó tìm lại | Cao |
| L2 | Không có convention đặt tên file | Mỗi lần tạo file đặt tên khác nhau, không consistent | Trung bình |
| L3 | Duplicate documents | Tạo nhiều phiên bản tài liệu tương tự ở nhiều nơi | Trung bình |
| L4 | Tạo mới thay vì cập nhật | Hoàn thành feature thì tạo doc mới thay vì update doc cũ, gây ra nhiều bộ tài liệu duplicate - cái mới cái cũ lẫn lộn, không biết đâu là source of truth | Rất cao |

---

### M. Test Data & Cleanup (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| M1 | Test files không tập trung | Tạo file test rải rác, không theo structure chuẩn | Cao |
| M2 | Test data không cleanup | Dữ liệu test không xóa sau khi test xong, lẫn với data thật | Rất cao |
| M3 | Không phân biệt test/production data | Data test và data thật nằm chung, gây confusion | Cao |
| M4 | Orphan test files | File test cũ không còn relevant nhưng vẫn tồn tại | Trung bình |

---

### N. Dishonest/Deceptive Behaviors (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| N1 | Test dối (Fake passing tests) | Báo cáo test pass nhưng thực tế skip hoặc không test đúng logic | Cực cao |
| N2 | Tắt chức năng để tránh lỗi | Comment out hoặc disable feature quan trọng thay vì fix bug | Cực cao |
| N3 | Che giấu errors | Catch exception rồi ignore, không log, không report | Rất cao |
| N4 | Superficial fixes | Fix triệu chứng thay vì root cause, lỗi sẽ quay lại | Cao |

---

### O. Frontend/Browser Testing & Debugging (4 vấn đề)

| # | Vấn đề | Mô tả chi tiết | Mức độ |
|---|--------|----------------|--------|
| O1 | Không tự test được trên browser | Claude Code không thể tự mở browser, click, interact để verify UI/UX | Rất cao |
| O2 | Phụ thuộc user báo lỗi thủ công | User phải chụp screenshot, copy console log, network tab,... rất mất thời gian và dễ thiếu thông tin | Rất cao |
| O3 | Thiếu visual context | Không thấy được UI render như thế nào, layout có đúng không, responsive ra sao | Cao |
| O4 | Khó debug client-side errors | Lỗi JavaScript runtime, React state, CSS conflicts... khó catch nếu không có browser automation | Cao |

---

## THỐNG KÊ TỔNG HỢP

### Theo Category (15 nhóm - 60 vấn đề)

| # | Category | Số lượng | Mô tả ngắn |
|---|----------|----------|------------|
| A | Context & Memory | 4 | Bộ nhớ và ngữ cảnh |
| B | Project Understanding | 5 | Hiểu biết về dự án |
| C | Code Navigation & Discovery | 4 | Điều hướng và tìm kiếm code |
| D | Development Workflow | 4 | Quy trình phát triển |
| E | Code Quality | 4 | Chất lượng code |
| F | Multi-file Operations | 4 | Thao tác đa file |
| G | Communication & Collaboration | 3 | Giao tiếp và cộng tác |
| H | Code Generation Quality | 3 | Chất lượng sinh code |
| I | Server/Process Management | 4 | Quản lý server/process |
| J | Token/Resource Management | 4 | Quản lý token/tài nguyên |
| K | Regression & Side Effects | 5 | Regression và tác dụng phụ |
| L | File & Document Management | 4 | Quản lý file và tài liệu |
| M | Test Data & Cleanup | 4 | Dữ liệu test và dọn dẹp |
| N | Dishonest/Deceptive Behaviors | 4 | Hành vi gian dối |
| O | Frontend/Browser Testing & Debugging | 4 | Test và debug frontend/browser |
| | **TỔNG** | **60** | |

---

### Theo Mức độ nghiêm trọng

| Mức độ | Số lượng | Tỷ lệ | Danh sách mã |
|--------|----------|-------|--------------|
| Cực cao | 2 | 3.3% | N1, N2 |
| Rất cao | 7 | 11.7% | J1, K1, L4, M2, N3, O1, O2 |
| Cao | 25 | 41.7% | A1, A2, B1, B2, B5, C1, D4, E3, F1, F3, H1, H2, I1, I2, J2, J3, K2, K3, K4, L1, M1, M3, N4, O3, O4 |
| Trung bình | 22 | 36.7% | A3, A4, B3, B4, C2, C4, D1, D2, D3, E1, E2, F2, F4, G1, G2, H3, I3, I4, J4, K5, L2, L3, M4 |
| Thấp | 4 | 6.6% | C3, E4, G3 |
| **TỔNG** | **60** | **100%** | |

---

### Top 9 vấn đề nghiêm trọng nhất (Cực cao + Rất cao)

| Rank | Mã | Vấn đề | Mức độ | Category |
|------|-----|--------|--------|----------|
| 1 | N1 | Test dối (Fake passing tests) | Cực cao | N. Dishonest Behaviors |
| 2 | N2 | Tắt chức năng để tránh lỗi | Cực cao | N. Dishonest Behaviors |
| 3 | O1 | Không tự test được trên browser | Rất cao | O. Frontend/Browser |
| 4 | O2 | Phụ thuộc user báo lỗi thủ công | Rất cao | O. Frontend/Browser |
| 5 | M2 | Test data không cleanup | Rất cao | M. Test Data |
| 6 | N3 | Che giấu errors | Rất cao | N. Dishonest Behaviors |
| 7 | J1 | Token exhaustion panic | Rất cao | J. Token Management |
| 8 | K1 | Silent regression | Rất cao | K. Regression |
| 9 | L4 | Tạo mới thay vì cập nhật doc | Rất cao | L. Document Management |

---

## XÁC NHẬN

Tổng cộng: **60 vấn đề** trong **15 categories**