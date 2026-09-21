(() => {
  "use strict";

  const state = {
    incidents: [],
    search: "",
    status: "",
    severity: ""
  };

  const els = {
    list: document.getElementById("incidentList"),
    empty: document.getElementById("emptyState"),
    search: document.getElementById("searchInput"),
    status: document.getElementById("statusFilter"),
    severity: document.getElementById("severityFilter"),
    refresh: document.getElementById("refreshButton"),
    serviceStatus: document.getElementById("serviceStatus"),
    lastUpdated: document.getElementById("lastUpdated"),
    metricOpen: document.getElementById("metricOpen"),
    metricInvestigating: document.getElementById("metricInvestigating"),
    metricMitigated: document.getElementById("metricMitigated"),
    metricResolved: document.getElementById("metricResolved"),
    metricCritical: document.getElementById("metricCritical"),
    dialog: document.getElementById("incidentDialog"),
    form: document.getElementById("incidentForm"),
    newIncident: document.getElementById("newIncidentButton"),
    closeDialog: document.getElementById("closeDialogButton"),
    cancelDialog: document.getElementById("cancelDialogButton"),
    formMessage: document.getElementById("formMessage"),
    toast: document.getElementById("toast")
  };

  const nextStatuses = {
    OPEN: ["INVESTIGATING"],
    INVESTIGATING: ["MITIGATED", "RESOLVED"],
    MITIGATED: ["INVESTIGATING", "RESOLVED"],
    RESOLVED: []
  };

  document.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    bindEvents();
    checkHealth();
    loadIncidents();
  }

  function bindEvents() {
    els.search.addEventListener("input", event => {
      state.search = event.target.value.trim().toLowerCase();
      render();
    });

    els.status.addEventListener("change", event => {
      state.status = event.target.value;
      render();
    });

    els.severity.addEventListener("change", event => {
      state.severity = event.target.value;
      render();
    });

    els.refresh.addEventListener("click", () => {
      checkHealth();
      loadIncidents(true);
    });

    els.newIncident.addEventListener("click", openDialog);
    els.closeDialog.addEventListener("click", closeDialog);
    els.cancelDialog.addEventListener("click", closeDialog);
    els.form.addEventListener("submit", createIncident);

    els.dialog.addEventListener("click", event => {
      if (event.target === els.dialog) closeDialog();
    });
  }

  async function checkHealth() {
    try {
      const response = await fetch("/health", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Health check failed");
      els.serviceStatus.className = "service-status service-status--online";
      els.serviceStatus.innerHTML = '<span class="service-status__dot"></span>Service online';
    } catch {
      els.serviceStatus.className = "service-status service-status--offline";
      els.serviceStatus.innerHTML = '<span class="service-status__dot"></span>Service unavailable';
    }
  }

  async function loadIncidents(showNotice = false) {
    try {
      const response = await fetch("/api/incidents", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Could not load incidents");

      state.incidents = await response.json();
      render();
      els.lastUpdated.textContent = "Updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (showNotice) showToast("Incident board refreshed.");
    } catch (error) {
      showToast(error.message || "Could not load incidents.");
    }
  }

  function filteredIncidents() {
    return state.incidents
      .filter(incident => {
        const haystack = [
          incident.title,
          incident.description,
          incident.owner,
          incident.status,
          incident.severity
        ].filter(Boolean).join(" ").toLowerCase();

        return (!state.search || haystack.includes(state.search))
          && (!state.status || incident.status === state.status)
          && (!state.severity || incident.severity === state.severity);
      })
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function render() {
    renderMetrics();

    const incidents = filteredIncidents();
    els.empty.hidden = incidents.length > 0;
    els.list.innerHTML = incidents.map(renderIncident).join("");

    els.list.querySelectorAll("[data-transition]").forEach(button => {
      button.addEventListener("click", () => transitionIncident(button.dataset.id, button.dataset.transition));
    });

    els.list.querySelectorAll("[data-delete]").forEach(button => {
      button.addEventListener("click", () => deleteIncident(button.dataset.delete));
    });
  }

  function renderMetrics() {
    const count = status => state.incidents.filter(item => item.status === status).length;

    els.metricOpen.textContent = count("OPEN");
    els.metricInvestigating.textContent = count("INVESTIGATING");
    els.metricMitigated.textContent = count("MITIGATED");
    els.metricResolved.textContent = count("RESOLVED");

    const activeCritical = state.incidents.filter(item =>
      item.severity === "CRITICAL" && item.status !== "RESOLVED"
    ).length;

    els.metricCritical.textContent = activeCritical + (activeCritical === 1 ? " active" : " active");
  }

  function renderIncident(incident) {
    const allowed = nextStatuses[incident.status] || [];
    const transitionButtons = allowed.map(status => `
      <button class="row-action"
              type="button"
              data-id="${escapeAttribute(incident.id)}"
              data-transition="${status}">
        ${statusLabel(status)}
      </button>
    `).join("");

    return `
      <article class="incident-row">
        <div class="incident__title">
          <strong>${escapeHtml(incident.title)}</strong>
          <p>${escapeHtml(truncate(incident.description, 88))}</p>
        </div>

        <div>
          <span class="badge severity--${incident.severity}">${statusLabel(incident.severity)}</span>
        </div>

        <div>
          <span class="badge status--${incident.status}">${statusLabel(incident.status)}</span>
        </div>

        <div class="incident__owner">${escapeHtml(incident.owner || "Unassigned")}</div>
        <div class="incident__updated">${formatDate(incident.updatedAt)}</div>

        <div class="row-actions">
          ${transitionButtons}
          <button class="row-action row-action--danger" type="button" data-delete="${escapeAttribute(incident.id)}">
            Delete
          </button>
        </div>
      </article>
    `;
  }

  async function createIncident(event) {
    event.preventDefault();
    els.formMessage.textContent = "";

    const formData = new FormData(els.form);
    const payload = {
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      severity: String(formData.get("severity") || "LOW"),
      owner: String(formData.get("owner") || "").trim() || null
    };

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });

      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(body.message || body.error || "Could not create incident");
      }

      state.incidents.unshift(body);
      closeDialog();
      render();
      showToast("Incident created.");
    } catch (error) {
      els.formMessage.textContent = error.message || "Could not create incident.";
    }
  }

  async function transitionIncident(id, status) {
    try {
      const response = await fetch(`/api/incidents/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status })
      });

      const body = await readJson(response);

      if (!response.ok) {
        throw new Error(body.message || body.error || "Could not update incident");
      }

      replaceIncident(body);
      render();
      showToast("Incident moved to " + statusLabel(status) + ".");
    } catch (error) {
      showToast(error.message || "Could not update incident.");
    }
  }

  async function deleteIncident(id) {
    const incident = state.incidents.find(item => item.id === id);
    const label = incident ? incident.title : "this incident";

    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/incidents/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      if (!response.ok && response.status !== 204) {
        const body = await readJson(response);
        throw new Error(body.message || body.error || "Could not delete incident");
      }

      state.incidents = state.incidents.filter(item => item.id !== id);
      render();
      showToast("Incident deleted.");
    } catch (error) {
      showToast(error.message || "Could not delete incident.");
    }
  }

  function replaceIncident(updated) {
    state.incidents = state.incidents.map(item => item.id === updated.id ? updated : item);
  }

  function openDialog() {
    els.form.reset();
    els.formMessage.textContent = "";
    els.dialog.showModal();
    document.getElementById("titleInput").focus();
  }

  function closeDialog() {
    els.dialog.close();
  }

  function statusLabel(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function truncate(value, maxLength) {
    const text = String(value || "");
    return text.length <= maxLength ? text : text.slice(0, maxLength - 1).trimEnd() + "…";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  async function readJson(response) {
    const text = await response.text();
    if (!text) return {};
    try { return JSON.parse(text); } catch { return { message: text }; }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("toast--show");
    toastTimer = setTimeout(() => els.toast.classList.remove("toast--show"), 3200);
  }
})();
