import { TrackingTable } from "@/components/tracking-table";
import { BonusTierIndicator } from "@/components/bonus-tier-indicator";
import { SummaryStats } from "@/components/summary-stats";
import { CustomerReportsTable } from "@/components/customer-reports-table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { TrackingRecord } from "@shared/schema";
import { useState } from "react";
import { Plus } from "lucide-react";
import { getNextWorkingDay, getTodayDate } from "@/lib/utils";

export default function TrackingPage() {
  const { data: records = [] } = useQuery<TrackingRecord[]>({
    queryKey: ['/api/tracking-records'],
  });

  const [customerTables, setCustomerTables] = useState([{ id: 1, date: getTodayDate() }]); // Start with one table

  const addNewCustomerTable = () => {
    const newTableId = Math.max(...customerTables.map(t => t.id)) + 1;
    // Get the latest date from existing tables and find next working day
    const latestDate = customerTables.reduce((latest, table) => 
      table.date > latest ? table.date : latest, customerTables[0]?.date || getTodayDate()
    );
    const nextWorkingDate = getNextWorkingDay(latestDate);
    
    // Add new table to the beginning of the array (newest first)
    const newTables = [{ id: newTableId, date: nextWorkingDate }, ...customerTables];
    setCustomerTables(newTables);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bảng Theo Dõi Khách Hàng & Tiền Thưởng
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Quản lý số lượng khách hàng và tính toán tiền thưởng hàng ngày
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Stats - moved to top */}
        <SummaryStats records={records} />



        {/* Tracking Table */}
        <TrackingTable />
        
        {/* Customer Reports Tables */}
        {customerTables.map((table) => (
          <CustomerReportsTable key={table.id} tableId={table.id} initialDate={table.date} />
        ))}
        
        {/* Add New Customer Table Button */}
        <div className="flex justify-center">
          <Button
            onClick={addNewCustomerTable}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Thêm Bảng Chi Tiết Khách Hàng Mới
          </Button>
        </div>
      </div>
    </div>
  );
}
