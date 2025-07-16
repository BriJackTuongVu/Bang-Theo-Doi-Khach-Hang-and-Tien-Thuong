defmodule CustomerTrackingWeb.TrackingRecordJSON do
  alias CustomerTracking.Tracking.TrackingRecord

  @doc """
  Renders a list of tracking_records.
  """
  def index(%{tracking_records: tracking_records}) do
    %{data: for(tracking_record <- tracking_records, do: data(tracking_record))}
  end

  @doc """
  Renders a single tracking_record.
  """
  def show(%{tracking_record: tracking_record}) do
    %{data: data(tracking_record)}
  end

  @doc """
  Renders tracking_record errors.
  """
  def error(%{changeset: changeset}) do
    %{errors: Ecto.Changeset.traverse_errors(changeset, &translate_error/1)}
  end

  defp data(%TrackingRecord{} = tracking_record) do
    %{
      id: tracking_record.id,
      date: tracking_record.date,
      scheduled_customers: tracking_record.scheduled_customers,
      reported_customers: tracking_record.reported_customers,
      closed_customers: tracking_record.closed_customers,
      inserted_at: tracking_record.inserted_at,
      updated_at: tracking_record.updated_at
    }
  end

  defp translate_error({msg, opts}) do
    # You can make use of gettext to translate error messages by
    # uncommenting and adjusting the following code:

    # if count = opts[:count] do
    #   Gettext.dngettext(CustomerTrackingWeb.Gettext, "errors", msg, msg, count, opts)
    # else
    #   Gettext.dgettext(CustomerTrackingWeb.Gettext, "errors", msg, opts)
    # end

    Enum.reduce(opts, msg, fn {key, value}, acc ->
      String.replace(acc, "%{#{key}}", fn _ -> to_string(value) end)
    end)
  end
end