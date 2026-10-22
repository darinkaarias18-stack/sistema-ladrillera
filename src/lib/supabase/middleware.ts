import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-project.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Soporte de sesión en desarrollo local para testing automatizado
  const devBypass = process.env.NODE_ENV === 'development' && request.nextUrl.searchParams.get('dev_bypass') === 'true';
  if (devBypass) {
    const url = request.nextUrl.clone();
    url.searchParams.delete('dev_bypass');
    const response = NextResponse.redirect(url);
    response.cookies.set('dev_session', 'true', { path: '/', httpOnly: true });
    return response;
  }
  const hasDevSession = process.env.NODE_ENV === 'development' && request.cookies.get('dev_session')?.value === 'true';
  if (hasDevSession) {
    return supabaseResponse;
  }

  // Proteger las rutas que requieran autenticación (ej. /dashboard)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // Si no hay usuario y trata de acceder al dashboard u otra ruta protegida
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si ya está autenticado y quiere ir al login, enviarlo al dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Proteger rutas /admin/auditoria exclusivamente para superadmin
  if (user && (request.nextUrl.pathname.startsWith('/admin/auditoria') || request.nextUrl.pathname.startsWith('/admin/logs'))) {
    const role = (user.user_metadata?.role || '').toLowerCase();
    if (role !== 'superadmin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Proteger resto de rutas /admin para superadmin y admin
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const role = (user.user_metadata?.role || '').toLowerCase();
    if (role && role !== 'admin' && role !== 'superadmin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
