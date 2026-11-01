"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  AUTH_BROADCAST_CHANNEL,
  SESSION_EXPIRED_EVENT,
  authApi,
  broadcastAuth,
  type AuthBroadcastMessage,
  type AuthUser,
  type LoginPayload,
} from "@/lib/api";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  sessionExpired: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [bootstrapKey, setBootstrapKey] = useState(0);
  const cancelledRef = useRef(false);

  const retry = useCallback(() => {
    setBootstrapKey((current) => current + 1);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;

    async function bootstrap() {
      setStatus("loading");
      setSessionExpired(false);

      try {
        const currentUser = await authApi.me();
        if (!cancelledRef.current) {
          setUser(currentUser);
          setStatus("authenticated");
        }
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          (error.status !== 401 && error.status !== 403)
        ) {
          if (!cancelledRef.current) {
            setStatus("error");
          }
          return;
        }

        try {
          const session = await authApi.refresh();
          if (!cancelledRef.current) {
            setUser(session.user);
            setStatus("authenticated");
          }
        } catch (refreshError) {
          if (cancelledRef.current) {
            return;
          }

          if (
            refreshError instanceof ApiError &&
            (refreshError.status === 401 || refreshError.status === 403)
          ) {
            setUser(null);
            setStatus("unauthenticated");
          } else {
            setStatus("error");
          }
        }
      }
    }

    void bootstrap();

    return () => {
      cancelledRef.current = true;
    };
  }, [bootstrapKey]);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
      setStatus("authenticated");
    } catch {
      // Sinkronisasi antar-tab bersifat best effort.
    }
  }, []);

  useEffect(() => {
    function handleExpired() {
      setUser(null);
      setStatus("unauthenticated");
      setSessionExpired(true);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
        const message = event.data;
        if (!message) {
          return;
        }

        if (message.type === "signed-in") {
          void refreshUser();
          return;
        }

        setUser(null);
        setStatus("unauthenticated");
        setSessionExpired(message.type === "session-expired");
      };
    }

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
      channel?.close();
    };
  }, [refreshUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    const session = await authApi.login(payload);
    setUser(session.user);
    setStatus("authenticated");
    setSessionExpired(false);
    broadcastAuth({ type: "signed-in" });
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // State lokal tetap dibersihkan walau server tidak dapat dihubungi.
    }

    setUser(null);
    setStatus("unauthenticated");
    setSessionExpired(false);
    broadcastAuth({ type: "signed-out" });
  }, []);

  return (
    <AuthContext.Provider
      value={{ status, user, sessionExpired, login, logout, retry }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider");
  }

  return context;
}
