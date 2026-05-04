import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import tessLogo from '@assets/tess_logo-final_152_1773757415772.png';

const palette = {
  bg: '#f0ebe0',
  fg: '#11192d',
  card: '#eae4d6',
  border: '#dcd5c4',
  primary: '#a8a25a',
  accent: '#11192d',
  primaryFg: '#ffffff',
  muted: '#5a6478',
};

const fontSans = 'Inter, sans-serif';

// Простой markdown → JSX рендер. Не полный markdown, но покрывает наши документы.
function renderMarkdown(md: string): JSX.Element[] {
  const lines = md.split('\n');
  const elements: JSX.Element[] = [];
  let listBuffer: string[] = [];
  let listOrdered = false;

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((t, i) => (
      <li key={i} className="leading-relaxed mb-2" style={{ color: palette.fg }}>
        <span dangerouslySetInnerHTML={{ __html: inlineMd(t) }} />
      </li>
    ));
    elements.push(
      listOrdered
        ? <ol key={key} className="list-decimal list-inside ml-2 my-3 space-y-1">{items}</ol>
        : <ul key={key} className="list-disc list-inside ml-2 my-3 space-y-1">{items}</ul>
    );
    listBuffer = [];
  };

  function inlineMd(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="px-1 rounded text-sm" style="background:#dcd5c4">$1</code>');
  }

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `l-${idx}`;

    // Bullet list
    if (/^- /.test(line) || /^\* /.test(line)) {
      if (listOrdered) flushList(key + '-pre');
      listOrdered = false;
      listBuffer.push(line.replace(/^[-*]\s+/, ''));
      return;
    }
    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      if (!listOrdered) flushList(key + '-pre');
      listOrdered = true;
      listBuffer.push(line.replace(/^\d+\.\s+/, ''));
      return;
    }

    flushList(key + '-pre');

    if (line === '') return;

    // Заголовки (markdown пишет ## или просто **bold** для заголовков)
    if (/^#{1,6}\s/.test(line)) {
      const lvl = line.match(/^(#+)\s/)?.[1].length || 2;
      const text = line.replace(/^#+\s+/, '');
      const cls = lvl === 1 ? 'text-3xl mt-10 mb-4 font-extrabold tracking-tight' :
                  lvl === 2 ? 'text-xl mt-8 mb-3 font-bold tracking-tight' :
                              'text-base mt-6 mb-2 font-bold tracking-tight';
      elements.push(<h2 key={key} className={cls} style={{ color: palette.fg }}>{text}</h2>);
      return;
    }

    // Bold-only line (markdown часто использует **TEXT** для центрированных заголовков)
    const boldOnly = line.match(/^\*\*(.+)\*\*$/);
    if (boldOnly) {
      const txt = boldOnly[1];
      // Распознаём «1. Общие положения» как h2
      if (/^\d+\.\s/.test(txt)) {
        elements.push(<h2 key={key} className="text-xl mt-8 mb-3 font-bold tracking-tight" style={{ color: palette.fg }}>{txt}</h2>);
      } else if (txt.length < 80 && !txt.includes('.')) {
        elements.push(<h3 key={key} className="text-base mt-6 mb-2 font-bold tracking-tight" style={{ color: palette.fg }}>{txt}</h3>);
      } else {
        elements.push(<p key={key} className="leading-relaxed my-3 font-bold" style={{ color: palette.fg }}>{txt}</p>);
      }
      return;
    }

    // Обычный параграф
    elements.push(
      <p key={key} className="leading-relaxed my-3" style={{ color: palette.fg }}>
        <span dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />
      </p>
    );
  });

  flushList('end');
  return elements;
}

export interface LegalPageProps {
  title: string;
  subtitle?: string;
  content: string;
}

export default function LegalPage({ title, subtitle, content }: LegalPageProps) {
  return (
    <div className="min-h-screen" style={{ background: palette.bg, color: palette.fg, fontFamily: fontSans }}>
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
            <a
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-opacity hover:opacity-70"
              style={{ color: palette.muted }}
            >
              <ArrowLeft className="h-4 w-4" />
              На главную
            </a>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1
          className="text-3xl sm:text-4xl mb-2 font-extrabold tracking-tight"
          style={{ color: palette.fg }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mb-10" style={{ color: palette.muted }}>{subtitle}</p>
        )}

        <article className="text-base">
          {renderMarkdown(content)}
        </article>
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
