import { apiGet, apiPost } from "../../shared/api/client";

export interface UserListItem {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

export interface CreateUserPayload {
  email: string;
  display_name: string;
  password: string;
  role: string;
  status: string;
}

export async function fetchUsers(): Promise<UserListItem[]> {
  const response = await apiGet<{ items: UserListItem[] }>("/auth/users");
  return response.items;
}

export async function createUser(payload: CreateUserPayload): Promise<string> {
  const response = await apiPost<{ message: string }>("/auth/users", payload);
  return response.message;
}
