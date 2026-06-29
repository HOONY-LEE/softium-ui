import {
  Actions,
  Avatar,
  BooleanDot,
  Chip,
  CodeCopy,
  Gauge,
  NumberText,
} from '@softium/table-react';
import { Archive, Copy, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Locale } from '../i18n';

interface Variant {
  label: string;
  demo: ReactNode;
}

interface CellTypeSection {
  title: string;
  ko: string;
  en: string;
  variants: Variant[];
}

export function CellTypesPage({ locale }: { locale: Locale }) {
  const t = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  const sections: CellTypeSection[] = [
    {
      title: 'Chip',
      ko: 'enum·상태·카테고리 값을 색상 톤이 있는 알약 형태로. 선택적 상태 점(dot).',
      en: 'Pill for enum / status / category values, with semantic tones and an optional dot.',
      variants: [
        { label: 'neutral', demo: <Chip>기본</Chip> },
        { label: 'accent', demo: <Chip tone="accent">진행중</Chip> },
        {
          label: 'success · dot',
          demo: (
            <Chip tone="success" dot>
              완료
            </Chip>
          ),
        },
        {
          label: 'warning · dot',
          demo: (
            <Chip tone="warning" dot>
              대기
            </Chip>
          ),
        },
        {
          label: 'danger · dot',
          demo: (
            <Chip tone="danger" dot>
              취소
            </Chip>
          ),
        },
        { label: 'info', demo: <Chip tone="info">보관</Chip> },
      ],
    },
    {
      title: 'NumberText',
      ko: '숫자 값 + 접두사/접미사, 소수 자리수, 천단위 구분. 우측 정렬에 적합.',
      en: 'Numeric value with prefix/suffix, decimals, and thousands grouping.',
      variants: [
        { label: 'plain', demo: <NumberText value={1234567} /> },
        { label: 'prefix ₩', demo: <NumberText value={1200000} prefix="₩" /> },
        { label: 'suffix %', demo: <NumberText value={92.5} suffix="%" decimals={1} /> },
        { label: 'suffix 원', demo: <NumberText value={48000} suffix="원" /> },
        { label: 'decimals 2', demo: <NumberText value={1234.5678} decimals={2} /> },
      ],
    },
    {
      title: 'Gauge',
      ko: '진행률 막대 + 퍼센트 라벨. 값에 따라 색상 톤을 줄 수 있음.',
      en: 'Progress bar with a percentage label; tone can vary by value.',
      variants: [
        { label: 'accent 62%', demo: <Gauge value={62} /> },
        { label: 'success 100%', demo: <Gauge value={100} tone="success" /> },
        { label: 'warning 45%', demo: <Gauge value={45} tone="warning" /> },
        { label: 'danger 8%', demo: <Gauge value={8} tone="danger" /> },
        { label: 'no label', demo: <Gauge value={73} showLabel={false} /> },
      ],
    },
    {
      title: 'Avatar',
      ko: '프로필/제품 썸네일. 이미지 없으면 이니셜로 대체. 라벨과 함께 사용 가능.',
      en: 'Profile / product thumbnail; falls back to initials. Optional inline label.',
      variants: [
        { label: 'initials (CJK)', demo: <Avatar name="김민준" /> },
        { label: 'initials (latin)', demo: <Avatar name="John Doe" /> },
        { label: 'with label', demo: <Avatar name="이서연">이서연</Avatar> },
        { label: 'size 36', demo: <Avatar name="박도윤" size={36} /> },
      ],
    },
    {
      title: 'CodeCopy',
      ko: '모노스페이스 코드 값 + 클립보드 복사 버튼(복사 후 체크 표시).',
      en: 'Monospace code value with a copy-to-clipboard button.',
      variants: [
        { label: 'id', demo: <CodeCopy value="ISS-4090" /> },
        { label: 'hash', demo: <CodeCopy value="a1b2c3d4" /> },
      ],
    },
    {
      title: 'BooleanDot',
      ko: '불리언 값을 상태 점으로. 라벨은 선택.',
      en: 'Boolean value as a status dot, with an optional label.',
      variants: [
        { label: 'on · label', demo: <BooleanDot value trueLabel="활성" falseLabel="비활성" /> },
        {
          label: 'off · label',
          demo: <BooleanDot value={false} trueLabel="활성" falseLabel="비활성" />,
        },
        { label: 'on', demo: <BooleanDot value /> },
        { label: 'off', demo: <BooleanDot value={false} /> },
      ],
    },
    {
      title: 'Actions',
      ko: '행 액션 버튼 — 인라인 아이콘 버튼과 ⋯ 오버플로 메뉴.',
      en: 'Row action buttons — inline icon buttons and a ⋯ overflow menu.',
      variants: [
        {
          label: 'inline',
          demo: (
            <Actions
              inline={[
                { key: 'e', label: '수정', icon: <Pencil size={15} />, onClick: () => {} },
                {
                  key: 'd',
                  label: '삭제',
                  icon: <Trash2 size={15} />,
                  danger: true,
                  onClick: () => {},
                },
              ]}
            />
          ),
        },
        {
          label: 'kebab',
          demo: (
            <Actions
              menu={[
                { key: 'dup', label: '복제', icon: <Copy size={15} />, onClick: () => {} },
                { key: 'arc', label: '보관', icon: <Archive size={15} />, onClick: () => {} },
              ]}
            />
          ),
        },
        {
          label: 'inline + kebab',
          demo: (
            <Actions
              inline={[{ key: 'e', label: '수정', icon: <Pencil size={15} />, onClick: () => {} }]}
              menu={[
                { key: 'dup', label: '복제', icon: <Copy size={15} />, onClick: () => {} },
                {
                  key: 'd',
                  label: '삭제',
                  icon: <Trash2 size={15} />,
                  danger: true,
                  onClick: () => {},
                },
              ]}
            />
          ),
        },
      ],
    },
  ];

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('셀 타입', 'Cell Types')}</h2>
          <p className="page-desc">
            {t(
              '컬럼의 renderCell에 꽂아 쓰는 빌트인 셀 컴포넌트들입니다.',
              'Built-in cell components you drop into a column’s renderCell.',
            )}
          </p>
        </div>
      </div>

      <div className="celltypes">
        {sections.map((s) => (
          <section className="celltype" key={s.title}>
            <div className="celltype__head">
              <h3 className="celltype__title">{s.title}</h3>
              <p className="celltype__desc">{locale === 'ko' ? s.ko : s.en}</p>
            </div>
            <div className="celltype__variants">
              {s.variants.map((v) => (
                <div className="celltype__variant" key={v.label}>
                  <div className="celltype__demo">{v.demo}</div>
                  <code className="celltype__vlabel">{v.label}</code>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
