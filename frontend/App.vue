
<script setup>
import { ref, computed, onMounted } from "vue";

const API = "http://localhost:3000";

const selectedFile = ref(null);
const screenshotId = ref("");
const imageUrl = ref("");
const intention = ref("");
const inferenceId = ref("");
const tasks = ref([]);
const loading = ref(false);
const error = ref("");
const message = ref("");

const editingTaskId = ref(null);
const editedDescription = ref("");
const expandedScreenshots = ref({});

const remainingTasks = computed(
  () => tasks.value.filter((task) => !task.completed).length
);

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "The request could not be completed."
    );
  }

  return data;
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
    const form = new FormData();
    form.append("image", selectedFile.value);

    const data = await request("/api/screenshots", {
      method: "POST",
      body: form,
    });

    screenshotId.value = data.screenshot;
    imageUrl.value = `${API}${data.imageUrl}`;
    inferenceId.value = "";
    intention.value = "";
    message.value =
      "Screenshot uploaded. Enter the action you want to remember.";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
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

    await request("/api/inferences/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inference: inferenceId.value,
      }),
    });

    await loadTasks();

    screenshotId.value = "";
    inferenceId.value = "";
    imageUrl.value = "";
    selectedFile.value = null;
    intention.value = "";

    message.value = "Task created successfully!";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function loadTasks() {
  const data = await request("/api/tasks");
  tasks.value = data.tasks;
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

onMounted(async () => {
  try {
    await loadTasks();
  } catch (err) {
    error.value = err.message;
  }
});
</script>

<template>
  <main class="container">
    <header>
      <h1>SnapBack</h1>
      <p>Turn screenshots into actions you won't forget.</p>
    </header>

    <section class="card">
      <h2>1. Upload a screenshot</h2>

      <input
        type="file"
        accept="image/*"
        @change="selectFile"
      />

      <button
        :disabled="loading || !selectedFile"
        @click="uploadScreenshot"
      >
        Upload Screenshot
      </button>

      <img
        v-if="imageUrl"
        :src="imageUrl"
        class="preview"
        alt="Uploaded screenshot"
      />
    </section>

    <section v-if="screenshotId" class="card">
      <h2>2. Review your intention</h2>

      <p>
        What do you want to remember or do based on this screenshot?
      </p>

      <textarea
        v-model="intention"
        placeholder="e.g. Register for the career fair by Friday"
        rows="3"
      ></textarea>

      <button
        v-if="!inferenceId"
        :disabled="loading || !intention.trim()"
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

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="message" class="success">{{ message }}</p>

    <section class="card">
      <h2>My Tasks</h2>

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
                  <button @click="saveTaskEdit(task)">Save</button>
                  <button @click="cancelEditing">Cancel</button>
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

            <div v-if="task.imageUrl" class="screenshot-section">
              <button
                class="screenshot-toggle"
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
                  :src="`${API}${task.imageUrl}`"
                  :alt="`Original screenshot for ${task.description}`"
                  class="task-screenshot"
                />
              </div>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>
