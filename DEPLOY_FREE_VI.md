# Đưa LichHoc lên mạng miễn phí

Cấu hình này chuẩn bị cho Render (giao diện và API) cùng Supabase (PostgreSQL). Gói miễn phí phù hợp để thử nghiệm: API Render có thể ngủ khi không có người truy cập và cần thời gian khởi động; Supabase có thể tạm dừng dự án ít hoạt động. Không dùng cấu hình miễn phí này cho dữ liệu cần luôn sẵn sàng.

## Trước khi bắt đầu

- Frontend và API nằm ở hai kho GitHub riêng: `LichHoc` và `LichHoc_API`.
- Tạo một cơ sở dữ liệu PostgreSQL miễn phí trên Supabase. Trong Render, điền connection string vào `DATABASE_URL` của API; không gửi mật khẩu hoặc connection string qua chat.
- Tạo API Web Service trên Render từ kho `LichHoc_API`, dùng Blueprint `render.yaml`. Sau khi tạo, ghi lại địa chỉ `https://...onrender.com` của API.
- Tạo Static Site trên Render từ kho `LichHoc`, dùng Blueprint `render.yaml`. Giá trị `VITE_API_BASE_URL` là địa chỉ API ở bước trước, không thêm dấu `/` cuối.
- Sau khi có địa chỉ Static Site, đặt `FRONTEND_ORIGIN` ở API thành địa chỉ giao diện đó. Cần cấu hình CORS cho đúng domain trước khi gọi API từ trình duyệt.
- Trong Firebase Authentication, thêm domain Render của giao diện vào danh sách Authorized domains nếu dùng đăng nhập Google/Firebase.

## Bảo vệ tài khoản và dữ liệu

- Chưa triển khai công khai cho đến khi các vấn đề xác thực trong API được xử lý: đăng ký hiện có thể tự cấp quyền quản trị, đăng nhập Google chưa xác minh đáng tin cậy danh tính trong mọi trường hợp, và API có mật khẩu admin mặc định. Không dùng tài khoản thật với API hiện tại.
- `JWT_SECRET_KEY` được Render tạo tự động trong Blueprint. Giữ bí mật giá trị này.
- Cơ sở dữ liệu SQLite hiện tại chưa được tải lên Supabase. Chỉ chuyển dữ liệu sau khi chủ dự án xác nhận; hãy sao lưu trước và bảo vệ thông tin cá nhân trong các tài khoản/lịch học.
- Cơ sở dữ liệu miễn phí Supabase có giới hạn dung lượng và không có bản sao lưu tải xuống tự động như gói trả phí. Tải bản sao lưu định kỳ nếu dùng dữ liệu quan trọng.

## Giới hạn gói miễn phí

Render Free có thể tắt API sau khoảng 15 phút không hoạt động; lần truy cập đầu sau đó sẽ chậm do khởi động lại. Supabase Free có thể tạm dừng dự án sau thời gian dài không hoạt động. Vì vậy, địa chỉ web có thể truy cập công khai nhưng không đảm bảo dịch vụ luôn hoạt động liên tục.
