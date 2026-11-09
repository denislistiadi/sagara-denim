import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/components/auth/auth-provider";
import { makeAuthUser } from "@/test/fixtures";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);

function mockAuth(
  status: "loading" | "authenticated" | "unauthenticated" | "error",
  options: { sessionExpired?: boolean; retry?: () => void } = {},
) {
  useAuthMock.mockReturnValue({
    status,
    user: status === "authenticated" ? makeAuthUser() : null,
    sessionExpired: options.sessionExpired ?? false,
    login: vi.fn(async () => makeAuthUser()),
    logout: vi.fn(async () => {}),
    retry: options.retry ?? vi.fn(),
  });
}

describe("AuthGate", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("mengalihkan ke login saat sesi tidak terautentikasi", async () => {
    mockAuth("unauthenticated");

    render(
      <AuthGate>
        <p>Konten rahasia</p>
      </AuthGate>,
    );

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/login?next=%2F"),
    );
    expect(screen.queryByText("Konten rahasia")).not.toBeInTheDocument();
  });

  it("menambahkan alasan kedaluwarsa saat sesi berakhir", async () => {
    mockAuth("unauthenticated", { sessionExpired: true });

    render(
      <AuthGate>
        <p>Konten rahasia</p>
      </AuthGate>,
    );

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/login?next=%2F&reason=expired"),
    );
  });

  it("merender children saat sesi terautentikasi", () => {
    mockAuth("authenticated");

    render(
      <AuthGate>
        <p>Konten rahasia</p>
      </AuthGate>,
    );

    expect(screen.getByText("Konten rahasia")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("menampilkan error koneksi dan memanggil retry", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    mockAuth("error", { retry });

    render(
      <AuthGate>
        <p>Konten rahasia</p>
      </AuthGate>,
    );

    expect(
      screen.getByRole("heading", { name: "Tidak dapat menghubungi server" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("menampilkan splash pemeriksaan sesi saat loading", () => {
    mockAuth("loading");

    render(
      <AuthGate>
        <p>Konten rahasia</p>
      </AuthGate>,
    );

    expect(screen.getByLabelText("Memeriksa sesi")).toBeInTheDocument();
    expect(screen.getByText("Memeriksa sesi Anda...")).toBeInTheDocument();
    expect(screen.queryByText("Konten rahasia")).not.toBeInTheDocument();
  });
});
