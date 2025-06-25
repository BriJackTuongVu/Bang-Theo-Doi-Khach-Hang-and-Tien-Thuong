import { TrackingTable } from "@/components/tracking-table";
import { BonusTierIndicator } from "@/components/bonus-tier-indicator";
import { SummaryStats } from "@/components/summary-stats";
import { CustomerReportsTable } from "@/components/customer-reports-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { TrackingRecord } from "@shared/schema";
import { useState, useEffect } from "react";
import { Plus, Clock, CheckCircle, XCircle, Settings } from "lucide-react";
import { getNextWorkingDay, getTodayDate } from "@/lib/utils";

export default function TrackingPage() {
  const { data: records = [] } = useQuery<TrackingRecord[]>({
    queryKey: ['/api/tracking-records'],
  });

  const [customerTables, setCustomerTables] = useState([{ id: 1, date: getTodayDate() }]); // Start with one table
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);

  // Check Calendly connection status on load
  useEffect(() => {
    checkCalendlyConnection();
  }, []);

  const checkCalendlyConnection = async () => {
    try {
      const response = await fetch('/api/calendly/status');
      const result = await response.json();
      setCalendlyConnected(result.connected || false);
    } catch (error) {
      setCalendlyConnected(false);
    }
  };

  const handleCalendlyConnect = () => {
    setShowCalendlyModal(true);
  };

  const handleCalendlyDisconnect = async () => {
    if (confirm('Bạn có chắc chắn muốn ngắt kết nối Calendly?')) {
      try {
        await fetch('/api/calendly/disconnect', { method: 'POST' });
        setCalendlyConnected(false);
        
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.textContent = 'Đã ngắt kết nối Calendly';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } catch (error) {
        alert('Lỗi khi ngắt kết nối');
      }
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Bảng Theo Dõi Khách Hàng & Tiền Thưởng
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Quản lý số lượng khách hàng và tính toán tiền thưởng hàng ngày
              </p>
            </div>
            
            {/* Calendly Connection Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Calendly:</span>
                {calendlyConnected ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Đã kết nối</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600 font-medium">Chưa kết nối</span>
                  </div>
                )}
              </div>
              
              {calendlyConnected ? (
                <Button
                  onClick={handleCalendlyDisconnect}
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Ngắt kết nối
                </Button>
              ) : (
                <Button
                  onClick={handleCalendlyConnect}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Kết nối Calendly
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Stats - moved to top */}
        <SummaryStats records={records} />



        {/* Tracking Table */}
        <TrackingTable />
        
        {/* Add New Customer Table Button - Between tables */}
        <div className="flex justify-center py-4">
          <Button
            onClick={addNewCustomerTable}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Thêm Bảng Chi Tiết Khách Hàng Mới
          </Button>
        </div>
        
        {/* Customer Reports Tables */}
        {customerTables.map((table) => (
          <CustomerReportsTable key={table.id} tableId={table.id} initialDate={table.date} />
        ))}
      </div>
    </div>
  );
}
