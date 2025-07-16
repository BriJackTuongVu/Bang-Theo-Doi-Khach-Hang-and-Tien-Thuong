defmodule CustomerTrackingWeb.HealthController do
  use CustomerTrackingWeb, :controller

  def health(conn, _params) do
    json(conn, %{status: "ok", timestamp: DateTime.utc_now()})
  end
end