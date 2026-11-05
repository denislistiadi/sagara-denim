/** Tipe bersama yang dipakai lintas domain. */

export type UserRole = "admin" | "operator" | "qc";

export type Tone =
  | "orange"
  | "green"
  | "blue"
  | "purple"
  | "amber"
  | "red";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: readonly UserRole[];
}

export interface UserSummary {
  id: string;
  name: string;
  role: UserRole;
}

export interface CustomerSummary {
  id: string;
  code: string;
  name: string;
}

export interface ProductSummary {
  id: string;
  code: string;
  name: string;
  size: string | null;
  color: string | null;
}
