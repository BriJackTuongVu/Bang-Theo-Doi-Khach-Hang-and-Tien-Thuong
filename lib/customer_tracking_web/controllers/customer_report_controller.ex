defmodule CustomerTrackingWeb.CustomerReportController do
  use CustomerTrackingWeb, :controller

  alias CustomerTracking.Tracking
  alias CustomerTracking.Tracking.CustomerReport

  def index(conn, _params) do
    customer_reports = Tracking.list_customer_reports()
    render(conn, :index, customer_reports: customer_reports)
  end

  def create(conn, %{"customer_report" => customer_report_params}) do
    case Tracking.create_customer_report(customer_report_params) do
      {:ok, customer_report} ->
        conn
        |> put_status(:created)
        |> render(:show, customer_report: customer_report)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def show(conn, %{"id" => id}) do
    customer_report = Tracking.get_customer_report!(id)
    render(conn, :show, customer_report: customer_report)
  end

  def update(conn, %{"id" => id, "customer_report" => customer_report_params}) do
    customer_report = Tracking.get_customer_report!(id)

    case Tracking.update_customer_report(customer_report, customer_report_params) do
      {:ok, customer_report} ->
        render(conn, :show, customer_report: customer_report)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> render(:error, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    customer_report = Tracking.get_customer_report!(id)

    with {:ok, %CustomerReport{}} <- Tracking.delete_customer_report(customer_report) do
      send_resp(conn, :no_content, "")
    end
  end
end