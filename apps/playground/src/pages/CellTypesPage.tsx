import {
  Actions,
  Avatar,
  BooleanDot,
  Chip,
  type ChipTone,
  CodeCopy,
  Gauge,
  NumberText,
  type ReactColumnDef,
  Table,
  useTable,
} from '@softium/table-react';
import { useCallback, useMemo } from 'react';
import type { Locale } from '../i18n';

interface Task {
  no: number;
  name: string;
  code: string;
  status: 'done' | 'progress' | 'pending' | 'hold' | 'canceled';
  progress: number;
  amount: number;
  active: boolean;
  /** no data — column hosts row action buttons */
  actions?: undefined;
}

const STATUS: Record<Task['status'], { ko: string; en: string; tone: ChipTone }> = {
  done: { ko: '완료', en: 'Done', tone: 'success' },
  progress: { ko: '진행중', en: 'In progress', tone: 'accent' },
  pending: { ko: '대기', en: 'Pending', tone: 'warning' },
  hold: { ko: '보류', en: 'On hold', tone: 'neutral' },
  canceled: { ko: '취소', en: 'Canceled', tone: 'danger' },
};

const NAMES = ['김민준', '이서연', '박도윤', '최하은', '정시우', '강지유', '윤주원', '임채원'];
const STATUSES = Object.keys(STATUS) as Task['status'][];

const rows: Task[] = NAMES.map((name, i) => ({
  no: i + 1,
  name,
  code: `ISS-${4090 + i * 7}`,
  status: STATUSES[i % STATUSES.length] as Task['status'],
  progress: [100, 62, 8, 45, 0, 88, 30, 73][i] ?? 50,
  amount: 1200000 + ((i * 437) % 50) * 31000,
  active: i % 4 !== 0,
}));

export function CellTypesPage({ locale }: { locale: Locale }) {
  const t = useCallback((ko: string, en: string) => (locale === 'ko' ? ko : en), [locale]);

  const columns = useMemo<ReactColumnDef<Task>[]>(
    () => [
      { key: 'no', label: '# · Index', type: 'number', width: 70, align: 'center' },
      {
        key: 'name',
        label: `${t('이름', 'Name')} · Avatar`,
        flex: 1,
        minWidth: 160,
        renderCell: ({ value }) => <Avatar name={String(value)}>{String(value)}</Avatar>,
      },
      {
        key: 'code',
        label: `${t('코드', 'Code')} · CodeCopy`,
        width: 150,
        renderCell: ({ value }) => <CodeCopy value={String(value)} />,
      },
      {
        key: 'status',
        label: `${t('상태', 'Status')} · Chip`,
        width: 130,
        renderCell: ({ value }) => {
          const s = STATUS[value as Task['status']];
          return (
            <Chip tone={s.tone} dot>
              {locale === 'ko' ? s.ko : s.en}
            </Chip>
          );
        },
      },
      {
        key: 'progress',
        label: `${t('진행률', 'Progress')} · Gauge`,
        width: 160,
        renderCell: ({ value }) => {
          const v = Number(value);
          const tone = v >= 100 ? 'success' : v < 20 ? 'danger' : 'accent';
          return <Gauge value={v} tone={tone} />;
        },
      },
      {
        key: 'amount',
        label: `${t('금액', 'Amount')} · Number`,
        type: 'number',
        align: 'right',
        width: 150,
        renderCell: ({ value }) => <NumberText value={Number(value)} prefix="₩" />,
      },
      {
        key: 'active',
        label: `${t('활성', 'Active')} · Boolean`,
        width: 110,
        renderCell: ({ value }) => (
          <BooleanDot
            value={Boolean(value)}
            trueLabel={t('활성', 'On')}
            falseLabel={t('비활성', 'Off')}
          />
        ),
      },
      {
        key: 'actions',
        label: `${t('관리', 'Actions')} · Actions`,
        width: 120,
        align: 'center',
        sortable: false,
        renderCell: ({ row }) => (
          <Actions
            inline={[
              { key: 'edit', label: t('수정', 'Edit'), icon: '✎', onClick: () => {} },
              {
                key: 'del',
                label: t('삭제', 'Delete'),
                icon: '🗑',
                danger: true,
                onClick: () => {},
              },
            ]}
            menu={[
              { key: 'dup', label: t('복제', 'Duplicate'), icon: '⧉', onClick: () => {} },
              { key: 'arch', label: t('보관', 'Archive'), icon: '🗄', onClick: () => {} },
              {
                key: 'del2',
                label: t('삭제', 'Delete'),
                icon: '🗑',
                danger: true,
                onClick: () => {},
              },
            ]}
          />
        ),
      },
    ],
    [locale, t],
  );

  const data = useMemo(() => rows, []);
  const table = useTable({ data, columns, getRowId: (r) => r.code });

  return (
    <div className="page-body">
      <div className="page-head">
        <div>
          <h2 className="page-title">{t('셀 타입', 'Cell Types')}</h2>
          <p className="page-desc">
            {t(
              '컬럼은 renderCell에 빌트인 셀 컴포넌트를 꽂아 어떤 요소든 표현할 수 있습니다.',
              'Columns render any element by dropping a built-in cell component into renderCell.',
            )}
          </p>
        </div>
      </div>

      <Table table={table} locale={locale} toolbar={false} rowBorders />
    </div>
  );
}
