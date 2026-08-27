(function () {
  "use strict";

  const THEME_STORAGE_KEY = "0fi";
  const ITEMS_PER_PAGE = 100;

  {
    let theme = "auto";
    try {
      theme = localStorage.getItem(THEME_STORAGE_KEY) || "auto";
    } catch {
      theme = "auto";
    }
    if (theme !== "light" && theme !== "dark") theme = "auto";
    const actual =
      theme === "auto"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(`theme-${actual}`);
    root.style.colorScheme = actual;
  }

  function start() {
    const SITE_NAME =
      document.documentElement.getAttribute("data-site-name") || "MoAEIOU";

    const form = document.querySelector(".directory-controls form");
    const input = document.getElementById("search");
    const themeToggle = document.querySelector(".theme-toggle");
    const resultsStatus = document.querySelector(".results-status");
    const body = document.body;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const table = document.querySelector("#list");
    const tbody = table?.querySelector("tbody");

    function detectThemeBase() {
      const fromHtml = document.documentElement.getAttribute("data-theme-base");
      if (fromHtml) return fromHtml.replace(/\/+$/, "") || "/";
      const script = document.querySelector('script[src*="fancyindex.js"]');
      const src = script?.getAttribute("src") || "";
      const match = src.match(/^(.*)\/fancyindex\.js(?:\?.*)?$/);
      return match ? match[1] : "/0fi";
    }

    function detectSiteRoot(themeBase) {
      const withoutTheme = themeBase.replace(/\/0fi$/i, "");
      if (!withoutTheme) return "/";
      return withoutTheme.endsWith("/") ? withoutTheme : `${withoutTheme}/`;
    }

    const themeBase = detectThemeBase();
    const siteRoot = detectSiteRoot(themeBase);

    function decodePathPart(part) {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    }

    function pathParts() {
      const encoded = window.location.pathname.split("/").filter(Boolean);
      const rootParts = siteRoot.split("/").filter(Boolean);
      const prefixLength =
        rootParts.length && rootParts.every((part, i) => encoded[i] === part)
          ? rootParts.length
          : 0;
      const encodedParts = encoded.slice(prefixLength);
      return {
        encodedParts,
        decodedParts: encodedParts.map(decodePathPart),
      };
    }

    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      try {
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        if (!document.execCommand("copy")) throw new Error("Copy failed");
      } finally {
        textarea.remove();
      }
    }

    function flashButton(button, text) {
      const originalText = button.textContent;
      button.textContent = text;
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }

    function sanitizeNameCells() {
      if (!tbody) return;

      // The fancyindex module (especially 0.5.x, which Debian ships) inserts
      // file names into the listing without HTML-escaping them, so a file named
      // e.g. `<img src=x onerror=alert(1)>` can smuggle markup into the page.
      // Rebuild every name cell as plain text. The href is percent-encoded by
      // the module, so it is the reliable source for the real file name. This
      // is defense-in-depth; the CSP meta tag in header.html is what actually
      // stops injected scripts from running.
      Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
        const cell = row.querySelector("td");
        if (!cell) return;

        const originalLink = cell.querySelector("a");
        const href = originalLink?.getAttribute("href") || "";

        // The "Parent directory" row is static, module-generated content.
        if (href.startsWith("../")) return;

        const decodedHref = (() => {
          if (!href) return null;
          try {
            return decodeURIComponent(href.split("?")[0]);
          } catch {
            return null;
          }
        })();
        const name = decodedHref ?? cell.textContent;
        if (!name) return;

        // Older module builds append sort state ("?C=N&O=A") to file links.
        // Download managers then save files as "name.tar.gz?C=N&O=A". Drop the
        // query from file links, but keep it on directory links so the sort
        // order survives navigation into a folder.
        const querylessHref = href.split("?")[0];
        const isDirectory = querylessHref.endsWith("/");
        const safeHref = isDirectory ? href : querylessHref;

        cell.replaceChildren();

        const link = document.createElement("a");
        if (safeHref) {
          link.setAttribute("href", safeHref);
        } else {
          try {
            link.setAttribute("href", encodeURIComponent(name));
          } catch {
            /* unencodable name; leave the link without an href */
          }
        }
        link.textContent = name;
        link.title = name;
        cell.appendChild(link);
      });
    }

    function applyColumnLabels() {
      if (!table || !tbody) return;
      const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
        th.textContent.replace(/\s+/g, " ").trim(),
      );
      tbody.querySelectorAll("tr").forEach((row) => {
        Array.from(row.children).forEach((cell, index) => {
          if (headers[index]) cell.setAttribute("data-label", headers[index]);
        });
      });
    }

    sanitizeNameCells();
    applyColumnLabels();

    const themeOptions = ["auto", "light", "dark"];
    let currentThemeIndex = 0;

    function updateThemeButton() {
      if (!themeToggle) return;

      const theme = themeOptions[currentThemeIndex];
      const labels = { auto: "Auto", light: "Light", dark: "Dark" };
      themeToggle.textContent = labels[theme];
      themeToggle.setAttribute("data-theme", theme);
      themeToggle.setAttribute(
        "aria-label",
        `Theme: ${labels[theme]}. Change theme`,
      );
    }

    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        currentThemeIndex = (currentThemeIndex + 1) % themeOptions.length;
        const theme = themeOptions[currentThemeIndex];
        storeTheme(theme);
        applyTheme(theme);
        updateThemeButton();
      });
    }

    function updateBreadcrumbs() {
      const breadcrumbNav = document.querySelector(".breadcrumb-nav");
      if (!breadcrumbNav) return;

      let breadcrumbList = breadcrumbNav.querySelector(".breadcrumb");
      if (!breadcrumbList) {
        breadcrumbList = document.createElement("ol");
        breadcrumbList.className = "breadcrumb";
        breadcrumbNav.prepend(breadcrumbList);
      }
      breadcrumbList.replaceChildren();

      const rootLi = document.createElement("li");
      const rootLink = document.createElement("a");
      rootLink.href = siteRoot;
      rootLink.textContent = "Root";
      rootLi.appendChild(rootLink);
      breadcrumbList.appendChild(rootLi);

      const { encodedParts, decodedParts } = pathParts();

      if (encodedParts.length) {
        let currentPath = siteRoot.endsWith("/") ? siteRoot : `${siteRoot}/`;

        decodedParts.forEach((part, index) => {
          currentPath += `${encodedParts[index]}/`;
          const li = document.createElement("li");

          if (index === decodedParts.length - 1) {
            li.textContent = part;
            li.setAttribute("aria-current", "page");
            li.className = "breadcrumb-current";
          } else {
            const link = document.createElement("a");
            link.href = currentPath;
            link.textContent = part;
            li.appendChild(link);
          }

          breadcrumbList.appendChild(li);
        });
      } else {
        rootLink.setAttribute("aria-current", "page");
      }
    }

    function updatePageTitle() {
      const rawPath = window.location.pathname;
      const displayPath =
        rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath || "/";
      document.title = `${displayPath} | ${SITE_NAME}`;
    }

    updatePageTitle();
    updateBreadcrumbs();

    const copyBtn = document.querySelector(".copy-page-url-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await copyText(window.location.href);
          flashButton(copyBtn, "Copied!");
        } catch {
          flashButton(copyBtn, "Failed");
        }
      });
    }

    const listItems = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];
    const isParentRow = (item) => {
      const link = item.querySelector("td a");
      if (!link) return false;
      const href = link.getAttribute("href") || "";
      return (
        href === "../" ||
        href.startsWith("../?") ||
        /^Parent directory/i.test(link.textContent || "")
      );
    };
    const parentItems = listItems.filter(isParentRow);
    const contentItems = listItems.filter((item) => !isParentRow(item));
    let filteredItems = [...contentItems];
    let currentPage = 1;

    function createPagination() {
      const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
      if (totalPages <= 1) return null;

      const paginationDiv = document.createElement("div");
      paginationDiv.className = "pagination";
      paginationDiv.setAttribute("role", "navigation");
      paginationDiv.setAttribute("aria-label", "Pagination");

      const info = document.createElement("span");
      info.className = "pagination-info";
      const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
      const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length);
      info.textContent = `Showing ${start}–${end} of ${filteredItems.length}`;
      paginationDiv.appendChild(info);

      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "pagination-buttons";

      const prevBtn = document.createElement("button");
      prevBtn.textContent = "← Previous";
      prevBtn.className = "pagination-btn";
      prevBtn.disabled = currentPage === 1;
      prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--;
          renderPage({ shouldScroll: true });
        }
      });
      buttonsDiv.appendChild(prevBtn);

      const maxButtons = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);
      if (endPage - startPage < maxButtons - 1)
        startPage = Math.max(1, endPage - maxButtons + 1);

      if (startPage > 1) {
        buttonsDiv.appendChild(createPageButton(1));
        if (startPage > 2) buttonsDiv.appendChild(makeEllipsis());
      }

      for (let i = startPage; i <= endPage; i++)
        buttonsDiv.appendChild(createPageButton(i));

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) buttonsDiv.appendChild(makeEllipsis());
        buttonsDiv.appendChild(createPageButton(totalPages));
      }

      const nextBtn = document.createElement("button");
      nextBtn.textContent = "Next →";
      nextBtn.className = "pagination-btn";
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderPage({ shouldScroll: true });
        }
      });
      buttonsDiv.appendChild(nextBtn);

      paginationDiv.appendChild(buttonsDiv);
      return paginationDiv;
    }

    function makeEllipsis() {
      const el = document.createElement("span");
      el.textContent = "...";
      el.className = "pagination-ellipsis";
      return el;
    }

    function createPageButton(pageNum) {
      const btn = document.createElement("button");
      btn.textContent = pageNum;
      btn.className = "pagination-btn";
      if (pageNum === currentPage) {
        btn.classList.add("active");
        btn.setAttribute("aria-current", "page");
      }
      btn.addEventListener("click", () => {
        currentPage = pageNum;
        renderPage({ shouldScroll: true });
      });
      return btn;
    }

    function persistSearch(query) {
      const url = new URL(window.location.href);
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      history.replaceState(null, "", url);

      table?.querySelectorAll("thead a[href]").forEach((link) => {
        try {
          const href = link.getAttribute("href");
          if (!href) return;
          const next = new URL(href, window.location.href);
          if (query) next.searchParams.set("q", query);
          else next.searchParams.delete("q");
          link.setAttribute("href", `${next.pathname}${next.search}`);
        } catch {
          /* ignore unparseable sort links */
        }
      });
    }

    function applySearch(rawQuery) {
      const searchValue = rawQuery.trim();

      if (!searchValue) {
        filteredItems = [...contentItems];
        contentItems.forEach((item) => (item.hidden = false));
        currentPage = 1;
        persistSearch("");
        renderPage();
        return;
      }

      const terms = searchValue.toLowerCase().split(/\s+/);

      filteredItems = contentItems.filter((item) => {
        const text =
          item.querySelector("td a")?.textContent.replace(/\s+/g, " ") || "";
        const normalizedText = text.toLowerCase();
        const matches = terms.every((term) => normalizedText.includes(term));
        item.hidden = !matches;
        return matches;
      });

      currentPage = 1;
      persistSearch(searchValue);
      renderPage();
    }

    function renderPage({ shouldScroll = false } = {}) {
      if (!tbody) return;

      listItems.forEach((item) => (item.style.display = "none"));
      parentItems.forEach((item) => {
        item.hidden = false;
        item.style.display = "";
      });

      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const pageItems = filteredItems.slice(start, start + ITEMS_PER_PAGE);
      pageItems.forEach((item) => {
        if (!item.hidden) item.style.display = "";
      });

      const existingPagination = table?.parentNode.querySelector(".pagination");
      if (existingPagination) existingPagination.remove();

      if (filteredItems.length > ITEMS_PER_PAGE) {
        const pagination = createPagination();
        if (pagination && table) table.after(pagination);
      }

      if (resultsStatus) {
        const query = input?.value.trim();
        resultsStatus.textContent = query
          ? filteredItems.length
            ? `${filteredItems.length} matching item${filteredItems.length === 1 ? "" : "s"}`
            : "No matching items"
          : "";
      }

      if (shouldScroll) {
        window.scrollTo({
          top: 0,
          behavior: reducedMotionQuery.matches ? "auto" : "smooth",
        });
      }
    }

    let searchTimeout;
    if (form) {
      form.addEventListener("submit", (event) => event.preventDefault());
    }

    input?.addEventListener(
      "input",
      function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          applySearch(this.value);
        }, 150);
      },
      { passive: true },
    );

    function getStoredTheme() {
      try {
        return localStorage.getItem(THEME_STORAGE_KEY) || "auto";
      } catch {
        return "auto";
      }
    }

    function storeTheme(theme) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        /* storage not available */
      }
    }

    function applyTheme(theme) {
      const actualTheme =
        theme === "auto" ? (mediaQuery.matches ? "dark" : "light") : theme;

      if (theme === "auto") {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
      } else {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      }

      document.documentElement.classList.remove("theme-light", "theme-dark");
      document.documentElement.classList.add(`theme-${actualTheme}`);
      document.documentElement.style.colorScheme = actualTheme;
      body.classList.remove("theme-light", "theme-dark");
    }

    function handleSystemThemeChange() {
      if (getStoredTheme() === "auto") applyTheme("auto");
    }

    const savedTheme = getStoredTheme();
    const storedTheme = themeOptions.includes(savedTheme) ? savedTheme : "auto";
    if (storedTheme !== savedTheme) storeTheme(storedTheme);
    currentThemeIndex = themeOptions.indexOf(storedTheme);
    if (currentThemeIndex === -1) currentThemeIndex = 0;
    applyTheme(storedTheme);
    updateThemeButton();

    document.addEventListener("keydown", (event) => {
      if (
        !input ||
        event.altKey ||
        event.key !== "f" ||
        !(event.ctrlKey || event.metaKey)
      ) {
        return;
      }
      event.preventDefault();
      input.focus();
      input.select();
    });

    const initialQuery =
      new URLSearchParams(window.location.search).get("q") || "";
    if (input && initialQuery) input.value = initialQuery;
    if (initialQuery) applySearch(initialQuery);
    else renderPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
