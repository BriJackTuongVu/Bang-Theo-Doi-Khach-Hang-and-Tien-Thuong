import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTrackingRecordSchema, insertCustomerReportSchema } from "@shared/schema";
import { z } from "zod";
import { google } from 'googleapis';

// Google OAuth2 setup - using dynamic callback URL
let oauth2Client: any;

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize OAuth client with environment-specific callback URL
  oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000/auth/google/callback'
      : 'https://your-app.replit.app/auth/google/callback'
  );
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

  // Customer Reports endpoints
  app.get("/api/customer-reports", async (req, res) => {
    try {
      const reports = await storage.getCustomerReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer reports" });
    }
  });

  app.get("/api/customer-reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const report = await storage.getCustomerReport(id);
      if (!report) {
        return res.status(404).json({ error: "Customer report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer report" });
    }
  });

  app.post("/api/customer-reports", async (req, res) => {
    try {
      const validatedData = insertCustomerReportSchema.parse(req.body);
      const report = await storage.createCustomerReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data format" });
      }
      res.status(500).json({ error: "Failed to create customer report" });
    }
  });

  app.patch("/api/customer-reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCustomerReportSchema.partial().parse(req.body);
      const report = await storage.updateCustomerReport(id, validatedData);
      if (!report) {
        return res.status(404).json({ error: "Customer report not found" });
      }
      res.json(report);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data format" });
      }
      res.status(500).json({ error: "Failed to update customer report" });
    }
  });

  app.delete("/api/customer-reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCustomerReport(id);
      if (!deleted) {
        return res.status(404).json({ error: "Customer report not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer report" });
    }
  });

  // Google Calendar API routes
  app.get("/api/google-auth", (req, res) => {
    const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: req.query.returnTo || '/',
    });
    res.redirect(authUrl);
  });

  app.get("/api/google-auth-status", (req, res) => {
    res.json({ 
      authenticated: !!oauth2Client.credentials?.access_token,
      hasCredentials: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code, state } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);
      
      const returnTo = state as string || '/';
      res.redirect(`${returnTo}?google-auth=success`);
    } catch (error) {
      console.error('Error getting access token:', error);
      res.redirect('/?google-auth=error');
    }
  });

  // Calendar events API
  app.get("/api/calendar/events", async (req, res) => {
    const { date } = req.query;
    
    if (!oauth2Client.credentials.access_token) {
      return res.status(401).json({ error: 'Not authenticated with Google Calendar' });
    }

    try {
      // Set time range for the specified date (Vietnam timezone)
      const startOfDay = new Date(date as string);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date as string);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      
      // Extract customer names from event summaries
      const customers = events.map(event => {
        let customerName = event.summary || 'Unnamed Event';
        
        // Clean up common patterns
        customerName = customerName
          .replace(/\s+and\s+Tuong.*$/i, '')
          .replace(/\s*-.*$/, '')
          .replace(/\s*\(.*\)/, '')
          .trim();
          
        return {
          name: customerName,
          startTime: event.start?.dateTime || event.start?.date,
          endTime: event.end?.dateTime || event.end?.date,
        };
      }).filter(customer => customer.name.length > 0);

      res.json({ customers, totalEvents: events.length });
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // OCR endpoint for extracting customer names from images
  app.post("/api/ocr/extract-names", async (req, res) => {
    try {
      const { image, date } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'No image provided' });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      // Import OpenAI inside the route to avoid initialization issues
      const { default: OpenAI } = await import('openai');
      
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an OCR assistant that extracts customer names from images. 
            Please analyze the image and extract all customer names you can find.
            Return ONLY a JSON object with a "names" array containing the extracted names.
            Clean up the names by removing any extra text like "and Tuong", time stamps, or other irrelevant information.
            Focus only on extracting actual customer names.
            
            Example output format:
            {"names": ["John Smith", "Mary Johnson", "David Wilson"]}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract all customer names from this image. Remove any unnecessary text and return only clean customer names in JSON format.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"names": []}');
      
      // Clean up names further
      const cleanedNames = (result.names || [])
        .map((name: string) => {
          return name
            .replace(/\s+and\s+Tuong.*$/i, '') // Remove "and Tuong ..." patterns
            .replace(/\s*-.*$/, '') // Remove anything after dash
            .replace(/\s*\(.*\)/, '') // Remove anything in parentheses
            .replace(/^\d{1,2}:\d{2}\s*(AM|PM)?\s*-?\s*/i, '') // Remove time stamps
            .replace(/^[✓✗☑☐]\s*/, '') // Remove checkmarks
            .replace(/Canceled:\s*/i, '') // Remove "Canceled:" prefix
            .trim();
        })
        .filter((name: string) => name.length > 0 && name.length < 100) // Filter out empty or too long names
        .filter((name: string) => !name.match(/^\d+$/)) // Filter out pure numbers
        .slice(0, 50); // Limit to 50 names maximum

      res.json({ names: cleanedNames });
    } catch (error) {
      console.error('Error processing OCR request:', error);
      res.status(500).json({ error: 'Failed to process image' });
    }
  });

  // Calendly API integration
  app.get("/api/calendly/events", async (req, res) => {
    try {
      const { date } = req.query;
      
      if (!process.env.CALENDLY_API_TOKEN) {
        return res.status(400).json({ 
          error: 'Calendly API token not configured',
          setup_instructions: 'Please add CALENDLY_API_TOKEN to environment variables',
          setup_url: 'https://calendly.com/integrations/api_webhooks'
        });
      }

      // Get user info first
      const userResponse = await fetch('https://api.calendly.com/users/me', {
        headers: {
          'Authorization': `Bearer ${process.env.CALENDLY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`Calendly user API error: ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      const userUri = userData.resource.uri;

      // Get scheduled events for the specific date
      const startTime = new Date(`${date}T00:00:00.000Z`).toISOString();
      const endTime = new Date(`${date}T23:59:59.999Z`).toISOString();

      const eventsResponse = await fetch(`https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${startTime}&max_start_time=${endTime}`, {
        headers: {
          'Authorization': `Bearer ${process.env.CALENDLY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!eventsResponse.ok) {
        throw new Error(`Calendly events API error: ${eventsResponse.status}`);
      }

      const eventsData = await eventsResponse.json();
      const events = eventsData.collection || [];

      // Get invitee information for each event
      const eventsWithInvitees = await Promise.all(
        events.map(async (event: any) => {
          try {
            const inviteesResponse = await fetch(`https://api.calendly.com/scheduled_events/${event.uri.split('/').pop()}/invitees`, {
              headers: {
                'Authorization': `Bearer ${process.env.CALENDLY_API_TOKEN}`,
                'Content-Type': 'application/json'
              }
            });

            if (inviteesResponse.ok) {
              const inviteesData = await inviteesResponse.json();
              const invitees = inviteesData.collection || [];
              
              return {
                event_name: event.name,
                start_time: event.start_time,
                end_time: event.end_time,
                status: event.status,
                invitee_name: invitees.length > 0 ? invitees[0].name : 'Unknown',
                invitee_email: invitees.length > 0 ? invitees[0].email : ''
              };
            }
            return null;
          } catch (error) {
            console.error('Error fetching invitee:', error);
            return null;
          }
        })
      );

      const validEvents = eventsWithInvitees.filter(event => event !== null);

      res.json({ 
        events: validEvents,
        total: validEvents.length,
        date: date
      });
    } catch (error) {
      console.error('Error fetching Calendly events:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Calendly events',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Save Calendly token endpoint
  app.post("/api/calendly/save-token", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }
      
      // Validate token format
      if (!token.startsWith('eyJ')) {
        return res.status(400).json({ error: 'Invalid token format' });
      }
      
      // Test token by making a simple API call
      const testResponse = await fetch('https://api.calendly.com/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!testResponse.ok) {
        return res.status(400).json({ error: 'Invalid token or API access denied' });
      }
      
      // Store token in environment (in production, this would be stored securely)
      process.env.CALENDLY_API_TOKEN = token;
      
      res.json({ success: true, message: 'Token saved successfully' });
    } catch (error) {
      console.error('Error saving Calendly token:', error);
      res.status(500).json({ error: 'Failed to save token' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
