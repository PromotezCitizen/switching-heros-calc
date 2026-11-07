import { useTranslation } from 'react-i18next';
import { Image, Stack, Text, UnstyledButton } from '@mantine/core';
import AutoGrid from '@/components/AutoGrid';
import { CONSTS } from '@/CONSTS';
import { frameOwnedField, frameRows } from '@/calc/sources/providers/frame';
import { statDescription } from '@/calc/statText';
import type { TabPanelProps } from '@/calc/types';
import { iconUrl } from '@/calc/panels/heroWeaponCardPet/IconPicker';

const { ID_COLUMN, STAT_COLUMN, VALUE_COLUMN, TILE_MIN_WIDTH, ICON_FOLDER, ICON_PREFIX, ICON_DIGITS, ICON_SIZE } =
  CONSTS.providers.frame;
/** 안 가진 테두리 그림 (특성 화면의 꺼진 아이콘과 같은 모양) */
const { INACTIVE_ICON_STYLE } = CONSTS.masteryRuneBuff.PANEL;
const PLACEHOLDER = '{0}';
const { CHECKED_TEXT } = CONSTS.textLines;

/**
 * 프로필 테두리: 가진 테두리를 그림을 눌러 켜고 끈다 (특성 얼티밋 아이콘과 같은 방식).
 * 장착과 무관하게 보유한 테두리 전부 효과가 들어간다. 그림과 이름을 붙인다 (번호만으로는 알 수 없음).
 * 효과는 아직 모두 같은 고정값이라 칸마다 쓰지 않고 그림에 마우스를 올리면 보인다
 */
export default function FramePanel({ values, setValue, tables, descriptions }: TabPanelProps) {
  const { t: translate, i18n } = useTranslation();
  const rows = frameRows(tables);
  const ownedCount = rows.filter((row) => values[frameOwnedField(row[ID_COLUMN])] === CHECKED_TEXT).length;
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.frame.help')}
      </Text>
      <Text size="sm">{translate('calc.frame.ownedCount', { count: ownedCount, total: rows.length })}</Text>
      <AutoGrid minItemWidth={TILE_MIN_WIDTH}>
        {rows.map((row) => {
          const id = row[ID_COLUMN];
          const field = frameOwnedField(id);
          const owned = values[field] === CHECKED_TEXT;
          // 이름은 게임 번역 표 item_name_frame<번호> (0~6 server_tables/Localized264913, 7~16 은 5.70 앱 내장 표 app_dump/new_5.70/diff/Localized__vs_old.txt)
          const name = i18n.exists(`calc.frame.names.${id}`)
            ? translate(`calc.frame.names.${id}`)
            : translate('calc.frame.unnamed', { frame: id });
          // 효과 문구의 {0} 자리에 값을 넣는다 (예: 공격력 100% 증가)
          const effect = statDescription(descriptions, row[STAT_COLUMN]).replace(PLACEHOLDER, row[VALUE_COLUMN]);
          return (
            <UnstyledButton
              key={id}
              aria-label={name}
              aria-pressed={owned}
              title={`${name}: ${effect}`}
              onClick={() => setValue(field, String(!owned))}
            >
              <Stack gap={2} align="center">
                <Image
                  src={iconUrl(`${ICON_FOLDER}/${ICON_PREFIX}${id.padStart(ICON_DIGITS, '0')}`)}
                  w={ICON_SIZE}
                  h={ICON_SIZE}
                  fit="contain"
                  alt=""
                  style={owned ? undefined : INACTIVE_ICON_STYLE}
                />
                <Text size="xs" ta="center" fw={owned ? 600 : undefined} c={owned ? undefined : 'dimmed'}>
                  {name}
                </Text>
              </Stack>
            </UnstyledButton>
          );
        })}
      </AutoGrid>
    </Stack>
  );
}
