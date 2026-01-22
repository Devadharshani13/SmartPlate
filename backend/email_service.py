import os
import asyncio
import logging
import resend
from dotenv import load_dotenv

load_dotenv()

# Initialize Resend
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

logger = logging.getLogger(__name__)

async def send_welcome_email(recipient_email: str, user_name: str, role: str):
    """Send welcome email to newly registered user"""
    
    subject = f"Welcome to SmartPlate, {user_name}!"
    
    # HTML email template with inline CSS
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F9F7F2;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9F7F2; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #1A4D2E 0%, #0f3019 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
                                <h1 style="color: #FFFFFF; margin: 0; font-size: 32px; font-weight: bold;">SmartPlate</h1>
                                <p style="color: #FFFFFF; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Reducing Hunger Through Food Redistribution</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1F2937; margin: 0 0 20px 0; font-size: 24px;">Welcome, {user_name}! 🎉</h2>
                                
                                <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Thank you for joining SmartPlate as a <strong>{role.upper()}</strong>. Together, we're working towards achieving SDG-2: Zero Hunger.
                                </p>
                                
                                <div style="background-color: #F9F7F2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="color: #1A4D2E; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
                                    {get_role_specific_content(role)}
                                </div>
                                
                                <div style="background-color: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <p style="color: #2E7D32; margin: 0; font-size: 14px;">
                                        <strong>💡 Did you know?</strong> Every meal delivered through SmartPlate prevents food waste and helps someone in need.
                                    </p>
                                </div>
                                
                                <p style="color: #4B5563; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                                    If you have any questions, feel free to reach out to our support team.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F9F7F2; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
                                <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 10px 0;">
                                    SmartPlate - Fighting Hunger, One Meal at a Time
                                </p>
                                <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                                    Aligned with UN SDG-2 (Zero Hunger) & SDG-12 (Responsible Consumption)
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Welcome email sent to {recipient_email}, email_id: {email.get('id')}")
        return {"status": "success", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send welcome email to {recipient_email}: {str(e)}")
        return {"status": "error", "error": str(e)}


def get_role_specific_content(role: str) -> str:
    """Get role-specific content for welcome email"""
    
    if role == "ngo":
        return """
        <ul style="color: #4B5563; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Your account needs verification by our admin team</li>
            <li>Once verified, you can create food requests</li>
            <li>Track all your requests in the dashboard</li>
            <li>Get real-time updates when donors respond</li>
        </ul>
        """
    elif role == "donor":
        return """
        <ul style="color: #4B5563; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Browse food requests from verified NGOs</li>
            <li>Accept requests and upload food proof photos</li>
            <li>Choose to deliver yourself or request a volunteer</li>
            <li>Make an impact in your local community</li>
        </ul>
        """
    elif role == "volunteer":
        return """
        <ul style="color: #4B5563; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Upload your ID proof for verification</li>
            <li>Once approved, you can accept delivery tasks</li>
            <li>Earn reliability scores with each delivery</li>
            <li>Help connect donors and NGOs efficiently</li>
        </ul>
        """
    elif role == "admin":
        return """
        <ul style="color: #4B5563; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Access the admin dashboard</li>
            <li>Verify NGOs and volunteers</li>
            <li>Monitor system analytics</li>
            <li>Manage user accounts and reports</li>
        </ul>
        """
    else:
        return """
        <ul style="color: #4B5563; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Explore your dashboard</li>
            <li>Complete your profile</li>
            <li>Start making a difference today!</li>
        </ul>
        """


async def send_verification_approved_email(recipient_email: str, user_name: str, role: str):
    """Send email when NGO or Volunteer is verified"""
    
    subject = "Your SmartPlate Account Has Been Verified! 🎉"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F9F7F2;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9F7F2; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px;">
                        <tr>
                            <td style="background: linear-gradient(135deg, #1A4D2E 0%, #0f3019 100%); padding: 40px; text-align: center; border-radius: 16px 16px 0 0;">
                                <h1 style="color: #FFFFFF; margin: 0; font-size: 32px;">✅ Verification Complete!</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1F2937; margin: 0 0 20px 0;">Great News, {user_name}!</h2>
                                <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
                                    Your {role.upper()} account has been verified by our admin team. You now have full access to SmartPlate!
                                </p>
                                <div style="background-color: #E8F5E9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                                    <p style="color: #2E7D32; margin: 0; font-size: 18px; font-weight: bold;">
                                        🚀 You're all set to start making an impact!
                                    </p>
                                </div>
                                <p style="color: #4B5563; font-size: 16px; line-height: 1.6;">
                                    Log in to your dashboard and start contributing to zero hunger today.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Verification email sent to {recipient_email}")
        return {"status": "success", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send verification email: {str(e)}")
        return {"status": "error", "error": str(e)}
