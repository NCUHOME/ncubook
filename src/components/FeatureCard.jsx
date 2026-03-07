import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './FeatureCard.module.css'; // 使用 CSS Modules 进行局部样式隔离

// 这是一个通用的卡片组件，可以传入图标、标题、描述和链接
export function FeatureCard({ title, description, to, icon, className = '' }) {
  return (
    <div className={className}>
      <Link className={styles.card} to={to}>
        <div className={styles.iconContainer}>
          {React.isValidElement(icon) ? icon : React.createElement(icon, { size: 20 })}
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>
        <div className={styles.actionLink}>
          Explore <span className={styles.actionIcon}>{React.createElement(icon instanceof Function ? icon : 'span', { size: 16 })}</span>
        </div>
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