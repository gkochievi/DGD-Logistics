import React from 'react';
import { Tag } from 'antd';
import { STATUS_CONFIG, URGENCY_CONFIG } from '../../utils/status';
import { useLang } from '../../contexts/LanguageContext';

export function StatusBadge({ status, label }) {
  const { t } = useLang();
  const cfg = STATUS_CONFIG[status] || { color: 'default', label: status };
  return <Tag color={cfg.color}>{label || t('status.' + status) || cfg.label}</Tag>;
}

export function UrgencyBadge({ urgency, label }) {
  const { t } = useLang();
  const cfg = URGENCY_CONFIG[urgency] || { color: 'default', label: urgency };
  return <Tag color={cfg.color}>{label || t('urgency.' + urgency) || cfg.label}</Tag>;
}
