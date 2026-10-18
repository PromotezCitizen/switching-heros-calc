import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Button, Group, Image, Modal, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { CONSTS } from '@/CONSTS';
import type { TableRow } from '@/data/statTables';

const {
  ATTRIBUTES,
  JOBS,
  ATTRIBUTE_ICONS,
  JOB_ICONS,
  HERO_ICON_PREFIX,
  HERO_ICON_COSTUME_PART,
  HERO_DEFAULT_COSTUME,
} = CONSTS.hero;
const {
  PICKER_BUTTON_IMAGE_SIZE,
  PICKER_OPTION_IMAGE_SIZE,
  TYPE_ICON_SIZE,
  FILTER_ICON_SIZE,
  PICKER_GRID_COLUMNS,
  PICKED_OUTLINE_WIDTH,
} = CONSTS.hero.ui;

/** public/icons/<경로>.png */
function iconUrl(path: string): string {
  return `${import.meta.env.BASE_URL}icons/${path}.png`;
}

/** 히어로 그림 경로 (기본 코스튬 그림, 기존 src 89~92) */
export function heroIconPath(hero: TableRow): string {
  return `${HERO_ICON_PREFIX}${hero.charId}${HERO_ICON_COSTUME_PART}${HERO_DEFAULT_COSTUME}`;
}

export function HeroImage({ hero, size }: { hero: TableRow | undefined; size: number }) {
  if (!hero) {
    return (
      <Box
        w={size}
        h={size}
        style={{ border: '1px dashed var(--mantine-color-dimmed)', borderRadius: 'var(--mantine-radius-sm)', flexShrink: 0 }}
        aria-hidden
      />
    );
  }
  return <Image src={iconUrl(heroIconPath(hero))} w={size} h={size} fit="contain" alt="" style={{ flexShrink: 0 }} />;
}

/** 속성·직업 작은 아이콘 (이름은 마우스를 올리면 보임) */
export function HeroTypeIcons({ hero }: { hero: TableRow }) {
  const { t: translate } = useTranslation();
  const attributeName = translate(`calc.hero.attributes.${hero.attribute}`, { defaultValue: hero.attribute });
  const jobName = translate(`calc.hero.jobs.${hero.job}`, { defaultValue: hero.job });
  return (
    <Group gap={2} wrap="nowrap" component="span">
      <Image src={iconUrl(ATTRIBUTE_ICONS[hero.attribute])} w={TYPE_ICON_SIZE} h={TYPE_ICON_SIZE} alt={attributeName} title={attributeName} />
      <Image src={iconUrl(JOB_ICONS[hero.job])} w={TYPE_ICON_SIZE} h={TYPE_ICON_SIZE} alt={jobName} title={jobName} />
    </Group>
  );
}

interface FilterButtonsProps {
  keys: readonly string[];
  icons: Record<string, string>;
  /** 번역 키 앞부분 (calc.hero.attributes / calc.hero.jobs) */
  namePrefix: string;
  value: string;
  onChange: (value: string) => void;
}

/** 속성·직업 걸러 보기: 아이콘을 누르면 켜지고, 한 번 더 누르면 꺼짐 */
function FilterButtons({ keys, icons, namePrefix, value, onChange }: FilterButtonsProps) {
  const { t: translate } = useTranslation();
  return (
    <Group gap={4} wrap="nowrap">
      {keys.map((key) => {
        const name = translate(`${namePrefix}.${key}`);
        return (
          <ActionIcon
            key={key}
            variant={value === key ? 'filled' : 'default'}
            aria-label={name}
            aria-pressed={value === key}
            title={name}
            onClick={() => onChange(value === key ? '' : key)}
          >
            <Image src={iconUrl(icons[key])} w={FILTER_ICON_SIZE} h={FILTER_ICON_SIZE} alt="" />
          </ActionIcon>
        );
      })}
    </Group>
  );
}

interface HeroPickerProps {
  /** 칸 이름 (charName / charName2), 번역 calc.hero.slots.<칸> */
  fieldId: string;
  /** 지금 고른 히어로 이름 ('' = 없음) */
  value: string;
  /** 버튼에 보일 고른 히어로 행 (고르기 목록에 없으면 undefined = 빈 칸) */
  picked: TableRow | undefined;
  /** 고르기 창 목록 (히어로마다 표 첫 행, 표 순서). 창을 열 때만 부른다 */
  listHeroes: () => TableRow[];
  onPick: (name: string) => void;
}

/**
 * 아이콘으로 히어로 고르기: 버튼 (그림·이름·속성·직업·성별) 을 누르면 고르기 창이 뜬다.
 * 창 위쪽의 속성·직업 아이콘으로 걸러 볼 수 있다 (드롭다운 없음)
 */
export default function HeroPicker({ fieldId, value, picked, listHeroes, onPick }: HeroPickerProps) {
  const { t: translate } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [attributeFilter, setAttributeFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const slotName = translate(`calc.hero.slots.${fieldId}`);
  /* 고르기 창 목록 (창을 열 때 만든다. 닫히는 동안에도 그대로 보이게 상태로 둔다) */
  const [heroes, setHeroes] = useState<TableRow[]>([]);
  const open = () => {
    setHeroes(listHeroes());
    setOpened(true);
  };
  const shown = heroes.filter(
    (hero) => (!attributeFilter || hero.attribute === attributeFilter) && (!jobFilter || hero.job === jobFilter),
  );
  const choose = (name: string) => {
    onPick(name);
    setOpened(false);
  };
  const optionStyle = (selected: boolean) => ({
    borderRadius: 'var(--mantine-radius-sm)',
    outline: selected ? `${PICKED_OUTLINE_WIDTH}px solid var(--mantine-primary-color-filled)` : undefined,
  });

  return (
    <>
      <UnstyledButton onClick={open} aria-label={translate('calc.hero.pickButton', { slot: slotName })}>
        <Group gap="xs" wrap="nowrap">
          <HeroImage hero={picked} size={PICKER_BUTTON_IMAGE_SIZE} />
          <Stack gap={0}>
            <Text size="xs" c="dimmed">{slotName}</Text>
            <Text size="sm" fw={600}>{picked ? picked.name : translate('calc.hero.pickEmpty')}</Text>
            {picked && (
              <Group gap={4} wrap="nowrap">
                <HeroTypeIcons hero={picked} />
                <Text size="xs" c="dimmed">{translate('calc.hero.gender', { gender: picked.gender })}</Text>
              </Group>
            )}
          </Stack>
        </Group>
      </UnstyledButton>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={slotName}
        closeButtonProps={{ 'aria-label': translate('calc.hero.close') }}
      >
        <Stack gap="xs">
          <Group gap="xs">
            <Button
              variant={!attributeFilter && !jobFilter ? 'filled' : 'default'}
              onClick={() => {
                setAttributeFilter('');
                setJobFilter('');
              }}
            >
              {translate('calc.hero.filter.all')}
            </Button>
            <FilterButtons
              keys={ATTRIBUTES}
              icons={ATTRIBUTE_ICONS}
              namePrefix="calc.hero.attributes"
              value={attributeFilter}
              onChange={setAttributeFilter}
            />
            <FilterButtons keys={JOBS} icons={JOB_ICONS} namePrefix="calc.hero.jobs" value={jobFilter} onChange={setJobFilter} />
          </Group>
          <SimpleGrid cols={PICKER_GRID_COLUMNS} spacing={4}>
            <UnstyledButton
              p={4}
              aria-pressed={!value}
              data-autofocus={!value || undefined}
              onClick={() => choose('')}
              style={optionStyle(!value)}
            >
              <Stack gap={0} align="center">
                <HeroImage hero={undefined} size={PICKER_OPTION_IMAGE_SIZE} />
                <Text size="xs">{translate('calc.hero.none')}</Text>
              </Stack>
            </UnstyledButton>
            {shown.map((hero) => (
              <UnstyledButton
                key={hero.name}
                p={4}
                aria-pressed={hero.name === value}
                data-autofocus={hero.name === value || undefined}
                onClick={() => choose(hero.name)}
                style={optionStyle(hero.name === value)}
              >
                <Stack gap={0} align="center">
                  <HeroImage hero={hero} size={PICKER_OPTION_IMAGE_SIZE} />
                  <Text size="xs" ta="center">{hero.name}</Text>
                  <HeroTypeIcons hero={hero} />
                </Stack>
              </UnstyledButton>
            ))}
          </SimpleGrid>
          {!shown.length && (
            <Text size="sm" c="dimmed">{translate('calc.hero.filter.noMatch')}</Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}
