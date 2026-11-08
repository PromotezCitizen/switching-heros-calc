import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Accordion, Alert, Box, Stack, Tabs } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { CONSTS } from '@/CONSTS';
import { useUiValue } from '@/store/useUiStore';
import { useJsonData } from '@/data/useJsonData';
import { useStickyHeaderHeight } from '@/useStickyHeaderHeight';
import { CALC_TAB_GROUPS, shownGroupTabs } from '@/calc/tabGroups';
import { TAB_ITEM_STYLE, TAB_ROW_STYLE, TAB_STACK_STYLE, TAB_STACKS } from '@/calc/tabWidths';
import TabItem from '@/calc/TabItem';
import CalcSideNavLayout from '@/calc/CalcSideNavLayout';
import AccountFields from '@/account/AccountFields';
import { SLIDE_TAB_LIST_STYLE, SLIDE_TAB_STYLE } from '@/components/slideTabs';
import CalcSettingsFields from '@/masteryOptimizer/CalcSettingsFields';
import type { StatDescriptions } from '@/calc/statText';

const EMPTY_DESCRIPTIONS: StatDescriptions = {};
const GROUP_UI_KEY = 'calcGroup';
/** 맨 앞 묶음: 여러 페이지가 같이 쓰는 계정 값 (계산 탭이 아니라 AccountFields 를 그린다) */
const ACCOUNT_GROUP_ID = 'account';
/** 맨 뒤 묶음: 추천 계산 설정 (맞는 적 수 · 스테이지 층, CalcSettingsFields) */
const CALC_SETTINGS_GROUP_ID = 'calcSettings';
/** 계산 칸이 아닌 묶음 → 그리는 칸 (넓은 화면 목록용) */
const SPECIAL_GROUPS = {
  [ACCOUNT_GROUP_ID]: () => <AccountFields />,
  [CALC_SETTINGS_GROUP_ID]: () => <CalcSettingsFields />,
};

/** 계산식 확인기: 하위 탭(묶음) 안에 콘텐츠마다 접이식 칸 */
export default function CalcPage() {
  const { t: translate } = useTranslation();
  const descriptions = useJsonData<StatDescriptions>('statDescriptions.json');
  const [savedGroup, setSavedGroup] = useUiValue(GROUP_UI_KEY);
  const subTabBarRef = useStickyHeaderHeight<HTMLDivElement>(CONSTS.display.STICKY_SUB_TAB_HEIGHT_VAR);
  const groups = CALC_TAB_GROUPS.filter((group) => shownGroupTabs(group.tabIds).length > 0);
  const groupIds = [ACCOUNT_GROUP_ID, ...groups.map((group) => group.id), CALC_SETTINGS_GROUP_ID];
  const activeGroup = { id: groupIds.includes(savedGroup ?? '') ? (savedGroup as string) : ACCOUNT_GROUP_ID };
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
  // 넓은 화면은 왼쪽 목록 + 오른쪽 칸 하나, 좁은 화면 (폰) 은 아래의 묶음 탭 + 접이식 칸 그대로
  const sideNavScreen = useMediaQuery(`(min-width: ${CONSTS.display.SIDE_NAV_MIN_SCREEN_WIDTH}px)`);

  if (sideNavScreen) {
    return (
      <Stack mt="md" gap="xs">
        {descriptions.status === 'failed' && <Alert color="red">{translate('calc.loadFailed')}</Alert>}
        <CalcSideNavLayout
          groupIds={groupIds}
          specialGroups={SPECIAL_GROUPS}
          tabIdsByGroup={Object.fromEntries(groups.map((group) => [group.id, group.tabIds]))}
          descriptions={shownDescriptions}
        />
      </Stack>
    );
  }

  return (
    <Stack mt="md" gap="xs">
      {descriptions.status === 'failed' && <Alert color="red">{translate('calc.loadFailed')}</Alert>}
      {/* 숨긴 하위 탭은 화면에서만 숨긴다: Mantine 기본 (React Activity) 은 다시 열 때 탭 안 전체를 다시 그려 히어로 탭이 0.8초 넘게 멈췄다 */}
      <Tabs value={activeGroup.id} onChange={(next) => next && changeGroup(next)} variant="pills" keepMountedMode="display-none">
        <Box
          ref={subTabBarRef}
          pos="sticky"
          top={`var(${CONSTS.display.STICKY_HEADER_HEIGHT_VAR})`}
          py="xs"
          bg="var(--mantine-color-body)"
          style={{ zIndex: CONSTS.display.STICKY_HEADER_Z_INDEX - 1 }}
        >
          <Tabs.List style={SLIDE_TAB_LIST_STYLE}>
            {groupIds.map((groupId) => (
              <Tabs.Tab key={groupId} value={groupId} style={SLIDE_TAB_STYLE}>
                {translate(`calc.groups.${groupId}`)}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Box>
        {renderedGroupIds.includes(ACCOUNT_GROUP_ID) && (
          <Tabs.Panel value={ACCOUNT_GROUP_ID} pt={CONSTS.display.CONTENT_TOP_GAP}>
            <AccountFields />
          </Tabs.Panel>
        )}
        {renderedGroupIds.includes(CALC_SETTINGS_GROUP_ID) && (
          <Tabs.Panel value={CALC_SETTINGS_GROUP_ID} pt={CONSTS.display.CONTENT_TOP_GAP}>
            <CalcSettingsFields />
          </Tabs.Panel>
        )}
        {groups.map((group) => {
          const tabs = shownGroupTabs(group.tabIds);
          if (!renderedGroupIds.includes(group.id)) return null;
          // 칸이 하나뿐인 묶음 (종합 · 몬스터 카드 · 펫) 은 접을 일이 없어 접이식 제목 줄 없이 그린다
          if (tabs.length === 1) {
            return (
              <Tabs.Panel key={group.id} value={group.id} pt={CONSTS.display.CONTENT_TOP_GAP}>
                <TabItem tab={tabs[0]} descriptions={shownDescriptions} single />
              </Tabs.Panel>
            );
          }
          return (
            <Tabs.Panel key={group.id} value={group.id} pt={CONSTS.display.CONTENT_TOP_GAP}>
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
