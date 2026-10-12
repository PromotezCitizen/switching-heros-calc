import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Accordion, Alert, Box, Stack, Tabs, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { CONSTS } from '../CONSTS';
import { useUiValue } from '../store/useUiStore';
import { useJsonData } from '../data/useJsonData';
import { useStickyHeaderHeight } from '../useStickyHeaderHeight';
import { CALC_TAB_GROUPS, groupTabs } from './tabGroups';
import { TAB_ITEM_STYLE, TAB_ROW_STYLE, TAB_STACK_STYLE, TAB_STACKS } from './tabWidths';
import TabItem from './TabItem';
import type { StatDescriptions } from './statText';

const EMPTY_DESCRIPTIONS: StatDescriptions = {};
const GROUP_UI_KEY = 'calcGroup';

/** 계산식 확인기: 하위 탭(묶음) 안에 콘텐츠마다 접이식 칸 */
export default function CalcPage() {
  const { t: translate } = useTranslation();
  const descriptions = useJsonData<StatDescriptions>('statDescriptions.json');
  const [savedGroup, setSavedGroup] = useUiValue(GROUP_UI_KEY);
  const subTabBarRef = useStickyHeaderHeight<HTMLDivElement>(CONSTS.display.STICKY_SUB_TAB_HEIGHT_VAR);
  const groups = CALC_TAB_GROUPS.filter((group) => groupTabs(group.tabIds).length > 0);
  const activeGroup = groups.find((group) => group.id === savedGroup) ?? groups[0];
  /* 한 번 연 하위 탭은 다른 탭으로 가도 지우지 않고 숨겨 둔다 (다시 열 때 처음부터 그리지 않음). 열지 않은 탭은 그리지 않는다 */
  const [openedGroupIds, setOpenedGroupIds] = useState<string[]>([]);
  const renderedGroupIds = openedGroupIds.includes(activeGroup.id) ? openedGroupIds : [...openedGroupIds, activeGroup.id];
  const changeGroup = (groupId: string) => {
    setOpenedGroupIds((previous) => (previous.includes(groupId) ? previous : [...renderedGroupIds, groupId]));
    setSavedGroup(groupId);
  };
  const shownDescriptions = descriptions.status === 'ready' ? descriptions.data : EMPTY_DESCRIPTIONS;
  // 화면이 넓으면 TAB_STACKS 의 칸들을 위아래로 쌓는다
  const stackScreen = useMediaQuery(`(min-width: ${CONSTS.display.TAB_STACK_MIN_SCREEN_WIDTH + 1}px)`);

  return (
    <Stack mt="md" gap="xs">
      <Text size="sm" c="dimmed">
        {translate('calc.intro')}
      </Text>
      {descriptions.status === 'failed' && <Alert color="red">{translate('calc.loadFailed')}</Alert>}
      <Tabs value={activeGroup.id} onChange={(next) => next && changeGroup(next)} variant="pills">
        <Box
          ref={subTabBarRef}
          pos="sticky"
          top={`var(${CONSTS.display.STICKY_HEADER_HEIGHT_VAR})`}
          py="xs"
          bg="var(--mantine-color-body)"
          style={{ zIndex: CONSTS.display.STICKY_HEADER_Z_INDEX - 1 }}
        >
          <Tabs.List>
            {groups.map((group) => (
              <Tabs.Tab key={group.id} value={group.id}>
                {translate(`calc.groups.${group.id}`)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Box>
        {groups.map((group) => {
          const tabs = groupTabs(group.tabIds);
          if (!renderedGroupIds.includes(group.id)) return null;
          return (
            <Tabs.Panel key={group.id} value={group.id}>
              <Accordion
                variant="separated"
                multiple
                defaultValue={tabs.map((tab) => tab.id)}
                styles={{ root: TAB_ROW_STYLE, item: TAB_ITEM_STYLE }}
              >
                {tabs.map((tab) => {
                  const stack = stackScreen ? TAB_STACKS.find((tabIds) => tabIds.includes(tab.id)) : undefined;
                  if (!stack) return <TabItem key={tab.id} tab={tab} descriptions={shownDescriptions} />;
                  // 묶음의 첫 칸 자리에 묶음 전체를 위아래로 놓고, 나머지 칸 자리는 비운다
                  if (stack[0] !== tab.id) return null;
                  return (
                    <Box key={stack.join('+')} style={TAB_STACK_STYLE}>
                      {tabs
                        .filter((stackTab) => stack.includes(stackTab.id))
                        .map((stackTab) => (
                          <TabItem key={stackTab.id} tab={stackTab} descriptions={shownDescriptions} stacked />
                        ))}
                    </Box>
                  );
                })}
              </Accordion>
            </Tabs.Panel>
          );
        })}
      </Tabs>
    </Stack>
  );
}
