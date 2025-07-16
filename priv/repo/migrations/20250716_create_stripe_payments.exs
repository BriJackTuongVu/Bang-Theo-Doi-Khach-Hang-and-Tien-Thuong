defmodule CustomerTracking.Repo.Migrations.CreateStripePayments do
  use Ecto.Migration

  def change do
    create table(:stripe_payments) do
      add :payment_intent_id, :string, null: false
      add :customer_email, :string
      add :amount, :integer, null: false
      add :currency, :string, null: false
      add :status, :string, null: false
      add :payment_date, :date, null: false
      add :created_at_stripe, :utc_datetime

      timestamps()
    end

    create unique_index(:stripe_payments, [:payment_intent_id])
    create index(:stripe_payments, [:payment_date])
    create index(:stripe_payments, [:customer_email])
  end
end