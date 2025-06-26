import { TrackingTable } from "@/components/tracking-table";
import { SummaryStats } from "@/components/summary-stats";
import { CustomerReportsTable } from "@/components/customer-reports-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { TrackingRecord, BONUS_TIERS } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Plus, Clock, CheckCircle, XCircle, Settings, Database, CreditCard } from "lucide-react";
import { getNextWorkingDay, getTodayDate, formatDateWithDay, formatDate } from "@/lib/utils";

export default function TrackingPage() {
  const { data: records = [] } = useQuery<TrackingRecord[]>({
    queryKey: ['/api/tracking-records'],
  });

  // Remove customerTables state as we'll use tracking records directly
  const [calendlyConnected, setCalendlyConnected] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [dataRetentionEnabled, setDataRetentionEnabled] = useState(false);
  const [showCalendlyModal, setShowCalendlyModal] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState('2025-06-25');
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [selectedAddTableDate, setSelectedAddTableDate] = useState(getTodayDate());
  const [testLoading, setTestLoading] = useState(false);

  const checkInitialStates = async () => {
    // Check Stripe status (assume enabled if STRIPE_SECRET_KEY exists)
    setStripeEnabled(true); // Since we have live Stripe keys
    
    // Check data retention setting from database
    try {
      const response = await fetch('/api/settings/data-retention');
      const result = await response.json();
      setDataRetentionEnabled(result.enabled || false);
    } catch (error) {
      setDataRetentionEnabled(false);
    }
  };

  // Check Calendly connection status on load
  useEffect(() => {
    checkCalendlyConnection();
    checkInitialStates();
    
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

  const validatePIN = (): boolean => {
    const pin = prompt('Nhập mã PIN để kích hoạt:');
    return pin === '1995';
  };

  const handleToggleCalendly = async () => {
    if (!calendlyConnected) {
      // Chuyển từ OFF sang ON - không cần mã PIN
      setShowCalendlyModal(true);
    } else {
      // Chuyển từ ON sang OFF - yêu cầu mã PIN
      if (!validatePIN()) {
        alert('Mã PIN không đúng!');
        return;
      }
      if (confirm('Bạn có chắc chắn muốn ngắt kết nối Calendly?')) {
        try {
          await fetch('/api/calendly/disconnect', { method: 'POST' });
          setCalendlyConnected(false);
        } catch (error) {
          console.error('Error disconnecting Calendly:', error);
        }
      }
    }
  };

  const handleToggleStripe = () => {
    if (stripeEnabled) {
      // Chuyển từ ON sang OFF - yêu cầu mã PIN
      if (!validatePIN()) {
        alert('Mã PIN không đúng!');
        return;
      }
    }
    // Chuyển từ OFF sang ON - không cần mã PIN
    setStripeEnabled(!stripeEnabled);
  };

  const handleToggleDataRetention = async () => {
    if (dataRetentionEnabled) {
      // Chuyển từ ON sang OFF - yêu cầu mã PIN
      if (!validatePIN()) {
        alert('Mã PIN không đúng!');
        return;
      }
    }
    // Chuyển từ OFF sang ON - không cần mã PIN
    
    try {
      const response = await fetch('/api/settings/data-retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !dataRetentionEnabled })
      });
      
      if (response.ok) {
        setDataRetentionEnabled(!dataRetentionEnabled);
      }
    } catch (error) {
      console.error('Error updating data retention setting:', error);
    }
  };

  const checkStripePayments = async (date: string) => {
    setStripeLoading(true);
    try {
      const response = await fetch('/api/stripe/check-first-time-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-8 py-4 rounded-lg shadow-lg z-50 text-center';
        notification.innerHTML = `
          <div class="font-semibold mb-2">${result.message}</div>
          <div class="text-sm">${result.firstTimePaymentCount} khách hàng thanh toán lần đầu</div>
          ${result.trackingRecordUpdated ? '<div class="text-xs mt-1">Đã cập nhật cột TƯƠNG ONLY</div>' : ''}
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
        
        // Refresh page to see updated data
        setTimeout(() => window.location.reload(), 2000);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      const notification = document.createElement('div');
      notification.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white px-8 py-4 rounded-lg shadow-lg z-50 text-center';
      notification.textContent = `Lỗi: ${error.message}`;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } finally {
      setStripeLoading(false);
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
    setShowAddTableModal(true);
  };

  const handleConfirmAddTable = async () => {
    // Immediately close modal and show processing state
    setShowAddTableModal(false);
    
    // Show instant processing feedback
    const processingNotification = document.createElement('div');
    processingNotification.id = 'processing-notification';
    processingNotification.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #3B82F6;
        color: white;
        padding: 16px 32px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        text-align: center;
      ">
        ⏳ Đang tạo bảng cho ngày ${selectedAddTableDate}...
        <div style="
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          margin-top: 12px;
          overflow: hidden;
        ">
          <div style="
            height: 100%;
            background: linear-gradient(90deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FECA57, #FF9FF3, #54A0FF);
            background-size: 200% 100%;
            border-radius: 2px;
            animation: colorWave 2s ease-in-out infinite, widthPulse 1.5s ease-in-out infinite;
          "></div>
        </div>
      </div>
      <style>
        @keyframes colorWave {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes widthPulse {
          0% { width: 20%; }
          25% { width: 60%; }
          50% { width: 90%; }
          75% { width: 40%; }
          100% { width: 20%; }
        }
      </style>
    `;
    document.body.appendChild(processingNotification);

    // Check if table already exists for this date
    const existingTable = records?.find(record => record.date === selectedAddTableDate);
    if (existingTable) {
      // Remove processing notification
      if (document.body.contains(processingNotification)) {
        document.body.removeChild(processingNotification);
      }
      
      // Show error notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #EF4444;
          color: white;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          z-index: 9999;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        ">
          ⚠ Bảng cho ngày ${selectedAddTableDate} đã tồn tại
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
      return;
    }

    try {
      // First check if a tracking record already exists for this date
      const existingRecordsResponse = await fetch('/api/tracking-records');
      const existingRecords = await existingRecordsResponse.json();
      const existingRecord = existingRecords.find((r: any) => r.date === selectedAddTableDate);
      
      if (existingRecord) {
        // Show warning notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #F59E0B;
            color: white;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          ">
            ⚠️ Đã có bảng cho ngày ${selectedAddTableDate}! Mỗi ngày chỉ được tạo 1 bảng duy nhất.
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 2000);
        setShowAddTableModal(false);
        return;
      }

      // Create the tracking record if it doesn't exist
      const createResponse = await fetch('/api/tracking-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedAddTableDate,
          scheduledCustomers: 0,
          reportedCustomers: 0,
          closedCustomers: 0,
          paymentStatus: 'chưa pay'
        })
      });

      if (createResponse.status === 409) {
        // Backend detected duplicate - show warning
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #F59E0B;
            color: white;
            padding: 16px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          ">
            ⚠️ Đã có bảng cho ngày ${selectedAddTableDate}! Mỗi ngày chỉ được tạo 1 bảng duy nhất.
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 2000);
        setShowAddTableModal(false);
        return;
      }

      if (!createResponse.ok) {
        throw new Error('Failed to create tracking record');
      }

      // Then automatically check Stripe payments for this date
      await fetch('/api/stripe/check-first-time-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedAddTableDate
        })
      });

      // Auto-import customers from Calendly for this date
      try {
        const calendlyStatusResponse = await fetch('/api/calendly/status');
        const calendlyStatus = await calendlyStatusResponse.json();
        
        if (calendlyStatus.connected) {
          // Get Calendly events for this date
          const calendlyResponse = await fetch(`/api/calendly/events?date=${selectedAddTableDate}`);
          const calendlyResult = await calendlyResponse.json();
          
          if (calendlyResponse.ok && calendlyResult.events && calendlyResult.events.length > 0) {
            // Get the newly created tracking record ID
            const newRecordsResponse = await fetch('/api/tracking-records');
            const newRecords = await newRecordsResponse.json();
            const newRecord = newRecords.find((r: any) => r.date === selectedAddTableDate);
            
            if (newRecord) {
              // Create customer reports for each Calendly event
              let importedCount = 0;
              for (const event of calendlyResult.events) {
                if (event.invitee_name && event.invitee_name.trim() !== '' && event.invitee_name !== 'Unknown') {
                  await fetch('/api/customer-reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      customerName: event.invitee_name.trim(),
                      customerEmail: event.invitee_email || null,
                      customerPhone: event.invitee_phone || null,
                      reportSent: false,
                      reportReceivedDate: null,
                      customerDate: selectedAddTableDate,
                      trackingRecordId: newRecord.id,
                    })
                  });
                  importedCount++;
                }
              }
              
              if (importedCount > 0) {
                console.log(`Auto-imported ${importedCount} customers from Calendly for ${selectedAddTableDate}`);
              }
            }
          }
        }
      } catch (calendlyError) {
        console.log('Calendly auto-import failed, continuing without it:', calendlyError);
      }
      
      // Remove processing notification immediately
      if (document.body.contains(processingNotification)) {
        document.body.removeChild(processingNotification);
      }
      
      // Show success notification in center of screen for 1 second
      const notification = document.createElement('div');
      let successMessage = `✓ Đã tạo bảng cho ngày ${selectedAddTableDate}`;
      
      // Check if we imported customers from Calendly
      try {
        const calendlyStatusResponse = await fetch('/api/calendly/status');
        const calendlyStatus = await calendlyStatusResponse.json();
        
        if (calendlyStatus.connected) {
          const calendlyResponse = await fetch(`/api/calendly/events?date=${selectedAddTableDate}`);
          const calendlyResult = await calendlyResponse.json();
          
          if (calendlyResponse.ok && calendlyResult.events && calendlyResult.events.length > 0) {
            const validEvents = calendlyResult.events.filter((event: any) => 
              event.invitee_name && event.invitee_name.trim() !== '' && event.invitee_name !== 'Unknown'
            );
            if (validEvents.length > 0) {
              successMessage += ` và tự động import ${validEvents.length} khách hàng từ Calendly`;
            }
          }
        }
      } catch (e) {
        // Keep original message if Calendly check fails
      }
      
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #10B981;
          color: white;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          z-index: 9999;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        ">
          ${successMessage}
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 1000);
      
      setShowAddTableModal(false);
      
      // Reload page to show new tracking record
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error) {
      console.error('Error creating tracking record:', error);
      
      // Remove processing notification on error
      if (document.body.contains(processingNotification)) {
        document.body.removeChild(processingNotification);
      }
      
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #EF4444;
          color: white;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          z-index: 9999;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        ">
          ✗ Lỗi khi tạo bảng
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 1000);
    }
  };

  // Remove auto-sync for now - it was causing infinite loops

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bảng Theo Dõi Khách Hàng & Tiền Thưởng
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Quản lý số lượng khách hàng và tính toán tiền thưởng hàng ngày
                </p>
              </div>
              
              {/* Compact Bonus Tier Indicator */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-3 py-2">
                <div className="text-xs font-medium text-gray-700 mb-1">Thang điểm tiền thưởng:</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-xs text-gray-600">≥30%: {formatCurrency(BONUS_TIERS.TIER_1.rate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span className="text-xs text-gray-600">≥50%: {formatCurrency(BONUS_TIERS.TIER_2.rate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-gray-600">≥70%: {formatCurrency(BONUS_TIERS.TIER_3.rate)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Toggle Switches - Vertical Layout */}
            <div className="flex flex-col gap-2">
              {/* Calendly Toggle */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-medium text-gray-700">Calendly:</span>
                <button
                  onClick={handleToggleCalendly}
                  className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                    calendlyConnected ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                      calendlyConnected ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Stripe Toggle */}
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-gray-700">Stripe:</span>
                <button
                  onClick={handleToggleStripe}
                  className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                    stripeEnabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                      stripeEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Data Retention Toggle */}
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-gray-700">Lưu dữ liệu vĩnh viễn:</span>
                <button
                  onClick={handleToggleDataRetention}
                  className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                    dataRetentionEnabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                      dataRetentionEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              
              {/* Hidden: Stripe Payment Check Section per user request */}
              <div className="flex items-center gap-2" style={{ display: 'none' }}>
                <Input
                  type="date"
                  value={selectedPaymentDate}
                  onChange={(e) => setSelectedPaymentDate(e.target.value)}
                  className="w-36 h-8 text-sm"
                />
                <Button
                  onClick={() => checkStripePayments(selectedPaymentDate)}
                  disabled={stripeLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  {stripeLoading ? 'Đang kiểm tra...' : 'Kiểm tra Pay'}
                </Button>
              </div>
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
        
        {/* Hidden: Add Customer Table Button per user request */}
        <div className="flex justify-center" style={{ display: 'none' }}>
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

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thêm Bảng Chi Tiết Khách Hàng
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn ngày:
              </label>
              <Input
                type="date"
                value={selectedAddTableDate}
                onChange={(e) => setSelectedAddTableDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddTableModal(false)}
                variant="outline"
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={handleConfirmAddTable}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Tạo Bảng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
