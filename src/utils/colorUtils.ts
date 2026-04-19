import { DataFrame, Field, FieldType, GrafanaTheme2, ThresholdsMode } from '@grafana/data';
import { ColorConfig } from '../types';

function getLastValue(field: Field): number | string | null {
  const vals = field.values;
  if (!vals || vals.length === 0) {
    return null;
  }
  return vals[vals.length - 1] ?? null;
}

function findField(series: DataFrame[], fieldName: string): Field | undefined {
  for (const frame of series) {
    const f = frame.fields.find((ff) => ff.name === fieldName);
    if (f) {
      return f;
    }
  }
  return undefined;
}

function thresholdColor(field: Field, value: number, theme: GrafanaTheme2): string {
  const thresholds = field.config?.thresholds;
  if (!thresholds || !thresholds.steps || thresholds.steps.length === 0) {
    return theme.colors.text.primary;
  }

  let activeColor = thresholds.steps[0].color;

  if (thresholds.mode === ThresholdsMode.Percentage) {
    const min = field.config?.min ?? 0;
    const max = field.config?.max ?? 100;
    const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
    for (const step of thresholds.steps) {
      if (pct >= step.value!) {
        activeColor = step.color;
      }
    }
  } else {
    for (const step of thresholds.steps) {
      if (value >= (step.value ?? 0)) {
        activeColor = step.color;
      }
    }
  }

  return theme.visualization.getColorByName(activeColor) ?? activeColor;
}

export function resolveColor(
  cfg: ColorConfig,
  series: DataFrame[],
  theme: GrafanaTheme2,
  fallback = 'transparent'
): string {
  if (cfg.mode === 'fixed') {
    return cfg.value || fallback;
  }

  if (cfg.mode === 'field' || cfg.mode === 'thresholds') {
    const fieldName = cfg.mode === 'field' ? cfg.field : undefined;
    const field = fieldName
      ? findField(series, fieldName)
      : series[0]?.fields.find((f) => f.type === FieldType.number);

    if (!field) {
      return fallback;
    }

    const raw = getLastValue(field);
    if (raw === null || typeof raw !== 'number') {
      return fallback;
    }

    return thresholdColor(field, raw, theme);
  }

  return fallback;
}

export function resolveText(cfg: { mode: 'fixed'; value: string } | { mode: 'field'; field: string }, series: DataFrame[]): string {
  if (cfg.mode === 'fixed') {
    return cfg.value;
  }
  const field = findField(series, cfg.field);
  if (!field) {
    return '';
  }
  const val = getLastValue(field);
  return val !== null ? String(val) : '';
}
