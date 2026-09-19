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
      const src = script?.getAttribute("src");
      if (!src) return "/0fi";

      // Resolve the src the way the browser did, so relative paths such as
      // "fancyindex.js" or "/assets/fancyindex.js" work too.
      try {
        const path = new URL(src, window.location.href).pathname;
        const match = path.match(/^(.*)\/fancyindex\.js$/);
        return match ? match[1] || "/" : "/0fi";
      } catch {
        return "/0fi";
      }
    }

    // The theme lives in its own directory (e.g. /0fi), so the site root is
    // whatever sits above it. Deriving it instead of matching the literal
    // "/0fi" keeps the theme working under a different name or a sub-path.
    function detectSiteRoot(themeBase) {
      const trimmed = themeBase.replace(/\/+$/, "");
      const separator = trimmed.lastIndexOf("/");
      if (separator <= 0) return "/";
      return `${trimmed.slice(0, separator)}/`;
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

    const flashTimers = new WeakMap();

    function flashButton(button, text) {
      const previous = flashTimers.get(button);
      const originalText = previous?.originalText ?? button.textContent;
      if (previous) clearTimeout(previous.timer);

      button.textContent = text;
      const timer = setTimeout(() => {
        button.textContent = originalText;
        flashTimers.delete(button);
      }, 2000);
      flashTimers.set(button, { originalText, timer });
    }

    function sanitizeNameCells() {
      if (!tbody) return;

      // Rebuild every name cell as plain text instead of trusting the markup
      // the module emitted. The href is percent-encoded by the module, so it is
      // the reliable source for the real file name, and a file called
      // `<img src=x onerror=alert(1)>` stays a file name rather than markup.
      // This is defense-in-depth; the CSP meta tag in header.html is the
      // backstop if a build ever emits unescaped names.
      Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
        const cell = row.querySelector("td");
        if (!cell) return;

        const originalLink = cell.querySelector("a");
        const href = originalLink?.getAttribute("href") || "";

        // The parent entry is static, module-generated content. The module
        // emits it as a plain <tr> even though the stylesheet styles
        // "tr.parent", so tag the row and leave its markup alone.
        if (
          href.startsWith("../") ||
          /^Parent directory/i.test(cell.textContent || "")
        ) {
          row.classList.add("parent");
          return;
        }

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
        link.classList.add(isDirectory ? "dir" : "file");
        cell.appendChild(link);
      });
    }

    function applyColumnLabels() {
      if (!table || !tbody) return;
      const headers = Array.from(table.querySelectorAll("thead th")).map(
        (th) => {
          // Each header holds a sort link plus a second link with the direction
          // arrow, so read the label from the first link only.
          const label = th.querySelector("a")?.textContent ?? th.textContent;
          return label.replace(/\s+/g, " ").trim();
        },
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
      const { decodedParts } = pathParts();
      const rootPath = siteRoot === "/" ? "" : siteRoot.replace(/\/+$/, "");
      const displayPath = decodedParts.length
        ? `${rootPath}/${decodedParts.join("/")}`
        : rootPath || "/";
      const label = displayPath === "/" ? "Root" : displayPath;
      document.title = `${label} | ${SITE_NAME}`;
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
      prevBtn.type = "button";
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
      nextBtn.type = "button";
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
      btn.type = "button";
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

    // Keep the search term and the current page in the URL so a reload (or a
    // shared link) lands on the same view. The sort links inside the table get
    // the query too, because the module reloads the directory when sorting.
    function persistUrl() {
      const query = input?.value.trim() || "";
      const url = new URL(window.location.href);
      if (query) url.searchParams.set("q", query);
      else url.searchParams.delete("q");
      if (currentPage > 1) url.searchParams.set("page", String(currentPage));
      else url.searchParams.delete("page");

      try {
        history.replaceState(null, "", url.toString());
      } catch {
        /* no History API (e.g. a file:// listing); sorting still works below */
      }

      table?.querySelectorAll("thead a[href]").forEach((link) => {
        try {
          const href = link.getAttribute("href");
          if (!href) return;
          const next = new URL(href, window.location.href);
          if (query) next.searchParams.set("q", query);
          else next.searchParams.delete("q");
          next.searchParams.delete("page");
          link.setAttribute("href", `${next.pathname}${next.search}`);
        } catch {
          /* ignore unparseable sort links */
        }
      });
    }

    function applySearch(rawQuery, { resetPage = true } = {}) {
      const searchValue = rawQuery.trim();

      if (!searchValue) {
        filteredItems = [...contentItems];
      } else {
        const terms = searchValue.toLowerCase().split(/\s+/);
        filteredItems = contentItems.filter((item) => {
          const text =
            item.querySelector("td a")?.textContent.replace(/\s+/g, " ") || "";
          const normalizedText = text.toLowerCase();
          return terms.every((term) => normalizedText.includes(term));
        });
      }

      if (resetPage) currentPage = 1;
      renderPage();
    }

    function renderPage({ shouldScroll = false } = {}) {
      if (!tbody) return;

      const totalPages = Math.max(
        1,
        Math.ceil(filteredItems.length / ITEMS_PER_PAGE),
      );
      currentPage = Math.min(Math.max(currentPage, 1), totalPages);

      listItems.forEach((item) => (item.hidden = true));
      parentItems.forEach((item) => {
        item.hidden = false;
      });

      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      filteredItems.slice(start, start + ITEMS_PER_PAGE).forEach((item) => {
        item.hidden = false;
      });

      const existingPagination = table?.parentNode.querySelector(".pagination");
      if (existingPagination) existingPagination.remove();

      if (filteredItems.length > ITEMS_PER_PAGE && table) {
        const pagination = createPagination();
        if (pagination) table.after(pagination);
      }

      if (resultsStatus) {
        const query = input?.value.trim();
        if (query) {
          resultsStatus.textContent = filteredItems.length
            ? `${filteredItems.length} matching item${filteredItems.length === 1 ? "" : "s"}`
            : "No matching items";
        } else {
          resultsStatus.textContent = contentItems.length
            ? ""
            : "This directory is empty.";
        }
      }

      persistUrl();

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

    const initialParams = new URLSearchParams(window.location.search);
    const initialQuery = initialParams.get("q") || "";
    const initialPage = Number.parseInt(initialParams.get("page") || "1", 10);
    if (Number.isFinite(initialPage) && initialPage > 0)
      currentPage = initialPage;

    if (input && initialQuery) input.value = initialQuery;
    if (initialQuery) applySearch(initialQuery, { resetPage: false });
    else renderPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
