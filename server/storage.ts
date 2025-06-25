import { trackingRecords, type TrackingRecord, type InsertTrackingRecord } from "@shared/schema";

export interface IStorage {
  getTrackingRecords(): Promise<TrackingRecord[]>;
  getTrackingRecord(id: number): Promise<TrackingRecord | undefined>;
  createTrackingRecord(record: InsertTrackingRecord): Promise<TrackingRecord>;
  updateTrackingRecord(id: number, record: Partial<InsertTrackingRecord>): Promise<TrackingRecord | undefined>;
  deleteTrackingRecord(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private records: Map<number, TrackingRecord>;
  private currentId: number;

  constructor() {
    this.records = new Map();
    this.currentId = 1;
    
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
      },
      {
        date: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduledCustomers: 15,
        reportedCustomers: 6,
      },
      {
        date: today.toISOString().split('T')[0],
        scheduledCustomers: 12,
        reportedCustomers: 2,
      },
    ];

    sampleRecords.forEach(record => {
      const id = this.currentId++;
      const trackingRecord: TrackingRecord = { ...record, id };
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
    const record: TrackingRecord = { ...insertRecord, id };
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
}

export const storage = new MemStorage();
