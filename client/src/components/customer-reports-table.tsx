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
import { formatDate, getTodayDate, getDayOfWeek, getNextWorkingDay } from "@/lib/utils";
import { Plus, User, Send, Calendar, Trash2, Upload, Link, Image } from "lucide-react";

interface CalendarEvent {
  name: string;
  startTime: string;
  endTime: string;
}

interface CustomerReportsTableProps {
  tableId?: number;
  initialDate?: string;
}

export function CustomerReportsTable({ tableId = 1, initialDate }: CustomerReportsTableProps) {
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
    createMutation.mutate({
      customerName: `Khách hàng mới - Bảng ${tableId}`,
      reportSent: false,
      reportReceivedDate: null,
      customerDate: selectedDate,
      trackingRecordId: tableId, // Use tableId to group customers by table
    });
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
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Chi Tiết Khách Hàng #{tableId}
            {initialDate && (
              <span className="text-sm font-normal text-gray-500">
                ({getDayOfWeek(selectedDate)})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {getDayOfWeek(selectedDate)}
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Tên Khách Hàng
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Đã Gửi Report
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Ngày Nhận Report
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành Động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(reports as CustomerReport[]).filter((report: CustomerReport) => 
                report.customerDate === selectedDate && 
                (report.trackingRecordId === tableId || (!report.trackingRecordId && tableId === 1))
              ).map((report: CustomerReport) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap">
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
                      <div
                        className="text-sm text-gray-900 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                        onClick={() => handleStartEdit(report.id, "reportReceivedDate", report.reportReceivedDate || "")}
                      >
                        {report.reportReceivedDate ? formatDate(report.reportReceivedDate) : "Chưa nhận"}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(report.id)}
                      disabled={deleteMutation.isPending}
                      className="hover:bg-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleAddCustomer}
            disabled={createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm Khách Hàng
          </Button>
          <Button
            onClick={handleGoogleCalendarImport}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Import từ Google Calendar
          </Button>
          <Button 
            onClick={handleImageUpload}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Image className="h-4 w-4 mr-2" />
            Upload Hình Ảnh
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
      </CardContent>
    </Card>
  );
}