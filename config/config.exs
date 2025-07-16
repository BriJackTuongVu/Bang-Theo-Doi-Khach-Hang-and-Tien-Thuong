import Config

# Configure your database
config :customer_tracking, CustomerTracking.Repo,
  username: System.get_env("PGUSER") || "postgres",
  password: System.get_env("PGPASSWORD") || "postgres",
  hostname: System.get_env("PGHOST") || "localhost",
  database: System.get_env("PGDATABASE") || "customer_tracking_dev",
  port: System.get_env("PGPORT") || 5432,
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

# Configures the endpoint
config :customer_tracking, CustomerTrackingWeb.Endpoint,
  url: [host: "localhost"],
  render_errors: [
    formats: [html: CustomerTrackingWeb.ErrorHTML, json: CustomerTrackingWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: CustomerTracking.PubSub,
  live_view: [signing_salt: "customer_tracking"]

# Configure esbuild (the version is required)
config :esbuild,
  version: "0.17.11",
  default: [
    args:
      ~w(js/app.js --bundle --target=es2017 --outdir=../priv/static/assets --external:/fonts/* --external:/images/*),
    cd: Path.expand("../assets", __DIR__),
    env: %{"NODE_PATH" => Path.expand("../deps", __DIR__)}
  ]

# Configure tailwind (the version is required)
config :tailwind,
  version: "3.2.7",
  default: [
    args: ~w(
      --config=tailwind.config.js
      --input=css/app.css
      --output=../priv/static/assets/app.css
    ),
    cd: Path.expand("../assets", __DIR__)
  ]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Quantum scheduler configuration
config :customer_tracking, CustomerTracking.Scheduler,
  jobs: [
    # Create tracking records at 6:00 AM Eastern Time, weekdays only
    create_tracking_records: [
      schedule: "0 6 * * 1-5",
      timezone: "America/New_York",
      task: {CustomerTracking.Scheduler, :create_daily_tracking_record, []}
    ],
    # Check Stripe payments at 11:59 PM Eastern Time, daily
    check_stripe_payments: [
      schedule: "59 23 * * *",
      timezone: "America/New_York", 
      task: {CustomerTracking.Scheduler, :check_stripe_payments, []}
    ]
  ]

# Import environment specific config
import_config "#{config_env()}.exs"