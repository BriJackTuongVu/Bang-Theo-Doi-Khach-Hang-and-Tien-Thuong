defmodule CustomerTrackingWeb.Router do
  use CustomerTrackingWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {CustomerTrackingWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", CustomerTrackingWeb do
    pipe_through :browser

    live "/", TrackingLive.Index, :index
    live "/tracking", TrackingLive.Index, :index
    
    # Health check endpoint
    get "/health", HealthController, :health
  end

  # API routes
  scope "/api", CustomerTrackingWeb do
    pipe_through :api

    resources "/tracking-records", TrackingRecordController, except: [:new, :edit]
    resources "/customer-reports", CustomerReportController, except: [:new, :edit]
    
    post "/sync-tracking-data", TrackingRecordController, :sync_data
    post "/calendly-import/:date", CalendlyController, :import_for_date
    post "/stripe-check/:date", StripeController, :check_payments_for_date
    
    get "/settings/:key", SettingController, :show
    put "/settings/:key", SettingController, :update
  end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:customer_tracking, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: CustomerTrackingWeb.Telemetry
    end
  end
end