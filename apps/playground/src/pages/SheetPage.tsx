import { Sheet } from '@softium/table-react';
import type { Locale } from '../i18n';

const initial: Record<string, string> = {
  A1: '품목',
  B1: '단가',
  C1: '수량',
  D1: '금액',
  A2: '키보드',
  B2: '38000',
  C2: '3',
  D2: '=B2*C2',
  A3: '모니터',
  B3: '270000',
  C3: '2',
  D3: '=B3*C3',
  A4: '마우스',
  B4: '24000',
  C4: '5',
  D4: '=B4*C4',
  A6: '합계',
  D6: '=SUM(D2:D4)',
  A7: '평균',
  D7: '=AVERAGE(D2:D4)',
};

export function SheetPage({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('시트', 'Sheet')}</h2>
          <p className="page-desc">
            {t(
              'A1 주소 격자 + 수식. 셀을 클릭/더블클릭해 편집(=B2*C2, =SUM(D2:D4)). Enter 아래로, Tab 오른쪽, Esc 취소. (미니멀 버전)',
              'A1 grid + formulas. Click/double-click to edit (=B2*C2, =SUM(D2:D4)). Enter down, Tab right, Esc cancel. (minimal)',
            )}
          </p>
        </div>
      </div>

      <Sheet rows={12} cols={6} initial={initial} />
    </div>
  );
}
