// Script để test import khách hàng từ Calendly cho ngày 26/06/2025
import { db } from './server/db.js';
import { storage } from './server/storage.js';
import { settings } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testCalendlyImport() {
  try {
    const targetDate = '2025-06-26';
    console.log(`🧪 Testing Calendly import for ${targetDate}...`);
    
    // Get existing tracking record for this date
    const records = await storage.getTrackingRecords();
    const record = records.find(r => r.date === targetDate);
    
    if (!record) {
      console.log('❌ No tracking record found for this date');
      return;
    }
    
    console.log(`Found tracking record ID: ${record.id}`);
    
    // Get Calendly token from database
    const [tokenSetting] = await db.select().from(settings).where(eq(settings.key, 'calendly_token'));
    
    if (!tokenSetting) {
      console.log('❌ No Calendly token found');
      return;
    }
    
    const calendlyToken = tokenSetting.value;
    console.log('✅ Found Calendly token');
    
    // Call Calendly API
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = nextDay.toISOString().split('T')[0];
    
    const url = `https://api.calendly.com/scheduled_events?user=https://api.calendly.com/users/GHEAKECV6H5CQZ2A&min_start_time=${targetDate}T00:00:00.000000Z&max_start_time=${endDate}T00:00:00.000000Z&status=active`;
    console.log('📞 Calling Calendly API...');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${calendlyToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Failed to fetch from Calendly API: ${response.status}`);
      return;
    }
    
    const eventsData = await response.json();
    const events = eventsData.collection || [];
    
    console.log(`📋 Found ${events.length} events from Calendly for ${targetDate}`);
    
    if (events.length === 0) {
      console.log('ℹ️ No events found for this date');
      return;
    }
    
    let importedCount = 0;
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`Processing event: ${event.name}`);
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
            
            console.log(`Adding customer: ${invitee.name}, Email: ${invitee.email}, Phone: ${phone}`);
            
            // Create customer report
            await storage.createCustomerReport({
              customerName: invitee.name || 'Unknown',
              customerEmail: invitee.email || '',
              customerPhone: phone,
              reportSent: false,
              reportReceivedDate: null,
              customerDate: targetDate,
              trackingRecordId: record.id
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
      console.log(`✅ Successfully imported ${importedCount} customers from Calendly`);
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test import error:', error);
  }
  
  process.exit(0);
}

testCalendlyImport();