(function () {
  const todayDate = document.body.dataset.today || new Date().toISOString().slice(0, 10);

  let allTasks = [];
  let activeFilter = "all";
  let pendingDeleteId = null;

  const taskListEl = document.getElementById("task-list");
  const viewTitleEl = document.getElementById("view-title");
  const feedbackEl = document.getElementById("feedback-banner");
  const searchInput = document.getElementById("search-input");
  const priorityFilter = document.getElementById("priority-filter");

  const statTotal = document.getElementById("stat-total");
  const statPending = document.getElementById("stat-pending");
  const statCompleted = document.getElementById("stat-completed");
  const statToday = document.getElementById("stat-today");

  const modal = document.getElementById("task-modal");
  const modalTitle = document.getElementById("modal-title");
  const taskForm = document.getElementById("task-form");
  const taskIdInput = document.getElementById("task-id");
  const taskTitleInput = document.getElementById("task-title");
  const taskDescInput = document.getElementById("task-desc");
  const taskDueInput = document.getElementById("task-due");
  const taskPriorityInput = document.getElementById("task-priority");
  const taskStatusInput = document.getElementById("task-status");

  const sidebar = document.getElementById("sidebar");

  function showFeedback(message) {
    if (!message) {
      feedbackEl.classList.add("hidden");
      feedbackEl.textContent = "";
      return;
    }
    feedbackEl.textContent = message;
    feedbackEl.classList.remove("hidden");
  }

  function updateStats(stats) {
    statTotal.textContent = String(stats.total || 0);
    statPending.textContent = String(stats.pending || 0);
    statCompleted.textContent = String(stats.completed || 0);
    statToday.textContent = String(stats.today || 0);
  }

  function openModal(task) {
    showFeedback(null);
    if (task) {
      modalTitle.textContent = "Edit Task";
      taskIdInput.value = String(task.id);
      taskTitleInput.value = task.title;
      taskDescInput.value = task.description || "";
      taskDueInput.value = task.due_date;
      taskPriorityInput.value = task.priority;
      taskStatusInput.value = task.status;
    } else {
      modalTitle.textContent = "New Task";
      taskIdInput.value = "";
      taskTitleInput.value = "";
      taskDescInput.value = "";
      taskDueInput.value = todayDate;
      taskPriorityInput.value = "Medium";
      taskStatusInput.value = "Pending";
    }
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  function renderTasks() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const prio = priorityFilter.value;

    const visible = allTasks.filter((task) => {
      if (activeFilter === "today" && task.due_date !== todayDate) return false;
      if (
        (activeFilter === "Pending" ||
          activeFilter === "In Progress" ||
          activeFilter === "Completed") &&
        task.status !== activeFilter
      ) {
        return false;
      }
      if (prio !== "all" && task.priority !== prio) return false;
      if (query) {
        const inTitle = task.title.toLowerCase().includes(query);
        const inDesc = (task.description || "").toLowerCase().includes(query);
        if (!inTitle && !inDesc) return false;
      }
      return true;
    });

    if (visible.length === 0) {
      taskListEl.innerHTML =
        '<div class="empty-state"><p>No tasks found for this view. Click "+ New Task" to add one.</p></div>';
      return;
    }

    taskListEl.innerHTML = visible
      .map((task) => {
        const isDone = task.status === "Completed";
        const isConfirming = pendingDeleteId === task.id;
        return `
          <article class="task-card ${isDone ? "completed" : ""}">
            <div class="task-main">
              <input type="checkbox" ${isDone ? "checked" : ""} data-toggle="${task.id}" aria-label="Mark completed" />
              <div>
                <h3 class="task-title">${escapeHtml(task.title)}</h3>
                ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ""}
                <div class="task-meta">
                  <span>Status: <strong>${escapeHtml(task.status)}</strong></span>
                  <span>&middot;</span>
                  <span>Priority: <strong>${escapeHtml(task.priority)}</strong></span>
                  <span>&middot;</span>
                  <span>Due: <strong>${escapeHtml(task.due_date)}</strong></span>
                </div>
              </div>
            </div>
            <div class="task-actions">
              ${
                isConfirming
                  ? `<button type="button" class="btn btn-danger" data-confirm-delete="${task.id}">Confirm</button>
                     <button type="button" class="btn btn-outline" data-cancel-delete="${task.id}">Cancel</button>`
                  : `<button type="button" class="btn btn-outline" data-edit="${task.id}">Edit</button>
                     <button type="button" class="btn btn-outline" data-delete="${task.id}">Delete</button>`
              }
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadTasks() {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tasks.");
      allTasks = data.tasks || [];
      updateStats(data.stats || {});
      renderTasks();
    } catch (err) {
      showFeedback(err.message);
    }
  }

  taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showFeedback(null);
    const id = taskIdInput.value;
    const payload = {
      title: taskTitleInput.value.trim(),
      description: taskDescInput.value.trim(),
      due_date: taskDueInput.value,
      priority: taskPriorityInput.value,
      status: taskStatusInput.value,
    };

    try {
      const res = await fetch(id ? `/api/tasks/${id}` : "/api/tasks", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save task.");
      allTasks = data.tasks || [];
      updateStats(data.stats || {});
      renderTasks();
      closeModal();
    } catch (err) {
      showFeedback(err.message);
    }
  });

  taskListEl.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const toggleId = target.dataset.toggle;
    if (toggleId) {
      const res = await fetch(`/api/tasks/${toggleId}/complete`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        allTasks = data.tasks || [];
        updateStats(data.stats || {});
        renderTasks();
      }
      return;
    }

    const editId = target.dataset.edit;
    if (editId) {
      const task = allTasks.find((t) => String(t.id) === editId);
      if (task) openModal(task);
      return;
    }

    const deleteId = target.dataset.delete;
    if (deleteId) {
      pendingDeleteId = Number(deleteId);
      renderTasks();
      return;
    }

    if (target.dataset.cancelDelete) {
      pendingDeleteId = null;
      renderTasks();
      return;
    }

    const confirmId = target.dataset.confirmDelete;
    if (confirmId) {
      const res = await fetch(`/api/tasks/${confirmId}`, { method: "DELETE" });
      const data = await res.json();
      pendingDeleteId = null;
      if (res.ok) {
        allTasks = data.tasks || [];
        updateStats(data.stats || {});
        renderTasks();
      }
    }
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.filter || "all";
      viewTitleEl.textContent = btn.textContent || "All Tasks";
      sidebar.classList.remove("open");
      renderTasks();
    });
  });

  searchInput.addEventListener("input", renderTasks);
  priorityFilter.addEventListener("change", renderTasks);

  document.getElementById("new-task-btn").addEventListener("click", () => openModal(null));
  document.getElementById("close-modal-btn").addEventListener("click", closeModal);
  document.getElementById("cancel-modal-btn").addEventListener("click", closeModal);
  document.getElementById("open-menu-btn").addEventListener("click", () => sidebar.classList.add("open"));
  document.getElementById("close-menu-btn").addEventListener("click", () => sidebar.classList.remove("open"));

  loadTasks();
})();
