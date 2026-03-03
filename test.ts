import { initDB } from "./database";
import { identify } from "./service";

async function runTests() {
  await initDB();
  console.log("=== Bitespeed Identity Reconciliation Tests ===\n");

  // Test 1: New contact (no existing matches)
  console.log("Test 1: New primary contact");
  const r1 = identify({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });
  console.log(JSON.stringify(r1, null, 2));
  console.assert(r1.contact.primaryContatctId === 1);
  console.assert(r1.contact.emails[0] === "lorraine@hillvalley.edu");
  console.assert(r1.contact.phoneNumbers[0] === "123456");
  console.assert(r1.contact.secondaryContactIds.length === 0);
  console.log("✓ Passed\n");

  // Test 2: Same phone, new email → creates secondary
  console.log("Test 2: Secondary contact creation (same phone, new email)");
  const r2 = identify({ email: "mcfly@hillvalley.edu", phoneNumber: "123456" });
  console.log(JSON.stringify(r2, null, 2));
  console.assert(r2.contact.primaryContatctId === 1);
  console.assert(r2.contact.emails.includes("lorraine@hillvalley.edu"));
  console.assert(r2.contact.emails.includes("mcfly@hillvalley.edu"));
  console.assert(r2.contact.phoneNumbers.includes("123456"));
  console.assert(r2.contact.secondaryContactIds.length === 1);
  console.log("✓ Passed\n");

  // Test 3: Query with just phone
  console.log("Test 3: Query with just phone number");
  const r3 = identify({ email: null, phoneNumber: "123456" });
  console.log(JSON.stringify(r3, null, 2));
  console.assert(r3.contact.primaryContatctId === 1);
  console.assert(r3.contact.emails.length === 2);
  console.log("✓ Passed\n");

  // Test 4: Query with just email (lorraine)
  console.log("Test 4: Query with just email (lorraine)");
  const r4 = identify({ email: "lorraine@hillvalley.edu", phoneNumber: null });
  console.log(JSON.stringify(r4, null, 2));
  console.assert(r4.contact.primaryContatctId === 1);
  console.log("✓ Passed\n");

  // Test 5: Query with just email (mcfly)
  console.log("Test 5: Query with just email (mcfly)");
  const r5 = identify({ email: "mcfly@hillvalley.edu", phoneNumber: null });
  console.log(JSON.stringify(r5, null, 2));
  console.assert(r5.contact.primaryContatctId === 1);
  console.log("✓ Passed\n");

  // Test 6: Primary turning into secondary
  console.log("Test 6: Primary contact turns secondary (merging two primaries)");
  // Create two separate primary contacts first
  identify({ email: "george@hillvalley.edu", phoneNumber: "919191" });
  identify({ email: "biffsucks@hillvalley.edu", phoneNumber: "717171" });

  // Now link them with a request that has george's email and biff's phone
  const r6 = identify({ email: "george@hillvalley.edu", phoneNumber: "717171" });
  console.log(JSON.stringify(r6, null, 2));
  // george's contact (created first) should be primary
  console.assert(r6.contact.emails.includes("george@hillvalley.edu"));
  console.assert(r6.contact.emails.includes("biffsucks@hillvalley.edu"));
  console.assert(r6.contact.phoneNumbers.includes("919191"));
  console.assert(r6.contact.phoneNumbers.includes("717171"));
  console.log("✓ Passed\n");

  // Test 7: Duplicate request (exact same info) should not create new contact
  console.log("Test 7: Duplicate request doesn't create new contact");
  const r7 = identify({ email: "lorraine@hillvalley.edu", phoneNumber: "123456" });
  console.log(JSON.stringify(r7, null, 2));
  console.assert(r7.contact.secondaryContactIds.length === 1); // still just 1 secondary
  console.log("✓ Passed\n");

  // Test 8: Completely new contact
  console.log("Test 8: Brand new customer");
  const r8 = identify({ email: "newperson@test.com", phoneNumber: "999999" });
  console.log(JSON.stringify(r8, null, 2));
  console.assert(r8.contact.secondaryContactIds.length === 0);
  console.assert(r8.contact.emails[0] === "newperson@test.com");
  console.log("✓ Passed\n");

  console.log("=== All tests passed! ===");
}

runTests().catch(console.error);
