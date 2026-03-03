import {
  Contact,
  findMatchingContacts,
  getPrimaryContact,
  getLinkedContacts,
  createContact,
  updateToSecondary,
  rePointSecondaries,
} from "./database";

export interface IdentifyRequest {
  email?: string | null;
  phoneNumber?: string | number | null;
}

export interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export function identify(request: IdentifyRequest): IdentifyResponse {
  const email = request.email || null;
  const phoneNumber = request.phoneNumber != null ? String(request.phoneNumber) : null;

  if (!email && !phoneNumber) {
    throw new Error("At least one of email or phoneNumber must be provided");
  }

  // Step 1: Find all existing contacts that match email or phone
  const matchingContacts = findMatchingContacts(email, phoneNumber);

  // Step 2: No matches - create a new primary contact
  if (matchingContacts.length === 0) {
    const newContact = createContact(email, phoneNumber, null, "primary");
    return buildResponse(newContact.id);
  }

  // Step 3: Find all unique primary contacts in the matched set
  const primaryContactsMap = new Map<number, Contact>();
  for (const contact of matchingContacts) {
    const primary = getPrimaryContact(contact);
    primaryContactsMap.set(primary.id, primary);
  }

  const primaryContacts = Array.from(primaryContactsMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // The oldest primary becomes/stays the primary
  const truePrimary = primaryContacts[0];

  // Step 4: If multiple primary contacts found, merge them
  // The newer primary contacts become secondary
  for (let i = 1; i < primaryContacts.length; i++) {
    const olderPrimary = primaryContacts[i];
    // Re-point all secondaries of this primary to the true primary
    rePointSecondaries(olderPrimary.id, truePrimary.id);
    // Turn this primary into a secondary
    updateToSecondary(olderPrimary.id, truePrimary.id);
  }

  // Step 5: Check if we need to create a new secondary contact
  // Only if the incoming request has new information not already in the linked set
  const allLinked = getLinkedContacts(truePrimary.id);

  const existingEmails = new Set(allLinked.map((c) => c.email).filter(Boolean));
  const existingPhones = new Set(allLinked.map((c) => c.phoneNumber).filter(Boolean));

  const hasNewEmail = email && !existingEmails.has(email);
  const hasNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

  // Check if exact combination already exists
  const exactMatch = allLinked.some(
    (c) =>
      (email ? c.email === email : c.email === null) &&
      (phoneNumber ? c.phoneNumber === phoneNumber : c.phoneNumber === null)
  );

  if ((hasNewEmail || hasNewPhone) && !exactMatch) {
    createContact(email, phoneNumber, truePrimary.id, "secondary");
  }

  return buildResponse(truePrimary.id);
}

function buildResponse(primaryId: number): IdentifyResponse {
  const allContacts = getLinkedContacts(primaryId);

  const primary = allContacts.find((c) => c.id === primaryId)!;
  const secondaries = allContacts.filter((c) => c.id !== primaryId);

  // Collect unique emails - primary's email first
  const emails: string[] = [];
  if (primary.email) emails.push(primary.email);
  for (const c of secondaries) {
    if (c.email && !emails.includes(c.email)) {
      emails.push(c.email);
    }
  }

  // Collect unique phone numbers - primary's phone first
  const phoneNumbers: string[] = [];
  if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);
  for (const c of secondaries) {
    if (c.phoneNumber && !phoneNumbers.includes(c.phoneNumber)) {
      phoneNumbers.push(c.phoneNumber);
    }
  }

  const secondaryContactIds = secondaries.map((c) => c.id);

  return {
    contact: {
      primaryContatctId: primaryId,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  };
}
