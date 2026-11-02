import fs from 'fs';
import path from 'path';

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
  try {
    if (!fs.existsSync(COMPLAINTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(COMPLAINTS_FILE, 'utf8'));
  } catch (err) {
    console.warn('[localComplaints] Failed to read complaints file:', err);
    return [];
  }
}

function saveComplaints(complaints: LocalComplaint[]) {
  try {
    const dir = path.dirname(COMPLAINTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(complaints, null, 2), 'utf8');
  } catch (err) {
    console.warn('[localComplaints] Failed to write complaints file:', err);
  }
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
