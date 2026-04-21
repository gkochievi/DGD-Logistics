import React from 'react';
import { Tag } from 'antd';
import { STATUS_CONFIG, URGENCY_CONFIG, getStatusLabel } from '../../utils/status';
import { useLang } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

export function StatusBadge({ status, label }) {
  const { t } = useLang();
  const { isCustomer } = useAuth();
  const cfg = STATUS_CONFIG[status] || { color: 'default', label: status };
  return <Tag color={cfg.color}>{label || getStatusLabel(t, status, { isCustomer }) || cfg.label}</Tag>;
}

export function UrgencyBadge({ urgency, label }) {
  const { t } = useLang();
  const cfg = URGENCY_CONFIG[urgency] || { color: 'default', label: urgency };
  return <Tag color={cfg.color}>{label || t('urgency.' + urgency) || cfg.label}</Tag>;
}
