import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold">404 — Страница не найдена</h1>
          </div>

          <p className="mt-2 text-sm text-muted-foreground mb-6">
            Похоже, такой страницы не существует. Возможно, ссылка устарела или содержит опечатку.
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              ← На главную
            </Link>
            <Link
              href="/play/join"
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
            >
              В мастер-класс
            </Link>
            <Link
              href="/trainer"
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
            >
              Кабинет тренера
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
