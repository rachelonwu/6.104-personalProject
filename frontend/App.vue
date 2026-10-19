
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { prepareImageForUpload } from "./imageConversion.js";
import {
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
  checkDueReminders,
} from "./reminderNotifications.js";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const user = ref(null);
const checkingSession = ref(true);
const authMode = ref("login");
const authEmail = ref("");
const authPassword = ref("");
const authLoading = ref(false);
const authError = ref("");

const selectedFile = ref(null);
const screenshotId = ref("");
const imageUrl = ref("");
const intention = ref("");
const inferenceId = ref("");
const suggestedReminder = ref("");
const tasks = ref([]);
const loading = ref(false);
const aiLoading = ref(false);
const error = ref("");
const message = ref("");

const editingTaskId = ref(null);
const editedDescription = ref("");
const expandedScreenshots = ref({});
const screenshotObjectUrls = ref({});

const editingReminderId = ref(null);
const reminderInput = ref("");
const savingReminder = ref(false);

const notificationStatus = ref(notificationPermission());
const notificationMessage = ref("");
const currentTime = ref(Date.now());

let reminderInterval = null;
let reminderCheckInProgress = false;

const remainingTasks = computed(
  () => tasks.value.filter((task) => !task.completed).length
);

const dueReminders = computed(() =>
  tasks.value.filter((task) => {
    if (task.completed || !task.reminderAt) return false;

    const time = new Date(task.reminderAt).getTime();

    return Number.isFinite(time) && time <= currentTime.value;
  })
);

async function enableNotifications() {
  notificationStatus.value = await requestNotificationPermission();

  notificationMessage.value =
    notificationStatus.value === "granted"
      ? "Browser notifications enabled."
      : notificationStatus.value === "denied"
        ? "Notifications are blocked. Enable them in your browser settings."
        : "Notifications require a supported browser and secure connection.";

  if (notificationStatus.value === "granted" && user.value) {
    checkDueReminders(tasks.value, user.value.email);
  }
}

async function checkReminders() {
  currentTime.value = Date.now();
  notificationStatus.value = notificationPermission();

  if (!user.value || reminderCheckInProgress) return;

  reminderCheckInProgress = true;
  const account = user.value.email;

  try {
    const data = await request("/api/tasks");

    if (user.value?.email !== account) return;

    tasks.value = data.tasks;

    if (notificationStatus.value === "granted") {
      checkDueReminders(tasks.value, account);
    }
  } catch (err) {
    console.warn("Reminder check failed:", err);
  } finally {
    reminderCheckInProgress = false;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      clearWorkspace();
      user.value = null;
      authError.value = "Your session has expired. Please sign in again.";
    }

    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "The request could not be completed."
    );
  }

  return data;
}

function clearImageUrls() {
  for (const url of Object.values(screenshotObjectUrls.value)) {
    URL.revokeObjectURL(url);
  }

  screenshotObjectUrls.value = {};
}

function clearWorkspace() {
  selectedFile.value = null;
  screenshotId.value = "";
  imageUrl.value = "";
  intention.value = "";
  inferenceId.value = "";
  suggestedReminder.value = "";
  tasks.value = [];
  notificationMessage.value = "";
  editingTaskId.value = null;
  editedDescription.value = "";
  editingReminderId.value = null;
  reminderInput.value = "";
  savingReminder.value = false;
  expandedScreenshots.value = {};
  error.value = "";
  message.value = "";
  clearImageUrls();
}

async function restoreSession() {
  checkingSession.value = true;

  try {
    const data = await request("/api/auth/me");
    user.value = data.user;
    await loadTasks();
  } catch {
    user.value = null;
    clearWorkspace();
  } finally {
    checkingSession.value = false;
  }
}

async function submitAuth() {
  authError.value = "";

  if (!authEmail.value.trim() || !authPassword.value) {
    authError.value = "Enter your email and password.";
    return;
  }

  if (authMode.value === "register" && authPassword.value.length < 12) {
    authError.value = "Your password must contain at least 12 characters.";
    return;
  }

  authLoading.value = true;

  try {
    const path =
      authMode.value === "register"
        ? "/api/auth/register"
        : "/api/auth/login";

    const data = await request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: authEmail.value.trim(),
        password: authPassword.value,
      }),
    });

    clearWorkspace();
    user.value = data.user;
    authPassword.value = "";
    await loadTasks();
  } catch (err) {
    authError.value = err.message;
  } finally {
    authLoading.value = false;
  }
}

function switchAuthMode() {
  authMode.value = authMode.value === "login" ? "register" : "login";
  authError.value = "";
  authPassword.value = "";
}

async function logout() {
  authLoading.value = true;
  error.value = "";

  try {
    await request("/api/auth/logout", { method: "POST" });
    user.value = null;
    clearWorkspace();
    authPassword.value = "";
    authEmail.value = "";
    authMode.value = "login";
    authError.value = "";
  } catch (err) {
    error.value = err.message;
  } finally {
    authLoading.value = false;
  }
}

function selectFile(event) {
  selectedFile.value = event.target.files?.[0] ?? null;
  error.value = "";
  message.value = "";
}

async function uploadScreenshot() {
  if (!selectedFile.value) {
    error.value = "Please select a screenshot first.";
    return;
  }

  loading.value = true;
  error.value = "";
  message.value = "";

  try {
    const preparedFile = await prepareImageForUpload(selectedFile.value);

    const form = new FormData();
    form.append("image", preparedFile);

    const data = await request("/api/screenshots", {
      method: "POST",
      body: form,
    });

    screenshotId.value = data.screenshot;
    imageUrl.value = `${API}${data.imageUrl}`;
    inferenceId.value = "";
    intention.value = "";
    suggestedReminder.value = "";

    message.value =
      "Screenshot uploaded. Generate an AI suggestion or enter an action manually.";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function toLocalDateTime(isoTimestamp) {
  if (!isoTimestamp) return "";

  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

function calculateSuggestedReminder(data) {
  const { eventDate, eventTime, dateType } = data;

  if (
    typeof eventDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
  ) {
    return "";
  }

  if (
    typeof eventTime !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(eventTime)
  ) {
    return "";
  }

  const event = new Date(`${eventDate}T${eventTime}:00`);

  if (
    Number.isNaN(event.getTime()) ||
    event.getFullYear() !== Number(eventDate.slice(0, 4)) ||
    event.getMonth() + 1 !== Number(eventDate.slice(5, 7)) ||
    event.getDate() !== Number(eventDate.slice(8, 10))
  ) {
    return "";
  }

  const offset = dateType === "deadline" ? 24 * 60 : 60;
  const reminder = new Date(event.getTime() - offset * 60_000);

  // Populate the picker even when the suggested time is in the past.
  // Validation before saving still requires a future reminder.
  return toLocalDateTime(reminder.toISOString());
}

async function generateAISuggestion() {
  if (!screenshotId.value || aiLoading.value || loading.value) return;

  aiLoading.value = true;
  error.value = "";
  message.value = "";

  const requestedScreenshot = screenshotId.value;

  try {
    const data = await request("/api/inferences/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        screenshot: requestedScreenshot,
      }),
    });

    if (screenshotId.value !== requestedScreenshot) return;

    if (
      typeof data.description !== "string" ||
      !data.description.trim()
    ) {
      throw new Error("AI did not return a valid suggestion.");
    }

    intention.value = data.description.trim();
    suggestedReminder.value = calculateSuggestedReminder(data);

    message.value =
      "AI suggestion generated. Review and edit it before saving.";
  } catch (err) {
    error.value = err.message;
  } finally {
    aiLoading.value = false;
  }
}

async function createInference() {
  if (!intention.value.trim()) {
    error.value = "Please enter an intended action.";
    return;
  }

  loading.value = true;
  error.value = "";
  message.value = "";

  try {
    const data = await request("/api/inferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        screenshot: screenshotId.value,
        description: intention.value,
      }),
    });

    inferenceId.value = data.inference;
    message.value =
      "Intention saved. Review or correct it before confirming.";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function correctInference() {
  if (!intention.value.trim()) {
    error.value = "Please enter an intended action.";
    return;
  }

  loading.value = true;
  error.value = "";
  message.value = "";

  try {
    await request(`/api/inferences/${inferenceId.value}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: intention.value,
      }),
    });

    message.value = "Intention updated.";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function confirmInference() {
  if (!intention.value.trim()) {
    error.value = "Please enter an intended action.";
    return;
  }

  if (suggestedReminder.value) {
    const date = new Date(suggestedReminder.value);

    if (
      Number.isNaN(date.getTime()) ||
      date.getTime() <= Date.now()
    ) {
      error.value =
        "Choose a valid future reminder, or clear the reminder field.";
      return;
    }
  }

  loading.value = true;
  error.value = "";
  message.value = "";

  try {
    await request(`/api/inferences/${inferenceId.value}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: intention.value,
      }),
    });

    const confirmedInference = inferenceId.value;
    const existingTaskIds = new Set(
      tasks.value.map((task) => task.task)
    );

    await request("/api/inferences/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inference: confirmedInference,
      }),
    });

    await loadTasks();

    let reminderMessage = "Task created successfully!";

    if (suggestedReminder.value) {
      const matching = tasks.value.filter(
        (task) =>
          task.source === confirmedInference &&
          !existingTaskIds.has(task.task)
      );

      if (matching.length === 1) {
        try {
          const reminderAt = new Date(
            suggestedReminder.value
          ).toISOString();

          await request(`/api/tasks/${matching[0].task}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reminderAt }),
          });

          await loadTasks();

          reminderMessage =
            "Task created with your suggested reminder!";
        } catch {
          reminderMessage =
            "Task created, but the reminder could not be saved. Set it from My Tasks.";
        }
      } else {
        reminderMessage =
          "Task created, but its reminder could not be linked automatically. Set it from My Tasks.";
      }
    }

    screenshotId.value = "";
    inferenceId.value = "";
    imageUrl.value = "";
    selectedFile.value = null;
    intention.value = "";
    suggestedReminder.value = "";

    message.value = reminderMessage;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function loadTasks() {
  const data = await request("/api/tasks");
  tasks.value = data.tasks;

  await loadTaskImages();

  currentTime.value = Date.now();

  if (notificationPermission() === "granted" && user.value) {
    checkDueReminders(tasks.value, user.value.email);
  }
}

async function fetchPrivateImage(path) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Could not load screenshot.");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

async function loadTaskImages() {
  clearImageUrls();

  const entries = await Promise.all(
    tasks.value.map(async (task) => {
      if (!task.imageUrl) {
        return [task.task, null];
      }

      try {
        return [task.task, await fetchPrivateImage(task.imageUrl)];
      } catch {
        return [task.task, null];
      }
    })
  );

  screenshotObjectUrls.value = Object.fromEntries(
    entries.filter((entry) => entry[1] !== null)
  );
}

function toggleScreenshot(taskId) {
  expandedScreenshots.value[taskId] =
    !expandedScreenshots.value[taskId];
}

function startEditing(task) {
  editingTaskId.value = task.task;
  editedDescription.value = task.description;
}

function cancelEditing() {
  editingTaskId.value = null;
  editedDescription.value = "";
}

async function saveTaskEdit(task) {
  if (!editedDescription.value.trim()) {
    error.value = "Task description cannot be empty.";
    return;
  }

  error.value = "";

  try {
    await request(`/api/tasks/${task.task}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: editedDescription.value,
      }),
    });

    cancelEditing();
    await loadTasks();
    message.value = "Task updated.";
  } catch (err) {
    error.value = err.message;
  }
}

async function toggleTaskCompletion(task) {
  error.value = "";

  try {
    await request(`/api/tasks/${task.task}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed: !task.completed,
      }),
    });

    await loadTasks();
  } catch (err) {
    error.value = err.message;
  }
}

async function deleteTask(task) {
  error.value = "";

  try {
    await request(`/api/tasks/${task.task}`, {
      method: "DELETE",
    });

    delete expandedScreenshots.value[task.task];
    await loadTasks();
  } catch (err) {
    error.value = err.message;
  }
}

function formatReminder(isoTimestamp) {
  if (!isoTimestamp) return "";

  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return "Invalid reminder date";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function startReminderEdit(task) {
  editingReminderId.value = task.task;
  reminderInput.value = toLocalDateTime(task.reminderAt);
  error.value = "";
  message.value = "";
}

function cancelReminderEdit() {
  editingReminderId.value = null;
  reminderInput.value = "";
}

async function saveReminder(task) {
  if (!reminderInput.value) {
    error.value = "Choose a reminder date and time.";
    return;
  }

  const selectedDate = new Date(reminderInput.value);

  if (
    Number.isNaN(selectedDate.getTime()) ||
    selectedDate.getTime() <= Date.now()
  ) {
    error.value = "Choose a valid reminder time in the future.";
    return;
  }

  savingReminder.value = true;
  error.value = "";
  message.value = "";

  try {
    await request(`/api/tasks/${task.task}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reminderAt: selectedDate.toISOString(),
      }),
    });

    cancelReminderEdit();
    await loadTasks();
    message.value = "Reminder saved.";
  } catch (err) {
    error.value = err.message;
  } finally {
    savingReminder.value = false;
  }
}

async function removeReminder(task) {
  savingReminder.value = true;
  error.value = "";
  message.value = "";

  try {
    await request(`/api/tasks/${task.task}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reminderAt: null,
      }),
    });

    cancelReminderEdit();
    await loadTasks();
    message.value = "Reminder removed.";
  } catch (err) {
    error.value = err.message;
  } finally {
    savingReminder.value = false;
  }
}

onMounted(() => {
  restoreSession();
  reminderInterval = window.setInterval(checkReminders, 30_000);
});

onBeforeUnmount(() => {
  if (reminderInterval !== null) {
    window.clearInterval(reminderInterval);
  }

  clearImageUrls();
});
</script>

<template>
  <main class="container">
    <header class="site-header">
      <div>
        <h1>SnapBack</h1>
        <p>Turn screenshots into actions you won't forget.</p>
      </div>

      <div v-if="user" class="account-actions">
        <span class="account-email">{{ user.email }}</span>
        <button :disabled="authLoading" @click="logout">
          {{ authLoading ? "Signing out..." : "Log Out" }}
        </button>
      </div>
    </header>

    <section v-if="checkingSession" class="card" aria-live="polite">
      <p>Loading your workspace...</p>
    </section>

    <section v-else-if="!user" class="card auth-card">
      <h2>
        {{ authMode === "login" ? "Welcome back" : "Create an account" }}
      </h2>

      <p>
        {{
          authMode === "login"
            ? "Sign in to access your saved screenshots and tasks."
            : "Create an account to keep your screenshots and tasks together."
        }}
      </p>

      <form class="auth-form" @submit.prevent="submitAuth">
        <label for="auth-email">Email address</label>
        <input
          id="auth-email"
          v-model="authEmail"
          type="email"
          autocomplete="email"
          required
          maxlength="254"
          placeholder="you@example.com"
        />

        <label for="auth-password">Password</label>
        <input
          id="auth-password"
          v-model="authPassword"
          type="password"
          :autocomplete="
            authMode === 'register' ? 'new-password' : 'current-password'
          "
          :minlength="authMode === 'register' ? 12 : undefined"
          maxlength="128"
          required
          placeholder="Enter your password"
        />

        <p v-if="authMode === 'register'" class="form-hint">
          Use at least 12 characters.
        </p>

        <p v-if="authError" class="error" role="alert">
          {{ authError }}
        </p>

        <button
          class="primary"
          type="submit"
          :disabled="authLoading"
        >
          {{
            authLoading
              ? "Please wait..."
              : authMode === "login"
                ? "Log In"
                : "Create Account"
          }}
        </button>
      </form>

      <p class="auth-switch">
        {{
          authMode === "login"
            ? "Don't have an account?"
            : "Already have an account?"
        }}
        <button
          class="text-button"
          type="button"
          @click="switchAuthMode"
        >
          {{ authMode === "login" ? "Sign up" : "Log in" }}
        </button>
      </p>
    </section>

    <template v-else>
      <section class="card">
        <h2>1. Upload a screenshot</h2>

        <input
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif,.heic,.heif,image/*"
          aria-label="Choose a screenshot"
          :disabled="loading || aiLoading"
          @change="selectFile"
        />

        <button
          :disabled="loading || aiLoading || !selectedFile"
          @click="uploadScreenshot"
        >
          {{ loading ? "Uploading..." : "Upload Screenshot" }}
        </button>

        <div
          v-if="imageUrl"
          class="screenshot-container preview-container"
        >
          <p>Screenshot uploaded successfully.</p>
          <p class="form-hint">
            Continue below to generate or enter your intended action.
          </p>
        </div>
      </section>

      <section v-if="screenshotId" class="card">
        <h2>2. Review your intention</h2>

        <p>
          Generate an AI suggestion or describe what you want to remember
          yourself.
        </p>

        <div v-if="!inferenceId" class="ai-suggestion-section">
          <button
            type="button"
            class="primary"
            :disabled="loading || aiLoading"
            @click="generateAISuggestion"
          >
            {{
              aiLoading
                ? "Analyzing Screenshot..."
                : "Generate AI Suggestion"
            }}
          </button>

          <p class="form-hint">
            Optional: Clicking this button sends your screenshot to
            MIT Parley for AI analysis. Review the suggestion before
            saving it. You can also enter an action manually.
          </p>
        </div>

        <label for="intention-description">
          Intended action
        </label>

        <textarea
          id="intention-description"
          v-model="intention"
          placeholder="e.g. Register for the career fair by Friday"
          rows="3"
          aria-label="Intended action"
          :disabled="aiLoading"
        ></textarea>

        <div class="task-reminder">
          <label for="new-task-reminder">
            Suggested reminder (optional)
          </label>

          <input
            id="new-task-reminder"
            v-model="suggestedReminder"
            type="datetime-local"
            :disabled="loading || aiLoading"
          />
        </div>

        <button
          v-if="!inferenceId"
          :disabled="loading || aiLoading || !intention.trim()"
          @click="createInference"
        >
          Save Intention
        </button>

        <div v-else class="actions">
          <button
            :disabled="loading || !intention.trim()"
            @click="correctInference"
          >
            Save Correction
          </button>

          <button
            class="primary"
            :disabled="loading || !intention.trim()"
            @click="confirmInference"
          >
            Confirm and Create Task
          </button>
        </div>
      </section>

      <p v-if="error" class="error" role="alert">
        {{ error }}
      </p>

      <p v-if="message" class="success" role="status">
        {{ message }}
      </p>

      <section class="card">
        <h2>My Tasks</h2>

        <div class="task-reminder">
          <button
            v-if="
              notificationStatus === 'default' &&
              notificationsSupported()
            "
            type="button"
            @click="enableNotifications"
          >
            Enable Notifications
          </button>

          <p
            v-else-if="notificationStatus === 'granted'"
            class="form-hint"
          >
            Browser notifications are enabled while SnapBack is open.
          </p>

          <p v-else class="form-hint">
            Browser notifications are unavailable or blocked.
            Due reminders still appear here.
          </p>

          <p
            v-if="notificationMessage"
            role="status"
            class="form-hint"
          >
            {{ notificationMessage }}
          </p>
        </div>

        <div
          v-if="dueReminders.length"
          class="task-reminder"
          aria-live="polite"
        >
          <h3>Due reminders</h3>

          <ul>
            <li
              v-for="task in dueReminders"
              :key="`due-${task.task}`"
            >
              {{ task.description }} —
              {{ formatReminder(task.reminderAt) }}
            </li>
          </ul>
        </div>

        <p>
          {{ remainingTasks }}
          {{ remainingTasks === 1 ? "task" : "tasks" }}
          remaining
        </p>

        <p v-if="tasks.length === 0">
          No tasks yet. Upload a screenshot to get started.
        </p>

        <ul v-else class="task-list">
          <li v-for="task in tasks" :key="task.task">
            <div class="task-content">
              <template v-if="editingTaskId === task.task">
                <div class="task-edit">
                  <input
                    v-model="editedDescription"
                    type="text"
                    aria-label="Edit task description"
                  />

                  <div class="actions">
                    <button @click="saveTaskEdit(task)">
                      Save
                    </button>

                    <button @click="cancelEditing">
                      Cancel
                    </button>
                  </div>
                </div>
              </template>

              <template v-else>
                <div class="task-header">
                  <label class="task-checkbox-label">
                    <input
                      type="checkbox"
                      :checked="task.completed"
                      @change="toggleTaskCompletion(task)"
                    />

                    <span :class="{ completed: task.completed }">
                      {{ task.description }}
                    </span>
                  </label>

                  <div class="actions">
                    <button @click="startEditing(task)">
                      Edit
                    </button>

                    <button
                      class="danger"
                      @click="deleteTask(task)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </template>

              <div class="task-reminder">
                <div v-if="editingReminderId === task.task">
                  <label :for="`reminder-${task.task}`">
                    Reminder date and time
                  </label>

                  <input
                    :id="`reminder-${task.task}`"
                    v-model="reminderInput"
                    type="datetime-local"
                    :disabled="savingReminder"
                  />

                  <div class="actions">
                    <button
                      class="primary"
                      :disabled="savingReminder || !reminderInput"
                      @click="saveReminder(task)"
                    >
                      {{
                        savingReminder
                          ? "Saving..."
                          : "Save Reminder"
                      }}
                    </button>

                    <button
                      :disabled="savingReminder"
                      @click="cancelReminderEdit"
                    >
                      Cancel
                    </button>

                    <button
                      v-if="task.reminderAt"
                      class="danger"
                      :disabled="savingReminder"
                      @click="removeReminder(task)"
                    >
                      Remove Reminder
                    </button>
                  </div>
                </div>

                <div v-else>
                  <p
                    v-if="task.reminderAt"
                    class="form-hint"
                  >
                    Reminder:
                    {{ formatReminder(task.reminderAt) }}
                  </p>

                  <p v-else class="form-hint">
                    No reminder set.
                  </p>

                  <button
                    class="screenshot-toggle"
                    @click="startReminderEdit(task)"
                  >
                    {{
                      task.reminderAt
                        ? "Edit Reminder"
                        : "Set Reminder"
                    }}
                  </button>
                </div>
              </div>

              <div
                v-if="task.imageUrl"
                class="screenshot-section"
              >
                <button
                  class="screenshot-toggle"
                  :aria-expanded="
                    !!expandedScreenshots[task.task]
                  "
                  @click="toggleScreenshot(task.task)"
                >
                  {{
                    expandedScreenshots[task.task]
                      ? "Hide Screenshot"
                      : "View Screenshot"
                  }}
                </button>

                <div
                  v-if="expandedScreenshots[task.task]"
                  class="screenshot-container"
                >
                  <img
                    v-if="screenshotObjectUrls[task.task]"
                    :src="screenshotObjectUrls[task.task]"
                    :alt="
                      `Original screenshot for ${task.description}`
                    "
                    class="task-screenshot"
                  />

                  <p v-else class="form-hint">
                    Screenshot could not be loaded.
                  </p>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>
