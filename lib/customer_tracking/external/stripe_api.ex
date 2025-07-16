defmodule CustomerTracking.External.StripeAPI do
  @moduledoc """
  Stripe API integration for tracking first-time payments.
  """
  
  require Logger
  
  @stripe_base_url "https://api.stripe.com/v1"
  
  def get_first_time_payments_for_date(date) do
    secret_key = System.get_env("STRIPE_SECRET_KEY")
    
    if is_nil(secret_key) do
      {:error, "STRIPE_SECRET_KEY not configured"}
    else
      # Convert date to Unix timestamps
      {:ok, start_datetime} = DateTime.new(Date.from_iso8601!(date), ~T[00:00:00.000])
      {:ok, end_datetime} = DateTime.new(Date.from_iso8601!(date), ~T[23:59:59.999])
      
      start_timestamp = DateTime.to_unix(start_datetime)
      end_timestamp = DateTime.to_unix(end_datetime)
      
      # Get all successful payments for the date
      case get_payments_for_date_range(secret_key, start_timestamp, end_timestamp) do
        {:ok, payments} ->
          # Filter for first-time customers
          first_time_count = count_first_time_customers(payments, date)
          {:ok, first_time_count}
          
        {:error, reason} ->
          {:error, reason}
      end
    end
  end
  
  defp get_payments_for_date_range(secret_key, start_timestamp, end_timestamp) do
    url = "#{@stripe_base_url}/payment_intents"
    headers = [
      {"Authorization", "Bearer #{secret_key}"},
      {"Content-Type", "application/x-www-form-urlencoded"}
    ]
    
    params = %{
      "created[gte]" => start_timestamp,
      "created[lte]" => end_timestamp,
      "status" => "succeeded",
      "limit" => 100
    }
    
    query_string = URI.encode_query(params)
    full_url = "#{url}?#{query_string}"
    
    case HTTPoison.get(full_url, headers) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"data" => payments}} ->
            {:ok, payments}
            
          {:error, _} ->
            {:error, "Failed to parse Stripe response"}
        end
        
      {:ok, %HTTPoison.Response{status_code: status_code, body: body}} ->
        Logger.error("❌ Stripe API error #{status_code}: #{body}")
        {:error, "Stripe API error: #{status_code}"}
        
      {:error, %HTTPoison.Error{reason: reason}} ->
        Logger.error("❌ Stripe HTTP error: #{reason}")
        {:error, "HTTP error: #{reason}"}
    end
  end
  
  defp count_first_time_customers(payments, date) do
    # Group payments by customer email
    customer_emails = 
      payments
      |> Enum.filter(fn payment -> payment["receipt_email"] end)
      |> Enum.map(fn payment -> payment["receipt_email"] end)
      |> Enum.uniq()
    
    # Check each customer's payment history to see if this is their first payment
    first_time_customers = 
      Enum.filter(customer_emails, fn email ->
        is_first_time_customer?(email, date)
      end)
    
    length(first_time_customers)
  end
  
  defp is_first_time_customer?(email, date) do
    secret_key = System.get_env("STRIPE_SECRET_KEY")
    
    # Get target date timestamp
    {:ok, target_datetime} = DateTime.new(Date.from_iso8601!(date), ~T[00:00:00.000])
    target_timestamp = DateTime.to_unix(target_datetime)
    
    # Search for any payments from this customer before the target date
    url = "#{@stripe_base_url}/payment_intents"
    headers = [
      {"Authorization", "Bearer #{secret_key}"},
      {"Content-Type", "application/x-www-form-urlencoded"}
    ]
    
    params = %{
      "created[lt]" => target_timestamp,
      "status" => "succeeded",
      "limit" => 1
    }
    
    query_string = URI.encode_query(params)
    full_url = "#{url}?#{query_string}"
    
    case HTTPoison.get(full_url, headers) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        case Jason.decode(body) do
          {:ok, %{"data" => previous_payments}} ->
            # Check if any previous payments are from this customer
            has_previous_payment = 
              Enum.any?(previous_payments, fn payment ->
                payment["receipt_email"] == email
              end)
            
            not has_previous_payment
            
          {:error, _} ->
            false
        end
        
      _ ->
        false
    end
  end
end