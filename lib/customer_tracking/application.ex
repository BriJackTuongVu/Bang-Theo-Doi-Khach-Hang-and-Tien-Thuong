defmodule CustomerTracking.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      CustomerTracking.Repo,
      {DNSCluster, query: Application.get_env(:customer_tracking, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: CustomerTracking.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: CustomerTracking.Finch},
      # Start a worker by calling: CustomerTracking.Worker.start_link(arg)
      # {CustomerTracking.Worker, arg},
      # Start the Endpoint (http/https)
      CustomerTrackingWeb.Endpoint,
      # Start the Quantum scheduler
      CustomerTracking.Scheduler
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: CustomerTracking.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    CustomerTrackingWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end