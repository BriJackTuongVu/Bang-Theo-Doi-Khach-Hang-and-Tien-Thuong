defmodule CustomerTracking.Tracking.CustomerReport do
  use Ecto.Schema
  import Ecto.Changeset

  schema "customer_reports" do
    field :customer_date, :date
    field :customer_name, :string
    field :customer_phone, :string
    field :customer_email, :string
    field :appointment_time, :string
    field :report_received_date, :date

    timestamps()
  end

  @doc false
  def changeset(customer_report, attrs) do
    customer_report
    |> cast(attrs, [:customer_date, :customer_name, :customer_phone, :customer_email, :appointment_time, :report_received_date])
    |> validate_required([:customer_date, :customer_name])
    |> validate_format(:customer_email, ~r/@/, message: "must be a valid email")
  end
end