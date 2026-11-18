import fs from 'fs';
import path from 'path';
import { StoredComplaintSchema } from './complaints';

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved';

export interface LocalComplaint {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  orderId: string | null;
  category: string;
  subject: string;
  message: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
}

const COMPLAINTS_FILE = path.join(process.cwd(), 'data', 'complaints.json');

function readComplaints(): LocalComplaint[] {
  if (process.env.NODE_ENV !== 'development') throw new Error('Local complaints storage is available only in development.');
  if (!fs.existsSync(COMPLAINTS_FILE)) return [];
  const stored: unknown = JSON.parse(fs.readFileSync(COMPLAINTS_FILE, 'utf8'));
  if (!Array.isArray(stored)) throw new Error('Local complaints storage is corrupt.');
  return stored.map((value) => StoredComplaintSchema.parse(value));
}

function saveComplaints(complaints: LocalComplaint[]) {
  if (process.env.NODE_ENV !== 'development') throw new Error('Local complaints storage is available only in development.');
  const dir = path.dirname(COMPLAINTS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const temporary = `${COMPLAINTS_FILE}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(complaints, null, 2), 'utf8');
  fs.renameSync(temporary, COMPLAINTS_FILE);
}

export function addLocalComplaint(complaint: LocalComplaint): LocalComplaint {
  const complaints = readComplaints();
  complaints.unshift(complaint);
  saveComplaints(complaints);
  return complaint;
}

export function getLocalComplaints(userId?: string): LocalComplaint[] {
  const complaints = readComplaints();
  return userId ? complaints.filter((c) => c.userId === userId) : complaints;
}

export function updateLocalComplaintStatus(id: string, status: ComplaintStatus): LocalComplaint | null {
  const complaints = readComplaints();
  const complaint = complaints.find((c) => c.id === id);
  if (!complaint) return null;
  complaint.status = status;
  complaint.updatedAt = new Date().toISOString();
  saveComplaints(complaints);
  return complaint;
}
