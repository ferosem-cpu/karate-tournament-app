import { NextResponse } from 'next/server';

// Backend routing intentionally minimal — primary data layer is Firebase (Auth + Firestore + Storage).
export async function GET(_req, { params }) {
  return NextResponse.json({ ok: true, message: 'Kohai Platform API', path: params?.path || [] });
}

export async function POST(_req, { params }) {
  return NextResponse.json({ ok: true, path: params?.path || [] });
}
