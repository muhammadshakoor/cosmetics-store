import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }
    // TODO: save to database / send to Mailchimp / ConvertKit
    console.log('[Newsletter] New subscriber:', email);
    return NextResponse.json({ message: 'Subscribed successfully!' });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
