import { useEffect, useState, type ReactNode } from "react";

// MVP-2 UX: блок для маленьких экранов — игра не работает на телефонах.
// На <768px показываем заглушку вместо children.

interface Props {
  children: ReactNode;
  minWidth?: number;
  message?: string;
}

export function MobileBlock({ children, minWidth = 768, message }: Props) {
  const [tooSmall, setTooSmall] = useState(false);

  useEffect(() => {
    function check() {
      setTooSmall(window.innerWidth < minWidth);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [minWidth]);

  if (!tooSmall) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-card border border-border rounded-xl p-6 text-center max-w-md">
        <div className="text-5xl mb-3">💻</div>
        <h2 className="text-lg font-semibold mb-2">
          Командная игра требует ноутбук или планшет
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {message ??
            "Симулятор фабрики не помещается на экранах меньше 768 пикселей. Откройте этот код на устройстве с экраном побольше — компьютер, ноутбук или планшет."}
        </p>
        <p className="text-xs text-muted-foreground">
          Вся команда играет за одним устройством — телефоны не подходят технически.
        </p>
        <a
          href="/"
          className="mt-4 inline-block px-4 py-2 rounded-lg border border-border text-sm hover:bg-elevate-1"
        >
          На главную
        </a>
      </div>
    </div>
  );
}
