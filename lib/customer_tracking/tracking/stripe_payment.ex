defmodule CustomerTracking.Tracking.StripePayment do
  use Ecto.Schema
  import Ecto.Changeset

  schema "stripe_payments" do
    field :payment_intent_id, :string
    field :customer_email, :string
    field :amount, :integer
    field :currency, :string
    field :status, :string
    field :payment_date, :date
    field :created_at_stripe, :utc_datetime

    timestamps()
  end

  @doc false
  def changeset(stripe_payment, attrs) do
    stripe_payment
    |> cast(attrs, [:payment_intent_id, :customer_email, :amount, :currency, :status, :payment_date, :created_at_stripe])
    |> validate_required([:payment_intent_id, :amount, :currency, :status, :payment_date])
    |> validate_number(:amount, greater_than: 0)
    |> unique_constraint(:payment_intent_id)
  end
end