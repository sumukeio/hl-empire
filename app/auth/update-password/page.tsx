import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "设置新密码 · 瀚翎帝国",
};

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-primary">设置新密码</h1>
          <p className="mt-1 text-sm text-muted-foreground">通过邮件链接进入本页后即可修改</p>
        </div>
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
