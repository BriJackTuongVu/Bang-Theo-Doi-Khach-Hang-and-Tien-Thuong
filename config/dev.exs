import Config

# Configure your database
config :customer_tracking, CustomerTracking.Repo,
  url: System.get_env("DATABASE_URL") ||
    "ecto://#{System.get_env("PGUSER", "postgres")}:#{System.get_env("PGPASSWORD", "postgres")}@#{System.get_env("PGHOST", "localhost")}:#{System.get_env("PGPORT", "5432")}/#{System.get_env("PGDATABASE", "customer_tracking_dev")}",
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

# For development, we disable any cache and enable
# debugging and code reloading.
config :customer_tracking, CustomerTrackingWeb.Endpoint,
  # Binding to loopback ipv4 address prevents access from other machines.
  # Change to `ip: {0, 0, 0, 0}` to allow access from other machines.
  http: [ip: {0, 0, 0, 0}, port: 5000],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: "customer_tracking_secret_key_base_for_development_only",
  watchers: [
    esbuild: {Esbuild, :install_and_run, [:default, ~w(--sourcemap=inline --watch)]},
    tailwind: {Tailwind, :install_and_run, [:default, ~w(--watch)]}
  ]

# Watch static and templates for browser reloading.
config :customer_tracking, CustomerTrackingWeb.Endpoint,
  live_reload: [
    patterns: [
      ~r"priv/static/.*(js|css|png|jpeg|jpg|gif|svg)$",
      ~r"priv/gettext/.*(po)$",
      ~r"lib/customer_tracking_web/(controllers|live|components)/.*(ex|heex)$"
    ]
  ]

# Enable dev routes for dashboard and mailbox
config :customer_tracking, dev_routes: true

# Do not include metadata nor timestamps in development logs
config :logger, :console, format: "[$level] $message\n"

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 20

# Initialize plugs at runtime for faster development compilation
config :phoenix, :plug_init_mode, :runtime