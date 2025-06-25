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
import { Plus, User, Send, Calendar, Trash2, Upload, Link } from "lucide-react";

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
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

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
    
    // Clean up names - remove common suffixes
    names = names.map(name => {
      return name
        .replace(/\s+and\s+Tuong.*$/i, '')
        .replace(/\s*-.*$/, '') // Remove anything after dash
        .replace(/\s*\(.*\)/, '') // Remove anything in parentheses
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

  const handleGoogleAuth = () => {
    window.location.href = '/auth/google';
  };

  const loadCalendarEvents = async () => {
    setIsLoadingCalendar(true);
    try {
      const response = await fetch(`/api/calendar/events?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.customers);
        setIsGoogleAuthenticated(true);
      } else if (response.status === 401) {
        setIsGoogleAuthenticated(false);
      }
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setIsGoogleAuthenticated(false);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const importFromGoogleCalendar = () => {
    calendarEvents.forEach(event => {
      createMutation.mutate({
        customerName: event.name,
        reportSent: false,
        reportReceivedDate: null,
        customerDate: selectedDate,
        trackingRecordId: tableId,
      });
    });
    setShowImportDialog(false);
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
            onClick={() => setShowImportDialog(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import từ Calendar
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

        {/* Import from Calendar Dialog */}
        <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Import Khách Hàng từ Google Calendar</AlertDialogTitle>
              <AlertDialogDescription>
                Copy danh sách tên khách hàng từ Google Calendar và paste vào đây. Mỗi tên một dòng.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Ví dụ:
Heny phan
Simone Le
Van hul
Jackie pham
Huan Nguyen
..."
                className="w-full h-64 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setImportText("");
                setShowImportDialog(false);
              }}>
                Hủy bỏ
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleImportFromCalendar}
                className="bg-green-600 hover:bg-green-700"
              >
                Import ({importText.split('\n').filter(line => line.trim().length > 0).length} khách hàng)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}