import initSqlJs, { Database } from "sql.js";

let db: Database;

export async function initDB(): Promise<Database> {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS Contact (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phoneNumber TEXT,
      email TEXT,
      linkedId INTEGER,
      linkPrecedence TEXT NOT NULL CHECK(linkPrecedence IN ('primary', 'secondary')),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      deletedAt TEXT,
      FOREIGN KEY (linkedId) REFERENCES Contact(id)
    )
  `);

  return db;
}

export function getDB(): Database {
  return db;
}

export interface Contact {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: "primary" | "secondary";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

function rowsToContacts(results: any[]): Contact[] {
  if (results.length === 0) return [];
  const columns = results[0].columns;
  return results[0].values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, idx: number) => {
      obj[col] = row[idx];
    });
    return obj as Contact;
  });
}

export function findMatchingContacts(
  email: string | null,
  phoneNumber: string | null
): Contact[] {
  const conditions: string[] = [];
  const params: any[] = [];

  if (email) {
    conditions.push("email = ?");
    params.push(email);
  }
  if (phoneNumber) {
    conditions.push("phoneNumber = ?");
    params.push(phoneNumber);
  }

  if (conditions.length === 0) return [];

  const query = `SELECT id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt
    FROM Contact WHERE deletedAt IS NULL AND (${conditions.join(" OR ")}) ORDER BY createdAt ASC`;

  return rowsToContacts(db.exec(query, params));
}

export function getPrimaryContact(contact: Contact): Contact {
  if (contact.linkPrecedence === "primary") return contact;

  const results = db.exec(
    `SELECT id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt
     FROM Contact WHERE id = ? AND deletedAt IS NULL`,
    [contact.linkedId!]
  );

  const contacts = rowsToContacts(results);
  if (contacts.length === 0) return contact;
  return getPrimaryContact(contacts[0]);
}

export function getLinkedContacts(primaryId: number): Contact[] {
  const results = db.exec(
    `SELECT id, phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt
     FROM Contact WHERE (id = ? OR linkedId = ?) AND deletedAt IS NULL ORDER BY createdAt ASC`,
    [primaryId, primaryId]
  );
  return rowsToContacts(results);
}

export function createContact(
  email: string | null,
  phoneNumber: string | null,
  linkedId: number | null,
  linkPrecedence: "primary" | "secondary"
): Contact {
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
    [phoneNumber, email, linkedId, linkPrecedence, now, now]
  );

  const results = db.exec(`SELECT last_insert_rowid() as id`);
  const newId = results[0].values[0][0] as number;

  return {
    id: newId,
    phoneNumber,
    email,
    linkedId,
    linkPrecedence,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

export function updateToSecondary(contactId: number, linkedId: number): void {
  const now = new Date().toISOString();
  db.run(
    `UPDATE Contact SET linkPrecedence = 'secondary', linkedId = ?, updatedAt = ? WHERE id = ?`,
    [linkedId, now, contactId]
  );
}

export function rePointSecondaries(oldPrimaryId: number, newPrimaryId: number): void {
  const now = new Date().toISOString();
  db.run(
    `UPDATE Contact SET linkedId = ?, updatedAt = ? WHERE linkedId = ?`,
    [newPrimaryId, now, oldPrimaryId]
  );
}
