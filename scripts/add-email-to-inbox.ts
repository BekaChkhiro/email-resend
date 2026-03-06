import "dotenv/config";
import { prisma } from "../src/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function addEmailToInbox(emailId: string) {
  console.log(`Fetching email ${emailId} from Resend...`);

  const fromEmail = "susana@mezcalreina.com";
  const toEmail = "giorgi@getinfinity.website";
  const subject = "Re: Partership ideas";

  // Try to fetch email content from Resend
  let textBody = "";
  let htmlBody = "";
  let messageId: string | null = null;

  try {
    const inboundResponse = await (resend.emails as any).receiving.get(emailId);
    if (inboundResponse.data) {
      textBody = inboundResponse.data.text || "";
      htmlBody = inboundResponse.data.html || "";
      messageId = inboundResponse.data.message_id || null;
      console.log("Inbound content fetched successfully");
      console.log("Message-ID:", messageId);
    }
  } catch (e) {
    console.log("Could not fetch inbound content:", e);
  }

  // Find or create contact
  let contact = await prisma.contact.findFirst({
    where: { email: fromEmail },
  });

  if (!contact) {
    console.log("Contact not found, creating...");
    contact = await prisma.contact.create({
      data: {
        email: fromEmail,
        firstName: "Susana",
        lastName: "",
        fullName: "Susana",
        companyName: "Mezcal Reina",
      },
    });
    console.log("Contact created:", contact.id);
  } else {
    console.log("Contact found:", contact.id);
  }

  // Check if message already exists
  const existingMessage = await prisma.inboxMessage.findFirst({
    where: { resendId: emailId },
  });

  if (existingMessage) {
    console.log("Message already exists in inbox:", existingMessage.id);
    return;
  }

  // Create InboxMessage
  const inboxMessage = await prisma.inboxMessage.create({
    data: {
      contactId: contact.id,
      direction: "inbound",
      status: "unread",
      fromEmail,
      toEmail,
      subject,
      textBody,
      htmlBody,
      messageId,
      resendId: emailId,
      receivedAt: new Date(),
    },
  });

  console.log("InboxMessage created:", inboxMessage.id);
  console.log("Done! Email should now appear in inbox.");
}

// Run with the email ID
addEmailToInbox("ee1307d5-6a0c-40fb-bb26-c2c92ba713d5")
  .catch(console.error)
  .finally(() => prisma.$disconnect());
