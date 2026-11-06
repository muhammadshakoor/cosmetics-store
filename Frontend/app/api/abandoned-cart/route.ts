import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'Cart recovery emails are currently unavailable. Your cart is saved in this browser.' }, { status: 503 });
}
