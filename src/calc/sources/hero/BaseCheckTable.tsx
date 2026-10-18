import { useTranslation } from 'react-i18next';
import { Table } from '@mantine/core';
import { formatLog } from '@/calc/gameNumber';
import type { BaseCheckRow } from '@/calc/sources/hero/baseCheck';

/** 기본값 확인 표: 수치표 기본값 / 화면 값 / 같음·다름 (기존 renderBaseCheck 의 표). rows = null (1슬롯 히어로 없음) 이면 표 없음 */
export default function BaseCheckTable({ rows }: { rows: BaseCheckRow[] | null }) {
  const { t: translate } = useTranslation();
  if (!rows) return null;
  return (
    <Table>
      <Table.Thead>
        <Table.Tr>
          <Table.Th />
          <Table.Th ta="right">{translate('calc.hero.baseCheck.tableBase')}</Table.Th>
          <Table.Th ta="right">{translate('calc.hero.baseCheck.screen')}</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((row) => (
          <Table.Tr key={row.stat}>
            <Table.Td>{translate(`calc.hero.baseCheck.${row.stat}`)}</Table.Td>
            <Table.Td ta="right">{formatLog(row.tableLog)}</Table.Td>
            <Table.Td ta="right">{formatLog(row.screenLog)}</Table.Td>
            <Table.Td c={row.same ? 'teal' : 'red'}>
              {translate(row.same ? 'calc.hero.baseCheck.same' : 'calc.hero.baseCheck.different')}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
