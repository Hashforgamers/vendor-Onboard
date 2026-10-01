import {NextRequest, NextResponse} from 'next/server';
import {authorizedAdmin} from './app/lib/admin-auth';
export async function middleware(request: NextRequest) {
  if (await authorizedAdmin(request.headers.get('authorization'))) return NextResponse.next();
  return new NextResponse('Hash team sign-in required', {
    status: 401,
    headers: {'WWW-Authenticate':'Basic realm="Hash Admin", charset="UTF-8"','Cache-Control':'no-store'},
  });
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
