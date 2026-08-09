import { ExternalLink } from "lucide-react";
import { COMPANY_URL } from "@/lib/links";

export default function CorporateBrandBar() {
  return (
    <div className="bg-[#11192d] text-white">
      <div className="max-w-6xl mx-auto px-6 h-9 flex items-center justify-between gap-4 text-xs">
        <span className="truncate text-white/70">
          <strong className="text-white">TessTOC</strong> — продукт Tess Technology
        </span>
        <a
          href={COMPANY_URL}
          className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#c3bd68] transition-opacity hover:opacity-75"
          aria-label="Перейти на сайт компании Tess Technology"
        >
          Сайт компании
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
