import { useMemo } from 'react';
import { PanelData, GrafanaTheme2 } from '@grafana/data';
import { CanvasElement } from '../../types';
import { resolveColor, resolveImageSrc, resolveText } from '../../utils/colorUtils';

export interface ResolvedStyle {
  bg: string;
  borderColor: string;
  text: string;
  textColor: string;
  iconColor: string;
  statusColor: string;
  imageSrc: string;
  metricValue: string;
  metricValueColor: string;
}

export function useDataBinding(
  element: CanvasElement,
  data: PanelData,
  theme: GrafanaTheme2
): ResolvedStyle {
  return useMemo(() => {
    const series = data.series;

    const bg = resolveColor(element.background.color, series, theme, 'transparent');
    const borderColor = resolveColor(element.border.color, series, theme, theme.colors.border.medium);

    const text = element.text
      ? resolveText(element.text.content, series)
      : '';

    const textColor = element.text
      ? resolveColor(element.text.color, series, theme, theme.colors.text.primary)
      : theme.colors.text.primary;

    const iconColor = element.iconColor
      ? resolveColor(element.iconColor, series, theme, theme.colors.text.primary)
      : theme.colors.text.primary;

    const statusColor = element.statusColor
      ? resolveColor(element.statusColor, series, theme, theme.colors.success.main)
      : theme.colors.success.main;

    const imageSrc = resolveImageSrc(element, series);

    const metricValue =
      element.type === 'metric-value' && element.metricField
        ? resolveText({ mode: 'field', field: element.metricField }, series)
        : '';

    const metricValueColor =
      element.type === 'metric-value'
        ? resolveColor(
            element.metricValueColor ?? { mode: 'fixed', value: theme.colors.text.primary },
            series,
            theme,
            theme.colors.text.primary
          )
        : '';

    return { bg, borderColor, text, textColor, iconColor, statusColor, imageSrc, metricValue, metricValueColor };
  }, [element, data.series, theme]);
}

