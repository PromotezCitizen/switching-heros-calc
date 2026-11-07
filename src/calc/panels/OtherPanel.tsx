/** 프로필 아이콘 · 별자리 요정의 축복 · 호감도 칸 (게임에서 서로 다른 화면이라 칸도 따로) */
import { useTranslation } from 'react-i18next';
import { Group, Stack, Text } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import { combineLines } from '@/calc/combine';
import { formatLog } from '@/calc/gameNumber';
import { FAIRY_BLESSING_ON_FIELD, FAIRY_BOND_LEVEL_FIELD, PROFILE_ICON_FIELDS, affinityLines, fairyBlessingRow } from '@/calc/sources/textLines/other';
import { isChecked, wholeLevel } from '@/calc/sources/textLines/screenFields';
import type { TabPanelProps } from '@/calc/types';
import { ScreenValueInput } from '@/calc/panels/TextLinesFields';

const { FAIRY_BLESSING_SHOWN_COLUMN } = CONSTS.textLines;
/** 호감도 칸에 보여 줄 능력치와 이름 */
const AFFINITY_SHOWN_STATS = [
  ['_per_attackDamage', 'calc.affinity.attack'],
  ['_per_hp', 'calc.affinity.hp'],
] as const;

function ScreenFieldsPanel({ values, setValue, fieldIds, helpKey }: Pick<TabPanelProps, 'values' | 'setValue'> & { fieldIds: string[]; helpKey: string }) {
  const { t: translate } = useTranslation();
  return (
    <Stack gap="xs">
      {fieldIds.map((fieldId) => (
        <ScreenValueInput
          key={fieldId}
          values={values}
          setValue={setValue}
          fieldId={fieldId}
          translationPrefix={`calc.other.fields.${fieldId}`}
        />
      ))}
      <Text size="xs" c="dimmed">
        {translate(helpKey)}
      </Text>
    </Stack>
  );
}

export function ProfileIconPanel({ values, setValue }: TabPanelProps) {
  return (
    <ScreenFieldsPanel
      values={values}
      setValue={setValue}
      fieldIds={PROFILE_ICON_FIELDS.map((field) => field.id)}
      helpKey="calc.profileIcon.help"
    />
  );
}

/** 호감도: 히어로 표의 호감도 레벨로 계산하므로 결과 (히어로끼리 곱한 배율) 만 보여 준다 */
export function AffinityPanel({ values, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const combined = combineLines(affinityLines(values, tables, (key, params) => translate(key, params)));
  return (
    <Stack gap="xs">
      {AFFINITY_SHOWN_STATS.map(([stat, labelKey]) => (
        <Group key={stat} gap="xs">
          <Text size="sm">{translate(labelKey)}</Text>
          <Text size="sm" fw={600}>
            {combined[stat] ? translate('calc.affinity.multiplier', { value: formatLog(combined[stat].log) }) : '-'}
          </Text>
        </Group>
      ))}
      <Text size="xs" c="dimmed">
        {translate('calc.affinity.help')}
      </Text>
    </Stack>
  );
}

/** 요정의 축복: 레벨·켜짐은 공통 입력에서 받으므로 결과만 보여 준다. 꺼져 있으면 계산에 안 들어가니 꺼짐이라고 보인다 */
export function FairyPanel({ values, tables }: TabPanelProps) {
  const { t: translate } = useTranslation();
  const fairyRow = fairyBlessingRow(wholeLevel(values[FAIRY_BOND_LEVEL_FIELD]), tables);
  const percent = fairyRow?.[FAIRY_BLESSING_SHOWN_COLUMN];
  const on = isChecked(values[FAIRY_BLESSING_ON_FIELD]);
  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text size="sm">{translate('calc.fairy.value')}</Text>
        <Text size="sm" fw={600}>
          {!on ? translate('calc.fairy.off') : percent === undefined ? '-' : translate('calc.fairy.percent', { value: Number(percent) })}
        </Text>
      </Group>
      <Text size="xs" c="dimmed">
        {translate('calc.fairy.help')}
      </Text>
    </Stack>
  );
}
