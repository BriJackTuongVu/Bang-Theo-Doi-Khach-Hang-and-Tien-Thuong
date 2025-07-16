defmodule CustomerTrackingWeb.CustomerReportJSON do
  alias CustomerTracking.Tracking.CustomerReport

  @doc """
  Renders a list of customer_reports.
  """
  def index(%{customer_reports: customer_reports}) do
    %{data: for(customer_report <- customer_reports, do: data(customer_report))}
  end

  @doc """
  Renders a single customer_report.
  """
  def show(%{customer_report: customer_report}) do
    %{data: data(customer_report)}
  end

  @doc """
  Renders customer_report errors.
  """
  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
  end

  defp data(%CustomerReport{} = customer_report) do
    %{
      id: customer_report.id,
      customer_date: customer_report.customer_date,
      customer_name: customer_report.customer_name,
      customer_phone: customer_report.customer_phone,
      customer_email: customer_report.customer_email,
      appointment_time: customer_report.appointment_time,
      report_received_date: customer_report.report_received_date,
      inserted_at: customer_report.inserted_at,
      updated_at: customer_report.updated_at
    }
  end

  defp translate_error({msg, opts}) do
    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", fn _ -> to_string(value) end)
    end)
  end
end