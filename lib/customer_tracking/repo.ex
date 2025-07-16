defmodule CustomerTracking.Repo do
  use Ecto.Repo,
    otp_app: :customer_tracking,
    adapter: Ecto.Adapters.Postgres
end