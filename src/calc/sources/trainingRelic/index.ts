/** 훈련·유물 탭 묶음. 줄 출처 이름은 번역 파일 (calc.training / calc.relic) 에서 가져온다 */
import i18next from 'i18next';
import RelicPanel from '@/calc/panels/RelicPanel';
import TrainingPanel from '@/calc/panels/TrainingPanel';
import type { CalcTab } from '@/calc/types';
import { RELIC_TABLE, WEAPON_JOB_TABLE, relicLines } from '@/calc/sources/trainingRelic/relic';
import { TRAINING_TABLE, trainingLines } from '@/calc/sources/trainingRelic/training';

export const trainingRelicTabs: CalcTab[] = [
  {
    id: 'training',
    tableNames: [TRAINING_TABLE],
    Panel: TrainingPanel,
    lines: (values, tables) =>
      trainingLines(values, tables, (stage) => i18next.t('calc.training.source', { stage })),
  },
  {
    id: 'relic',
    /* 훈련 연동 유물이 훈련 단계 (Training 표의 최대 단계로 제한) 를, 직업 무기 연동 유물이 일반 무기 최대 레벨 (WeaponJob) 을 읽는다 */
    // 히어로 수·★10 전용 무기 수 연동 유물은 히어로 표 (Character) · 전용 무기 표 (WeaponChar) 를 센다
    tableNames: [RELIC_TABLE, TRAINING_TABLE, WEAPON_JOB_TABLE, 'Character', 'WeaponChar'],
    Panel: RelicPanel,
    lines: (values, tables) =>
      relicLines(values, tables, {
        relic: (relicId, level, multiplier) => {
          const name = i18next.t(`calc.relic.names.${relicId}`);
          return multiplier === null
            ? i18next.t('calc.relic.source', { name, level })
            : i18next.t('calc.relic.sourceLinked', { name, level, multiplier });
        },
        blessing: i18next.t('calc.relic.blessingSource'),
      }),
  },
];
