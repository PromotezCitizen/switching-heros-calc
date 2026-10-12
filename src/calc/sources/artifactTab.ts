import ArtifactPanel from '../panels/ArtifactPanel';
import type { CalcTab } from '../types';
import { ARTIFACT_SOURCE_PREFIX, artifactLines } from './artifact';

export const artifactTab: CalcTab = {
  id: 'artifact',
  tableNames: [],
  Panel: ArtifactPanel,
  lines: (values) => artifactLines(values, (fieldId) => `${ARTIFACT_SOURCE_PREFIX}${fieldId}`),
};
