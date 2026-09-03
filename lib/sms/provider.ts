export interface SmsProvider {
  sendOtp(phoneNumber: string, code: string): Promise<boolean>;
}

class MockSmsProvider implements SmsProvider {
  async sendOtp(phoneNumber: string, code: string): Promise<boolean> {
    console.log(`[MOCK SMS] Sending OTP ${code} to ${phoneNumber}`);
    return true;
  }
}

class TwilioSmsProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromPhone: string;
  private channel: "sms" | "whatsapp";

  constructor() {
    this.accountSid = process.env.TWILIO_SID ?? "";
    this.authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
    this.fromPhone = process.env.TWILIO_PHONE ?? "";
    this.channel = process.env.TWILIO_CHANNEL === "whatsapp" ? "whatsapp" : "sms";

    if (!this.accountSid || !this.authToken || !this.fromPhone) {
      throw new Error(
        "TWILIO_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE are required when OTP_MOCK is disabled"
      );
    }
  }

  private prefixIfNeeded(number: string): string {
    if (this.channel === "whatsapp") {
      return number.startsWith("whatsapp:") ? number : `whatsapp:${number}`;
    }
    return number.replace(/^whatsapp:/, "");
  }

  async sendOtp(phoneNumber: string, code: string): Promise<boolean> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: this.prefixIfNeeded(phoneNumber),
      From: this.prefixIfNeeded(this.fromPhone),
      Body: `Your verification code is: ${code}. It expires in 5 minutes.`,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    return response.ok;
  }
}

export function getSmsProvider(): SmsProvider {
  if (process.env.OTP_MOCK === "true") {
    return new MockSmsProvider();
  }
  return new TwilioSmsProvider();
}
