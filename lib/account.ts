import { cookies } from "next/headers";

const ACCOUNT_COOKIE = "readndr_account_id";

export async function getAccountId(): Promise<number | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ACCOUNT_COOKIE)?.value;
  return value ? parseInt(value, 10) : null;
}

export function getAccountCookieName(): string {
  return ACCOUNT_COOKIE;
}
