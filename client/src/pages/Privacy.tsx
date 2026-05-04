import LegalPage from './LegalPage';
import content from './legal/privacy.md?raw';

export default function Privacy() {
  return <LegalPage title="Политика обработки персональных данных" subtitle="на сайте https://toc.tesstech.ru" content={content} />;
}
