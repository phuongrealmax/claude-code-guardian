import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Handle Google verification file
  if (request.nextUrl.pathname === '/google2be428d36c826426.html') {
    return new NextResponse('google-site-verification: google2be428d36c826426.html', {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/google2be428d36c826426.html'],
}
