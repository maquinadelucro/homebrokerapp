import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  // Gerar um token CSRF aleatório
  const csrfToken = crypto.randomBytes(32).toString('hex');
  
  return NextResponse.json({ csrfToken });
}