# Railway Deployment Troubleshooting

## Vấn đề: Page can't be found

### Nguyên nhân có thể:
1. **Port Configuration**: Railway không bind đúng port
2. **Build Process**: Build không thành công
3. **Environment Variables**: Thiếu DATABASE_URL hoặc API keys
4. **Health Check**: App crash sau khi start

### Cách kiểm tra:

#### 1. Kiểm tra Deployment Logs
- Vào Railway Dashboard > Project > Deployments
- Kiểm tra Build Logs và Runtime Logs
- Tìm errors trong logs

#### 2. Kiểm tra Environment Variables
Đảm bảo có đủ các biến:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
PORT=5000
```

#### 3. Kiểm tra Health Check
Railway cần app response tại root path `/`

#### 4. Kiểm tra Build Process
- Railway sẽ chạy `npm run build`
- Sau đó chạy `npm run start`

### Giải pháp:

#### Option 1: Sử dụng Nixpacks (Recommended)
Railway sẽ tự động detect và build Node.js app:
```bash
# Xóa Dockerfile để force Nixpacks
rm Dockerfile
git add .
git commit -m "Use Nixpacks for deployment"
git push origin main
```

#### Option 2: Fix Docker Configuration
Nếu muốn dùng Docker, đảm bảo:
- App listen trên `0.0.0.0:$PORT`
- Dockerfile expose đúng port
- Health check response tại root

#### Option 3: Thử Platform Khác
- **Vercel**: Excellent cho Node.js
- **Fly.io**: Docker-native
- **Heroku**: Classic và stable

### Commands để debug:
```bash
# Test local Docker
docker build -t test-app .
docker run -p 5000:5000 -e PORT=5000 test-app

# Test local build
npm run build
npm run start
```

### Nếu vẫn lỗi:
1. Kiểm tra Railway logs chi tiết
2. Thử deploy với Nixpacks thay vì Docker
3. Test local trước khi deploy
4. Kiểm tra database connection string