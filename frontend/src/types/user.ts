/** Tipe data master pengguna aplikasi. */

import type { UserRole } from "./common";

export type UserActiveFilter = "aktif" | "nonaktif" | "semua";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
