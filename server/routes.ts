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

  // Direct scheduler test - manual trigger
  app.post("/api/run-scheduler-now", async (req, res) => {
    try {
      const { date } = req.body;
      const testDate = date || new Date().toISOString().split('T')[0];
      
      console.log(`🚀 RUNNING SCHEDULER TEST for ${testDate}`);
      
      // Import scheduler function directly
      const { runSchedulerTask } = require('./scheduler');
      
      // Run the actual scheduler task
      await runSchedulerTask();
      
      console.log(`✅ Scheduler task completed for ${testDate}`);
      
      res.json({
        success: true,
        message: `Scheduler executed successfully for ${testDate}`,
        date: testDate
      });
      
    } catch (error) {
      console.error('❌ Scheduler execution error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: `Scheduler failed: ${error.message}`
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
