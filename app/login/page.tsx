import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "登录 · 瀚翎帝国",
  description: "邮箱与密码登录",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            瀚翎帝国
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">请使用管理员分配的邮箱登录</p>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-muted-foreground">加载表单…</p>}>
          <LoginForm />
        </Suspense>
        <div className="flex justify-center text-sm">
          <Button variant="link" className="h-auto p-0 text-muted-foreground" asChild>
            <Link href="/auth/forgot-password">忘记密码</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
