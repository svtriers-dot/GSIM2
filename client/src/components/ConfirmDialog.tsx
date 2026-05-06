import { useEffect, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  // Опционально: пользователь должен ввести причину/заметку
  promptLabel?: string;
  promptPlaceholder?: string;
  promptOptional?: boolean;
}

interface ConfirmResult {
  confirmed: boolean;
  promptValue?: string;
}

let confirmDialogTrigger:
  | ((opts: ConfirmOptions) => Promise<ConfirmResult>)
  | null = null;

// Глобальная функция confirm() — можно вызывать из любого места.
// Внутри использует Provider компонент, который реально рендерит модалку.
export async function confirmDialog(opts: ConfirmOptions): Promise<ConfirmResult> {
  if (!confirmDialogTrigger) {
    // Fallback на нативный — на случай если Provider не смонтирован
    if (opts.promptLabel) {
      const v = window.prompt(opts.title + (opts.description ? "\n\n" + opts.description : ""));
      return { confirmed: v !== null, promptValue: v ?? undefined };
    }
    return { confirmed: window.confirm(opts.title), promptValue: undefined };
  }
  return confirmDialogTrigger(opts);
}

// Удобные shortcuts
export const confirmAction = (
  title: string,
  description?: string,
  destructive = false,
) =>
  confirmDialog({ title, description, destructive }).then((r) => r.confirmed);

export const promptAction = (
  title: string,
  description?: string,
  promptLabel = "Заметка (опционально)",
) =>
  confirmDialog({
    title,
    description,
    promptLabel,
    promptOptional: true,
    destructive: false,
  });

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [resolver, setResolver] = useState<
    ((r: ConfirmResult) => void) | null
  >(null);

  useEffect(() => {
    confirmDialogTrigger = (o: ConfirmOptions) => {
      return new Promise<ConfirmResult>((resolve) => {
        setOpts(o);
        setPromptValue("");
        setResolver(() => resolve);
        setOpen(true);
      });
    };
    return () => {
      confirmDialogTrigger = null;
    };
  }, []);

  function close(confirmed: boolean) {
    if (resolver) {
      resolver({
        confirmed,
        promptValue: opts?.promptLabel ? promptValue : undefined,
      });
    }
    setOpen(false);
    setResolver(null);
  }

  return (
    <>
      {children}
      <AlertDialog open={open} onOpenChange={(o) => !o && close(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
            {opts?.description && (
              <AlertDialogDescription className="whitespace-pre-line">
                {opts.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          {opts?.promptLabel && (
            <div className="py-2">
              <label className="block text-sm font-medium mb-1">
                {opts.promptLabel}
                {opts.promptOptional && (
                  <span className="text-xs text-muted-foreground ml-1">(опционально)</span>
                )}
              </label>
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={opts.promptPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                autoFocus
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>
              {opts?.cancelLabel ?? "Отмена"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => close(true)}
              className={
                opts?.destructive ? "bg-red-600 text-white hover:bg-red-700" : undefined
              }
            >
              {opts?.confirmLabel ?? "Подтвердить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
