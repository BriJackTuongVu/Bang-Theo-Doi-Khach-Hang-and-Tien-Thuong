import { TrackingTable } from "@/components/tracking-table";
import { BonusTierIndicator } from "@/components/bonus-tier-indicator";
import { SummaryStats } from "@/components/summary-stats";
import { CustomerReportsTable } from "@/components/customer-reports-table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { TrackingRecord } from "@shared/schema";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function TrackingPage() {
  const { data: records = [] } = useQuery<TrackingRecord[]>({
    queryKey: ['/api/tracking-records'],
  });

  const [customerTables, setCustomerTables] = useState([1]); // Start with one table

  const addNewCustomerTable = () => {
    const newTableId = Math.max(...customerTables) + 1;
    setCustomerTables([...customerTables, newTableId]);
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

        {/* Bonus Tier Indicator - compact version */}
        <BonusTierIndicator />

        {/* Tracking Table */}
        <TrackingTable />
        
        {/* Customer Reports Tables */}
        {customerTables.map((tableId) => (
          <CustomerReportsTable key={tableId} tableId={tableId} />
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
