// Welcome email — sent on registration
export const welcomeEmail = (name: string, role: string): string => {
  const roleMessage =
    role === "HOST"
      ? `
        <p>As a host, you can start listing your properties and welcoming guests from around the world!</p>
        <a href="http://localhost:3000/listings" style="background-color:#FF5A5F;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">
          Create Your First Listing
        </a>
      `
      : `
        <p>As a guest, you can explore thousands of unique listings and book your next adventure!</p>
        <a href="http://localhost:3000/listings" style="background-color:#FF5A5F;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">
          Explore Listings
        </a>
      `;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Welcome to Airbnb, ${name}! 🎉</h1>
      <p>We're excited to have you on board.</p>
      ${roleMessage}
      <hr style="margin-top:32px;border:none;border-top:1px solid #eee;" />
      <p style="color:#999;font-size:12px;">If you did not create this account, please ignore this email.</p>
    </div>
  `;
};

// Booking confirmation email — sent on booking creation
export const bookingConfirmationEmail = (
  guestName: string,
  listingTitle: string,
  location: string,
  checkIn: string,
  checkOut: string,
  totalPrice: number
): string => {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Booking Confirmed! 🏠</h1>
      <p>Hi ${guestName}, your booking has been confirmed!</p>

      <div style="background-color:#f9f9f9;padding:24px;border-radius:8px;margin:24px 0;">
        <h2 style="margin-top:0;color:#333;">${listingTitle}</h2>
        <p><strong>📍 Location:</strong> ${location}</p>
        <p><strong>📅 Check-in:</strong> ${checkIn}</p>
        <p><strong>📅 Check-out:</strong> ${checkOut}</p>
        <p><strong>💰 Total Price:</strong> $${totalPrice}</p>
      </div>

      <p style="color:#666;">
        <strong>Cancellation Policy:</strong> You can cancel your booking at any time.
        Please note that cancellation policies vary by listing.
      </p>

      <hr style="margin-top:32px;border:none;border-top:1px solid #eee;" />
      <p style="color:#999;font-size:12px;">Thank you for choosing Airbnb!</p>
    </div>
  `;
};

// Booking cancellation email — sent on booking cancellation
export const bookingCancellationEmail = (
  guestName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string
): string => {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Booking Cancelled</h1>
      <p>Hi ${guestName}, your booking has been cancelled.</p>

      <div style="background-color:#f9f9f9;padding:24px;border-radius:8px;margin:24px 0;">
        <h2 style="margin-top:0;color:#333;">${listingTitle}</h2>
        <p><strong>📅 Check-in:</strong> ${checkIn}</p>
        <p><strong>📅 Check-out:</strong> ${checkOut}</p>
      </div>

      <p>We hope to see you again soon! Explore other listings and find your perfect stay.</p>

      <a href="http://localhost:3000/listings" style="background-color:#FF5A5F;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">
        Find Another Listing
      </a>

      <hr style="margin-top:32px;border:none;border-top:1px solid #eee;" />
      <p style="color:#999;font-size:12px;">Thank you for choosing Airbnb!</p>
    </div>
  `;
};

// Password reset email — sent on forgot password
export const passwordResetEmail = (
  name: string,
  resetLink: string
): string => {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Password Reset Request</h1>
      <p>Hi ${name}, we received a request to reset your password.</p>

      <p>Click the button below to reset your password:</p>

      <a href="${resetLink}" style="background-color:#FF5A5F;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">
        Reset Password
      </a>

      <p style="margin-top:24px;color:#666;">
        ⏰ This link expires in <strong>1 hour</strong>.
      </p>

      <p style="color:#666;">
        If you did not request this, ignore this email. Your password will not change.
      </p>

      <hr style="margin-top:32px;border:none;border-top:1px solid #eee;" />
      <p style="color:#999;font-size:12px;">Thank you for choosing Airbnb!</p>
    </div>
  `;
};