"use client";

import { useState } from "react";
import Link from "next/link";

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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const supabase = getSupabaseOrNull();
    if (!supabase) {
      setError("未配置 Supabase 环境变量。");
      return;
    }
    const origin = window.location.origin;
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/update-password")}`,
      }
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage("若该邮箱已注册，你将收到重置邮件，请查收并按链接设置新密码。");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card/40 p-6 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="email">注册邮箱</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "发送中…" : "发送重置邮件"}
      </Button>
      <Button variant="outline" className="w-full" asChild>
        <Link href="/login">返回登录</Link>
      </Button>
    </form>
  );
}
