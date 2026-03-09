// Spam words categorized for detection and filtering
const SPAM_WORDS = {
  financial: [
    "earn",
    "earnings",
    "discount",
    "profit",
    "free",
    "money back",
    "cash",
    "bonus",
    "investment",
    "income",
    "save big",
    "lowest price",
    "cheap",
    "winner",
    "prize",
    "lottery",
    "claim your",
  ],
  urgency: [
    "act now",
    "urgent",
    "limited offer",
    "last chance",
    "hurry",
    "expires",
    "don't miss",
    "final notice",
    "time sensitive",
    "immediately",
    "only today",
    "deadline",
  ],
  marketing: [
    "buy now",
    "best price",
    "deal",
    "special promotion",
    "offer",
    "order now",
    "subscribe",
    "click below",
    "limited time",
    "exclusive",
    "save now",
  ],
  exaggerated: [
    "miracle",
    "amazing",
    "revolutionary",
    "incredible",
    "unbelievable",
    "guaranteed",
    "100%",
    "risk-free",
    "no obligation",
    "breakthrough",
  ],
  spammy: [
    "dear friend",
    "congratulations",
    "click here",
    "you have been selected",
    "you're a winner",
    "act immediately",
    "apply now",
    "as seen on",
    "call now",
    "no cost",
    "no fees",
    "no purchase",
    "opt-in",
    "please read",
    "see attachment",
    "special offer",
    "this is not spam",
    "unsubscribe",
    "what are you waiting for",
    "while supplies last",
  ],
};

// Flatten all spam words into a single array
const ALL_SPAM_WORDS = Object.values(SPAM_WORDS).flat();

export interface SpamCheckResult {
  hasSpamWords: boolean;
  foundWords: string[];
  categories: string[];
}

export function checkForSpamWords(text: string): SpamCheckResult {
  const lowerText = text.toLowerCase();
  const foundWords: string[] = [];
  const categories = new Set<string>();

  for (const [category, words] of Object.entries(SPAM_WORDS)) {
    for (const word of words) {
      if (lowerText.includes(word.toLowerCase())) {
        foundWords.push(word);
        categories.add(category);
      }
    }
  }

  return {
    hasSpamWords: foundWords.length > 0,
    foundWords,
    categories: Array.from(categories),
  };
}

// Replacements for common spam words with professional alternatives
const SPAM_REPLACEMENTS: Record<string, string> = {
  free: "complimentary",
  urgent: "timely",
  "act now": "when convenient",
  hurry: "at your earliest convenience",
  amazing: "noteworthy",
  incredible: "notable",
  guaranteed: "expected",
  "click here": "see the link",
  discount: "adjusted pricing",
  "limited offer": "current opportunity",
  "special promotion": "current program",
  exclusive: "select",
};

export function sanitizeContent(text: string): string {
  let result = text;

  for (const [spamWord, replacement] of Object.entries(SPAM_REPLACEMENTS)) {
    const regex = new RegExp(spamWord, "gi");
    result = result.replace(regex, replacement);
  }

  return result;
}

export function getSpamWordsList(): string[] {
  return ALL_SPAM_WORDS;
}
