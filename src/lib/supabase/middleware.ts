import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEFAULT_ROLE_MODULES } from '@/lib/modules-config'
import { UserRole } from '@/types/database.types'

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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {
    user = null;
  }

  // Permitir que las Server Actions de Next.js procedan sin ser interceptadas con redirección HTML
  if (request.headers.has('next-action')) {
    return supabaseResponse;
  }

  // Estricto Zero Trust: Toda ruta protegida exige autenticación formal con usuario y contraseña
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api')
  ) {
    // Si no hay usuario y trata de acceder al dashboard u otra ruta protegida
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Si ya está autenticado y quiere ir al login, enviarlo al dashboard
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  if (user) {
    const isMaster = user.email?.toLowerCase() === 'darinka.arias18@gmail.com';
    const role = (isMaster
      ? 'superadmin'
      : (user.user_metadata?.role || 'cajero')
    ).toLowerCase() as UserRole;

    const pathname = request.nextUrl.pathname;

    // Proteger rutas /admin/auditoria, /admin/logs y /admin/observaciones exclusivamente para superadmin
    if (
      pathname.startsWith('/admin/auditoria') ||
      pathname.startsWith('/admin/logs') ||
      pathname.startsWith('/admin/observaciones')
    ) {
      if (role !== 'superadmin') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }

    // Proteger resto de rutas /admin para superadmin y admin
    if (pathname.startsWith('/admin')) {
      if (role !== 'admin' && role !== 'superadmin') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }

    // Proteger rutas operativas según módulos asignados al rol o usuario
    if (
      role !== 'superadmin' &&
      role !== 'admin' &&
      pathname !== '/' &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/auth') &&
      !pathname.startsWith('/api')
    ) {
      const customModules =
        Array.isArray(user.user_metadata?.allowed_modules) &&
        user.user_metadata.allowed_modules.length > 0
          ? (user.user_metadata.allowed_modules as string[])
          : null;

      const allowedRoutes = customModules || DEFAULT_ROLE_MODULES[role] || ['/'];
      const hasAccess = allowedRoutes.some((route) =>
        route === '/'
          ? pathname === '/'
          : pathname === route || pathname.startsWith(`${route}/`)
      );

      if (!hasAccess) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
