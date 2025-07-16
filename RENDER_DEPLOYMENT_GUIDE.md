# Render Deployment Guide cho Phoenix Application

## Cấu hình đã tạo

### 1. File cấu hình Elixir/Erlang version
- `elixir_buildpack.config`: Chỉ định Elixir 1.18.4 và Erlang 27.0

### 2. Build và Start scripts
- `build.sh`: Script build cho Render
- `start.sh`: Script start cho Render
- `Procfile`: Cấu hình process cho Render

### 3. Render configuration
- `render.yaml`: Cấu hình service cho Render với build commands đúng

## Hướng dẫn deploy trên Render

### Bước 1: Cấu hình trong Render Dashboard

1. **Build Command**: 
   ```bash
   mix deps.get --only prod && mix compile && mix assets.setup && mix assets.deploy && mix phx.digest
   ```

2. **Start Command**:
   ```bash
   mix ecto.migrate && mix phx.server
   ```

3. **Environment Variables** cần thiết:
   - `DATABASE_URL`: Database connection string
   - `SECRET_KEY_BASE`: Phoenix secret key (generate bằng `mix phx.gen.secret`)
   - `MIX_ENV`: `prod`
   - `PORT`: `4000`
   - `CALENDLY_API_TOKEN`: API token cho Calendly
   - `STRIPE_SECRET_KEY`: Secret key cho Stripe
   - `VITE_STRIPE_PUBLIC_KEY`: Public key cho Stripe

### Bước 2: Sửa lỗi build hiện tại

**Vấn đề**: Build command hiện tại là `mix phx.digest` (thiếu `mix deps.get`)

**Giải pháp**: Cập nhật Build Command trong Render Dashboard thành:
```bash
mix deps.get --only prod && mix compile && mix assets.setup && mix assets.deploy && mix phx.digest
```

### Bước 3: Cấu hình database
- Database URL sẽ được Render tự động tạo nếu bạn add PostgreSQL service
- Phoenix sẽ tự động chạy migrations khi start

### Bước 4: Test deployment
1. Push code lên GitHub
2. Trigger new deployment trên Render
3. Check logs để đảm bảo build và start thành công

## Troubleshooting

### Build failed với dependency errors
- Đảm bảo `mix deps.get --only prod` được chạy trước `mix compile`
- Check Elixir/Erlang version compatibility

### Database connection issues
- Kiểm tra `DATABASE_URL` environment variable
- Đảm bảo `mix ecto.migrate` chạy trong start command

### Port binding issues
- Render sẽ tự động set PORT environment variable
- Phoenix config đã được cập nhật để sử dụng PORT từ environment