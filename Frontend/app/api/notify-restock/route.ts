import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, productId, productName } = body;

    if (!email || !productId) {
      return NextResponse.json({ message: 'Email and productId are required' }, { status: 400 });
    }

    console.log(`[Restock Alert Registered] Email: ${email}, Product: ${productName || productId}`);

    return NextResponse.json({
      success: true,
      message: `Registered restock notification for ${email}`,
    });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
