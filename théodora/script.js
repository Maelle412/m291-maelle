document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");

  if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Ouvrir le menu" : "Fermer le menu");
      navigation.classList.toggle("is-open", !isOpen);
    });
  }

  const searchInput = document.querySelector("#site-search");
  const filterButtons = document.querySelectorAll(".filter-button");
  const newsGrid = document.querySelector("#news-grid");
  const noResults = document.querySelector("#aucun-resultat");
  const proposalForm = document.querySelector("#proposer");
  let allNews = [];

  const formatDate = (date) => new Intl.DateTimeFormat("fr-CH", {
    day: "numeric", month: "long", year: "numeric"
  }).format(new Date(`${date}T12:00:00`));

  const createStateMessage = (message, className, role = "status") => {
    const element = document.createElement("p");
    element.className = `news-state ${className}`;
    element.setAttribute("role", role);
    element.textContent = message;
    return element;
  };

  const renderNews = (articles) => {
    if (!newsGrid) return;
    allNews = articles;
    if (articles.length === 0) {
      newsGrid.replaceChildren(createStateMessage("Aucune actualité pour le moment.", "news-empty"));
      newsGrid.setAttribute("aria-busy", "false");
      if (noResults) noResults.hidden = true;
      return;
    }

    const illustrations = ["art-mondrian", "art-lips", "art-moon", "art-stage"];
    const categoryLabels = { clip: "Clip", album: "Album", live: "Live" };
    const cards = articles.map((article, index) => {
      const category = categoryLabels[article.categorie] ? article.categorie : "clip";
      const art = illustrations[index % illustrations.length];
      const duration = Number(article.dureeLectureMinutes);
      const readTime = Number.isFinite(duration) ? `${duration} min de lecture` : "Actualité";
      const card = document.createElement("article");
      card.className = "news-card";
      card.dataset.category = category;

      const illustration = document.createElement("div");
      illustration.className = `news-card-art ${art}`;
      illustration.setAttribute("aria-hidden", "true");
      if (art !== "art-mondrian") illustration.appendChild(document.createElement("span"));

      const copy = document.createElement("div");
      copy.className = "news-card-copy";

      const categoryBadge = document.createElement("span");
      categoryBadge.className = `category ${category === "live" ? "category-blue" : ""}`;
      categoryBadge.textContent = categoryLabels[category];

      const title = document.createElement("h2");
      title.textContent = article.titre || "Actualité";
      const summary = document.createElement("p");
      summary.textContent = article.resume || "";
      const meta = document.createElement("span");
      meta.className = "side-date";
      meta.textContent = `${formatDate(article.date)} · ${readTime}`;

      copy.append(categoryBadge, title, summary, meta);
      if (article.page === "article.html") {
        const link = document.createElement("a");
        link.href = article.page;
        link.append(illustration, copy);
        card.appendChild(link);
      } else {
        card.append(illustration, copy);
      }
      return card;
    });
    newsGrid.replaceChildren(...cards);
    newsGrid.setAttribute("aria-busy", "false");
    applyFilters();
  };

  const showNewsError = () => {
    if (!newsGrid) return;
    const message = document.createElement("div");
    message.className = "news-state news-error";
    message.setAttribute("role", "alert");
    const text = document.createElement("p");
    text.textContent = window.location.protocol === "file:"
      ? "Les actualités ne peuvent pas être chargées depuis un fichier local. Ouvre le site avec Live Server."
      : "Les actualités ne peuvent pas être chargées. Vérifie que actualites.json est publié à côté de cette page, puis réessaie.";
    const retry = document.createElement("button");
    retry.className = "news-retry";
    retry.type = "button";
    retry.textContent = "Réessayer";
    message.append(text, retry);
    newsGrid.replaceChildren(message);
    newsGrid.setAttribute("aria-busy", "false");
  };

  const loadNews = async () => {
    if (!newsGrid) return;
    newsGrid.setAttribute("aria-busy", "true");
    newsGrid.replaceChildren(createStateMessage("Chargement des actualités…", "news-loading"));
    try {
      const response = await fetch("actualites.json");
      if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Format des actualités invalide");
      renderNews(data);
    } catch (error) {
      console.error("Impossible de charger les actualités :", error);
      showNewsError();
    }
  };

  const applyFilters = () => {
    if (!newsGrid) return;
    const query = (searchInput?.value || "").trim().toLocaleLowerCase("fr");
    const activeFilter = [...filterButtons].find((button) => button.getAttribute("aria-pressed") === "true")?.dataset.filter || "all";
    const cards = [...newsGrid.querySelectorAll(".news-card")];
    cards.forEach((card) => {
      const text = card.textContent.toLocaleLowerCase("fr");
      card.hidden = !(text.includes(query) && (activeFilter === "all" || card.dataset.category === activeFilter));
    });
    if (noResults) noResults.hidden = cards.length === 0 || cards.some((card) => !card.hidden);
  };

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;

      filterButtons.forEach((filterButton) => {
        filterButton.setAttribute("aria-pressed", String(filterButton === button));
      });

      applyFilters();
    });
  });

  newsGrid?.addEventListener("click", (event) => {
    if (event.target.closest(".news-retry")) loadNews();
  });
  loadNews();

  if (proposalForm) {
    proposalForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const data = new FormData(proposalForm);
      const title = String(data.get("titre") || "").trim();
      const category = String(data.get("categorie") || "").trim();
      const errors = [];

      if (title.length < 2) {
        errors.push("Le titre doit avoir au moins 2 caractères.");
      }
      if (!["clip", "album", "live"].includes(category)) {
        errors.push("Choisissez un genre : clip, album ou live.");
      }

      const errorMessage = document.querySelector("#erreurs");
      if (errors.length > 0) {
        errorMessage.textContent = `Erreur : ${errors.join(" ")}`;
        return;
      }
      errorMessage.textContent = "";

      const today = new Date();
      const date = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
      ].join("-");
      allNews.unshift({
        titre: title,
        categorie: category,
        resume: "Proposée par un lecteur, à vérifier.",
        date,
        dureeLectureMinutes: 1,
        page: null
      });
      renderNews(allNews);
      proposalForm.reset();
    });
  }

  const newsletterForm = document.querySelector(".newsletter-form");
  const formMessage = document.querySelector(".form-message");

  if (newsletterForm && formMessage) {
    newsletterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      formMessage.textContent = "Merci ! Ton inscription a bien été prise en compte.";
      newsletterForm.reset();
    });
  }
});
