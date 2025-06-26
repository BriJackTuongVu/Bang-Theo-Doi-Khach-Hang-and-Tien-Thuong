import { TrackingTable } from "@/components/tracking-table";
import { BonusTierIndicator } from "@/components/bonus-tier-indicator";
import { SummaryStats } from "@/components/summary-stats";
import { CustomerReportsTable } from "@/components/customer-reports-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { TrackingRecord } from "@shared/schema";
import { useState, useEffect } from "react";
import { Plus, Clock, CheckCircle, XCircle, Settings, Database } from "lucide-react";
import { getNextWorkingDay, getTodayDate, formatDateWithDay } from "@/lib/utils";

export default function TrackingPage() {
  const { data: records = [] } = useQuery<TrackingRecord[]>({
    queryKey: ['/api/tracking-records'],
  });

  // Remove customerTables state as we'll use tracking records directly
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);

  // Check Calendly connection status on load
  useEffect(() => {
    checkCalendlyConnection();
    
    // Add event listener for table deletion - just reload the page
    const handleTableDeleted = (event: CustomEvent) => {
      // Since tracking records are managed by the database, we just need to refresh
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };
    
    window.addEventListener('tableDeleted', handleTableDeleted as EventListener);
    
    return () => {
      window.removeEventListener('tableDeleted', handleTableDeleted as EventListener);
    };
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

  const handleSaveMemoryForever = async () => {
    if (confirm('Bạn có chắc chắn muốn lưu toàn bộ dữ liệu memory vĩnh viễn? Điều này sẽ đảm bảo không bao giờ mất dữ liệu.')) {
      try {
        await fetch('/api/settings/save-memory-forever', { method: 'POST' });
        
        const notification = document.createElement('div');
        notification.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        notification.innerHTML = `
          <div class="bg-purple-500 text-white px-8 py-6 rounded-lg shadow-lg max-w-md mx-4 text-center">
            <div class="flex items-center justify-center gap-3 mb-3">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <div class="text-xl font-medium">Thành công!</div>
            </div>
            <div class="text-sm opacity-90">Đã lưu memory vĩnh viễn - dữ liệu sẽ không bao giờ bị xóa</div>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 1000);
      } catch (error) {
        alert('Lỗi khi lưu memory');
      }
    }
  };

  const addNewCustomerTable = async () => {
    // Get the latest date from existing records and find next working day
    const latestDate = records.length > 0 
      ? records.reduce((latest, record) => record.date > latest ? record.date : latest, records[0].date)
      : getTodayDate();
    const nextWorkingDate = getNextWorkingDay(latestDate);
    
    // Auto-create tracking record for this date if it doesn't exist
    try {
      const response = await fetch('/api/tracking-records');
      const existingRecords = await response.json();
      const recordExists = existingRecords.some((record: any) => record.date === nextWorkingDate);
      
      if (!recordExists) {
        await fetch('/api/tracking-records', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: nextWorkingDate,
            scheduledCustomers: 0,
            reportedCustomers: 0,
            closedCustomers: 0,
            paymentStatus: 'chưa pay'
          })
        });
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.textContent = `Đã tạo dòng tracking cho ngày ${nextWorkingDate}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
        
        // Reload page to show new tracking record
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error creating tracking record:', error);
    }
  };

  // Remove auto-sync for now - it was causing infinite loops

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
              
              {/* Memory Save Button */}
              <Button
                onClick={handleSaveMemoryForever}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                <Database className="h-4 w-4 mr-1" />
                Lưu Memory Vĩnh Viễn
              </Button>
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
        
        {/* Add Customer Table Button */}
        <div className="flex justify-center">
          <Button
            onClick={addNewCustomerTable}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Thêm Bảng Chi Tiết Khách Hàng
          </Button>
        </div>
        
        {/* Customer Reports Tables - One for each tracking record (newest first) */}
        {records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record) => (
          <div key={record.id} className="space-y-4">
            <CustomerReportsTable 
              key={`customer-table-${record.id}`}
              tableId={record.id} 
              initialDate={record.date} 
            />
          </div>
        ))}
      </div>
      
      {/* Calendly Connection Modal */}
      {showCalendlyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Kết nối Calendly API</h3>
            </div>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <p className="font-medium mb-2">Để kết nối với Calendly, làm theo các bước sau:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Truy cập <a href="https://calendly.com/integrations/api_webhooks" target="_blank" className="text-blue-600 underline">Calendly API Settings</a></li>
                  <li>Đăng nhập vào tài khoản Calendly của bạn</li>
                  <li>Tại mục "Personal Access Tokens", nhấn "Create Token"</li>
                  <li>Copy token vừa tạo</li>
                  <li>Paste token vào ô bên dưới</li>
                </ol>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-yellow-800 font-medium">Lưu ý:</p>
                <p className="text-yellow-700 text-sm">Token sẽ được lưu an toàn và tự động sử dụng cho các lần import khách hàng</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calendly API Token:
              </label>
              <Input
                type="text" 
                id="calendly-token-input"
                placeholder="Paste token từ Calendly (bắt đầu bằng eyJ...)"
                className="w-full text-sm"
                style={{ fontFamily: 'monospace' }}
              />
              <p className="text-xs text-gray-500 mt-1">Token sẽ được lưu và tự động sử dụng</p>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                onClick={() => setShowCalendlyModal(false)}
                variant="outline"
                className="flex-1"
              >
                Hủy
              </Button>
              <a href="https://calendly.com/integrations/api_webhooks" target="_blank">
                <Button variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                  Lấy Token
                </Button>
              </a>
              <Button
                onClick={async () => {
                  const tokenInput = document.getElementById('calendly-token-input') as HTMLInputElement;
                  const token = tokenInput?.value?.trim();
                  
                  if (!token) {
                    alert('Vui lòng nhập Calendly API token');
                    return;
                  }
                  
                  if (!token.startsWith('eyJ')) {
                    alert('Token không hợp lệ. Token phải bắt đầu bằng "eyJ"');
                    return;
                  }
                  
                  try {
                    const response = await fetch('/api/calendly/save-token', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ token })
                    });
                    
                    if (response.ok) {
                      setShowCalendlyModal(false);
                      setCalendlyConnected(true);
                      
                      const notification = document.createElement('div');
                      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                      notification.textContent = 'Kết nối Calendly thành công!';
                      document.body.appendChild(notification);
                      setTimeout(() => notification.remove(), 3000);
                    } else {
                      alert('Lỗi khi lưu token. Vui lòng kiểm tra token và thử lại.');
                    }
                  } catch (error) {
                    alert('Lỗi khi kết nối. Vui lòng thử lại.');
                  }
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Lưu & Kết nối
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
