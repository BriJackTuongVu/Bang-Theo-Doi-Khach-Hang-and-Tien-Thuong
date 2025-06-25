import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTrackingRecordSchema, insertCustomerReportSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all tracking records
  app.get("/api/tracking-records", async (req, res) => {
    try {
      const records = await storage.getTrackingRecords();
      res.json(records);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tracking records" });
    }
  });

  // Get single tracking record
  app.get("/api/tracking-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const record = await storage.getTrackingRecord(id);
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }
      
      res.json(record);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tracking record" });
    }
  });

  // Create tracking record
  app.post("/api/tracking-records", async (req, res) => {
    try {
      const validatedData = insertTrackingRecordSchema.parse(req.body);
      const record = await storage.createTrackingRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create tracking record" });
    }
  });

  // Update tracking record
  app.patch("/api/tracking-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const validatedData = insertTrackingRecordSchema.partial().parse(req.body);
      const record = await storage.updateTrackingRecord(id, validatedData);
      
      if (!record) {
        return res.status(404).json({ message: "Record not found" });
      }
      
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update tracking record" });
    }
  });

  // Delete tracking record
  app.delete("/api/tracking-records/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const deleted = await storage.deleteTrackingRecord(id);
      if (!deleted) {
        return res.status(404).json({ message: "Record not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tracking record" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
