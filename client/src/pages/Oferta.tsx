import LegalPage from './LegalPage';
import content from './legal/oferta.md?raw';

export default function Oferta() {
  return <LegalPage title="Публичная оферта" subtitle="на предоставление прав использования ПО «TessTOC»" content={content} />;
}
