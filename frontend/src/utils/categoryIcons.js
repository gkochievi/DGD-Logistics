import React from 'react';
import {
  CarOutlined, ToolOutlined, BuildOutlined, ThunderboltOutlined,
  RocketOutlined, InboxOutlined, ColumnHeightOutlined, ExperimentOutlined,
  DatabaseOutlined, VerticalAlignTopOutlined, FireOutlined, CloudOutlined,
  ArrowUpOutlined, CompressOutlined, BulbOutlined, MinusOutlined,
  SettingOutlined, AppstoreOutlined,
} from '@ant-design/icons';

const ICON_MAP = {
  car: <CarOutlined />,
  tool: <ToolOutlined />,
  build: <BuildOutlined />,
  thunderbolt: <ThunderboltOutlined />,
  rocket: <RocketOutlined />,
  inbox: <InboxOutlined />,
  'column-height': <ColumnHeightOutlined />,
  experiment: <ExperimentOutlined />,
  database: <DatabaseOutlined />,
  'vertical-align-top': <VerticalAlignTopOutlined />,
  fire: <FireOutlined />,
  cloud: <CloudOutlined />,
  'arrow-up': <ArrowUpOutlined />,
  compress: <CompressOutlined />,
  bulb: <BulbOutlined />,
  minus: <MinusOutlined />,
  setting: <SettingOutlined />,
  appstore: <AppstoreOutlined />,
};

export function getCategoryIcon(iconName) {
  return ICON_MAP[iconName] || <CarOutlined />;
}

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export default ICON_MAP;
