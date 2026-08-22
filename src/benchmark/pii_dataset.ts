export interface PiiTestCase {
  id: string;
  category:
    | "obvious_pii"
    | "disguised_pii"
    | "false_positive"
    | "nested_json"
    | "malformed_payload"
    | "mixed_prose_json";
  input: string;
  expectedPiiPresent: boolean;
  expectedPiiTypes: string[];
  description: string;
}

function createPiiTestSuite(): PiiTestCase[] {
  const cases: PiiTestCase[] = [];

  // 1. Obvious PII (20 items)
  const obviousPiiSamples = [
    { text: "Contact patient John Doe at john.doe@health.org or 415-555-0199.", types: ["email", "phone"] },
    { text: "Social security number is 123-45-6789 for tax form verification.", types: ["ssn"] },
    { text: "Charge credit card 4532-0123-4567-8910 exp 12/28 CVV 441.", types: ["credit_card"] },
    { text: "Server connected from origin IP 192.168.1.104 via SSH.", types: ["ip_address"] },
    { text: "Prod API key: sample_key_51M0xYZ99aBCDEF0123456789ghijklmn.", types: ["api_key"] },
    { text: "User email alice.smith@company.io requested password reset.", types: ["email"] },
    { text: "Billing address SSN: 987-65-4321, Phone: (212) 555-0143.", types: ["ssn", "phone"] },
    { text: "Mastercard 5412-7512-3412-9812 authorized for payment.", types: ["credit_card"] },
    { text: "Client connect from IPv4 10.0.4.15 and IPv6 2001:db8::1.", types: ["ip_address"] },
    { text: "Github Token: ghp_A1B2C3D4E5F6G7H8I9J0k1l2m3n4o5p6q7r8.", types: ["api_key"] },
    { text: "Patient record SSN: 456-78-9012, Email: patient@hospital.com.", types: ["ssn", "email"] },
    { text: "Amex card 3782-822467-91001 processed for $450.", types: ["credit_card"] },
    { text: "Stripe live secret key: sample_key_99a88b77c66d55e44f33g22h11.", types: ["api_key"] },
    { text: "Contact Dr. Evans at 650-555-0182 or evans@clinic.org.", types: ["phone", "email"] },
    { text: "Taxpayer ID SSN: 000-12-3456 verified by auditor.", types: ["ssn"] },
    { text: "Visa debit 4000-1234-5678-9010 authorized.", types: ["credit_card"] },
    { text: "Outbound Webhook from 172.16.254.1 to internal portal.", types: ["ip_address"] },
    { text: "AWS Access Key AKIAIOSFODNN7EXAMPLE logged in trace.", types: ["api_key"] },
    { text: "Direct line: +1 (555) 234-5678, Email: CEO@corp.com.", types: ["phone", "email"] },
    { text: "Confidential SSN 111-22-3333 attached to loan application.", types: ["ssn"] },
  ];

  obviousPiiSamples.forEach((item, idx) => {
    cases.push({
      id: `pii-obvious-${idx + 1}`,
      category: "obvious_pii",
      input: item.text,
      expectedPiiPresent: true,
      expectedPiiTypes: item.types,
      description: `Standard explicit ${item.types.join(", ")} extraction`,
    });
  });

  // 2. Disguised / Spaced / Obfuscated PII (20 items)
  const disguisedSamples = [
    { text: "SSN is 1 2 3 - 4 5 - 6 7 8 9 for security verification.", types: ["ssn"] },
    { text: "Reach me at user [at] domain [dot] com for details.", types: ["email"] },
    { text: "Card number: 4532 - 0123 - 4567 - 8910.", types: ["credit_card"] },
    { text: "Secret key: sample _ key _ 99a88b77c66d55e44f33g22h11", types: ["api_key"] },
    { text: "My phone number is 4 1 5 . 5 5 5 . 0 1 9 9.", types: ["phone"] },
    { text: "Send docs to support(at)acme(dot)org.", types: ["email"] },
    { text: "SSN: 9 8 7 -- 6 5 -- 4 3 2 1.", types: ["ssn"] },
    { text: "Card: 5412 / 7512 / 3412 / 9812.", types: ["credit_card"] },
    { text: "IP address: 1 9 2 . 1 6 8 . 1 . 1", types: ["ip_address"] },
    { text: "Key: g h p _ A1B2C3D4E5F6G7H8I9J0", types: ["api_key"] },
    { text: "Email: admin [AT] internal [DOT] dev", types: ["email"] },
    { text: "Phone: +1 - 5 5 5 - 2 3 4 - 5 6 7 8", types: ["phone"] },
    { text: "SSN: 456 - 78 - 9012 (spaced dashes)", types: ["ssn"] },
    { text: "Visa: 4000 1234 5678 9010", types: ["credit_card"] },
    { text: "Address IP: 10 . 0 . 4 . 15", types: ["ip_address"] },
    { text: "API token: sample-key-51M0xYZ99aBCDEF0123456789", types: ["api_key"] },
    { text: "Mailto: contact {at} health {dot] io", types: ["email"] },
    { text: "Call 6 5 0 / 5 5 5 / 0 1 8 2 for support.", types: ["phone"] },
    { text: "SSN: 0 0 0 - 1 2 - 3 4 5 6", types: ["ssn"] },
    { text: "Card: 3782 - 822467 - 91001", types: ["credit_card"] },
  ];

  disguisedSamples.forEach((item, idx) => {
    cases.push({
      id: `pii-disguised-${idx + 1}`,
      category: "disguised_pii",
      input: item.text,
      expectedPiiPresent: true,
      expectedPiiTypes: item.types,
      description: `Disguised/spaced PII pattern for ${item.types.join(", ")}`,
    });
  });

  // 3. False Positive Triggers (20 items - Should NOT be detected as PII)
  const falsePositiveSamples = [
    { text: "Product SKU-123-45-678 is currently out of stock in warehouse B." },
    { text: "Docker image hash sha256:4532012345678910abcdef0123456789." },
    { text: "HTTP Status 404 - Resource Not Found on endpoint /v1/users." },
    { text: "Software version v1.2.3-beta.4 released yesterday." },
    { text: "Order confirmation #ORD-987-65-4321 processed successfully." },
    { text: "Serial number SN: 5412-7512-3412-9812-REV3." },
    { text: "UUID: e4eaaaf2-d142-11e1-b3e4-080027620cdd." },
    { text: "CSS color hex code #192168 or RGB(192, 168, 1)." },
    { text: "Git commit hash 51M0xYZ99aBCDEF0123456789ghijklmn." },
    { text: "Timestamp: 2026-08-22T14:10:00.000Z." },
    { text: "Parcel tracking #TRK-456-78-9012-US." },
    { text: "Math equation: 4000 - 1234 = 2766." },
    { text: "Internal building code BLD-172-16-254." },
    { text: "Part number PN-650-555-0182-A." },
    { text: "Database connection pool size = 50, timeout = 3000ms." },
    { text: "Invoice line item #111-22-3333-QTY-5." },
    { text: "Model identifier gpt-4-turbo-2024-04-09." },
    { text: "Kernel version 5.15.0-88-generic x86_64." },
    { text: "Ticket ID #TK-000-12-3456." },
    { text: "CSS background: rgba(255, 255, 255, 0.12)." },
  ];

  falsePositiveSamples.forEach((item, idx) => {
    cases.push({
      id: `pii-fp-${idx + 1}`,
      category: "false_positive",
      input: item.text,
      expectedPiiPresent: false,
      expectedPiiTypes: [],
      description: "Non-PII product code/identifier (False positive control)",
    });
  });

  // 4. Deeply Nested JSON Payloads (15 items)
  for (let i = 1; i <= 15; i++) {
    const hasPii = i % 2 === 1;
    const jsonStr = JSON.stringify({
      traceId: `trace-json-${i}`,
      span: {
        attributes: {
          http: {
            request: {
              headers: {
                authorization: hasPii ? "Bearer sample_key_51M0xYZ99aBCDEF0123456789" : "Bearer token_public",
                user_email: hasPii ? `user${i}@patient-care.org` : undefined,
              },
              body: {
                patientInfo: hasPii
                  ? { ssn: `123-45-${6780 + i}`, phone: `415-555-${100 + i}` }
                  : { status: "anonymous", active: true },
              },
            },
          },
        },
      },
    });

    cases.push({
      id: `pii-nested-json-${i}`,
      category: "nested_json",
      input: jsonStr,
      expectedPiiPresent: hasPii,
      expectedPiiTypes: hasPii ? ["api_key", "email", "ssn", "phone"] : [],
      description: `Deeply nested JSON payload (PII present: ${hasPii})`,
    });
  }

  // 5. Malformed / Corrupted Payloads (15 items)
  for (let i = 1; i <= 15; i++) {
    const hasPii = i % 2 === 1;
    const malformedText = `{ "raw_log": "UNTERMINATED_STRING... patient_ssn: ${
      hasPii ? `888-77-${6600 + i}` : "REDACTED"
    }, contact_email: ${
      hasPii ? `malformed${i}@test.com` : "none"
    }, credit_card: 4532-0123-4567-8910,,, [INVALID JSON SYNTAX }}}`;

    cases.push({
      id: `pii-malformed-${i}`,
      category: "malformed_payload",
      input: malformedText,
      expectedPiiPresent: true, // Contains credit_card or ssn/email
      expectedPiiTypes: hasPii ? ["ssn", "email", "credit_card"] : ["credit_card"],
      description: "Malformed/unparsed JSON string containing PII patterns",
    });
  }

  // 6. Mixed Prose + Unstructured JSON Payloads (10 items)
  for (let i = 1; i <= 10; i++) {
    const mixedText = `Trace captured at 2026-08-22. Agent output: "I evaluated ticket #884 and found customer email: lead${i}@corporate-domain.com. Card 4532-0123-4567-8910 was charged. Trace payload: { \\"ip\\": \\"192.168.1.50\\", \\"ssn\\": \\"333-22-1111\\" }."`;

    cases.push({
      id: `pii-mixed-${i}`,
      category: "mixed_prose_json",
      input: mixedText,
      expectedPiiPresent: true,
      expectedPiiTypes: ["email", "credit_card", "ip_address", "ssn"],
      description: "Mixed natural language prose containing embedded JSON substrings",
    });
  }

  return cases;
}

export const PII_BENCHMARK_SUITE: PiiTestCase[] = createPiiTestSuite();
