import cron from 'node-cron';
import { storage } from './storage';

// Tự động tạo bảng chi tiết khách hàng mỗi ngày lúc 6AM Eastern Time
// Loại trừ thứ 7 (Saturday) và chủ nhật (Sunday)
export function startScheduler() {
  console.log('🕒 Khởi động scheduler cho việc tạo bảng tự động...');
  
  // Demo test: Chạy vào lúc 11:34 PM Eastern Time để test
  // Production: '0 6 * * 1-5' = 6:00 AM Eastern Time, Monday to Friday
  
  const job = cron.schedule('34 23 * * *', async () => {
    console.log('🚀 Bắt đầu tạo bảng tự động - DEMO TEST lúc 11:34PM Eastern Time...');
    
    try {
      // Lấy ngày hiện tại theo Eastern Time
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const todayDate = easternTime.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      console.log(`📅 Tạo bảng cho ngày: ${todayDate}`);
      
      // Kiểm tra xem bảng đã tồn tại chưa
      const existingRecords = await storage.getTrackingRecords();
      const existingRecord = existingRecords.find(r => r.date === todayDate);
      
      if (existingRecord) {
        console.log(`⚠️ Bảng cho ngày ${todayDate} đã tồn tại, bỏ qua việc tạo mới.`);
        return;
      }
      
      // Tạo tracking record mới
      const newRecord = await storage.createTrackingRecord({
        date: todayDate,
        scheduledCustomers: 0,
        reportedCustomers: 0,
        closedCustomers: 0,
        paymentStatus: "chưa pay"
      });
      
      console.log(`✅ Đã tạo tracking record ID: ${newRecord.id} cho ngày ${todayDate}`);
      
      // Tự động import khách hàng từ Calendly nếu có
      await autoImportFromCalendly(todayDate, newRecord.id);
      
      // Tự động kiểm tra Stripe payments
      await autoCheckStripePayments(todayDate);
      
      console.log(`🎉 Hoàn thành tạo bảng tự động cho ngày ${todayDate}`);
      
    } catch (error) {
      console.error('❌ Lỗi khi tạo bảng tự động:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Eastern Time
  });
  
  console.log('✅ Scheduler đã được khởi động - sẽ tạo bảng tự động lúc 6AM Eastern Time (thứ 2-6)');
}

// Hàm import tự động từ Calendly
async function autoImportFromCalendly(date: string, trackingRecordId: number) {
  try {
    console.log(`📞 Bắt đầu import khách hàng từ Calendly cho ngày ${date}...`);
    
    if (!process.env.CALENDLY_API_TOKEN || !process.env.CALENDLY_USER_URI) {
      console.log('⚠️ Thiếu Calendly API credentials, bỏ qua auto-import');
      return;
    }

    // Format date cho Calendly API
    const startDate = `${date}T00:00:00.000000Z`;
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = `${nextDay.toISOString().split('T')[0]}T00:00:00.000000Z`;

    // Gọi Calendly API
    const response = await fetch(`https://api.calendly.com/scheduled_events?user=${process.env.CALENDLY_USER_URI}&min_start_time=${startDate}&max_start_time=${endDate}&status=active`, {
      headers: {
        'Authorization': `Bearer ${process.env.CALENDLY_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('⚠️ Không thể kết nối Calendly API');
      return;
    }

    const eventsData = await response.json();
    const events = eventsData.collection || [];
    
    console.log(`📋 Tìm thấy ${events.length} events từ Calendly`);

    let importedCount = 0;

    // Xử lý từng event
    for (const event of events) {
      try {
        const eventId = event.uri.split('/').pop();
        const inviteesResponse = await fetch(`https://api.calendly.com/scheduled_events/${eventId}/invitees`, {
          headers: {
            'Authorization': `Bearer ${process.env.CALENDLY_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });

        if (inviteesResponse.ok) {
          const inviteesData = await inviteesResponse.json();
          const invitees = inviteesData.collection || [];

          for (const invitee of invitees) {
            // Lấy thông tin phone từ event location
            let phone = null;
            if (event.location && event.location.location) {
              const locationText = event.location.location;
              const phoneRegex = /[\+]?[1-9][\d\s\-\(\)]{8,20}/;
              if (phoneRegex.test(locationText)) {
                phone = locationText.trim();
              }
            }

            // Tạo customer report
            await storage.createCustomerReport({
              customerName: invitee.name || 'Unknown',
              customerEmail: invitee.email || '',
              customerPhone: phone,
              reportSent: false,
              reportReceivedDate: null,
              customerDate: date,
              trackingRecordId: trackingRecordId
            });
            
            importedCount++;
          }
        }
      } catch (eventError) {
        console.error('Lỗi xử lý event:', eventError);
      }
    }

    // Cập nhật scheduledCustomers trong tracking record
    if (importedCount > 0) {
      await storage.updateTrackingRecord(trackingRecordId, {
        scheduledCustomers: importedCount
      });
      console.log(`✅ Đã import ${importedCount} khách hàng từ Calendly`);
    }

  } catch (error) {
    console.error('❌ Lỗi khi auto-import từ Calendly:', error);
  }
}

// Hàm kiểm tra tự động Stripe payments
async function autoCheckStripePayments(date: string) {
  try {
    console.log(`💳 Kiểm tra Stripe payments cho ngày ${date}...`);
    
    // Import Stripe
    const Stripe = require('stripe');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('⚠️ Thiếu Stripe secret key, bỏ qua auto-check');
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Lấy payments cho ngày này
    const startOfDay = new Date(date + "T00:00:00.000Z");
    const endOfDay = new Date(date + "T23:59:59.999Z");
    
    const charges = await stripe.charges.list({
      created: {
        gte: Math.floor(startOfDay.getTime() / 1000),
        lte: Math.floor(endOfDay.getTime() / 1000),
      },
      limit: 100,
    });

    let firstTimePaymentCount = 0;

    // Kiểm tra first-time customers
    for (const charge of charges.data) {
      if (charge.status === 'succeeded') {
        const customerEmail = charge.receipt_email;
        
        if (customerEmail) {
          // Kiểm tra lịch sử thanh toán trước đó
          const customerHistoryCharges = await stripe.charges.list({
            created: {
              lt: Math.floor(startOfDay.getTime() / 1000),
            },
            limit: 100,
          });
          
          const previousPayments = customerHistoryCharges.data.filter(prevCharge => 
            prevCharge.receipt_email === customerEmail && prevCharge.status === 'succeeded'
          );
          
          if (previousPayments.length === 0) {
            firstTimePaymentCount++;
          }
        }
      }
    }

    // Cập nhật tracking record
    if (firstTimePaymentCount > 0) {
      const records = await storage.getTrackingRecords();
      const trackingRecord = records.find(r => r.date === date);
      
      if (trackingRecord) {
        await storage.updateTrackingRecord(trackingRecord.id, {
          closedCustomers: firstTimePaymentCount,
          paymentStatus: "đã pay"
        });
        console.log(`✅ Cập nhật ${firstTimePaymentCount} first-time payments`);
      }
    }

  } catch (error) {
    console.error('❌ Lỗi khi auto-check Stripe:', error);
  }
}

// Export để dùng ở nơi khác
export { autoImportFromCalendly, autoCheckStripePayments };