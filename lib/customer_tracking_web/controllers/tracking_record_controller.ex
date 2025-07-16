defmodule CustomerTrackingWeb.TrackingRecordController do
  use CustomerTrackingWeb, :controller

  alias CustomerTracking.Tracking
  alias CustomerTracking.Tracking.TrackingRecord

  def index(conn, _params) do
    tracking_records = Tracking.list_tracking_records()
    render(conn, :index, tracking_records: tracking_records)
  end

  def create(conn, %{"tracking_record" => tracking_record_params}) do
    case Tracking.create_tracking_record(tracking_record_params) do
      {:ok, tracking_record} ->
        conn
        |> put_status(:created)
        |> render(:show, tracking_record: tracking_record)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    tracking_record = Tracking.get_tracking_record!(id)
    render(conn, :show, tracking_record: tracking_record)
  end

  def update(conn, %{"id" => id, "tracking_record" => tracking_record_params}) do
    tracking_record = Tracking.get_tracking_record!(id)

    case Tracking.update_tracking_record(tracking_record, tracking_record_params) do
      {:ok, tracking_record} ->
        render(conn, :show, tracking_record: tracking_record)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    tracking_record = Tracking.get_tracking_record!(id)

    with {:ok, %TrackingRecord{}} <- Tracking.delete_tracking_record(tracking_record) do
      send_resp(conn, :no_content, "")
    end
  end

  def sync_data(conn, _params) do
    case Tracking.sync_tracking_data() do
      {:ok, updated_count} ->
        json(conn, %{
          success: true,
          message: "Updated #{updated_count} tracking records",
          updated_count: updated_count
        })

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{success: false, message: "Sync failed: #{reason}"})
    end
  end
end