import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTrackingRecordSchema, insertCustomerReportSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import { google } from 'googleapis';
import { db } from "./db";
import { trackingRecords, customerReports, settings } from "@shared/schema";
import { eq } from "drizzle-orm";

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
  // TEST: Manual trigger scheduler
  app.post("/api/test-scheduler", async (req, res) => {
    try {
      console.log('🧪 TEST: Manual scheduler trigger...');
      
      // Import and run scheduler task directly
      const schedulerModule = await import('./scheduler');
      const { runSchedulerTask } = schedulerModule;
      await runSchedulerTask();
      
      res.json({ success: true, message: "Scheduler test completed" });
    } catch (error: any) {
      console.error('Scheduler test error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

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
      
      // Check if a tracking record already exists for this date
      const existingRecords = await storage.getTrackingRecords();
      const existingRecord = existingRecords.find(r => r.date === validatedData.date);
      
      if (existingRecord) {
        return res.status(409).json({ 
          message: "A tracking record already exists for this date",
          conflict: true,
          existingDate: validatedData.date
        });
      }
      
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
      console.log("Received request body:", req.body);
      const validatedData = insertCustomerReportSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const report = await storage.createCustomerReport(validatedData);
      console.log("Created report:", report);
      res.status(201).json(report);
    } catch (error) {
      console.error("Full error in POST /api/customer-reports:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid data format", details: error.message });
      }
      res.status(500).json({ error: "Failed to create customer report", details: error.message });
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
    const { date } = req.query;
    
    try {
      const [setting] = await db.select().from(settings).where(eq(settings.key, 'calendly_token'));
      
      if (!setting?.value) {
        return res.status(401).json({ error: "No Calendly token found" });
      }
      
      const calendlyToken = setting.value;

      if (!date) {
        return res.status(400).json({ error: "Date parameter is required" });
      }

      console.log(`Fetching Calendly events for date: ${date}`);
      
      // Format date for API call - use Vietnam timezone (UTC+7)
      const inputDate = new Date(date as string);
      
      // Create start and end times for the day in Vietnam timezone
      const vietnamOffset = 7 * 60; // UTC+7 in minutes
      const utcOffset = inputDate.getTimezoneOffset(); // Local offset from UTC
      
      const startDate = new Date(inputDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(inputDate);
      endDate.setHours(23, 59, 59, 999);
      
      const startTime = startDate.toISOString();
      const endTime = endDate.toISOString();
      
      console.log(`Date range: ${startTime} to ${endTime}`);
      
      // First, get user info
      const userResponse = await fetch('https://api.calendly.com/users/me', {
        headers: {
          'Authorization': `Bearer ${calendlyToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        console.error('Failed to get user info:', userResponse.status, userResponse.statusText);
        return res.status(401).json({ error: 'Invalid Calendly token or expired' });
      }

      const userData = await userResponse.json();
      const userUri = userData.resource.uri;
      const organizationUri = userData.resource.current_organization;
      console.log('User URI:', userUri);
      console.log('Organization URI:', organizationUri);

      // Try both organization and user filters to get all events
      const organizationEventsUrl = `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(organizationUri)}&min_start_time=${encodeURIComponent(startTime)}&max_start_time=${encodeURIComponent(endTime)}&status=active`;
      const userEventsUrl = `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${encodeURIComponent(startTime)}&max_start_time=${encodeURIComponent(endTime)}&status=active`;
      
      console.log('Organization Events URL:', organizationEventsUrl);
      console.log('User Events URL:', userEventsUrl);
      
      // Try organization events first
      let eventsResponse = await fetch(organizationEventsUrl, {
        headers: {
          'Authorization': `Bearer ${calendlyToken}`,
          'Content-Type': 'application/json'
        }
      });

      let eventsData;
      if (eventsResponse.ok) {
        eventsData = await eventsResponse.json();
        console.log('Found organization events:', eventsData.collection?.length || 0);
      } else {
        console.log('Organization events failed, trying user events...');
        // If organization fails, try user events
        eventsResponse = await fetch(userEventsUrl, {
          headers: {
            'Authorization': `Bearer ${calendlyToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!eventsResponse.ok) {
          console.error('Failed to fetch events:', eventsResponse.status, eventsResponse.statusText);
          const errorText = await eventsResponse.text();
          console.error('Error response:', errorText);
          return res.status(500).json({ error: 'Failed to fetch Calendly events' });
        }

        eventsData = await eventsResponse.json();
        console.log('Found user events:', eventsData.collection?.length || 0);
      }
      
      const events = eventsData.collection || [];

      console.log('Processing events with invitees...');
      // Get invitee information for each event
      const eventsWithInvitees = await Promise.all(
        events.map(async (event: any) => {
          try {
            console.log('Processing event:', event.uri);
            const eventId = event.uri.split('/').pop();
            const inviteesResponse = await fetch(`https://api.calendly.com/scheduled_events/${eventId}/invitees`, {
              headers: {
                'Authorization': `Bearer ${calendlyToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (inviteesResponse.ok) {
              const inviteesData = await inviteesResponse.json();
              const invitees = inviteesData.collection || [];
              console.log('Found invitees for event:', invitees.length);
              
              // Debug: simplified logging
              console.log('Event location info:', event.location);
              if (invitees.length > 0) {
                console.log('Invitee info:', {name: invitees[0].name, email: invitees[0].email});
              }
              
              // Extract phone from location field or questions if available
              let phone = null;
              
              // First try to get from event location field
              if (event.location && event.location.location) {
                const locationText = event.location.location;
                console.log('Event location field:', locationText);
                // Check if location contains phone number pattern
                const phoneRegex = /[\+]?[1-9][\d\s\-\(\)]{8,20}/;
                if (phoneRegex.test(locationText)) {
                  phone = locationText.trim();
                  console.log('Found phone from event location:', phone);
                }
              }
              
              // Try text_reminder_number from invitee
              if (!phone && invitees.length > 0 && invitees[0].text_reminder_number) {
                phone = invitees[0].text_reminder_number;
                console.log('Found phone from text_reminder_number:', phone);
              }
              
              // Try questions and answers for location/phone
              if (!phone && invitees.length > 0 && invitees[0].questions_and_answers) {
                console.log('Questions and answers:', JSON.stringify(invitees[0].questions_and_answers, null, 2));
                const locationQuestion = invitees[0].questions_and_answers.find((qa: any) => 
                  qa.question.toLowerCase().includes('location') || 
                  qa.question.toLowerCase().includes('địa chỉ') ||
                  qa.question.toLowerCase().includes('phone') || 
                  qa.question.toLowerCase().includes('số điện thoại') ||
                  qa.question.toLowerCase().includes('contact') ||
                  qa.question.toLowerCase().includes('sdt') ||
                  qa.question.toLowerCase().includes('mobile') ||
                  qa.question.toLowerCase().includes('cell')
                );
                if (locationQuestion) {
                  phone = locationQuestion.answer;
                  console.log('Found phone from questions:', phone);
                } else {
                  console.log('No phone/location question found in questions_and_answers');
                }
              } 
              
              if (!phone) {
                console.log('No phone information available for event');
              }

              const result = {
                event_name: event.name,
                start_time: event.start_time,
                end_time: event.end_time,
                status: event.status,
                invitee_name: invitees.length > 0 ? invitees[0].name : 'Unknown',
                invitee_email: invitees.length > 0 ? invitees[0].email : '',
                invitee_phone: phone
              };
              console.log('Event result:', result);
              return result;
            } else {
              console.log('Failed to fetch invitees:', inviteesResponse.status);
              return {
                event_name: event.name,
                start_time: event.start_time,
                end_time: event.end_time,
                status: event.status,
                invitee_name: 'Unknown',
                invitee_email: '',
                invitee_phone: null
              };
            }
          } catch (error) {
            console.error('Error fetching invitee:', error);
            return {
              event_name: event.name,
              start_time: event.start_time,
              end_time: event.end_time,
              status: event.status,
              invitee_name: 'Unknown',
              invitee_email: '',
              invitee_phone: null
            };
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

  // Test manual trigger for scheduler demo
  app.post("/api/trigger-scheduler-demo", async (req, res) => {
    try {
      console.log('🧪 Manual trigger for scheduler demo initiated...');
      
      // Get current date in Eastern Time
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const todayDate = easternTime.toISOString().split('T')[0];
      
      console.log(`📅 Creating table for date: ${todayDate}`);
      
      // Check if table already exists
      const existingRecords = await storage.getTrackingRecords();
      const existingRecord = existingRecords.find(r => r.date === todayDate);
      
      if (existingRecord) {
        return res.json({
          success: false,
          message: `Table for ${todayDate} already exists`,
          existingRecordId: existingRecord.id
        });
      }
      
      // Create new tracking record
      const newRecord = await storage.createTrackingRecord({
        date: todayDate,
        scheduledCustomers: 0,
        reportedCustomers: 0,
        closedCustomers: 0,
        paymentStatus: "chưa pay"
      });
      
      console.log(`✅ Created tracking record ID: ${newRecord.id} for date ${todayDate}`);
      
      // Import from Calendly
      const { autoImportFromCalendly, autoCheckStripePayments } = await import('./scheduler');
      await autoImportFromCalendly(todayDate, newRecord.id);
      await autoCheckStripePayments(todayDate);
      
      res.json({
        success: true,
        message: `Successfully created table for ${todayDate}`,
        recordId: newRecord.id,
        date: todayDate
      });
      
    } catch (error) {
      console.error('❌ Error in scheduler demo:', error);
      res.status(500).json({
        success: false,
        message: error.message
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
      
      // Check if setting exists
      const [existing] = await db.select().from(settings).where(eq(settings.key, 'calendly_token'));
      
      if (existing) {
        // Update existing
        await db.update(settings)
          .set({ value: token, updatedAt: new Date() })
          .where(eq(settings.key, 'calendly_token'));
      } else {
        // Insert new
        await db.insert(settings).values({
          key: 'calendly_token',
          value: token
        });
      }
      
      res.json({ success: true, message: 'Token saved permanently' });
    } catch (error) {
      console.error('Error saving Calendly token:', error);
      res.status(500).json({ error: 'Failed to save token' });
    }
  });

  // Check Calendly connection status
  app.get("/api/calendly/status", async (req, res) => {
    try {
      const [setting] = await db.select().from(settings).where(eq(settings.key, 'calendly_token'));
      res.json({ connected: !!setting?.value });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Disconnect Calendly
  app.post("/api/calendly/disconnect", async (req, res) => {
    try {
      await db.delete(settings).where(eq(settings.key, 'calendly_token'));
      res.json({ success: true, message: 'Calendly disconnected successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disconnect' });
    }
  });

  // Save memory forever
  app.post("/api/settings/save-memory-forever", async (req, res) => {
    try {
      // Set multiple settings to ensure data preservation
      const memorySettings = [
        { key: 'auto_delete_old_data', value: 'false' },
        { key: 'preserve_memory_forever', value: 'true' },
        { key: 'data_retention_policy', value: 'permanent' },
        { key: 'memory_saved_at', value: new Date().toISOString() }
      ];

      for (const setting of memorySettings) {
        await db.insert(settings)
          .values(setting)
          .onConflictDoUpdate({
            target: settings.key,
            set: { value: setting.value }
          });
      }

      console.log('Memory preservation settings saved successfully');
      res.json({ success: true, message: 'Memory saved forever successfully' });
    } catch (error) {
      console.error('Error saving memory forever:', error);
      res.status(500).json({ error: 'Failed to save memory settings' });
    }
  });

  // Manual update customers from Calendly
  app.post("/api/manual-update-customers", async (req, res) => {
    try {
      const { date, trackingRecordId } = req.body;
      
      if (!date || !trackingRecordId) {
        return res.status(400).json({ error: "Date and trackingRecordId are required" });
      }
      
      console.log(`Manual update for date ${date}, tracking record ${trackingRecordId}`);
      
      let importedCount = 0;
      let calendlyError = null;
      
      // Get Calendly token from database
      let calendlyToken = process.env.CALENDLY_API_TOKEN;
      if (!calendlyToken) {
        try {
          const [setting] = await db.select().from(settings).where(eq(settings.key, 'calendly_token'));
          calendlyToken = setting?.value;
          console.log('Calendly token fetched from database:', calendlyToken ? 'Found' : 'Not found');
        } catch (error) {
          console.error('Error fetching Calendly token from database:', error);
        }
      }
      
      if (!calendlyToken) {
        calendlyError = "Calendly API token not configured";
      } else {
        try {
          console.log(`Fetching Calendly events for date: ${date}`);
          const calendlyUrl = `https://api.calendly.com/scheduled_events?user=https://api.calendly.com/users/5e8c8c66-7fe1-4727-ba2d-32c9a56eb1ca&min_start_time=${date}T00:00:00.000000Z&max_start_time=${date}T23:59:59.999999Z`;
          console.log(`Calendly URL: ${calendlyUrl}`);
          
          const calendlyResponse = await fetch(calendlyUrl, {
            headers: {
              'Authorization': `Bearer ${calendlyToken}`,
            },
          });

          console.log(`Calendly response status: ${calendlyResponse.status}`);
          
          if (calendlyResponse.ok) {
            const calendlyData = await calendlyResponse.json();
            console.log(`Calendly data received:`, JSON.stringify(calendlyData, null, 2));
            
            if (calendlyData.collection && calendlyData.collection.length > 0) {
              console.log(`Found ${calendlyData.collection.length} events`);
              
              for (const event of calendlyData.collection) {
                // Get event details including invitee information
                const eventResponse = await fetch(event.uri, {
                  headers: {
                    'Authorization': `Bearer ${calendlyToken}`,
                  },
                });

                if (eventResponse.ok) {
                  const eventData = await eventResponse.json();
                  
                  // Get invitees for this event
                  const inviteesResponse = await fetch(`${event.uri}/invitees`, {
                    headers: {
                      'Authorization': `Bearer ${calendlyToken}`,
                    },
                  });

                  if (inviteesResponse.ok) {
                    const inviteesData = await inviteesResponse.json();
                    
                    for (const invitee of inviteesData.collection) {
                      const customerName = invitee.name;
                      const customerEmail = invitee.email;
                      
                      // Extract phone from event location if available
                      let customerPhone = '';
                      if (eventData.resource?.location?.location) {
                        const phoneMatch = eventData.resource.location.location.match(/(\+?\d[\d\s\-\(\)]{8,})/);
                        if (phoneMatch) {
                          customerPhone = phoneMatch[1];
                        }
                      }
                      
                      // Extract appointment time from start_time
                      let appointmentTime = '';
                      if (eventData.resource?.start_time) {
                        const startTime = new Date(eventData.resource.start_time);
                        // Format time as HH:MM AM/PM
                        appointmentTime = startTime.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                          timeZone: 'America/New_York' // Eastern Time
                        });
                      }

                      // Check if customer already exists for this date
                      const existingReports = await storage.getCustomerReports();
                      const exists = existingReports.some(report => 
                        report.customerDate === date && 
                        report.customerEmail === customerEmail &&
                        report.trackingRecordId === trackingRecordId
                      );

                      if (!exists) {
                        await storage.createCustomerReport({
                          customerName,
                          customerEmail,
                          customerPhone,
                          appointmentTime,
                          reportSent: false,
                          customerDate: date,
                          trackingRecordId: trackingRecordId
                        });
                        importedCount++;
                      }
                    }
                  }
                }
              }
            } else {
              console.log('No events found in Calendly for this date');
            }
          } else {
            const errorText = await calendlyResponse.text();
            calendlyError = `Calendly API error: ${calendlyResponse.status} - ${errorText}`;
            console.error(calendlyError);
          }
        } catch (error) {
          calendlyError = `Calendly import error: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('Calendly import error:', error);
        }
      }
      
      console.log(`Manual update completed. Imported ${importedCount} customers.`);
      
      // Return result with detailed information
      if (calendlyError && importedCount === 0) {
        res.json({ 
          success: false, 
          importedCount, 
          error: calendlyError,
          message: `Không thể import từ Calendly: ${calendlyError}`
        });
      } else {
        res.json({ 
          success: true, 
          importedCount,
          message: importedCount > 0 ? `Đã import thành công ${importedCount} khách hàng` : 'Không có khách hàng mới nào từ Calendly'
        });
      }
      
    } catch (error) {
      console.error("Error in manual update:", error);
      res.status(500).json({ error: "Failed to update customers" });
    }
  });

  // Sync tracking data from customer reports
  app.post("/api/sync-tracking-data", async (req, res) => {
    try {
      console.log('=== Starting sync-tracking-data ===');
      const reports = await storage.getCustomerReports();
      const records = await storage.getTrackingRecords();
      
      console.log('Found reports:', reports.length);
      console.log('Found records:', records.length);
      console.log('All reports:', reports.map(r => ({ name: r.customerName, date: r.customerDate, received: r.reportReceivedDate })));
      
      // Group reports by date
      const reportsByDate = new Map();
      for (const report of reports) {
        const date = report.customerDate;
        if (!reportsByDate.has(date)) {
          reportsByDate.set(date, []);
        }
        reportsByDate.get(date).push(report);
      }
      
      console.log('Reports grouped by date:', Object.fromEntries(reportsByDate));
      
      // Update tracking records
      let updatedCount = 0;
      for (const record of records) {
        const dateReports = reportsByDate.get(record.date) || [];
        const scheduledCount = dateReports.length;
        const reportedCount = dateReports.filter(r => r.reportReceivedDate !== null && r.reportReceivedDate !== undefined).length;
        const closedCount = record.closedCustomers; // Preserve existing closed customers count from Stripe updates
        
        console.log(`=== Processing record for date ${record.date} ===`);
        console.log(`Date reports:`, dateReports.map(r => ({ name: r.customerName, received: r.reportReceivedDate })));
        console.log(`Counts - scheduled: ${scheduledCount}, reported: ${reportedCount}, closed: ${closedCount}`);
        console.log(`Current record - scheduled: ${record.scheduledCustomers}, reported: ${record.reportedCustomers}, closed: ${record.closedCustomers}`);
        
        if (record.scheduledCustomers !== scheduledCount || 
            record.reportedCustomers !== reportedCount ||
            record.closedCustomers !== closedCount) {
          console.log(`>>> UPDATING record ${record.id} for date ${record.date}`);
          await storage.updateTrackingRecord(record.id, {
            scheduledCustomers: scheduledCount,
            reportedCustomers: reportedCount,
            closedCustomers: closedCount
          });
          updatedCount++;
        } else {
          console.log(`>>> No update needed for record ${record.id}`);
        }
      }
      
      console.log(`=== Sync completed. Updated ${updatedCount} records ===`);
      
      res.json({ 
        success: true, 
        message: `Updated ${updatedCount} tracking records`,
        updatedCount 
      });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to sync tracking data" });
    }
  });

  // Test endpoint to check first-time payments from Stripe
  app.post("/api/stripe/check-first-time-payments", async (req, res) => {
    try {
      const { date } = req.body; // Format: YYYY-MM-DD
      
      // Use the provided Stripe secret key
      const stripe = new Stripe("sk_live_7BtDEiVp53rwPhYmp8XF3bp600MR0Ksi0h");
      
      // Get payments for the specified date
      const startOfDay = new Date(date + "T00:00:00.000Z");
      const endOfDay = new Date(date + "T23:59:59.999Z");
      
      const charges = await stripe.charges.list({
        created: {
          gte: Math.floor(startOfDay.getTime() / 1000),
          lte: Math.floor(endOfDay.getTime() / 1000),
        },
        limit: 100,
      });

      let totalPaymentCount = 0;
      let firstTimePaymentCount = 0;
      const paymentDetails = [];
      const firstTimeCustomers = [];

      for (const charge of charges.data) {
        if (charge.status === 'succeeded') {
          totalPaymentCount++;
          
          const customerEmail = charge.receipt_email;
          const customerName = charge.billing_details?.name || 'Unknown';
          
          // Check if this is a first-time customer by looking at their payment history
          let isFirstTimeCustomer = false;
          
          if (customerEmail) {
            // Get all charges for this customer email before this date
            const customerHistoryCharges = await stripe.charges.list({
              created: {
                lt: Math.floor(startOfDay.getTime() / 1000), // Before this date
              },
              limit: 100,
            });
            
            // Check if this customer has any previous successful payments
            const previousPayments = customerHistoryCharges.data.filter(prevCharge => 
              prevCharge.receipt_email === customerEmail && prevCharge.status === 'succeeded'
            );
            
            isFirstTimeCustomer = previousPayments.length === 0;
          }
          
          if (isFirstTimeCustomer) {
            firstTimePaymentCount++;
            firstTimeCustomers.push({
              customer_email: customerEmail,
              customer_name: customerName,
              amount: charge.amount / 100,
            });
          }
          
          paymentDetails.push({
            amount: charge.amount / 100,
            currency: charge.currency,
            customer_email: customerEmail,
            customer_name: customerName,
            created: new Date(charge.created * 1000).toISOString(),
            charge_id: charge.id,
            is_first_time: isFirstTimeCustomer,
          });
        }
      }

      // Update tracking record if exists
      const records = await storage.getTrackingRecords();
      const trackingRecord = records.find(r => r.date === date);
      
      if (trackingRecord) {
        await storage.updateTrackingRecord(trackingRecord.id, {
          closedCustomers: firstTimePaymentCount,
          paymentStatus: firstTimePaymentCount > 0 ? "đã pay" : "chưa pay"
        });
      }

      res.json({
        success: true,
        date,
        totalPaymentCount,
        firstTimePaymentCount,
        firstTimeCustomers,
        paymentDetails,
        trackingRecordUpdated: !!trackingRecord,
        message: `Tìm thấy ${firstTimePaymentCount} khách hàng thanh toán lần đầu vào ngày ${date} (tổng ${totalPaymentCount} thanh toán)`
      });

    } catch (error: any) {
      console.error("Error checking first-time payments:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi kiểm tra thanh toán lần đầu",
        error: error.message
      });
    }
  });

  // Auto-update customer contact information from Calendly
  app.post("/api/auto-update-contacts-calendly", async (req, res) => {
    try {
      const reports = await storage.getCustomerReports();
      let updatedCount = 0;

      // Get unique dates from customer reports
      const uniqueDates = [...new Set(reports.map(r => r.customerDate))];

      for (const date of uniqueDates) {
        try {
          // Format date for Calendly API (YYYY-MM-DD)
          const formattedDate = date;
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          const endDate = nextDay.toISOString().split('T')[0];

          // Get events from Calendly for this date
          const calendlyResponse = await fetch(`https://api.calendly.com/scheduled_events?user=${process.env.CALENDLY_USER_URI}&min_start_time=${formattedDate}T00:00:00.000000Z&max_start_time=${endDate}T00:00:00.000000Z&status=active`, {
            headers: {
              'Authorization': `Bearer ${process.env.CALENDLY_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          if (calendlyResponse.ok) {
            const calendlyData = await calendlyResponse.json();
            const events = calendlyData.collection || [];

            // For each event, get invitee information
            for (const event of events) {
              try {
                const inviteesResponse = await fetch(`https://api.calendly.com/scheduled_events/${event.uuid}/invitees`, {
                  headers: {
                    'Authorization': `Bearer ${process.env.CALENDLY_API_TOKEN}`,
                    'Content-Type': 'application/json'
                  }
                });

                if (inviteesResponse.ok) {
                  const inviteesData = await inviteesResponse.json();
                  const invitees = inviteesData.collection || [];

                  for (const invitee of invitees) {
                    const inviteeName = invitee.name;
                    const inviteeEmail = invitee.email;

                    // Find matching customer report
                    const matchingReport = reports.find(r => 
                      r.customerDate === date &&
                      r.customerName.toLowerCase().includes(inviteeName.toLowerCase()) ||
                      inviteeName.toLowerCase().includes(r.customerName.toLowerCase())
                    );

                    if (matchingReport && (!matchingReport.customerEmail || !matchingReport.customerPhone)) {
                      // Extract phone from questions if available
                      let phone = null;
                      if (invitee.questions_and_answers) {
                        const phoneQuestion = invitee.questions_and_answers.find(qa => 
                          qa.question.toLowerCase().includes('phone') || 
                          qa.question.toLowerCase().includes('số điện thoại') ||
                          qa.question.toLowerCase().includes('contact')
                        );
                        if (phoneQuestion) {
                          phone = phoneQuestion.answer;
                        }
                      }

                      await storage.updateCustomerReport(matchingReport.id, {
                        customerEmail: matchingReport.customerEmail || inviteeEmail,
                        customerPhone: matchingReport.customerPhone || phone
                      });
                      updatedCount++;
                    }
                  }
                }
              } catch (inviteeError) {
                console.error("Error fetching invitee data:", inviteeError);
              }
            }
          }
        } catch (dateError) {
          console.error(`Error processing date ${date}:`, dateError);
        }
      }

      res.json({ 
        success: true, 
        message: `Đã cập nhật thông tin liên lạc từ Calendly cho ${updatedCount} khách hàng`,
        updatedCount,
        processedDates: uniqueDates.length
      });
    } catch (error: any) {
      console.error("Error auto-updating contacts from Calendly:", error);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi khi cập nhật thông tin liên lạc từ Calendly: " + error.message 
      });
    }
  });

  // Test Stripe end-of-day check
  app.get("/api/test-stripe-endday/:date", async (req, res) => {
    try {
      const testDate = req.params.date;
      
      console.log(`🕚 TESTING STRIPE END-OF-DAY CHECK for ${testDate}`);
      
      // Import scheduler function
      const { autoCheckStripePayments } = await import('./scheduler');
      
      // Run the actual Stripe check
      await autoCheckStripePayments(testDate);
      
      console.log(`✅ Stripe check completed for ${testDate}`);
      
      // Return updated record
      const records = await storage.getTrackingRecords();
      const updatedRecord = records.find(r => r.date === testDate);
      
      res.json({
        success: true,
        message: `Stripe payments checked for ${testDate}`,
        date: testDate,
        record: updatedRecord
      });
      
    } catch (error) {
      console.error('❌ Stripe check error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Test endpoint to manually import from Calendly for today
  app.post('/api/test-calendly-import', async (req, res) => {
    try {
      const { date } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      console.log(`🧪 Testing Calendly import for ${targetDate}...`);
      
      // Get existing tracking record for this date
      const records = await storage.getTrackingRecords();
      const record = records.find(r => r.date === targetDate);
      
      if (!record) {
        return res.status(404).json({ error: 'No tracking record found for this date' });
      }
      
      // Get Calendly token from database
      const [tokenSetting] = await db.select().from(settings).where(eq(settings.key, 'calendly_token'));
      
      if (!tokenSetting) {
        return res.status(400).json({ error: 'No Calendly token found' });
      }
      
      const calendlyToken = tokenSetting.value;
      
      // Call Calendly API
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const endDate = nextDay.toISOString().split('T')[0];
      
      const response = await fetch(`https://api.calendly.com/scheduled_events?user=https://api.calendly.com/users/GHEAKECV6H5CQZ2A&min_start_time=${targetDate}T00:00:00.000000Z&max_start_time=${endDate}T00:00:00.000000Z&status=active`, {
        headers: {
          'Authorization': `Bearer ${calendlyToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return res.status(500).json({ error: 'Failed to fetch from Calendly API', status: response.status });
      }
      
      const eventsData = await response.json();
      const events = eventsData.collection || [];
      
      console.log(`📋 Found ${events.length} events from Calendly for ${targetDate}`);
      
      let importedCount = 0;
      const customerDetails = [];
      
      // Process each event
      for (const event of events) {
        try {
          const eventId = event.uri.split('/').pop();
          const inviteesResponse = await fetch(`https://api.calendly.com/scheduled_events/${eventId}/invitees`, {
            headers: {
              'Authorization': `Bearer ${calendlyToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (inviteesResponse.ok) {
            const inviteesData = await inviteesResponse.json();
            const invitees = inviteesData.collection || [];
            
            for (const invitee of invitees) {
              // Extract phone from event location
              let phone = null;
              if (event.location && event.location.location) {
                const locationText = event.location.location;
                const phoneRegex = /[\+]?[1-9][\d\s\-\(\)]{8,20}/;
                if (phoneRegex.test(locationText)) {
                  phone = locationText.trim();
                }
              }
              
              // Create customer report
              const newCustomer = await storage.createCustomerReport({
                customerName: invitee.name || 'Unknown',
                customerEmail: invitee.email || '',
                customerPhone: phone,
                reportSent: false,
                reportReceivedDate: null,
                customerDate: targetDate,
                trackingRecordId: record.id
              });
              
              customerDetails.push({
                name: newCustomer.customerName,
                email: newCustomer.customerEmail,
                phone: newCustomer.customerPhone
              });
              
              importedCount++;
            }
          }
        } catch (eventError) {
          console.error('Error processing event:', eventError);
        }
      }
      
      // Update tracking record
      if (importedCount > 0) {
        await storage.updateTrackingRecord(record.id, {
          scheduledCustomers: importedCount
        });
      }
      
      res.json({
        success: true,
        date: targetDate,
        eventsFound: events.length,
        customersImported: importedCount,
        customers: customerDetails
      });
      
    } catch (error) {
      console.error('Test import error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Settings endpoints for data retention
  app.get('/api/settings/data-retention', async (req, res) => {
    try {
      const [setting] = await db.select().from(settings).where(eq(settings.key, 'data_retention'));
      res.json({ enabled: setting ? setting.value === 'true' : false });
    } catch (error) {
      console.error('Error getting data retention setting:', error);
      res.json({ enabled: false });
    }
  });

  app.post('/api/settings/data-retention', async (req, res) => {
    try {
      const { enabled } = req.body;
      
      // Check if setting exists
      const [existingSetting] = await db.select().from(settings).where(eq(settings.key, 'data_retention'));
      
      if (existingSetting) {
        await db.update(settings)
          .set({ value: enabled.toString() })
          .where(eq(settings.key, 'data_retention'));
      } else {
        await db.insert(settings).values({
          key: 'data_retention',
          value: enabled.toString()
        });
      }
      
      res.json({ success: true, enabled });
    } catch (error) {
      console.error('Error updating data retention setting:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Endpoint để test một ngày cụ thể với logs chi tiết
  app.post("/api/stripe/test-date", async (req, res) => {
    try {
      const { date } = req.body;
      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Missing Stripe secret key');
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      const startDate = new Date(date + "T00:00:00.000Z");
      const endDate = new Date(date + "T23:59:59.999Z");
      
      console.log(`🔍 Testing date: ${date}`);
      
      // Lấy charges cho ngày này
      const charges = await stripe.charges.list({
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
        limit: 20,
      });

      console.log(`📈 Found ${charges.data.length} charges for ${date}`);
      
      const results = [];
      let firstTimeCount = 0;
      const todayUniqueEmails = new Set();
      
      for (const charge of charges.data) {
        if (charge.status === 'succeeded' && charge.receipt_email) {
          const email = charge.receipt_email.toLowerCase();
          
          if (!todayUniqueEmails.has(email)) {
            todayUniqueEmails.add(email);
            
            // Kiểm tra payments trước ngày này
            const previousPayments = await stripe.charges.list({
              created: {
                lt: Math.floor(startDate.getTime() / 1000),
              },
              limit: 100,
            });
            
            const hasPaymentBefore = previousPayments.data.some(prevCharge => 
              prevCharge.status === 'succeeded' && 
              prevCharge.receipt_email && 
              prevCharge.receipt_email.toLowerCase() === email
            );
            
            const isFirstTime = !hasPaymentBefore;
            if (isFirstTime) firstTimeCount++;
            
            const result = {
              email,
              amount: charge.amount / 100,
              currency: charge.currency.toUpperCase(),
              isFirstTime,
              created: new Date(charge.created * 1000).toISOString()
            };
            
            results.push(result);
            console.log(`${isFirstTime ? '✅ First-time' : '❌ Returning'} customer: ${email} (${result.amount} ${result.currency})`);
          }
        }
      }
      
      console.log(`💰 Total first-time payments: ${firstTimeCount}/${results.length}`);
      
      res.json({ 
        success: true, 
        date,
        totalCharges: charges.data.length,
        validPayments: results.length,
        firstTimePayments: firstTimeCount,
        details: results
      });
      
    } catch (error) {
      console.error("❌ Stripe test error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Simple test endpoint để check Stripe connection  
  app.get("/api/stripe/test-connection", async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Missing Stripe secret key');
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      // Test với 1 charge để verify connection
      const charges = await stripe.charges.list({ limit: 1 });
      
      res.json({ 
        success: true, 
        connected: true,
        message: `Stripe connected. Found ${charges.data.length} charges.`
      });
      
    } catch (error) {
      console.error("❌ Stripe test error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Endpoint để refresh tất cả Stripe payments cho tracking records với timeout protection
  app.post("/api/stripe/refresh-all-payments", async (req, res) => {
    // Set timeout 60 seconds for this endpoint
    req.setTimeout(60000);
    
    try {
      console.log('🔄 Starting Stripe refresh for all tracking records...');
      
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Missing Stripe secret key');
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      // Lấy tất cả tracking records cho tháng 6/2025
      const allRecords = await storage.getTrackingRecords();
      const trackingRecords = allRecords
        .filter(record => record.date.startsWith('2025-06'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
      console.log(`📊 Processing ${trackingRecords.length} most recent records (limited for performance)...`);
      
      let updatedCount = 0;
      
      // Process records sequentially để tránh timeout
      for (const record of trackingRecords) {
        try {
          console.log(`🔍 Checking payments for date: ${record.date}`);
          
          const startDate = new Date(record.date + "T00:00:00.000Z");
          const endDate = new Date(record.date + "T23:59:59.999Z");
          
          // Lấy charges với timeout protection và limit thấp hơn
          const chargesPromise = stripe.charges.list({
            created: {
              gte: Math.floor(startDate.getTime() / 1000),
              lte: Math.floor(endDate.getTime() / 1000),
            },
            limit: 50, // Reduced limit for faster response
          });
          
          // Add timeout protection per API call
          const charges = await Promise.race([
            chargesPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Stripe API timeout for this date')), 15000)
            )
          ]);

          console.log(`📈 Found ${charges.data.length} charges for ${record.date}`);
          
          // Thực sự kiểm tra first-time payments
          let firstTimePayments = 0;
          const todayUniqueEmails = new Set();
          
          for (const charge of charges.data) {
            if (charge.status === 'succeeded' && charge.receipt_email) {
              const email = charge.receipt_email.toLowerCase();
              
              // Chỉ đếm mỗi email một lần trong ngày
              if (!todayUniqueEmails.has(email)) {
                todayUniqueEmails.add(email);
                
                // Kiểm tra xem email này có từng thanh toán trước ngày này không
                const previousPayments = await stripe.charges.list({
                  created: {
                    lt: Math.floor(startDate.getTime() / 1000), // Trước ngày này
                  },
                  limit: 100,
                });
                
                // Tìm xem email này có trong payments trước đó không
                const hasPaymentBefore = previousPayments.data.some(prevCharge => 
                  prevCharge.status === 'succeeded' && 
                  prevCharge.receipt_email && 
                  prevCharge.receipt_email.toLowerCase() === email
                );
                
                // Nếu không có payment trước đó thì đây là first-time customer
                if (!hasPaymentBefore) {
                  firstTimePayments++;
                  console.log(`✅ First-time customer: ${email} (${charge.amount/100} ${charge.currency.toUpperCase()})`);
                } else {
                  console.log(`❌ Returning customer: ${email} (${charge.amount/100} ${charge.currency.toUpperCase()})`);
                }
              }
            }
          }
          
          console.log(`💰 Found ${firstTimePayments} first-time payments for ${record.date}`);
          
          // Cập nhật tracking record nếu số liệu khác
          if (record.closedCustomers !== firstTimePayments) {
            await storage.updateTrackingRecord(record.id, {
              closedCustomers: firstTimePayments
            });
            updatedCount++;
            console.log(`✅ Updated ${record.date}: ${record.closedCustomers} → ${firstTimePayments}`);
          }
          
        } catch (dateError) {
          console.error(`❌ Error processing ${record.date}:`, dateError);
          // Continue với record tiếp theo
        }
      }
      
      console.log(`🎉 Refresh completed. Updated ${updatedCount} records.`);
      
      res.json({ 
        success: true, 
        updatedCount,
        totalRecords: trackingRecords.length,
        message: `Updated ${updatedCount} out of ${trackingRecords.length} recent records`
      });
      
    } catch (error) {
      console.error("❌ Stripe refresh error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Endpoint để tìm tất cả payments $100+ trong khoảng thời gian
  app.post("/api/stripe/find-all-payments", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      const start = new Date(startDate + "T00:00:00.000Z");
      const end = new Date(endDate + "T23:59:59.999Z");
      
      console.log(`🔍 Searching Stripe payments from ${startDate} to ${endDate}...`);
      
      // Lấy tất cả charges trong khoảng thời gian
      const allCharges = [];
      let hasMore = true;
      let startingAfter = undefined;
      
      while (hasMore) {
        const params = {
          created: {
            gte: Math.floor(start.getTime() / 1000),
            lte: Math.floor(end.getTime() / 1000),
          },
          limit: 100,
          ...(startingAfter && { starting_after: startingAfter })
        };
        
        const charges = await stripe.charges.list(params);
        allCharges.push(...charges.data);
        
        hasMore = charges.has_more;
        if (hasMore && charges.data.length > 0) {
          startingAfter = charges.data[charges.data.length - 1].id;
        }
      }

      console.log(`📊 Found ${allCharges.length} total charges`);

      // Tìm first-time payments $100+
      const dailyStats = {};
      const firstTimePayments = [];
      let processedCount = 0;

      for (const charge of allCharges) {
        if (charge.status === 'succeeded' && charge.amount >= 10000) { // $100+
          const chargeDate = new Date(charge.created * 1000).toISOString().split('T')[0];
          const customerEmail = charge.receipt_email;
          
          processedCount++;
          console.log(`Processing payment ${processedCount}: $${charge.amount/100} for ${customerEmail} on ${chargeDate}`);
          
          if (customerEmail) {
            // Kiểm tra có phải first-time không
            const earlierCharges = await stripe.charges.list({
              created: {
                lt: charge.created,
              },
              limit: 100,
            });
            
            const previousPayments = earlierCharges.data.filter(prevCharge => 
              prevCharge.receipt_email === customerEmail && 
              prevCharge.status === 'succeeded' &&
              prevCharge.amount >= 10000 // Previous payments $100+
            );
            
            if (previousPayments.length === 0) {
              firstTimePayments.push({
                email: customerEmail,
                amount: charge.amount / 100,
                date: chargeDate,
                chargeId: charge.id
              });
              
              if (!dailyStats[chargeDate]) {
                dailyStats[chargeDate] = 0;
              }
              dailyStats[chargeDate]++;
              
              console.log(`✅ First-time $100+ payment: ${customerEmail} - $${charge.amount/100} on ${chargeDate}`);
            } else {
              console.log(`⏭️ Recurring customer: ${customerEmail} (${previousPayments.length} previous payments)`);
            }
          }
        }
      }

      console.log(`🎯 Total first-time $100+ payments found: ${firstTimePayments.length}`);

      res.json({
        success: true,
        totalFirstTimePayments: firstTimePayments.length,
        totalChargesFound: allCharges.length,
        dailyStats,
        payments: firstTimePayments,
        searchPeriod: { startDate, endDate }
      });
      
    } catch (error) {
      console.error("❌ Error finding all payments:", error);
      res.status(500).json({ error: "Failed to find payments: " + error.message });
    }
  });

  // Endpoint chuyên dụng để cập nhật toàn bộ tháng 6
  app.post("/api/stripe/refresh-june-complete", async (req, res) => {
    try {
      console.log('🚀 Starting complete June 2025 Stripe refresh...');
      
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ 
          success: false, 
          message: "Stripe secret key not configured" 
        });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      // Lấy TẤT CẢ tracking records trong tháng 6
      const allRecords = await storage.getTrackingRecords();
      const juneRecords = allRecords
        .filter(record => record.date.startsWith('2025-06'))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sắp xếp từ cũ đến mới
        
      console.log(`📊 Processing COMPLETE JUNE: ${juneRecords.length} records found`);
      
      let totalUpdated = 0;
      const results = [];
      
      // Lấy TẤT CẢ payments trong tháng 6 một lần
      const juneStart = new Date('2025-06-01T00:00:00.000Z');
      const juneEnd = new Date('2025-06-30T23:59:59.999Z');
      
      console.log('📥 Fetching ALL June payments from Stripe...');
      const allJuneCharges = await stripe.charges.list({
        created: {
          gte: Math.floor(juneStart.getTime() / 1000),
          lte: Math.floor(juneEnd.getTime() / 1000),
        },
        limit: 100, // Max limit
      });
      
      console.log(`💰 Found ${allJuneCharges.data.length} total charges in June 2025`);
      
      // Xử lý từng ngày
      for (const record of juneRecords) {
        const recordDate = record.date;
        console.log(`\n🔍 Processing ${recordDate}...`);
        
        // Lọc charges cho ngày này
        const dayCharges = allJuneCharges.data.filter(charge => {
          const chargeDate = new Date(charge.created * 1000).toISOString().split('T')[0];
          return chargeDate === recordDate;
        });
        
        console.log(`📈 Found ${dayCharges.data?.length || dayCharges.length} charges for ${recordDate}`);
        
        // Kiểm tra first-time customers
        let firstTimeCount = 0;
        const processedEmails = new Set();
        
        for (const charge of (dayCharges.data || dayCharges)) {
          if (charge.status === 'succeeded' && charge.receipt_email) {
            const email = charge.receipt_email.toLowerCase();
            
            if (!processedEmails.has(email)) {
              processedEmails.add(email);
              
              // Kiểm tra xem có payment nào trước ngày này không
              const hasEarlierPayment = allJuneCharges.data.some(earlierCharge => {
                if (earlierCharge.receipt_email?.toLowerCase() === email) {
                  const earlierDate = new Date(earlierCharge.created * 1000).toISOString().split('T')[0];
                  return earlierDate < recordDate;
                }
                return false;
              });
              
              if (!hasEarlierPayment) {
                firstTimeCount++;
                console.log(`✅ First-time customer: ${email} ($${(charge.amount / 100).toFixed(2)})`);
              } else {
                console.log(`❌ Returning customer: ${email} ($${(charge.amount / 100).toFixed(2)})`);
              }
            }
          }
        }
        
        console.log(`💰 Found ${firstTimeCount} first-time payments for ${recordDate}`);
        
        // Cập nhật record nếu khác
        if (record.closedCustomers !== firstTimeCount) {
          console.log(`🔄 Updating ${recordDate}: ${record.closedCustomers} → ${firstTimeCount}`);
          
          await storage.updateTrackingRecord(record.id, {
            closedCustomers: firstTimeCount
          });
          
          totalUpdated++;
          results.push({
            date: recordDate,
            oldValue: record.closedCustomers,
            newValue: firstTimeCount
          });
        } else {
          console.log(`✓ No change needed for ${recordDate}`);
        }
      }
      
      console.log(`\n🎉 June refresh complete! Updated ${totalUpdated} records`);
      
      res.json({
        success: true,
        message: `Successfully updated ${totalUpdated} records in June 2025`,
        totalRecords: juneRecords.length,
        updatedRecords: totalUpdated,
        results: results
      });
      
    } catch (error: any) {
      console.error('❌ Error in June Stripe refresh:', error);
      res.status(500).json({
        success: false,
        message: "Failed to refresh June payments: " + error.message
      });
    }
  });

  // Endpoint để tạo toàn bộ tracking records cho tháng 6 và cập nhật Stripe
  app.post("/api/create-full-june-with-stripe", async (req, res) => {
    try {
      console.log('🚀 Creating full June 2025 tracking records with Stripe data...');
      
      // Tạo tracking records cho tất cả ngày trong tháng 6
      const results = [];
      
      for (let day = 1; day <= 30; day++) {
        const dateStr = `2025-06-${day.toString().padStart(2, '0')}`;
        
        // Kiểm tra xem record đã tồn tại chưa
        const existing = await storage.getTrackingRecords();
        const existingRecord = existing.find(r => r.date === dateStr);
        
        if (!existingRecord) {
          console.log(`📅 Creating record for ${dateStr}...`);
          
          const newRecord = await storage.createTrackingRecord({
            date: dateStr,
            scheduledCustomers: 0,
            reportedCustomers: 0,
            closedCustomers: 0,
            paymentStatus: "chưa pay"
          });
          
          results.push({
            date: dateStr,
            created: true,
            record: newRecord
          });
        } else {
          console.log(`✓ Record for ${dateStr} already exists`);
          results.push({
            date: dateStr,
            created: false,
            record: existingRecord
          });
        }
      }
      
      console.log(`📊 Created/found ${results.length} records for June 2025`);
      
      // Bây giờ chạy Stripe refresh cho toàn bộ tháng
      if (process.env.STRIPE_SECRET_KEY) {
        console.log('💳 Starting Stripe refresh for all June records...');
        
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        // Lấy TẤT CẢ payments trong tháng 6 một lần
        const juneStart = new Date('2025-06-01T00:00:00.000Z');
        const juneEnd = new Date('2025-06-30T23:59:59.999Z');
        
        console.log('📥 Fetching ALL June payments from Stripe...');
        const allJuneCharges = await stripe.charges.list({
          created: {
            gte: Math.floor(juneStart.getTime() / 1000),
            lte: Math.floor(juneEnd.getTime() / 1000),
          },
          limit: 100,
        });
        
        console.log(`💰 Found ${allJuneCharges.data.length} total charges in June 2025`);
        
        let stripeUpdated = 0;
        
        // Xử lý từng ngày
        for (const result of results) {
          const recordDate = result.date;
          
          // Lọc charges cho ngày này
          const dayCharges = allJuneCharges.data.filter(charge => {
            const chargeDate = new Date(charge.created * 1000).toISOString().split('T')[0];
            return chargeDate === recordDate;
          });
          
          if (dayCharges.length > 0) {
            console.log(`💳 Processing ${dayCharges.length} charges for ${recordDate}`);
            
            // Kiểm tra first-time customers
            let firstTimeCount = 0;
            const processedEmails = new Set();
            
            for (const charge of dayCharges) {
              if (charge.status === 'succeeded' && charge.receipt_email) {
                const email = charge.receipt_email.toLowerCase();
                
                if (!processedEmails.has(email)) {
                  processedEmails.add(email);
                  
                  // Kiểm tra xem có payment nào trước ngày này không
                  const hasEarlierPayment = allJuneCharges.data.some(earlierCharge => {
                    if (earlierCharge.receipt_email?.toLowerCase() === email) {
                      const earlierDate = new Date(earlierCharge.created * 1000).toISOString().split('T')[0];
                      return earlierDate < recordDate;
                    }
                    return false;
                  });
                  
                  if (!hasEarlierPayment) {
                    firstTimeCount++;
                    console.log(`✅ First-time customer: ${email} ($${(charge.amount / 100).toFixed(2)}) on ${recordDate}`);
                  }
                }
              }
            }
            
            // Cập nhật record nếu có first-time customers
            if (firstTimeCount > 0) {
              await storage.updateTrackingRecord(result.record.id, {
                closedCustomers: firstTimeCount
              });
              
              console.log(`🔄 Updated ${recordDate}: closedCustomers = ${firstTimeCount}`);
              stripeUpdated++;
            }
          }
        }
        
        console.log(`✅ Stripe processing complete! Updated ${stripeUpdated} records with payment data`);
      }
      
      res.json({
        success: true,
        message: `Successfully created/updated ${results.length} tracking records for June 2025`,
        created: results.filter(r => r.created).length,
        existing: results.filter(r => !r.created).length,
        stripeUpdated: stripeUpdated || 0,
        details: results
      });
      
    } catch (error: any) {
      console.error('❌ Error creating full June data:', error);
      res.status(500).json({
        success: false,
        message: "Failed to create full June data: " + error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
