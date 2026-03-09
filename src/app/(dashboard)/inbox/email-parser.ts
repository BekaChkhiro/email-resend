// Email content parser - separates main content, signature, and quoted replies

export type ParsedEmail = {
  mainContent: string;
  signature: string | null;
  quotedContent: QuotedBlock[];
};

export type QuotedBlock = {
  header: string | null; // e.g., "On 5 Mar 2026, at 13:35, Giorgi wrote:"
  content: string;
};

// Common signature separators
const SIGNATURE_PATTERNS = [
  /^--\s*$/m, // Standard "-- " separator
  /^_{3,}$/m, // Three or more underscores
  /^-{3,}$/m, // Three or more dashes
  /^Sent from my/im,
  /^Get Outlook for/im,
  /^All my best,?$/im,
  /^Best regards,?$/im,
  /^Kind regards,?$/im,
  /^Regards,?$/im,
  /^Thanks,?$/im,
  /^Thank you,?$/im,
  /^Cheers,?$/im,
  /^Sincerely,?$/im,
];

// Quote header patterns
const QUOTE_HEADER_PATTERNS = [
  /^>?\s*On .+wrote:?\s*$/im, // "On [date], [person] wrote:"
  /^>?\s*On .+, at .+, .+ wrote:?\s*$/im, // Apple Mail format
  /^-+\s*Original Message\s*-+$/im,
  /^From:.+\nSent:.+\nTo:.+\nSubject:/im, // Outlook format
  /^>?\s*\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}.+wrote:/im, // Date format variations
];

export function parseEmailContent(text: string | null): ParsedEmail {
  if (!text) {
    return {
      mainContent: "",
      signature: null,
      quotedContent: [],
    };
  }

  let content = text.trim();
  let signature: string | null = null;
  const quotedContent: QuotedBlock[] = [];

  // First, try to separate quoted content
  const quoteStartIndex = findQuoteStart(content);

  if (quoteStartIndex !== -1) {
    const beforeQuote = content.substring(0, quoteStartIndex).trim();
    const quoteSection = content.substring(quoteStartIndex).trim();

    content = beforeQuote;

    // Parse the quoted section
    const parsedQuote = parseQuotedSection(quoteSection);
    quotedContent.push(...parsedQuote);
  }

  // Now try to find and separate signature from main content
  const signatureIndex = findSignatureStart(content);

  if (signatureIndex !== -1) {
    signature = content.substring(signatureIndex).trim();
    content = content.substring(0, signatureIndex).trim();
  }

  // Clean up main content
  content = cleanupContent(content);

  return {
    mainContent: content,
    signature: signature ? cleanupSignature(signature) : null,
    quotedContent,
  };
}

function findQuoteStart(text: string): number {
  // Look for quote header patterns
  for (const pattern of QUOTE_HEADER_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      return match.index;
    }
  }

  // Look for lines starting with ">" that aren't just single quotes
  const lines = text.split("\n");
  let consecutiveQuotes = 0;
  let quoteStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith(">")) {
      if (quoteStartLine === -1) {
        quoteStartLine = i;
      }
      consecutiveQuotes++;
    } else if (consecutiveQuotes > 0) {
      // If we found at least 2 consecutive quoted lines, consider it a quote
      if (consecutiveQuotes >= 2) {
        break;
      }
      quoteStartLine = -1;
      consecutiveQuotes = 0;
    }
  }

  if (quoteStartLine !== -1 && consecutiveQuotes >= 2) {
    // Find the byte position
    let pos = 0;
    for (let i = 0; i < quoteStartLine; i++) {
      pos += lines[i].length + 1; // +1 for newline
    }
    return pos;
  }

  return -1;
}

function findSignatureStart(text: string): number {
  const lines = text.split("\n");

  // Look for signature patterns
  for (const pattern of SIGNATURE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      // Make sure it's not too early in the email (at least 20% through)
      if (match.index > text.length * 0.2) {
        return match.index;
      }
    }
  }

  // Look for common signature indicators in the last part of the email
  const lastThird = Math.floor(lines.length * 0.66);

  for (let i = lastThird; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for phone/website patterns that indicate signature
    if (
      /^(?:\+|tel:|phone:)/i.test(line) ||
      /^www\./i.test(line) ||
      /^https?:\/\//i.test(line) ||
      /^CEO|^CTO|^COO|^CFO|^Director|^Manager|^Founder/i.test(line)
    ) {
      // Find a good signature start point (go back a few lines)
      const sigStartLine = Math.max(lastThird, i - 3);
      let pos = 0;
      for (let j = 0; j < sigStartLine; j++) {
        pos += lines[j].length + 1;
      }
      return pos;
    }
  }

  return -1;
}

function parseQuotedSection(text: string): QuotedBlock[] {
  const blocks: QuotedBlock[] = [];
  let header: string | null = null;
  const contentLines: string[] = [];

  const lines = text.split("\n");

  for (const line of lines) {
    // Check if this is a quote header
    let isHeader = false;
    for (const pattern of QUOTE_HEADER_PATTERNS) {
      if (pattern.test(line)) {
        // If we have accumulated content, save it
        if (contentLines.length > 0) {
          blocks.push({
            header,
            content: contentLines.join("\n").trim(),
          });
          contentLines.length = 0;
        }
        header = line.replace(/^>\s*/, "").trim();
        isHeader = true;
        break;
      }
    }

    if (!isHeader) {
      // Remove leading ">" from quoted lines
      const cleanedLine = line.replace(/^>\s?/, "");
      contentLines.push(cleanedLine);
    }
  }

  // Don't forget the last block
  if (contentLines.length > 0) {
    blocks.push({
      header,
      content: contentLines.join("\n").trim(),
    });
  }

  return blocks;
}

function cleanupContent(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n") // Replace multiple newlines with double
    .replace(/^\s+|\s+$/g, "") // Trim
    .replace(/\u00A0/g, " "); // Replace non-breaking spaces
}

function cleanupSignature(text: string): string {
  return text
    .replace(/^--\s*\n?/, "") // Remove "-- " separator
    .replace(/^_{3,}\n?/, "") // Remove underscore separator
    .replace(/^-{3,}\n?/, "") // Remove dash separator
    .trim();
}

// Format signature for display
export function formatSignature(signature: string): string[] {
  return signature
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
