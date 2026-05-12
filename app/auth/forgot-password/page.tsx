import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "忘记密码 · 瀚翎帝国",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-primary">忘记密码</h1>
          <p className="mt-1 text-sm text-muted-foreground">向注册邮箱发送重置链接</p>
        </div>
        <ForgotPasswordForm />
        <div className="flex justify-center">
          <Button variant="link" className="h-auto p-0 text-muted-foreground" asChild>
            <Link href="/login">返回登录</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
