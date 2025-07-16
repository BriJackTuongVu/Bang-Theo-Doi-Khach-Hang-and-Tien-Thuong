defmodule CustomerTrackingWeb.TrackingLive.Index do
  use CustomerTrackingWeb, :live_view

  alias CustomerTracking.Tracking
  alias CustomerTracking.Tracking.TrackingRecord
  alias CustomerTracking.External.{CalendlyAPI, StripeAPI}

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      # Auto-sync every 15 seconds
      Process.send_after(self(), :sync_tracking_data, 15_000)
    end

    socket =
      socket
      |> assign(:tracking_records, list_tracking_records())
      |> assign(:customer_reports, list_customer_reports())
      |> assign(:settings, load_settings())
      |> assign(:loading, false)
      |> assign(:sync_message, nil)

    {:ok, socket}
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  defp apply_action(socket, :index, _params) do
    socket
    |> assign(:page_title, "Tracking Records")
    |> assign(:tracking_record, nil)
  end

  @impl true
  def handle_event("sync_tracking_data", _params, socket) do
    case Tracking.sync_tracking_data() do
      {:ok, updated_count} ->
        socket =
          socket
          |> assign(:tracking_records, list_tracking_records())
          |> assign(:sync_message, "Updated #{updated_count} tracking records")
          |> put_flash(:info, "Sync completed successfully")

        {:noreply, socket}

      {:error, reason} ->
        socket =
          socket
          |> put_flash(:error, "Sync failed: #{reason}")

        {:noreply, socket}
    end
  end

  def handle_event("toggle_setting", %{"key" => key, "value" => value}, socket) do
    case Tracking.update_setting(key, value) do
      {:ok, _setting} ->
        socket =
          socket
          |> assign(:settings, load_settings())
          |> put_flash(:info, "Setting updated successfully")

        {:noreply, socket}

      {:error, _changeset} ->
        socket =
          socket
          |> put_flash(:error, "Failed to update setting")

        {:noreply, socket}
    end
  end

  def handle_event("update_tracking_record", %{"id" => id, "field" => field, "value" => value}, socket) do
    tracking_record = Tracking.get_tracking_record!(id)
    
    case Tracking.update_tracking_record(tracking_record, %{field => String.to_integer(value)}) do
      {:ok, _tracking_record} ->
        socket =
          socket
          |> assign(:tracking_records, list_tracking_records())
          |> put_flash(:info, "Record updated successfully")

        {:noreply, socket}

      {:error, _changeset} ->
        socket =
          socket
          |> put_flash(:error, "Failed to update record")

        {:noreply, socket}
    end
  end

  def handle_event("check_stripe_payments", %{"date" => date}, socket) do
    socket = assign(socket, :loading, true)
    
    case StripeAPI.get_first_time_payments_for_date(date) do
      {:ok, count} ->
        # Update tracking record with closed customers count
        case Tracking.get_tracking_record_by_date(date) do
          nil ->
            socket =
              socket
              |> assign(:loading, false)
              |> put_flash(:error, "No tracking record found for #{date}")
            
            {:noreply, socket}
            
          record ->
            case Tracking.update_tracking_record(record, %{closed_customers: count}) do
              {:ok, _} ->
                socket =
                  socket
                  |> assign(:tracking_records, list_tracking_records())
                  |> assign(:loading, false)
                  |> put_flash(:info, "Found #{count} first-time payments for #{date}")
                
                {:noreply, socket}
                
              {:error, _} ->
                socket =
                  socket
                  |> assign(:loading, false)
                  |> put_flash(:error, "Failed to update tracking record")
                
                {:noreply, socket}
            end
        end
        
      {:error, reason} ->
        socket =
          socket
          |> assign(:loading, false)
          |> put_flash(:error, "Stripe check failed: #{reason}")
        
        {:noreply, socket}
    end
  end

  @impl true
  def handle_info(:sync_tracking_data, socket) do
    # Auto-sync tracking data
    case Tracking.sync_tracking_data() do
      {:ok, updated_count} ->
        socket =
          socket
          |> assign(:tracking_records, list_tracking_records())
          |> assign(:sync_message, if(updated_count > 0, do: "Updated #{updated_count} records", else: nil))
      
      {:error, _reason} ->
        socket
    end
    
    # Schedule next sync
    Process.send_after(self(), :sync_tracking_data, 15_000)
    
    {:noreply, socket}
  end

  defp list_tracking_records do
    Tracking.list_tracking_records()
  end

  defp list_customer_reports do
    Tracking.list_customer_reports()
    |> Enum.group_by(& &1.customer_date)
  end

  defp load_settings do
    %{
      calendly_auto_import: get_setting_value("calendly_auto_import"),
      stripe_auto_check: get_setting_value("stripe_auto_check"),
      data_retention: get_setting_value("data_retention")
    }
  end

  defp get_setting_value(key) do
    case Tracking.get_or_create_setting(key, "true") do
      {:ok, setting} -> setting.value == "true"
      _ -> true
    end
  end

  defp calculate_bonus(scheduled, reported) do
    Tracking.calculate_bonus(scheduled, reported)
  end
end