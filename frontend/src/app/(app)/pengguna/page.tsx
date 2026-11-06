import { UserWorkspace } from "@/components/users/user-workspace";

export const instant = false;

export const metadata = {
  title: "Pengguna | Sagara Denim",
  description: "Kelola akses, peran, dan kata sandi pengguna aplikasi.",
};

export default function PenggunaPage() {
  return <UserWorkspace />;
}
