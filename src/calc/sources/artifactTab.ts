import ArtifactPanel from '@/calc/panels/ArtifactPanel';
import type { CalcTab } from '@/calc/types';
import { ARTIFACT_SOURCE_PREFIX, artifactLines } from '@/calc/sources/artifact';

export const artifactTab: CalcTab = {
  id: 'artifact',
  tableNames: [],
  Panel: ArtifactPanel,
  lines: (values) => artifactLines(values, (fieldId) => `${ARTIFACT_SOURCE_PREFIX}${fieldId}`),
};
