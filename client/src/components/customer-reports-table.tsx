import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CustomerReport, InsertCustomerReport } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, getTodayDate, getDayOfWeek, getNextWorkingDay, formatDateWithDay } from "@/lib/utils";
import { Plus, User, Send, Calendar, Trash2, Upload, Link, Image, Clock, Mail, Phone, RefreshCw } from "lucide-react";

interface CalendarEvent {
  name: string;
  startTime: string;
  endTime: string;
}

interface CustomerReportsTableProps {
  tableId?: number;
  initialDate?: string;
}

export function CustomerReportsTable({ tableId, initialDate }: CustomerReportsTableProps) {
  console.log('CustomerReportsTable received tableId:', tableId, 'initialDate:', initialDate);
  
  if (!tableId) {
    console.error('CustomerReportsTable: tableId is required but not provided');
    return <div>Error: tableId not provided</div>;
  }
  const queryClient = useQueryClient();

  const [editingCell, setEditingCell] = useState<{
    id: number;
    field: keyof InsertCustomerReport;
    value: string | boolean;
    originalValue: string | boolean;
  } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState("");
  const [pendingEdit, setPendingEdit] = useState<{id: number, field: string, value: any} | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate || getTodayDate());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [quickAddCount, setQuickAddCount] = useState(5);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isUpdatingCustomers, setIsUpdatingCustomers] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["/api/customer-reports", tableId],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomerReport) => {
      const response = await apiRequest("POST", "/api/customer-reports", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-reports"] });
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCustomerReport> }) => {
      const response = await apiRequest("PATCH", `/api/customer-reports/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-reports"] });
    },
    onError: (error) => {
      console.error("Error updating customer:", error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/customer-reports/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-reports"] });
    },
    onError: (error) => {
      console.error("Error deleting customer:", error);
    },
  });

  const handleAddCustomer = () => {
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setShowAddCustomerDialog(true);
  };

  const handleCreateCustomer = () => {
    if (!newCustomerName.trim()) {
      alert("Vui lòng nhập tên khách hàng");
      return;
    }

    createMutation.mutate({
      customerName: newCustomerName.trim(),
      customerEmail: newCustomerEmail.trim() || null,
      customerPhone: newCustomerPhone.trim() || null,
      reportSent: false,
      reportReceivedDate: null,
      customerDate: selectedDate,
      trackingRecordId: tableId,
    });

    setShowAddCustomerDialog(false);
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
  };



  const handleGoogleCalendarImport = () => {
    // Show instruction dialog for manual copy-paste from Google Calendar
    const notification = document.createElement('div');
    notification.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    notification.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <div class="flex items-center gap-2 mb-4">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900">Import từ Google Calendar</h3>
        </div>
        <div class="space-y-3 text-sm text-gray-700">
          <p><strong>Hướng dẫn:</strong></p>
          <ol class="list-decimal list-inside space-y-1">
            <li>Mở Google Calendar</li>
            <li>Chọn ngày ${selectedDate}</li>
            <li>Copy tên các sự kiện/khách hàng</li>
            <li>Paste vào ô "Import danh sách" bên dưới</li>
          </ol>
          <p class="text-blue-600 font-medium">Hoặc gõ trực tiếp danh sách tên khách hàng (mỗi tên một dòng)</p>
        </div>
        <div class="flex gap-2 mt-4">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                  class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
            Đóng
          </button>
          <button onclick="this.parentElement.parentElement.parentElement.remove(); document.querySelector('[data-import-button]').click()" 
                  class="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Mở Import Danh Sách
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto close after 10 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 10000);
  };

  const handleImageUpload = () => {
    // Show instruction for manual text extraction from image
    const notification = document.createElement('div');
    notification.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    notification.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <div class="flex items-center gap-2 mb-4">
          <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900">Upload Hình Ảnh</h3>
        </div>
        <div class="space-y-3 text-sm text-gray-700">
          <p><strong>Hướng dẫn:</strong></p>
          <ol class="list-decimal list-inside space-y-1">
            <li>Mở hình ảnh danh sách khách hàng</li>
            <li>Copy tất cả text trong hình (Ctrl+A, Ctrl+C)</li>
            <li>Paste vào ô "Import danh sách" bên dưới</li>
            <li>Hệ thống sẽ tự động tách tên khách hàng</li>
          </ol>
          <p class="text-purple-600 font-medium">
            Do giới hạn API, vui lòng sử dụng cách thủ công này. 
            Bạn có thể sử dụng Google Lens hoặc OCR app để chuyển hình thành text.
          </p>
        </div>
        <div class="flex gap-2 mt-4">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                  class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
            Đóng
          </button>
          <button onclick="this.parentElement.parentElement.parentElement.remove(); document.querySelector('[data-import-button]').click()" 
                  class="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Mở Import Danh Sách
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto close after 15 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 15000);
  };

  const handleCalendlyImport = async () => {
    try {
      // First check connection status
      const statusResponse = await fetch('/api/calendly/status');
      const statusResult = await statusResponse.json();
      
      if (!statusResult.connected) {
        // Show connection notification in center of page
        const notification = document.createElement('div');
        notification.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        notification.innerHTML = `
          <div class="bg-blue-500 text-white px-8 py-6 rounded-lg shadow-lg max-w-md mx-4 text-center">
            <div class="flex items-center justify-center gap-3 mb-3">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="text-xl font-medium">Chưa kết nối Calendly</div>
            </div>
            <div class="text-sm opacity-90">Vui lòng kết nối với Calendly trước khi cập nhật khách hàng</div>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 1000);
        return;
      }
      
      // Get events from Calendly for the selected date
      const response = await fetch(`/api/calendly/events?date=${selectedDate}`);
      const result = await response.json();
      
      // Check if this is an error response (no API token or other error)
      if (!response.ok || result.error) {
        console.error('Error importing from Calendly:', result);
        // Show setup instructions
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
          <div class="bg-white rounded-lg p-6 max-w-lg mx-4">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 class="text-lg font-semibold text-gray-900">Kết nối Calendly API</h3>
            </div>
            <div class="space-y-4 text-sm text-gray-700">
              <div>
                <p class="font-medium mb-2">Để kết nối với Calendly, làm theo các bước sau:</p>
                <ol class="list-decimal list-inside space-y-2">
                  <li>Truy cập <a href="https://calendly.com/integrations/api_webhooks" target="_blank" class="text-blue-600 underline">Calendly API Settings</a></li>
                  <li>Đăng nhập vào tài khoản Calendly của bạn</li>
                  <li>Tại mục "Personal Access Tokens", nhấn "Create Token"</li>
                  <li>Copy token vừa tạo</li>
                  <li>Quay lại đây và cung cấp token trong Secrets</li>
                </ol>
              </div>
              <div class="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p class="text-yellow-800 font-medium">Lưu ý:</p>
                <p class="text-yellow-700 text-sm">Token này cho phép truy cập vào lịch hẹn của bạn để tự động import tên khách hàng</p>
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Calendly API Token:
              </label>
              <input type="text" id="calendly-token-input" 
                     placeholder="Paste token từ Calendly (bắt đầu bằng eyJ...)"
                     class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                     style="font-family: monospace;">
              <p class="text-xs text-gray-500 mt-1">Token sẽ được lưu an toàn và chỉ dùng để import khách hàng</p>
            </div>
            <div class="flex gap-2 mt-6">
              <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                      class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
                Hủy
              </button>
              <a href="https://calendly.com/integrations/api_webhooks" target="_blank"
                 class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-center text-sm">
                Lấy Token
              </a>
              <button onclick="window.saveCalendlyToken()" 
                      class="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
                Lưu & Kết nối
              </button>
            </div>
          </div>
        `;
        
        // Add global function to save token
        (window as any).saveCalendlyToken = async () => {
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
            // Save token to server
            const response = await fetch('/api/calendly/save-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
            });
            
            if (response.ok) {
              // Close modal
              modal.remove();
              
              // Show success and retry import
              const successNotification = document.createElement('div');
              successNotification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
              successNotification.textContent = 'Token đã được lưu! Đang thử kết nối...';
              document.body.appendChild(successNotification);
              setTimeout(() => successNotification.remove(), 2000);
              
              // Retry import after short delay
              setTimeout(() => {
                handleCalendlyImport();
              }, 1000);
            } else {
              alert('Lỗi khi lưu token. Vui lòng thử lại.');
            }
          } catch (error) {
            alert('Lỗi khi lưu token. Vui lòng thử lại.');
          }
        };
        
        document.body.appendChild(modal);
        return;
      }

      console.log('Calendly API response:', result);
      
      const events = result.events || [];
      console.log('Found events:', events);
      
      if (events.length === 0) {
        // Show notification that no events were found for the selected date
        const notification = document.createElement('div');
        notification.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
        notification.innerHTML = `
          <div class="bg-orange-500 text-white px-8 py-6 rounded-lg shadow-lg max-w-md mx-4 text-center">
            <div class="flex items-center justify-center gap-3 mb-3">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="text-xl font-medium">Không có lịch hẹn</div>
            </div>
            <div class="text-sm opacity-90">Không tìm thấy lịch hẹn nào cho ngày ${selectedDate}</div>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 1000);
        return;
      }

      // Process events if found
      let addedCount = 0;
      
      for (const event of events) {
        if (event.invitee_name && event.invitee_name.trim() !== '' && event.invitee_name !== 'Unknown') {
          // Check if customer already exists
          const existingReports = reports as CustomerReport[];
          const exists = existingReports.some(report => 
            report.customerName.toLowerCase().trim() === event.invitee_name.toLowerCase().trim() &&
            report.customerDate === selectedDate
          );
          
          if (!exists) {
            console.log('Creating customer with tableId:', tableId);
            await createMutation.mutateAsync({
              customerName: event.invitee_name.trim(),
              customerEmail: event.invitee_email || null,
              customerPhone: event.invitee_phone || null,
              reportSent: false,
              reportReceivedDate: null,
              customerDate: selectedDate,
              trackingRecordId: tableId,
            });
            addedCount++;
          }
        }
      }
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
      notification.innerHTML = `
        <div class="bg-green-500 text-white px-8 py-6 rounded-lg shadow-lg max-w-md mx-4 text-center">
          <div class="flex items-center justify-center gap-3 mb-3">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div class="text-xl font-medium">Thành công!</div>
          </div>
          <div class="text-sm opacity-90">Đã thêm ${addedCount} khách hàng từ Calendly</div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 1000);

    } catch (error) {
      console.error('Error importing from Calendly:', error);
      const notification = document.createElement('div');
      notification.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
      notification.innerHTML = `
        <div class="bg-red-500 text-white px-8 py-6 rounded-lg shadow-lg max-w-md mx-4 text-center">
          <div class="flex items-center justify-center gap-3 mb-3">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div class="text-xl font-medium">Lỗi kết nối</div>
          </div>
          <div class="text-sm opacity-90">Lỗi khi kết nối với Calendly</div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 1000);
    }
  };

  const handleImportFromCalendar = () => {
    if (!importText.trim()) return;
    
    // Parse names from various formats
    let names: string[] = [];
    
    // Method 1: Split by lines first
    const lines = importText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
      // Method 2: Handle comma-separated names in a line
      if (line.includes(',')) {
        const commaSeparated = line.split(',').map(name => name.trim()).filter(name => name.length > 0);
        names.push(...commaSeparated);
      }
      // Method 3: Handle "and" separated names  
      else if (line.includes(' and ')) {
        const andSeparated = line.split(' and ').map(name => name.trim()).filter(name => name.length > 0);
        names.push(...andSeparated);
      }
      // Method 4: Single name per line
      else {
        names.push(line);
      }
    }
    
    // Clean up names - remove common suffixes and time stamps
    names = names.map(name => {
      return name
        .replace(/\s+and\s+Tuong.*$/i, '')
        .replace(/\s*-.*$/, '') // Remove anything after dash
        .replace(/\s*\(.*\)/, '') // Remove anything in parentheses
        .replace(/^\d{1,2}:\d{2}\s*(AM|PM)?\s*-?\s*/i, '') // Remove time stamps like "2:00 PM - "
        .trim();
    }).filter(name => name.length > 0);

    // Remove duplicates
    names = [...new Set(names)];

    // Create customer reports for each name
    names.forEach(name => {
      createMutation.mutate({
        customerName: name,
        reportSent: false,
        reportReceivedDate: null,
        customerDate: selectedDate,
        trackingRecordId: tableId,
      });
    });

    setImportText("");
    setShowImportDialog(false);
  };

  const handleQuickAdd = () => {
    for (let i = 1; i <= quickAddCount; i++) {
      createMutation.mutate({
        customerName: `Khách hàng ${i}`,
        reportSent: false,
        reportReceivedDate: null,
        customerDate: selectedDate,
        trackingRecordId: tableId,
      });
    }
    setShowImportDialog(false);
  };

  const startAutoDetect = async () => {
    setIsAutoDetecting(true);
    
    try {
      // Try to read from clipboard
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && clipboardText.trim()) {
        setImportText(clipboardText);
        // Auto-detect if it looks like calendar data
        if (clipboardText.includes('PM') || clipboardText.includes('AM') || clipboardText.includes('and Tuong')) {
          // Automatically process the import
          setTimeout(() => {
            handleImportFromCalendar();
          }, 1000);
        }
      }
    } catch (error) {
      // Fallback: show instruction for manual paste
      alert('Vui lòng copy nội dung từ Google Calendar, sau đó paste vào ô bên dưới');
    }
    
    setIsAutoDetecting(false);
  };

  const handleStartEdit = (
    id: number,
    field: keyof InsertCustomerReport,
    currentValue: string | boolean
  ) => {
    // Yêu cầu PIN cho việc xóa
    if (field === 'delete') {
      setPendingEdit({ id, field: field as string, value: currentValue });
      setShowPinDialog(true);
      setPin("");
    } else {
      setEditingCell({
        id,
        field,
        value: currentValue,
        originalValue: currentValue,
      });
    }
  };

  const handlePinConfirm = () => {
    if (pin === "1995" && pendingEdit) {
      if (pendingEdit.field === 'delete') {
        setPendingDelete(pendingEdit.id);
        setShowConfirmDialog(true);
      }
      setShowPinDialog(false);
      setPendingEdit(null);
      setPin("");
    } else {
      alert("Mã PIN không chính xác!");
      setPin("");
    }
  };

  const handlePinCancel = () => {
    setShowPinDialog(false);
    setPendingEdit(null);
    setPin("");
  };

  const handleDelete = (id: number) => {
    setPendingEdit({ id, field: 'delete', value: id });
    setShowPinDialog(true);
    setPin("");
  };

  const handleConfirmEdit = () => {
    if (editingCell) {
      updateMutation.mutate({
        id: editingCell.id,
        data: { [editingCell.field]: editingCell.value },
      });
      setEditingCell(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const handleInputChange = (value: string | boolean) => {
    if (editingCell) {
      setEditingCell({
        ...editingCell,
        value,
      });
    }
  };

  const confirmDelete = () => {
    if (pendingDelete) {
      deleteMutation.mutate(pendingDelete);
      setPendingDelete(null);
    }
    setShowConfirmDialog(false);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
    setShowConfirmDialog(false);
  };

  const handleManualUpdate = async () => {
    setIsUpdatingCustomers(true);
    
    try {
      // Call the scheduler function specifically for this date
      const response = await apiRequest("POST", "/api/manual-update-customers", {
        date: selectedDate,
        trackingRecordId: tableId
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Show success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
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
        `;
        notification.textContent = `✓ Đã cập nhật thành công từ Calendly: ${result.importedCount || 0} khách hàng`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 3000);

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/customer-reports"] });
        queryClient.invalidateQueries({ queryKey: ["/api/tracking-records"] });
      } else {
        throw new Error(result.error || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error updating customers:', error);
      
      // Show error notification
      const errorNotification = document.createElement('div');
      errorNotification.style.cssText = `
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
      `;
      errorNotification.textContent = `❌ Lỗi khi cập nhật: ${error instanceof Error ? error.message : 'Unknown error'}`;
      document.body.appendChild(errorNotification);
      
      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          document.body.removeChild(errorNotification);
        }
      }, 3000);
    } finally {
      setIsUpdatingCustomers(false);
    }
  };

  const handleDeleteTable = async () => {
    // Ask for PIN confirmation
    const pin = prompt('Nhập PIN để xác nhận xóa toàn bộ bảng (không thể hoàn tác):');
    
    if (pin !== '1995') {
      alert('PIN không đúng');
      return;
    }

    // Get all customer reports for this date
    const allReports = Array.isArray(reports) ? reports : [];
    const reportsForThisDate = allReports.filter((r: CustomerReport) => r.customerDate === selectedDate);
    
    const confirmDelete = confirm(`Bạn có chắc chắn muốn xóa toàn bộ bảng cho ngày ${selectedDate}?\n\nThao tác này sẽ xóa tất cả ${reportsForThisDate.length} khách hàng và không thể hoàn tác.`);
    
    if (!confirmDelete) {
      return;
    }

    try {
      // Delete all customer reports for this date first
      const deletePromises = reportsForThisDate.map(async (report) => {
        const response = await fetch(`/api/customer-reports/${report.id}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          throw new Error(`Failed to delete customer report ${report.id}`);
        }
        return response;
      });

      await Promise.all(deletePromises);
      console.log(`Deleted ${reportsForThisDate.length} customer reports`);

      // Then delete the corresponding tracking record
      const trackingResponse = await fetch('/api/tracking-records');
      if (trackingResponse.ok) {
        const trackingRecords = await trackingResponse.json();
        const trackingRecord = trackingRecords.find((r: any) => r.date === selectedDate);
        
        if (trackingRecord) {
          const deleteTrackingResponse = await fetch(`/api/tracking-records/${trackingRecord.id}`, {
            method: 'DELETE'
          });
          
          if (deleteTrackingResponse.ok) {
            console.log(`Deleted tracking record ${trackingRecord.id}`);
          } else {
            console.error('Failed to delete tracking record, but continuing...');
          }
        }
      }

      // Show success notification
      const notification = document.createElement('div');
      notification.style.cssText = `
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
      `;
      notification.textContent = `✓ Đã xóa thành công bảng ngày ${selectedDate} với ${reportsForThisDate.length} khách hàng`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 1000);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/customer-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tracking-records'] });

      // Notify parent component 
      window.dispatchEvent(new CustomEvent('tableDeleted', { 
        detail: { date: selectedDate, tableId } 
      }));

      // Reload page after a short delay to ensure everything refreshes
      setTimeout(() => {
        window.location.reload();
      }, 1200);

    } catch (error) {
      console.error('Error deleting table:', error);
      
      // Show error notification
      const errorNotification = document.createElement('div');
      errorNotification.style.cssText = `
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
      `;
      errorNotification.textContent = `❌ Lỗi khi xóa bảng: ${error instanceof Error ? error.message : 'Unknown error'}`;
      document.body.appendChild(errorNotification);
      
      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          document.body.removeChild(errorNotification);
        }
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Chi Tiết Khách Hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="py-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="text-xs">Chi Tiết Khách Hàng - {formatDateWithDay(selectedDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-32 h-6 text-xs cursor-not-allowed"
                disabled
              />
            </div>

            <Button
              onClick={handleManualUpdate}
              variant="outline"
              size="sm"
              disabled={isUpdatingCustomers}
              className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500 p-0.5 min-w-0 h-6 w-6"
            >
              {isUpdatingCustomers ? (
                <div className="animate-spin h-2 w-2 border border-white border-t-transparent rounded-full" />
              ) : (
                <RefreshCw className="h-2 w-2" />
              )}
            </Button>

            <Button
              onClick={handleDeleteTable}
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white p-0.5 min-w-0 h-6 w-6"
            >
              <Trash2 className="h-2 w-2" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-facebook-blue">
              <tr>
                <th className="px-3 py-0.5 text-left text-2xs font-medium text-gray-600 uppercase tracking-wider">
                  STT
                </th>
                <th className="px-3 py-0.5 text-left text-2xs font-medium text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Tên Khách Hàng
                  </div>
                </th>
                <th className="px-3 py-0.5 text-left text-2xs font-medium text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </div>
                </th>
                <th className="px-3 py-0.5 text-left text-2xs font-medium text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Phone
                  </div>
                </th>
                <th className="px-3 py-0.5 text-left text-2xs font-medium text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Đã Gửi Report
                  </div>
                </th>
                <th className="px-3 py-0.5 text-left text-2xs font-medium text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Ngày Nhận Report
                  </div>
                </th>
                <th className="px-3 py-0.5 text-left text-2xs font-medium text-gray-600 uppercase tracking-wider">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(reports as CustomerReport[]).filter((report: CustomerReport) => 
                report.customerDate === selectedDate && 
                (report.trackingRecordId === tableId || (!report.trackingRecordId && tableId === 1))
              ).sort((a, b) => a.id - b.id).map((report: CustomerReport, index: number) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-1 whitespace-nowrap text-center font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    {editingCell?.id === report.id && editingCell.field === "customerName" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingCell.value as string}
                          onChange={(e) => handleInputChange(e.target.value)}
                          className="w-48"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={handleConfirmEdit}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                        onClick={() => handleStartEdit(report.id, "customerName", report.customerName)}
                      >
                        {report.customerName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    {editingCell?.id === report.id && editingCell.field === "customerEmail" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingCell.value as string}
                          onChange={(e) => handleInputChange(e.target.value)}
                          className="w-48"
                          autoFocus
                          placeholder="email@example.com"
                        />
                        <Button
                          size="sm"
                          onClick={handleConfirmEdit}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="text-sm text-gray-900 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                        onClick={() => handleStartEdit(report.id, "customerEmail", report.customerEmail || "")}
                      >
                        {report.customerEmail || "Chưa có email"}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    {editingCell?.id === report.id && editingCell.field === "customerPhone" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingCell.value as string}
                          onChange={(e) => handleInputChange(e.target.value)}
                          className="w-48"
                          autoFocus
                          placeholder="0912345678"
                        />
                        <Button
                          size="sm"
                          onClick={handleConfirmEdit}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="text-xs text-gray-600 cursor-pointer hover:text-gray-800"
                        onClick={() => handleStartEdit(report.id, "customerPhone", report.customerPhone || "")}
                        title="Click để nhập số điện thoại"
                      >
                        {report.customerPhone || "Chưa nhập"}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    <div className="flex items-center">
                      <Checkbox
                        checked={report.reportSent}
                        onCheckedChange={(checked) => {
                          updateMutation.mutate({
                            id: report.id,
                            data: { reportSent: !!checked },
                          });
                        }}
                      />
                      <span className="ml-2 text-sm text-gray-900">
                        {report.reportSent ? "Đã gửi" : "Chưa gửi"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    {editingCell?.id === report.id && editingCell.field === "reportReceivedDate" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={editingCell.value as string || ""}
                          onChange={(e) => handleInputChange(e.target.value)}
                          className="w-40"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={handleConfirmEdit}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className="text-sm text-gray-900 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded flex-1"
                          onClick={() => handleStartEdit(report.id, "reportReceivedDate", report.reportReceivedDate || "")}
                        >
                          {report.reportReceivedDate ? formatDate(report.reportReceivedDate) : "Chưa nhận"}
                        </div>
                        {report.reportReceivedDate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-red-100 text-red-600"
                            onClick={() => {
                              updateMutation.mutate({
                                id: report.id,
                                data: { reportReceivedDate: null },
                              });
                            }}
                            title="Xóa ngày nhận report"
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    <Trash2 
                      className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" 
                      onClick={() => handleDelete(report.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Hidden: Customer management buttons per user request */}
        <div className="flex gap-2 mt-4" style={{ display: 'none' }}>
          <Button
            onClick={handleAddCustomer}
            disabled={createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm Khách Hàng
          </Button>
          <Button
            onClick={handleCalendlyImport}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Clock className="h-4 w-4 mr-2" />
            Cập Nhật Khách Hàng
          </Button>
        </div>

        {/* Confirmation Dialog for Delete */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc chắn muốn xóa khách hàng này?
                Hành động này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>
                Hủy bỏ
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* PIN Confirmation Dialog */}
        <AlertDialog open={showPinDialog} onOpenChange={setShowPinDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xác nhận quyền xóa</AlertDialogTitle>
              <AlertDialogDescription>
                Nhập mã PIN để xóa khách hàng:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                type="password"
                placeholder="Nhập mã PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePinConfirm();
                  }
                }}
                className="text-center text-lg tracking-widest"
                maxLength={4}
                autoFocus
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handlePinCancel}>
                Hủy bỏ
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePinConfirm}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Xác nhận
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Import Khách Hàng</DialogTitle>
              <DialogDescription>
                Chọn cách thêm khách hàng:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Auto Import Section */}
              <div className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Tự động từ Google Calendar
                </h4>
                <div className="space-y-3">
                  <div className="space-y-3">
                    <div className="text-center">
                      <Button 
                        onClick={startAutoDetect}
                        disabled={isAutoDetecting}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg"
                        size="lg"
                      >
                        {isAutoDetecting ? 'Đang phát hiện...' : '🔍 Tự động phát hiện từ Clipboard'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        Copy từ Google Calendar trước, sau đó click nút này
                      </p>
                    </div>
                    
                    <div className="text-center text-gray-400">
                      <span>hoặc</span>
                    </div>
                    
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      <strong>Hướng dẫn thủ công:</strong>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li>Mở Google Calendar của ngày {formatDate(selectedDate)}</li>
                        <li>Bôi chọn tất cả appointments (Ctrl+A hoặc drag chuột)</li>
                        <li>Copy (Ctrl+C)</li>
                        <li>Paste vào ô bên dưới (Ctrl+V)</li>
                        <li>Click "Tự động import" để thêm tất cả khách hàng</li>
                      </ol>
                    </div>
                  </div>
                  
                  <Textarea
                    placeholder="Paste nội dung từ Google Calendar vào đây...&#10;&#10;Ví dụ:&#10;2:00 PM - Nguyen Van A and Tuong&#10;3:00 PM - Tran Thi B and Tuong&#10;4:00 PM - Le Van C and Tuong"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    rows={4}
                    className="font-mono text-sm"
                  />
                  
                  {importText.trim() && (
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <p className="text-sm text-green-700 font-medium">
                        Phát hiện {Array.from(new Set(
                          importText.split(/[\n,]|and/)
                            .map(name => name.replace(/\s+and\s+Tuong.*$/i, '').replace(/\s*-.*$/, '').replace(/\s*\(.*\)/, '').replace(/^\d{1,2}:\d{2}\s*(AM|PM)?\s*-?\s*/i, '').trim())
                            .filter(name => name.length > 0)
                        )).length} khách hàng:
                      </p>
                      <div className="mt-2 text-xs text-green-600 max-h-20 overflow-y-auto">
                        {Array.from(new Set(
                          importText.split(/[\n,]|and/)
                            .map(name => name.replace(/\s+and\s+Tuong.*$/i, '').replace(/\s*-.*$/, '').replace(/\s*\(.*\)/, '').replace(/^\d{1,2}:\d{2}\s*(AM|PM)?\s*-?\s*/i, '').trim())
                            .filter(name => name.length > 0)
                        )).map((name, idx) => (
                          <span key={idx} className="inline-block bg-white px-2 py-1 rounded mr-1 mb-1">
                            {name}
                          </span>
                        ))}
                      </div>
                      <Button 
                        onClick={handleImportFromCalendar}
                        className="w-full mt-2 bg-green-600 hover:bg-green-700"
                      >
                        Tự động import {Array.from(new Set(
                          importText.split(/[\n,]|and/)
                            .map(name => name.replace(/\s+and\s+Tuong.*$/i, '').replace(/\s*-.*$/, '').replace(/\s*\(.*\)/, '').replace(/^\d{1,2}:\d{2}\s*(AM|PM)?\s*-?\s*/i, '').trim())
                            .filter(name => name.length > 0)
                        )).length} khách hàng
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Add Section */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Thêm nhanh nhiều khách hàng
                </h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Nhập số lượng khách hàng cần tạo:</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Số lượng"
                      min="1"
                      max="20"
                      className="w-24"
                      value={quickAddCount}
                      onChange={(e) => setQuickAddCount(parseInt(e.target.value) || 1)}
                    />
                    <Button 
                      onClick={handleQuickAdd}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Tạo {quickAddCount} khách hàng
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Sẽ tạo khách hàng với tên "Khách hàng 1", "Khách hàng 2", v.v.</p>
                </div>
              </div>


            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setImportText("");
                setShowImportDialog(false);
              }}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Customer Dialog */}
        <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Thêm Khách Hàng Mới
              </DialogTitle>
              <DialogDescription>
                Nhập thông tin khách hàng cho ngày {formatDate(selectedDate)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Tên khách hàng *
                </label>
                <Input
                  placeholder="Nhập tên khách hàng"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <Input
                  placeholder="email@example.com"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Số điện thoại
                </label>
                <Input
                  placeholder="0912345678"
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowAddCustomerDialog(false)}
              >
                Hủy
              </Button>
              <Button 
                onClick={handleCreateCustomer}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newCustomerName.trim()}
              >
                Thêm khách hàng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}