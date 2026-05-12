import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 服务端（Server Component / Server Action / Route Handler）使用的 Supabase 客户端。
 * 在无法写 Cookie 的 Server Component 中，setAll 会静默失败；会话刷新依赖根 middleware。
 */
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component 等场景无法 set cookie，由 middleware 刷新会话
        }
      },
    },
  });
}
