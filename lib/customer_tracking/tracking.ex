defmodule CustomerTracking.Tracking do
  @moduledoc """
  The Tracking context.
  """

  import Ecto.Query, warn: false
  alias CustomerTracking.Repo

  alias CustomerTracking.Tracking.{TrackingRecord, CustomerReport, Setting, StripePayment}

  @doc """
  Returns the list of tracking_records.
  """
  def list_tracking_records do
    Repo.all(from t in TrackingRecord, order_by: [desc: t.date])
  end

  @doc """
  Gets a single tracking_record.
  """
  def get_tracking_record!(id), do: Repo.get!(TrackingRecord, id)

  @doc """
  Gets a tracking record by date.
  """
  def get_tracking_record_by_date(date) do
    Repo.get_by(TrackingRecord, date: date)
  end

  @doc """
  Creates a tracking_record.
  """
  def create_tracking_record(attrs \\ %{}) do
    %TrackingRecord{}
    |> TrackingRecord.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a tracking_record.
  """
  def update_tracking_record(%TrackingRecord{} = tracking_record, attrs) do
    tracking_record
    |> TrackingRecord.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a tracking_record.
  """
  def delete_tracking_record(%TrackingRecord{} = tracking_record) do
    Repo.delete(tracking_record)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking a tracking_record.
  """
  def change_tracking_record(%TrackingRecord{} = tracking_record, attrs \\ %{}) do
    TrackingRecord.changeset(tracking_record, attrs)
  end

  @doc """
  Returns the list of customer_reports.
  """
  def list_customer_reports do
    Repo.all(from c in CustomerReport, order_by: [desc: c.customer_date, asc: c.customer_name])
  end

  @doc """
  Gets a single customer_report.
  """
  def get_customer_report!(id), do: Repo.get!(CustomerReport, id)

  @doc """
  Creates a customer_report.
  """
  def create_customer_report(attrs \\ %{}) do
    %CustomerReport{}
    |> CustomerReport.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a customer_report.
  """
  def update_customer_report(%CustomerReport{} = customer_report, attrs) do
    customer_report
    |> CustomerReport.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a customer_report.
  """
  def delete_customer_report(%CustomerReport{} = customer_report) do
    Repo.delete(customer_report)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking a customer_report.
  """
  def change_customer_report(%CustomerReport{} = customer_report, attrs \\ %{}) do
    CustomerReport.changeset(customer_report, attrs)
  end

  @doc """
  Gets or creates a setting.
  """
  def get_or_create_setting(key, default_value) do
    case Repo.get_by(Setting, key: key) do
      nil ->
        create_setting(%{key: key, value: default_value})
      setting ->
        {:ok, setting}
    end
  end

  @doc """
  Creates a setting.
  """
  def create_setting(attrs \\ %{}) do
    %Setting{}
    |> Setting.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a setting.
  """
  def update_setting(key, value) do
    case Repo.get_by(Setting, key: key) do
      nil ->
        create_setting(%{key: key, value: value})
      setting ->
        setting
        |> Setting.changeset(%{value: value})
        |> Repo.update()
    end
  end

  @doc """
  Syncs tracking data with customer reports.
  """
  def sync_tracking_data do
    customer_reports = list_customer_reports()
    tracking_records = list_tracking_records()
    
    # Group customer reports by date
    reports_by_date = Enum.group_by(customer_reports, & &1.customer_date)
    
    updated_count = 
      Enum.reduce(tracking_records, 0, fn record, acc ->
        date_reports = Map.get(reports_by_date, record.date, [])
        
        scheduled_count = length(date_reports)
        reported_count = Enum.count(date_reports, & &1.report_received_date != nil)
        
        if record.scheduled_customers != scheduled_count or record.reported_customers != reported_count do
          case update_tracking_record(record, %{
            scheduled_customers: scheduled_count,
            reported_customers: reported_count
          }) do
            {:ok, _} -> acc + 1
            _ -> acc
          end
        else
          acc
        end
      end)
    
    {:ok, updated_count}
  end

  @doc """
  Calculates bonus based on performance.
  """
  def calculate_bonus(scheduled, reported) do
    if scheduled == 0 do
      %{tier: "none", amount: 0, percentage: 0}
    else
      percentage = reported / scheduled * 100
      
      cond do
        percentage >= 70 -> %{tier: "platinum", amount: 400_000, percentage: percentage}
        percentage >= 50 -> %{tier: "gold", amount: 300_000, percentage: percentage}
        percentage >= 30 -> %{tier: "silver", amount: 200_000, percentage: percentage}
        true -> %{tier: "none", amount: 0, percentage: percentage}
      end
    end
  end

  @doc """
  Creates a stripe payment record.
  """
  def create_stripe_payment(attrs \\ %{}) do
    %StripePayment{}
    |> StripePayment.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Gets stripe payments by date.
  """
  def get_stripe_payments_by_date(date) do
    from(s in StripePayment, where: s.payment_date == ^date)
    |> Repo.all()
  end

  @doc """
  Gets first-time stripe payments count for a date.
  """
  def get_first_time_payments_count(date) do
    # This would need to be implemented with proper Stripe API logic
    # For now, return the count of payments for that date
    from(s in StripePayment, where: s.payment_date == ^date)
    |> Repo.aggregate(:count, :id)
  end
end