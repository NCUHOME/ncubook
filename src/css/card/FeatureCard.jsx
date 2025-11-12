import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './FeatureCard.module.css'; // 使用 CSS Modules 进行局部样式隔离

// 这是一个通用的卡片组件，可以传入图标、标题、描述和链接
export function FeatureCard({ title, description, to, icon, className }) {
  return (
    <div className={clsx('col col--6 margin-bottom--md', className)}> {/* col--6 表示在大屏幕上占据 12 列中的 6 列，即两列布局 */}
      <Link className={styles.card} to={to}>
        {/* 卡片头部 */}
        <div className={styles.cardHeader}>
          {/* 这里可以使用 SVG 或自定义 React Icon 组件 */}
          <div className={styles.icon}>{icon}</div> 
          <h3 className={styles.title}>{title}</h3>
        </div>
        {/* 卡片内容 */}
        <p className={styles.description}>{description}</p>
      </Link>
    </div>
  );
}

// 这是一个四列的容器组件，在文档中使用时会环绕所有卡片
export function FeatureGrid({ children }) {
  // Infima 的 row 容器，用于启用 Flexbox/Grid 布局
  return (
    <div className={clsx('row', styles.gridContainer)}> 
      {children}
    </div>
  );
}