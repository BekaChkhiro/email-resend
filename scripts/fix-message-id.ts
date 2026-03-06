import "dotenv/config";
import { prisma } from "../src/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function fixMessageId() {
  // Get the message we added
  const msg = await prisma.inboxMessage.findFirst({
    where: { resendId: "ee1307d5-6a0c-40fb-bb26-c2c92ba713d5" },
  });

  if (!msg) {
    console.log("Message not found");
    return;
  }

  console.log("Current messageId:", msg.messageId);

  // Fetch from Resend to get the actual Message-ID
  try {
    const response = await (resend.emails as any).receiving.get(
      "ee1307d5-6a0c-40fb-bb26-c2c92ba713d5"
    );

    const messageId = response.data?.message_id;
    console.log("Found Message-ID:", messageId);

    if (messageId) {
      await prisma.inboxMessage.update({
        where: { id: msg.id },
        data: { messageId },
      });
      console.log("Updated successfully!");
    }
  } catch (e) {
    console.error("Error:", e);
  }

  await prisma.$disconnect();
}

fixMessageId();
