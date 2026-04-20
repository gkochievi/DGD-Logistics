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

/**
 * Renders a category image if available, falls back to icon.
 * @param {string|null} imageUrl - The category image URL
 * @param {string} icon - The icon name (fallback)
 * @param {number} size - The display size in pixels
 */
export function CategoryImage({ imageUrl, icon, size = 32 }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          borderRadius: size > 40 ? 8 : 4,
        }}
      />
    );
  }
  return React.cloneElement(getCategoryIcon(icon), { style: { fontSize: size * 0.6 } });
}

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export default ICON_MAP;
