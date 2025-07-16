defmodule CustomerTracking.Repo.Migrations.CreateTrackingRecords do
  use Ecto.Migration

  def change do
    create table(:tracking_records) do
      add :date, :date, null: false
      add :scheduled_customers, :integer, default: 0
      add :reported_customers, :integer, default: 0
      add :closed_customers, :integer, default: 0

      timestamps()
    end

    create unique_index(:tracking_records, [:date])
  end
end