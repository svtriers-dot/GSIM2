import LegalPage from './LegalPage';
import content from './legal/eula.md?raw';

export default function Eula() {
  return <LegalPage title="Лицензионное соглашение (EULA)" subtitle="программного обеспечения «TessTOC»" content={content} />;
}
