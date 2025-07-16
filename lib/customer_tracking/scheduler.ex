defmodule CustomerTracking.Scheduler do
  use Quantum, otp_app: :customer_tracking

  alias CustomerTracking.Tracking
  alias CustomerTracking.External.CalendlyAPI
  alias CustomerTracking.External.StripeAPI
  require Logger

  @doc """
  Creates daily tracking record at 6:00 AM Eastern Time (weekdays only)
  """
  def create_daily_tracking_record do
    Logger.info("🕒 Running daily tracking record creation...")
    
    # Get today's date in Eastern Time
    today = Timex.now("America/New_York") |> Timex.to_date() |> Date.to_string()
    
    # Check if record already exists
    case Tracking.get_tracking_record_by_date(today) do
      nil ->
        # Create new tracking record
        case Tracking.create_tracking_record(%{
          date: today,
          scheduled_customers: 0,
          reported_customers: 0,
          closed_customers: 0
        }) do
          {:ok, record} ->
            Logger.info("✅ Created tracking record for #{today} (ID: #{record.id})")
            
            # Auto-import from Calendly
            import_from_calendly(today, record.id)
            
            # Auto-check Stripe payments
            check_stripe_for_date(today)
            
          {:error, changeset} ->
            Logger.error("❌ Failed to create tracking record: #{inspect(changeset)}")
        end
        
      existing_record ->
        Logger.info("📋 Tracking record already exists for #{today} (ID: #{existing_record.id})")
    end
  end

  @doc """
  Checks Stripe payments at 11:59 PM Eastern Time (daily)
  """
  def check_stripe_payments do
    Logger.info("💳 Running end-of-day Stripe payment check...")
    
    # Get today's date in Eastern Time
    today = Timex.now("America/New_York") |> Timex.to_date() |> Date.to_string()
    
    check_stripe_for_date(today)
  end

  # Helper function to import from Calendly
  defp import_from_calendly(date, tracking_record_id) do
    Logger.info("📅 Auto-importing from Calendly for #{date}...")
    
    # Create customer reports table first
    case Tracking.create_customer_report(%{
      customer_date: date,
      customer_name: "Auto-created",
      customer_phone: "",
      customer_email: "",
      appointment_time: "",
      report_received_date: nil
    }) do
      {:ok, _report} ->
        # Import events from Calendly
        case CalendlyAPI.import_events_for_date(date) do
          {:ok, events} ->
            Logger.info("✅ Imported #{length(events)} customers from Calendly")
            
            # Update tracking record with scheduled count
            Tracking.update_tracking_record(tracking_record_id, %{
              scheduled_customers: length(events)
            })
            
          {:error, reason} ->
            Logger.warning("⚠️ Calendly import failed: #{reason}")
        end
        
      {:error, changeset} ->
        Logger.error("❌ Failed to create customer report: #{inspect(changeset)}")
    end
  end

  # Helper function to check Stripe payments for a specific date
  defp check_stripe_for_date(date) do
    Logger.info("💰 Checking Stripe payments for #{date}...")
    
    case StripeAPI.get_first_time_payments_for_date(date) do
      {:ok, count} ->
        Logger.info("✅ Found #{count} first-time payments for #{date}")
        
        # Update tracking record with closed customers count
        case Tracking.get_tracking_record_by_date(date) do
          nil ->
            Logger.warning("⚠️ No tracking record found for #{date}")
            
          record ->
            Tracking.update_tracking_record(record.id, %{
              closed_customers: count
            })
        end
        
      {:error, reason} ->
        Logger.warning("⚠️ Stripe check failed: #{reason}")
    end
  end
end