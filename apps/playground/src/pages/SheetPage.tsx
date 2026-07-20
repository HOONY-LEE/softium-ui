import { Sheet } from '@softium/sheet';
import type { Locale } from '../i18n';

const initial: Record<string, string> = {
  A1: '품목',
  B1: '카테고리',
  C1: '단가',
  D1: '수량',
  E1: '금액',
  F1: '지역',
  G1: '담당자',
  A2: '노트북 15형',
  B2: '전자기기',
  C2: '1450000',
  D2: '4',
  E2: '=C2*D2',
  F2: '서울',
  G2: '김도윤',
  A3: '무선 모니터암',
  B3: '사무가구',
  C3: '89000',
  D3: '12',
  E3: '=C3*D3',
  F3: '부산',
  G3: '이서연',
  A4: '기계식 키보드',
  B4: '전자기기',
  C4: '112000',
  D4: '20',
  E4: '=C4*D4',
  F4: '대구',
  G4: '박지훈',
  A5: '무선 마우스',
  B5: '전자기기',
  C5: '45000',
  D5: '30',
  E5: '=C5*D5',
  F5: '인천',
  G5: '최민서',
  A6: '스탠딩 데스크',
  B6: '사무가구',
  C6: '620000',
  D6: '6',
  E6: '=C6*D6',
  F6: '광주',
  G6: '정하윤',
  A8: '합계',
  E8: '=SUM(E2:E6)',
  A9: '평균',
  E9: '=AVERAGE(E2:E6)',
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
              '수식 지원 스프레드시트 — 셀 편집, 행/열 크기 조절, 열·행 추가.',
              'A formula-aware spreadsheet — edit cells, resize, add rows/cols.',
            )}
          </p>
        </div>
      </div>

      <Sheet rows={20} cols={7} initial={initial} />
    </div>
  );
}
