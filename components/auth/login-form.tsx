"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function getSupabaseOrNull() {
  try {
    return createBrowserSupabaseClient();
  } catch {
    return null;
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const envReason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = getSupabaseOrNull();
    if (!supabase) {
      setError("未配置 Supabase 环境变量，请复制 .env.example 为 .env.local 并填写。");
      return;
    }
    setLoading(true);
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card/40 p-6 shadow-sm">
      {envReason === "missing_supabase_env" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
          服务端未检测到 Supabase 环境变量，无法校验登录。若在 Vercel
          部署，请到项目 <strong className="font-medium">Settings → Environment Variables</strong>{" "}
          添加 <code className="text-[11px]">NEXT_PUBLIC_SUPABASE_URL</code> 与{" "}
          <code className="text-[11px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 后重新部署。
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "登录中…" : "登录"}
      </Button>
    </form>
  );
}
