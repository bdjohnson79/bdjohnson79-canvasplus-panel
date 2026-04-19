import { useMemo } from 'react';
import { PanelData, GrafanaTheme2, FieldConfigSource } from '@grafana/data';
import { CanvasElement } from '../../types';
import { resolveColor, resolveText } from '../../utils/colorUtils';

export interface ResolvedStyle {
  bg: string;
  borderColor: string;
  text: string;
  iconColor: string;
  statusColor: string;
}

export function useDataBinding(
  element: CanvasElement,
  data: PanelData,
  _fieldConfig: FieldConfigSource,
  theme: GrafanaTheme2
): ResolvedStyle {
  return useMemo(() => {
    const series = data.series;

    const bg = resolveColor(element.background.color, series, theme, 'transparent');
    const borderColor = resolveColor(element.border.color, series, theme, theme.colors.border.medium);

    const text = element.text
      ? resolveText(element.text.content, series)
      : '';

    const iconColor = element.iconColor
      ? resolveColor(element.iconColor, series, theme, theme.colors.text.primary)
      : theme.colors.text.primary;

    const statusColor = element.statusColor
      ? resolveColor(element.statusColor, series, theme, theme.colors.success.main)
      : theme.colors.success.main;

    return { bg, borderColor, text, iconColor, statusColor };
  }, [element, data.series, theme]);
}
