defmodule CustomerTracking.Tracking.TrackingRecord do
  use Ecto.Schema
  import Ecto.Changeset

  schema "tracking_records" do
    field :date, :date
    field :scheduled_customers, :integer, default: 0
    field :reported_customers, :integer, default: 0
    field :closed_customers, :integer, default: 0

    timestamps()
  end

  @doc false
  def changeset(tracking_record, attrs) do
    tracking_record
    |> cast(attrs, [:date, :scheduled_customers, :reported_customers, :closed_customers])
    |> validate_required([:date])
    |> validate_number(:scheduled_customers, greater_than_or_equal_to: 0)
    |> validate_number(:reported_customers, greater_than_or_equal_to: 0)
    |> validate_number(:closed_customers, greater_than_or_equal_to: 0)
    |> unique_constraint(:date)
  end
end