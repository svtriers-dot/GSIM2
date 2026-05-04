import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import tessLogo from '@assets/tess_logo-final_152_1773757415772.png';

const palette = {
  bg: '#f0ebe0',
  fg: '#11192d',
  card: '#eae4d6',
  border: '#dcd5c4',
  primary: '#a8a25a',
  primaryFg: '#ffffff',
  muted: '#5a6478',
};

const fontSans = 'Inter, sans-serif';

export interface LegalPageProps {
  title: string;
  subtitle?: string;
  contentHtml: string;
}

export default function LegalPage({ title, subtitle, contentHtml }: LegalPageProps) {
  return (
    <div className="min-h-screen" style={{ background: palette.bg, color: palette.fg, fontFamily: fontSans }}>
      <style>{`
        .legal-content { font-size: 16px; line-height: 1.7; }
        .legal-content h2 { font-size: 24px; font-weight: 800; letter-spacing: -0.01em; margin: 2rem 0 0.75rem; padding-top: 1rem; border-top: 1px solid ${palette.border}; }
        .legal-content h2:first-child { padding-top: 0; border-top: none; margin-top: 0; }
        .legal-content h3 { font-size: 18px; font-weight: 700; margin: 1.5rem 0 0.5rem; }
        .legal-content p { margin: 0.75rem 0; color: ${palette.fg}; }
        .legal-content ul, .legal-content ol { margin: 0.75rem 0; padding-left: 1.5rem; }
        .legal-content li { margin: 0.4rem 0; }
        .legal-content strong { font-weight: 700; }
        .legal-content em { font-style: italic; }
        .legal-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 14px; }
        .legal-content table tr td { padding: 0.6rem 0.8rem; border: 1px solid ${palette.border}; vertical-align: top; }
        .legal-content table tr:first-child td { background: ${palette.card}; font-weight: 700; }
        .legal-content a { color: ${palette.primary}; text-decoration: underline; }
        .legal-content a:hover { opacity: 0.7; }
      `}</style>

      <header
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{ background: `${palette.bg}f0`, borderBottom: `1px solid ${palette.border}` }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <img src={tessLogo} alt="Tess Technology" className="h-9 w-auto" />
              <div className="hidden sm:block">
                <div className="text-sm font-semibold leading-tight">Tess Technology</div>
                <div className="text-xs leading-tight" style={{ color: palette.muted }}>tesstech.ru</div>
              </div>
            </a>
          </Link>
          <Link href="/">
            <a className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-opacity hover:opacity-70" style={{ color: palette.muted }}>
              <ArrowLeft className="h-4 w-4" />
              На главную
            </a>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl sm:text-4xl mb-2 font-extrabold tracking-tight" style={{ color: palette.fg }}>
          {title}
        </h1>
        {subtitle && <p className="text-sm mb-10" style={{ color: palette.muted }}>{subtitle}</p>}

        <article className="legal-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </main>

      <footer className="py-8 mt-16" style={{ background: palette.card, borderTop: `1px solid ${palette.border}` }}>
        <div className="max-w-4xl mx-auto px-6 text-center text-xs" style={{ color: palette.muted }}>
          © 2026 ООО «ТЕСС ТЕХНОЛОДЖИ» · ОГРН 1177746806181 · ИНН 7702421130 ·
          <a href="mailto:mail@tesstech.ru" className="ml-1 hover:underline" style={{ color: palette.primary }}>mail@tesstech.ru</a>
        </div>
      </footer>
    </div>
  );
}
