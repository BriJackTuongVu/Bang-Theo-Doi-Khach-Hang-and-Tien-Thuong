defmodule CustomerTracking.External.CalendlyAPI do
  @moduledoc """
  Calendly API integration for importing customer appointments.
  """
  
  require Logger
  
  @calendly_base_url "https://api.calendly.com"
  @user_uri "https://api.calendly.com/users/5e8c8c66-7fe1-4727-ba2d-32c9a56eb1ca"
  
  def import_events_for_date(date) do
    token = System.get_env("CALENDLY_API_TOKEN")
    
    if is_nil(token) do
      {:error, "CALENDLY_API_TOKEN not configured"}
    else
      # Convert date to UTC range
      start_time = "#{date}T00:00:00.000000Z"
      end_time = "#{date}T23:59:59.999999Z"
      
      # Make API request
      url = "#{@calendly_base_url}/scheduled_events"
      headers = [
        {"Authorization", "Bearer #{token}"},
        {"Content-Type", "application/json"}
      ]
      
      params = %{
        "user" => @user_uri,
        "min_start_time" => start_time,
        "max_start_time" => end_time
      }
      
      query_string = URI.encode_query(params)
      full_url = "#{url}?#{query_string}"
      
      case HTTPoison.get(full_url, headers) do
        {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
          case Jason.decode(body) do
            {:ok, %{"collection" => events}} ->
              parsed_events = parse_events(events)
              Logger.info("📅 Imported #{length(parsed_events)} events from Calendly for #{date}")
              {:ok, parsed_events}
              
            {:error, _} ->
              {:error, "Failed to parse Calendly response"}
          end
          
        {:ok, %HTTPoison.Response{status_code: 404}} ->
          Logger.info("📅 No events found for #{date}")
          {:ok, []}
          
        {:ok, %HTTPoison.Response{status_code: status_code, body: body}} ->
          Logger.error("❌ Calendly API error #{status_code}: #{body}")
          {:error, "Calendly API error: #{status_code}"}
          
        {:error, %HTTPoison.Error{reason: reason}} ->
          Logger.error("❌ Calendly HTTP error: #{reason}")
          {:error, "HTTP error: #{reason}"}
      end
    end
  end
  
  defp parse_events(events) do
    Enum.map(events, fn event ->
      # Extract appointment time
      start_time = event["start_time"]
      appointment_time = format_appointment_time(start_time)
      
      # Extract invitee information
      invitees_uri = event["event_memberships"]
      |> List.first()
      |> get_in(["user_email"])
      
      # For now, we'll extract basic info from the event
      # In a real implementation, we'd need to fetch invitee details
      %{
        name: extract_name_from_event(event),
        email: extract_email_from_event(event),
        phone: extract_phone_from_event(event),
        appointment_time: appointment_time,
        calendly_uri: event["uri"]
      }
    end)
  end
  
  defp format_appointment_time(start_time) do
    case DateTime.from_iso8601(start_time) do
      {:ok, datetime, _} ->
        datetime
        |> DateTime.shift_zone!("America/New_York")
        |> Calendar.strftime("%I:%M %p")
        
      _ ->
        ""
    end
  end
  
  defp extract_name_from_event(event) do
    # Extract name from event data
    # This is a simplified extraction - in practice you'd need to fetch invitee details
    event["name"] || "Unknown"
  end
  
  defp extract_email_from_event(event) do
    # Extract email from event data
    ""
  end
  
  defp extract_phone_from_event(event) do
    # Extract phone from location field if available
    location = event["location"]
    
    if location && location["location"] do
      # Phone numbers are often stored in location field
      location["location"]
    else
      ""
    end
  end
end