import React, { useEffect } from 'react';
import DocSidebar from '@theme-original/DocSidebar';

export default function DocSidebarWrapper(props) {
  useEffect(() => {
    // 初始化: 收起所有一级可折叠菜单项
    const initializeSidebar = () => {
      const topLevelCollapsible = document.querySelectorAll(
        '.menu__list > .menu__list-item-collapsible'
      );
      topLevelCollapsible.forEach(item => {
        item.classList.add('menu__list-item--collapsed');
      });
    };

    // 延迟初始化以确保DOM已完全加载
    setTimeout(initializeSidebar, 100);

    // 监听点击事件,实现手风琴效果
    const handleCategoryClick = (e) => {
      const clickedLink = e.target.closest('.menu__link');
      if (!clickedLink) return;

      const clickedCategory = clickedLink.closest('.menu__list-item-collapsible');
      if (!clickedCategory) return;

      // 只处理顶级菜单项
      const isTopLevel = clickedCategory.parentElement?.classList.contains('menu__list') &&
                         !clickedCategory.parentElement?.parentElement?.classList.contains('menu__list-item');
      
      if (!isTopLevel) return;

      e.preventDefault();
      e.stopPropagation();

      // 获取所有顶级可折叠项
      const topLevelItems = document.querySelectorAll(
        '.menu__list > .menu__list-item-collapsible'
      );

      const isCurrentlyCollapsed = clickedCategory.classList.contains('menu__list-item--collapsed');

      // 收起所有其他顶级项
      topLevelItems.forEach(item => {
        if (item !== clickedCategory) {
          item.classList.add('menu__list-item--collapsed');
        }
      });

      // 切换当前项的状态
      if (isCurrentlyCollapsed) {
        clickedCategory.classList.remove('menu__list-item--collapsed');
      } else {
        clickedCategory.classList.add('menu__list-item--collapsed');
      }
    };

    // 添加事件监听
    document.addEventListener('click', handleCategoryClick, true);

    return () => {
      document.removeEventListener('click', handleCategoryClick, true);
    };
  }, []);

  return <DocSidebar {...props} />;
}