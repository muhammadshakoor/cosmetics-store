import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, items, total } = body;

    if (!email || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Email and cart items are required' }, { status: 400 });
    }

    console.log(`[Abandoned Cart Recovery Triggered] User: ${email}, Items: ${items.length}, Total: Rs. ${total}`);

    // Simulated email trigger (e.g. via Resend or SendGrid)
    return NextResponse.json({
      success: true,
      code: 'RECOVER5',
      message: `Abandoned cart recovery email sent to ${email} with 5% discount code RECOVER5`,
    });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
