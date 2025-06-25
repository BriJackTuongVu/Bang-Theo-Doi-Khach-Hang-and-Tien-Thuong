# Hướng dẫn thiết lập Calendly API

## Bước 1: Truy cập trang API của Calendly
1. Mở trình duyệt và truy cập: https://calendly.com/integrations/api_webhooks
2. Đăng nhập vào tài khoản Calendly của bạn

## Bước 2: Tạo Personal Access Token
1. Trong trang API & Webhooks, tìm mục "Personal Access Tokens"
2. Nhấn nút "Create Token"
3. Nhập tên cho token (ví dụ: "Customer Tracking App")
4. Nhấn "Create Token"
5. Copy token vừa được tạo (token sẽ bắt đầu bằng "eyJ...")

## Bước 3: Cung cấp token trong Replit
1. Quay lại ứng dụng
2. Khi được yêu cầu, paste token vào ô CALENDLY_API_TOKEN
3. Token sẽ được lưu an toàn trong environment variables

## Bước 4: Test kết nối
1. Nhấn nút "Import từ Calendly" trong bảng khách hàng
2. Hệ thống sẽ tự động lấy danh sách cuộc hẹn từ Calendly
3. Tên khách hàng sẽ được tự động thêm vào bảng tracking

## Lưu ý quan trọng:
- Token này cho phép ứng dụng đọc thông tin lịch hẹn của bạn
- Token được lưu trữ an toàn và chỉ dùng để import tên khách hàng
- Bạn có thể thu hồi token bất cứ lúc nào trong trang Calendly settings

## Troubleshooting:
- Nếu gặp lỗi 401: Token không hợp lệ, vui lòng tạo token mới
- Nếu gặp lỗi 403: Tài khoản không có quyền truy cập API
- Nếu không thấy cuộc hẹn: Kiểm tra ngày được chọn có đúng không