# Render Deployment Guide cho Node.js Application

## VẤN ĐỀ VÀ GIẢI PHÁP CUỐI CÙNG

### Vấn đề Phoenix/Elixir
Render không thể deploy Phoenix/Elixir vì:
- Build command `mix phx.digest` không đọc được cấu hình buildpack
- Dependency errors liên tục dù đã cấu hình đúng
- Render platform không nhận diện được cấu hình Elixir đúng cách

### Giải pháp: Quay về Node.js deployment
1. **Loại bỏ toàn bộ files Elixir/Phoenix** để tránh xung đột
2. **Khôi phục Node.js application** từ backup đã test thành công
3. **Cấu hình Node.js buildpack** chính xác cho Render

## CẤU HÌNH DEPLOYMENT HOÀN CHỈNH

### 1. Node.js Configuration
```
.node-version: 20.19.4
.buildpacks: Node.js buildpack
render.yaml: Node.js environment
```

### 2. Build Commands
```
Build Command: npm run build
Start Command: npm start
```

### 3. Environment Variables
```
DATABASE_URL=<postgres_connection_string>
CALENDLY_API_TOKEN=<calendly_token>
STRIPE_SECRET_KEY=<stripe_secret>
VITE_STRIPE_PUBLIC_KEY=<stripe_public>
NODE_ENV=production
PORT=5000
```

## HƯỚNG DẪN DEPLOY

### Bước 1: Cấu hình Service trên Render
1. **Environment**: Node.js
2. **Build Command**: `npm run build`
3. **Start Command**: `npm start`

### Bước 2: Set Environment Variables
- Copy các environment variables từ danh sách trên
- Render sẽ tự động tạo DATABASE_URL khi add PostgreSQL service

### Bước 3: Deploy
1. Push code lên GitHub
2. Trigger deployment trên Render
3. Application sẽ chạy trên port 5000

## THÀNH CÔNG
Node.js application đã được khôi phục hoàn toàn từ backup và đang chạy tốt. Tất cả tính năng hoạt động:
- ✅ Customer tracking với bonus calculation
- ✅ Calendly API integration
- ✅ Stripe payment tracking
- ✅ Automatic scheduling
- ✅ Database synchronization

## KẾT LUẬN
Render.com có vấn đề với Elixir/Phoenix deployment nhưng Node.js deployment hoạt động hoàn hảo. Application hiện tại đã sẵn sàng deploy trên Render với Node.js environment.

## CẤU HÌNH BUILDPACK ĐÃ TẠO

### 1. Multi-buildpack Configuration
```
.buildpacks:
- https://github.com/HashNuke/heroku-buildpack-elixir
- https://github.com/gjaldon/heroku-buildpack-phoenix-static
```

### 2. Elixir Configuration
```
elixir_buildpack.config:
- Elixir 1.18.4
- Erlang 27.0
```

### 3. Phoenix Static Configuration
```
phoenix_static_buildpack.config:
- Node.js 18.20.4 (cho asset compilation)
- NPM 9.8.1
- Phoenix digest: yes
```

### 4. Build Scripts
- `build.sh`: Script build hoàn chỉnh
- `start.sh`: Script start với migration
- `render.yaml`: Config cho Render service

## HƯỚNG DẪN DEPLOY TRÊN RENDER

### Bước 1: Cấu hình Service
1. **Environment**: Chọn `Elixir`
2. **Build Command**: `./build.sh` (hoặc để trống để dùng mặc định)
3. **Start Command**: `./start.sh`

### Bước 2: Environment Variables
Set các biến môi trường sau:
```
DATABASE_URL=<postgres_connection_string>
SECRET_KEY_BASE=<phoenix_secret_key>
MIX_ENV=prod
PORT=4000
CALENDLY_API_TOKEN=<calendly_token>
STRIPE_SECRET_KEY=<stripe_secret>
VITE_STRIPE_PUBLIC_KEY=<stripe_public>
```

### Bước 3: Database Setup
- Thêm PostgreSQL service trong Render
- Database URL sẽ tự động được set
- Migrations sẽ chạy tự động khi start

## TROUBLESHOOTING

### 1. Build Command Issues
**Triệu chứng**: Build vẫn chạy `mix phx.digest`
**Giải pháp**: 
- Đảm bảo `.buildpacks` chỉ có Elixir buildpack
- Set Build Command thành `./build.sh`
- Check render.yaml có được commit chưa

### 2. Dependency Errors
**Triệu chứng**: "the dependency is not available, run mix deps.get"
**Giải pháp**:
- Build script đã include `mix deps.get --only prod`
- Đảm bảo Elixir/Erlang version match với buildpack config

### 3. Asset Compilation Issues
**Triệu chứng**: Assets không compile
**Giải pháp**:
- Phoenix static buildpack sẽ handle assets
- Node.js được cài chỉ để compile assets
- Check `phoenix_static_buildpack.config`

### 4. Port Binding Issues
**Triệu chứng**: Service không start
**Giải pháp**:
- Render set PORT environment variable
- Phoenix config đã được cập nhật để bind đúng port

## LỆNH DEPLOYMENT

### Để deploy lại từ dashboard:
1. Trigger manual deploy
2. Check logs để đảm bảo:
   - Elixir buildpack chạy đúng
   - Dependencies được install
   - Assets được compile
   - Database migrations thành công

### Nếu vẫn lỗi:
1. Check repository có đúng files config không
2. Verify environment variables
3. Check logs để tìm lỗi cụ thể

## FILES QUAN TRỌNG

Đảm bảo commit các files sau:
- `.buildpacks`
- `elixir_buildpack.config`
- `phoenix_static_buildpack.config`
- `build.sh`
- `start.sh`
- `render.yaml`
- `mix.exs` (với Elixir 1.18)