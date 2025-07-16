# HƯỚNG DẪN DEPLOY CUỐI CÙNG

## VẤN ĐỀ HIỆN TẠI
Render vẫn build Elixir/Phoenix vì GitHub repository chứa files Elixir cũ dù local đã clean.

## GIẢI PHÁP HOÀN CHỈNH

### Bước 1: Xóa Git Lock và Commit Node.js App
```bash
# Xóa git lock nếu có
rm -f .git/index.lock

# Thêm tất cả files Node.js
git add -A

# Commit để ghi đè files Elixir cũ
git commit -m "Remove all Elixir/Phoenix files, restore Node.js application for Render deployment"

# Push lên GitHub
git push origin main
```

### Bước 2: Cấu hình Render Service
1. **Đi vào Render Dashboard**
2. **Tạo New Web Service**
3. **Connect GitHub repository**
4. **Cấu hình Environment settings:**
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: `20.x`

### Bước 3: Environment Variables
Set các biến môi trường trong Render:
```
DATABASE_URL=<your_postgres_url>
CALENDLY_API_TOKEN=<your_calendly_token>
STRIPE_SECRET_KEY=<your_stripe_secret>
VITE_STRIPE_PUBLIC_KEY=<your_stripe_public>
NODE_ENV=production
PORT=5000
```

### Bước 4: Deploy
1. **Deploy service** từ Render dashboard
2. **Render sẽ nhận diện Node.js** thay vì Elixir
3. **Build thành công** với npm commands

## CÁC FILES QUAN TRỌNG ĐÃ TẠO

### Node.js Configuration
- ✅ `package.json` - Node.js project config
- ✅ `package-lock.json` - Dependency lock file
- ✅ `.node-version` - Node version (20.19.4)
- ✅ `.buildpacks` - Node.js buildpack
- ✅ `render.yaml` - Render service config

### Application Files
- ✅ `server/` - Express.js backend
- ✅ `client/` - React frontend
- ✅ `shared/` - Shared TypeScript schemas
- ✅ `vite.config.ts` - Frontend build config

### Database
- ✅ `drizzle.config.ts` - Database configuration
- ✅ PostgreSQL ready với Neon driver

## TÍNH NĂNG HOẠT ĐỘNG
✅ Customer tracking với bonus calculation
✅ Calendly API integration
✅ Stripe payment tracking
✅ Automatic scheduling
✅ Database synchronization
✅ Real-time auto-sync

## LƯU Ý QUAN TRỌNG
1. **Đảm bảo push git** để GitHub có code Node.js mới
2. **Render sẽ tự động detect** Node.js khi không có files Elixir
3. **Build command** phải là `npm run build` không phải `mix phx.digest`
4. **Start command** phải là `npm start` không phải Phoenix server

## NẾU VẪN CÓN LỖI
1. Check GitHub repository có files `mix.exs`, `config/`, `lib/` không
2. Nếu có thì xóa thủ công trong GitHub web interface
3. Hoặc force push để ghi đè hoàn toàn:
```bash
git push --force origin main
```

## KẾT QUẢ MONG MUỐN
- Render build log sẽ hiển thị Node.js build thay vì Elixir
- Application sẽ deploy thành công trên port 5000
- Tất cả tính năng working perfectly