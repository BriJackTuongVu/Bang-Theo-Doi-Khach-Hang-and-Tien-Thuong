defmodule CustomerTracking.Repo.Migrations.CreateCustomerReports do
  use Ecto.Migration

  def change do
    create table(:customer_reports) do
      add :customer_date, :date, null: false
      add :customer_name, :string, null: false
      add :customer_phone, :string
      add :customer_email, :string
      add :appointment_time, :string
      add :report_received_date, :date

      timestamps()
    end

    create index(:customer_reports, [:customer_date])
  end
end