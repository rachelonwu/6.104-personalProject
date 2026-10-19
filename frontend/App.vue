
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { prepareImageForUpload } from "./imageConversion.js";
import {
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
  checkDueReminders,
} from "./reminderNotifications.js";


const API =
  import.meta.env.DEV ? "http://localhost:3000" : "";


const user = ref(null);
const checkingSession = ref(true);
const authMode = ref("login");
const authEmail = ref("");
const authPassword = ref("");
const authLoading = ref(false);
const authError = ref("");

const selectedFile = ref(null);
const uploadPreviewUrl = ref("");
const screenshotId = ref("");
const imageUrl = ref("");
const intention = ref("");
const inferenceId = ref("");
const suggestedReminder = ref("");
const suggestedReminderTime = ref("");
const suggestedHasTime = ref(false);
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
const reminderTimeInput = ref("");
const reminderHasTime = ref(false);
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

function clearUploadPreview() {
  if (uploadPreviewUrl.value) {
    URL.revokeObjectURL(uploadPreviewUrl.value);
    uploadPreviewUrl.value = "";
  }
}

function clearWorkspace() {
  clearUploadPreview();
  selectedFile.value = null;
  screenshotId.value = "";
  imageUrl.value = "";
  intention.value = "";
  inferenceId.value = "";
  suggestedReminder.value = "";
  suggestedReminderTime.value = "";
  suggestedHasTime.value = false;
  tasks.value = [];
  notificationMessage.value = "";
  editingTaskId.value = null;
  editedDescription.value = "";
  editingReminderId.value = null;
  reminderInput.value = "";
  reminderTimeInput.value = "";
  reminderHasTime.value = false;
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
  clearUploadPreview();
  selectedFile.value = event.target.files?.[0] ?? null;
  // A newly selected image must be uploaded before it can be analyzed.
  screenshotId.value = "";
  imageUrl.value = "";
  inferenceId.value = "";
  intention.value = "";
  suggestedReminder.value = "";
  suggestedReminderTime.value = "";
  suggestedHasTime.value = false;
  if (selectedFile.value) {
    uploadPreviewUrl.value = URL.createObjectURL(selectedFile.value);
  }
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
    suggestedReminderTime.value = "";
    suggestedHasTime.value = false;

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

// Date-only reminders notify at 9 AM in the user's local timezone.
function reminderTimestamp(dateValue, timeValue, hasTime) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const time = hasTime ? timeValue : "09:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const date = new Date(`${dateValue}T${time}:00`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() !== Number(dateValue.slice(0, 4)) ||
    date.getMonth() + 1 !== Number(dateValue.slice(5, 7)) ||
    date.getDate() !== Number(dateValue.slice(8, 10)) ||
    date.getHours() !== Number(time.slice(0, 2)) ||
    date.getMinutes() !== Number(time.slice(3, 5))
  ) return null;
  return date.toISOString();
}

function applySuggestedReminder(data) {
  const date = data.eventDate;
  if (typeof date !== "string" || !reminderTimestamp(date, "", false)) {
    suggestedReminder.value = "";
    suggestedReminderTime.value = "";
    suggestedHasTime.value = false;
    return;
  }
  suggestedReminder.value = date;
  suggestedHasTime.value = typeof data.eventTime === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(data.eventTime);
  suggestedReminderTime.value = suggestedHasTime.value ? data.eventTime : "";
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
    applySuggestedReminder(data);

    message.value =
      "AI suggestion generated. Review and edit it before creating your task.";
  } catch (err) {
    error.value = err.message;
  } finally {
    aiLoading.value = false;
  }
}

async function confirmInference() {
  if (!intention.value.trim()) {
    error.value = "Please enter an intended action.";
    return;
  }

  if (suggestedHasTime.value && !suggestedReminder.value) {
    error.value = "Choose a reminder date before setting a time.";
    return;
  }
  if (suggestedReminder.value) {
    const iso = reminderTimestamp(suggestedReminder.value, suggestedReminderTime.value, suggestedHasTime.value);
    if (!iso || Date.parse(iso) <= Date.now()) {
      error.value = "Choose a valid future reminder. Date-only reminders notify at 9 AM.";
      return;
    }
  }

  loading.value = true;
  error.value = "";
  message.value = "";

  try {
    // Keep the IntentionInferring concept in the workflow, but perform
    // its actions behind a single user-facing confirmation button.
    // Retain the created inference ID if a later step fails, so a retry
    // does not create an additional inference.
    if (!inferenceId.value) {
      const created = await request("/api/inferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshot: screenshotId.value,
          description: intention.value.trim(),
        }),
      });
      inferenceId.value = created.inference;
    } else {
      await request(`/api/inferences/${inferenceId.value}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: intention.value.trim() }),
      });
    }

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
          const reminderAt = reminderTimestamp(
            suggestedReminder.value, suggestedReminderTime.value, suggestedHasTime.value
          );

          await request(`/api/tasks/${matching[0].task}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reminderAt, reminderDateOnly: !suggestedHasTime.value }),
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
    clearUploadPreview();
    intention.value = "";
    suggestedReminder.value = "";
    suggestedReminderTime.value = "";
    suggestedHasTime.value = false;

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

function formatReminder(isoTimestamp, dateOnly = false) {
  if (!isoTimestamp) return "";

  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return "Invalid reminder date";
  }

  if (dateOnly) return `${date.toLocaleDateString(undefined, { dateStyle: "medium" })} (9:00 AM notification)`;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function startReminderEdit(task) {
  editingReminderId.value = task.task;
  const local = toLocalDateTime(task.reminderAt);
  reminderInput.value = local ? local.slice(0, 10) : "";
  reminderHasTime.value = task.reminderAt ? task.reminderDateOnly !== true : false;
  reminderTimeInput.value = reminderHasTime.value && local ? local.slice(11, 16) : "";
  error.value = "";
  message.value = "";
}

function cancelReminderEdit() {
  editingReminderId.value = null;
  reminderInput.value = "";
  reminderTimeInput.value = "";
  reminderHasTime.value = false;
}

async function saveReminder(task) {
  const reminderAt = reminderTimestamp(reminderInput.value, reminderTimeInput.value, reminderHasTime.value);
  if (!reminderAt || Date.parse(reminderAt) <= Date.now()) {
    error.value = "Choose a valid future reminder. Date-only reminders notify at 9 AM.";
    return;
  }

  savingReminder.value = true;
  error.value = "";
  message.value = "";

  try {
    await request(`/api/tasks/${task.task}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderAt, reminderDateOnly: !reminderHasTime.value }),
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
        reminderAt: null, reminderDateOnly: false,
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
  clearUploadPreview();
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

        <div class="upload-layout">
          <div class="upload-controls">
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

            <p v-if="screenshotId" class="form-hint" role="status">
              Screenshot uploaded. Continue below to generate or enter your intended action.
            </p>
          </div>

          <div v-if="uploadPreviewUrl" class="upload-preview">
            <img
              :src="uploadPreviewUrl"
              :alt="`Preview of ${selectedFile?.name || 'selected screenshot'}`"
              class="upload-preview-image"
            />
            <p class="form-hint">{{ screenshotId ? "Uploaded screenshot" : "Selected screenshot preview" }}</p>
          </div>
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

          <p class="form-hint ai-suggestion-hint">
            Optional: Clicking this button sends your screenshot to
            MIT Parley for AI analysis. Review the suggestion before
            saving it. You can also enter an action manually.
          </p>
        </div>

        <label for="intention-description" class="intention-label">
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
            type="date"
            :disabled="loading || aiLoading"
          />
          <label class="form-hint"><input v-model="suggestedHasTime" type="checkbox" :disabled="loading || aiLoading" /> Set a specific notification time</label>
          <input v-if="suggestedHasTime" v-model="suggestedReminderTime" type="time" :disabled="loading || aiLoading" aria-label="Suggested reminder time" />
          <p class="form-hint" v-if="suggestedReminder && !suggestedHasTime">Notification at 9:00 AM on this date.</p>
        </div>

        <button
          class="primary"
          :disabled="loading || aiLoading || !intention.trim()"
          @click="confirmInference"
        >
          {{ loading ? "Creating Task..." : "Confirm and Create Task" }}
        </button>
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

          <p v-else-if="notificationStatus !== 'granted'" class="form-hint">
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
              {{ formatReminder(task.reminderAt, task.reminderDateOnly) }}
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
                    Reminder date
                  </label>

                  <input
                    :id="`reminder-${task.task}`"
                    v-model="reminderInput"
                    type="date"
                    :disabled="savingReminder"
                  />
                  <label class="form-hint"><input v-model="reminderHasTime" type="checkbox" :disabled="savingReminder" /> Set a specific notification time</label>
                  <input v-if="reminderHasTime" v-model="reminderTimeInput" type="time" :disabled="savingReminder" aria-label="Reminder time" />
                  <p class="form-hint" v-if="reminderInput && !reminderHasTime">Notification at 9:00 AM on this date.</p>

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
                    {{ formatReminder(task.reminderAt, task.reminderDateOnly) }}
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

<style scoped>
.upload-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}
.upload-controls {
  flex: 1 1 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.upload-controls input[type="file"] {
  max-width: 100%;
}
.upload-preview {
  flex: 0 1 280px;
  min-width: 0;
  max-width: 100%;
  text-align: center;
}
.upload-preview-image {
  display: block;
  max-width: 100%;
  max-height: 280px;
  width: auto;
  height: auto;
  margin: 0 auto;
  object-fit: contain;
  border: 1px solid #dedede;
  border-radius: 12px;
}
.upload-preview .form-hint {
  margin-top: 8px;
}
@media (max-width: 600px) {
  .upload-preview { flex-basis: 100%; }
}
.ai-suggestion-hint {
  margin-top: 16px;
}
</style>
