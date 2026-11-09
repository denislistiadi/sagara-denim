import type {
  CatalogActiveFilter,
  CatalogListResponse,
  CustomerRecord,
  CustomerSummary,
  ProductRecord,
  ProductSummary,
  UserSummary,
} from "@/types";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export interface OptionList<T> {
  items: T[];
  total: number;
}

export interface CatalogListParams {
  page?: number;
  page_size?: number;
  search?: string;
  active?: CatalogActiveFilter;
}

export interface CustomerCreateInput {
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  is_active?: boolean;
}

export type CustomerUpdateInput = Partial<CustomerCreateInput>;

export interface ProductCreateInput {
  code: string;
  name: string;
  size?: string | null;
  color?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

export function listCustomers(
  params: CatalogListParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<CatalogListResponse<CustomerRecord>> {
  return apiGet<CatalogListResponse<CustomerRecord>>("/api/customers", {
    query: {
      page: params.page,
      page_size: params.page_size,
      search: params.search,
      active: params.active,
    },
    signal: options.signal,
  });
}

export function getCustomer(id: string): Promise<CustomerRecord> {
  return apiGet<CustomerRecord>(`/api/customers/${id}`);
}

export function createCustomer(input: CustomerCreateInput): Promise<CustomerRecord> {
  return apiPost<CustomerRecord>("/api/customers", input);
}

export function updateCustomer(
  id: string,
  input: CustomerUpdateInput,
): Promise<CustomerRecord> {
  return apiPatch<CustomerRecord>(`/api/customers/${id}`, input);
}

export function deactivateCustomer(id: string): Promise<void> {
  return apiDelete<void>(`/api/customers/${id}`);
}

export function listProducts(
  params: CatalogListParams = {},
  options: { signal?: AbortSignal } = {},
): Promise<CatalogListResponse<ProductRecord>> {
  return apiGet<CatalogListResponse<ProductRecord>>("/api/products", {
    query: {
      page: params.page,
      page_size: params.page_size,
      search: params.search,
      active: params.active,
    },
    signal: options.signal,
  });
}

export function getProduct(id: string): Promise<ProductRecord> {
  return apiGet<ProductRecord>(`/api/products/${id}`);
}

export function createProduct(input: ProductCreateInput): Promise<ProductRecord> {
  return apiPost<ProductRecord>("/api/products", input);
}

export function updateProduct(
  id: string,
  input: ProductUpdateInput,
): Promise<ProductRecord> {
  return apiPatch<ProductRecord>(`/api/products/${id}`, input);
}

export function deactivateProduct(id: string): Promise<void> {
  return apiDelete<void>(`/api/products/${id}`);
}

export function listCustomerOptions(
  search?: string,
  options: { signal?: AbortSignal } = {},
): Promise<OptionList<CustomerSummary>> {
  return apiGet<OptionList<CustomerSummary>>("/api/customers", {
    query: { search, page_size: 100 },
    signal: options.signal,
  });
}

export function listProductOptions(
  search?: string,
  options: { signal?: AbortSignal } = {},
): Promise<OptionList<ProductSummary>> {
  return apiGet<OptionList<ProductSummary>>("/api/products", {
    query: { search, page_size: 100 },
    signal: options.signal,
  });
}

export function listUserOptions(
  options: { signal?: AbortSignal } = {},
): Promise<OptionList<UserSummary>> {
  return apiGet<OptionList<UserSummary>>("/api/users/options", {
    signal: options.signal,
  });
}

export const catalogApi = {
  customers: listCustomerOptions,
  products: listProductOptions,
  users: listUserOptions,
} as const;
