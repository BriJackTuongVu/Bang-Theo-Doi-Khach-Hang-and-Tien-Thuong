# Hướng dẫn Deploy lên Render.com

## Bước 1: Chuẩn bị Repository

1. **Push code lên GitHub:**
   ```bash
   git add .
   git commit -m "Complete Docker deployment configuration"
   git push origin main
   ```

## Bước 2: Tạo Web Service trên Render

1. Đăng nhập vào [Render.com](https://render.com)
2. Nhấn **"New"** > **"Web Service"**
3. Chọn GitHub repository: `BriJackTuongVu/Bang-Theo-Doi-Khach-Hang-and-Tien-Thuong`
4. Render sẽ tự động detect **Docker** runtime từ file `render.yaml`

## Bước 3: Environment Variables

Thêm các environment variables sau trong Render:

### Database (PostgreSQL)
```
DATABASE_URL=postgresql://username:password@hostname:port/database_name
```

### API Keys
```
CALENDLY_API_TOKEN=your_calendly_api_token
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
OPENAI_API_KEY=sk-your_openai_api_key
```

### Google OAuth (nếu sử dụng)
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Production Settings
```
NODE_ENV=production
```

## Bước 4: PostgreSQL Database

### Cách 1: Render PostgreSQL
1. Tạo **PostgreSQL** service trên Render
2. Copy connection string vào `DATABASE_URL`

### Cách 2: External Database (Supabase, PlanetScale, etc.)
1. Tạo database trên provider
2. Copy connection string vào `DATABASE_URL`

## Bước 5: API Keys Setup

### Calendly API Token
1. Đăng nhập vào [Calendly Developer Portal](https://developer.calendly.com/)
2. Tạo Personal Access Token
3. Copy token và thêm vào `CALENDLY_API_TOKEN`

### Stripe API Keys
1. Đăng nhập vào [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy **Publishable key** (pk_) vào `VITE_STRIPE_PUBLIC_KEY`
3. Copy **Secret key** (sk_) vào `STRIPE_SECRET_KEY`

### OpenAI API Key
1. Đăng nhập vào [OpenAI Platform](https://platform.openai.com/api-keys)
2. Tạo API key mới
3. Copy key vào `OPENAI_API_KEY`

## Bước 6: Deploy

1. Nhấn **"Deploy"** trên Render
2. Chờ deployment hoàn thành
3. Kiểm tra logs để đảm bảo không có lỗi

## Troubleshooting

### 1. Build Errors
- Kiểm tra logs deployment
- Đảm bảo tất cả dependencies có trong `package.json`

### 2. Database Connection
- Kiểm tra `DATABASE_URL` format đúng
- Kiểm tra database có accessible từ external không

### 3. API Key Errors
- Kiểm tra tất cả API keys đã được set
- Kiểm tra keys có valid và active không

### 4. Docker Issues
- Render sẽ tự động sử dụng Docker runtime
- Kiểm tra file `render.yaml` và `Dockerfile` đúng format

## Lưu ý quan trọng

- **Docker deployment** sẽ tự động bypass vấn đề Elixir detection
- Tất cả environment variables phải được set trước khi deploy
- Database phải accessible từ external connections
- Scheduler sẽ tự động chạy khi app khởi động

## Liên hệ

Nếu gặp vấn đề, kiểm tra logs deployment hoặc liên hệ để được hỗ trợ.