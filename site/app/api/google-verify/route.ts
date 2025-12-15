import { NextResponse } from 'next/server'

export async function GET() {
  return new NextResponse('google-site-verification: google2be428d36c826426.html', {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
