import { createTheme } from '@mantine/core';

/** 화면을 촘촘하게: 입력 칸·버튼·표를 한 단계 작게, 카드·간격을 줄인다 */
const COMPACT_SIZE = 'xs';

export const theme = createTheme({
  components: {
    TextInput: { defaultProps: { size: COMPACT_SIZE } },
    NumberInput: { defaultProps: { size: COMPACT_SIZE } },
    NativeSelect: { defaultProps: { size: COMPACT_SIZE } },
    Checkbox: { defaultProps: { size: COMPACT_SIZE } },
    Chip: { defaultProps: { size: COMPACT_SIZE } },
    Button: { defaultProps: { size: 'compact-sm' } },
    Table: { defaultProps: { verticalSpacing: COMPACT_SIZE, horizontalSpacing: 'sm' } },
    Card: { defaultProps: { padding: COMPACT_SIZE } },
    Paper: { defaultProps: { p: 'sm' } },
    Accordion: { styles: { control: { paddingTop: 6, paddingBottom: 6 }, content: { paddingTop: 4 } } },
    Stack: { defaultProps: { gap: 'xs' } },
    SimpleGrid: { defaultProps: { spacing: 'xs', verticalSpacing: 'xs' } },
  },
});
