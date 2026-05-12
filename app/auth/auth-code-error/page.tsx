import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold text-destructive">登录链接无效或已过期</h1>
        <p className="text-sm text-muted-foreground">请重新尝试忘记密码流程，或联系管理员。</p>
        <Button asChild>
          <Link href="/login">返回登录</Link>
        </Button>
      </div>
    </div>
  );
}
