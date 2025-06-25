import { TrackingRecord, InsertTrackingRecord, CustomerReport, InsertCustomerReport } from "@shared/schema";

export interface IStorage {
  getTrackingRecords(): Promise<TrackingRecord[]>;
  getTrackingRecord(id: number): Promise<TrackingRecord | undefined>;
  createTrackingRecord(record: InsertTrackingRecord): Promise<TrackingRecord>;
  updateTrackingRecord(id: number, record: Partial<InsertTrackingRecord>): Promise<TrackingRecord | undefined>;
  deleteTrackingRecord(id: number): Promise<boolean>;
  
  getCustomerReports(): Promise<CustomerReport[]>;
  getCustomerReport(id: number): Promise<CustomerReport | undefined>;
  createCustomerReport(report: InsertCustomerReport): Promise<CustomerReport>;
  updateCustomerReport(id: number, report: Partial<InsertCustomerReport>): Promise<CustomerReport | undefined>;
  deleteCustomerReport(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private records: Map<number, TrackingRecord>;
  private customerReports: Map<number, CustomerReport>;
  private currentId: number;
  private currentReportId: number;

  constructor() {
    this.records = new Map();
    this.customerReports = new Map();
    this.currentId = 1;
    this.currentReportId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    const today = new Date();
    const sampleRecords: InsertTrackingRecord[] = [
      {
        date: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledCustomers: 10,
        reportedCustomers: 8,
        closedCustomers: 6,
        paymentStatus: "đã pay" as const,
      },
      {
        date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledCustomers: 15,
        reportedCustomers: 6,
        closedCustomers: 4,
        paymentStatus: "chưa pay" as const,
      },
      {
        date: today.toISOString().split('T')[0],
        scheduledCustomers: 12,
        reportedCustomers: 2,
        closedCustomers: 1,
        paymentStatus: "chưa pay" as const,
      },
    ];

    sampleRecords.forEach(record => {
      const id = this.currentId++;
      const trackingRecord: TrackingRecord = { 
        ...record, 
        id,
        scheduledCustomers: record.scheduledCustomers ?? 0,
        reportedCustomers: record.reportedCustomers ?? 0,
        closedCustomers: record.closedCustomers ?? 0,
        paymentStatus: record.paymentStatus ?? "chưa pay"
      };
      this.records.set(id, trackingRecord);
    });
  }

  async getTrackingRecords(): Promise<TrackingRecord[]> {
    return Array.from(this.records.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getTrackingRecord(id: number): Promise<TrackingRecord | undefined> {
    return this.records.get(id);
  }

  async createTrackingRecord(insertRecord: InsertTrackingRecord): Promise<TrackingRecord> {
    const id = this.currentId++;
    const record: TrackingRecord = { 
      ...insertRecord, 
      id,
      scheduledCustomers: insertRecord.scheduledCustomers ?? 0,
      reportedCustomers: insertRecord.reportedCustomers ?? 0,
      closedCustomers: insertRecord.closedCustomers ?? 0,
      paymentStatus: insertRecord.paymentStatus ?? "chưa pay"
    };
    this.records.set(id, record);
    return record;
  }

  async updateTrackingRecord(id: number, updateRecord: Partial<InsertTrackingRecord>): Promise<TrackingRecord | undefined> {
    const existing = this.records.get(id);
    if (!existing) return undefined;
    
    const updated: TrackingRecord = { ...existing, ...updateRecord };
    this.records.set(id, updated);
    return updated;
  }

  async deleteTrackingRecord(id: number): Promise<boolean> {
    return this.records.delete(id);
  }

  async getCustomerReports(): Promise<CustomerReport[]> {
    return Array.from(this.customerReports.values());
  }

  async getCustomerReport(id: number): Promise<CustomerReport | undefined> {
    return this.customerReports.get(id);
  }

  async createCustomerReport(insertReport: InsertCustomerReport): Promise<CustomerReport> {
    const report: CustomerReport = { 
      id: this.currentReportId++, 
      ...insertReport,
      createdAt: new Date()
    };
    this.customerReports.set(report.id, report);
    return report;
  }

  async updateCustomerReport(id: number, updateReport: Partial<InsertCustomerReport>): Promise<CustomerReport | undefined> {
    const existing = this.customerReports.get(id);
    if (!existing) return undefined;
    
    const updated: CustomerReport = { ...existing, ...updateReport };
    this.customerReports.set(id, updated);
    return updated;
  }

  async deleteCustomerReport(id: number): Promise<boolean> {
    return this.customerReports.delete(id);
  }
}

export const storage = new MemStorage();
