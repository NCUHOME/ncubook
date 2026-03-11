import React, { useEffect } from 'react';
import SearchBar from '@theme-original/SearchBar';

function useAiButton() {
  useEffect(() => {
    // Observe the body for the search dropdown container to dynamically add the AI button
    const observer = new MutationObserver(() => {
      // @easyops-cn/docusaurus-search-local typically opens a .dropdownMenu
      const dropdowns = document.querySelectorAll('.dropdownMenu');
      for (const dropdown of dropdowns) {
        if (!dropdown.querySelector('.ai-search-button')) {
          const btn = document.createElement('button');
          btn.className = 'ai-search-button';

          // Styling the button directly for simplicity and robustness
          btn.style.width = 'calc(100% - 16px)';
          btn.style.margin = '8px';
          btn.style.padding = '10px 16px';
          btn.style.borderRadius = '6px';
          btn.style.border = 'none';
          btn.style.backgroundColor = 'var(--ifm-color-primary)';
          btn.style.color = '#fff';
          btn.style.cursor = 'pointer';
          btn.style.fontSize = '14px';
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'center';
          btn.style.gap = '8px';
          btn.style.transition = 'background-color 0.2s ease, transform 0.2s ease';

          btn.onmouseover = () => {
            btn.style.backgroundColor = 'var(--ifm-color-primary-dark)';
            btn.style.transform = 'translateY(-1px)';
          };
          btn.onmouseout = () => {
            btn.style.backgroundColor = 'var(--ifm-color-primary)';
            btn.style.transform = 'translateY(0)';
          };

          btn.innerHTML = `<img src="/img/ai-logo.png" style="width: 16px; height: 16px; border-radius: 50%; object-fit: contain;" /> <span style="font-weight: 500;">没找到？让 AI 帮你回答</span>`;

          btn.onclick = (e) => {
            e.preventDefault();
            // Try to get the user's current search input value
            const searchInput = document.querySelector('input[type="search"]');
            const query = searchInput ? searchInput.value : '';

            // Open the AI Assistant modal
            window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { query } }));

            // Attempt to close the search modal gracefully by blurring the input
            if (searchInput) searchInput.blur();
            // If there's a close button, trigger it
            const closeBtn = document.querySelector('.searchBar .clearButton') || document.querySelector('.navbar__search-clear');
            if (closeBtn) closeBtn.click();
          };

          dropdown.appendChild(btn);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);
}

export default function SearchBarWrapper(props) {
  useAiButton();
  return (
    <>
      <SearchBar {...props} />
    </>
  );
}
