import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, getQueryFn, queryClient } from '@/lib/query-client';

export interface Perfil {
  id: string;
  nombreUsuario: string;
  nombreCompleto: string;
  email: string | null;
  fotoBase64: string | null;
}

interface ContextoAuthValor {
  perfil: Perfil | null;
  cargando: boolean;
  autenticado: boolean;
  iniciarSesion: (datos: { nombreUsuario: string; contrasena: string }) => Promise<Perfil>;
  registrarse: (datos: { nombreUsuario: string; contrasena: string; nombreCompleto: string; email?: string }) => Promise<Perfil>;
  cerrarSesion: () => Promise<void>;
}

const ContextoAuth = createContext<ContextoAuthValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: perfil,
    isLoading: cargando,
  } = useQuery<Perfil | null>({
    queryKey: ["/api/auth/perfil"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const iniciarSesion = async (datos: { nombreUsuario: string; contrasena: string }): Promise<Perfil> => {
    const res = await apiRequest("POST", "/api/auth/login", datos);
    const perfilUsuario = await res.json();
    queryClient.setQueryData(["/api/auth/perfil"], perfilUsuario);
    return perfilUsuario;
  };

  const registrarse = async (datos: { nombreUsuario: string; contrasena: string; nombreCompleto: string; email?: string }): Promise<Perfil> => {
    const res = await apiRequest("POST", "/api/auth/registro", datos);
    const perfilUsuario = await res.json();
    queryClient.setQueryData(["/api/auth/perfil"], perfilUsuario);
    return perfilUsuario;
  };

  const cerrarSesion = async (): Promise<void> => {
    // Primero limpiar la sesión local para garantizar el logout en el cliente
    queryClient.setQueryData(["/api/auth/perfil"], null);
    // Luego notificar al servidor (en segundo plano, no bloquea la navegación)
    apiRequest("POST", "/api/auth/logout").catch(() => {});
  };

  const valor = useMemo(() => ({
    perfil: perfil ?? null,
    cargando,
    autenticado: !!perfil,
    iniciarSesion,
    registrarse,
    cerrarSesion,
  }), [perfil, cargando]);

  return (
    <ContextoAuth.Provider value={valor}>
      {children}
    </ContextoAuth.Provider>
  );
}

export function useAuth(): ContextoAuthValor {
  const contexto = useContext(ContextoAuth);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return contexto;
}
