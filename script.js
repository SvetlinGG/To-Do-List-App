// DOM Elements
const clockElement = document.getElementById("clock")
const dateElement = document.getElementById("date")
const foldersList = document.getElementById("folders-list")
const addFolderBtn = document.getElementById("add-folder-btn")
const tabButtons = document.querySelectorAll(".tab-btn")
const tabContents = document.querySelectorAll(".tab-content")
const taskForm = document.getElementById("task-form")
const taskTitleInput = document.getElementById("task-title")
const taskNotesInput = document.getElementById("task-notes")
const taskDueDateInput = document.getElementById("task-due-date")
const taskFolderSelect = document.getElementById("task-folder")
const taskNotifySelect = document.getElementById("task-notify")
const submitBtn = document.getElementById("submit-btn")
const cancelBtn = document.getElementById("cancel-btn")
const tasksContainer = document.getElementById("tasks-container")
const prevMonthBtn = document.getElementById("prev-month")
const nextMonthBtn = document.getElementById("next-month")
const calendarTitle = document.getElementById("calendar-title")
const calendarDays = document.getElementById("calendar-days")
const connectGoogleBtn = document.getElementById("connect-google-btn")
const syncContent = document.getElementById("sync-content")

// Add these variables at the top with the other DOM elements
const recordBtn = document.getElementById("record-btn")
const recordingStatus = document.getElementById("recording-status")
const audioPreview = document.getElementById("audio-preview")
const audioPlayer = document.getElementById("audio-player")
const deleteRecordingBtn = document.getElementById("delete-recording-btn")

// State
let tasks = JSON.parse(localStorage.getItem("tasks")) || []
const folders = JSON.parse(localStorage.getItem("folders")) || [
  { id: "today", name: "Today" },
  { id: "upcoming", name: "Upcoming" },
  { id: "all", name: "All Tasks" },
]
let activeFolder = "all"
let editingTaskId = null
const currentMonth = new Date()

// Add these variables to the state section
let mediaRecorder = null
let audioChunks = []
let recordedAudioURL = null

// Initialize the app
function init() {
  updateClock()
  setInterval(updateClock, 1000)
  renderFolders()
  renderTasks()
  renderCalendar()
  setupEventListeners()
  checkNotifications()
  setInterval(checkNotifications, 60000) // Check every minute

  // Request notification permission
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission()
  }
}

// Update clock
function updateClock() {
  const now = new Date()

  // Format time: HH:MM:SS
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const seconds = now.getSeconds().toString().padStart(2, "0")
  clockElement.textContent = `${hours}:${minutes}:${seconds}`

  // Format date: Weekday, Month Day, Year
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  dateElement.textContent = now.toLocaleDateString(undefined, options)
}

// Setup event listeners
function setupEventListeners() {
  // Folder selection
  foldersList.addEventListener("click", (e) => {
    if (e.target.tagName === "LI") {
      activeFolder = e.target.dataset.folder
      document.querySelectorAll(".folders-list li").forEach((li) => {
        li.classList.remove("active")
      })
      e.target.classList.add("active")
      renderTasks()
    }
  })

  // Add folder
  addFolderBtn.addEventListener("click", () => {
    const folderName = prompt("Enter folder name:")
    if (folderName && folderName.trim()) {
      const newFolder = {
        id: "folder_" + Date.now(),
        name: folderName.trim(),
      }
      folders.push(newFolder)
      localStorage.setItem("folders", JSON.stringify(folders))
      renderFolders()
      updateTaskFolderOptions()
    }
  })

  // Tab switching
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"))
      tabContents.forEach((content) => content.classList.remove("active"))

      button.classList.add("active")
      const tabId = button.dataset.tab
      document.getElementById(`${tabId}-view`).classList.add("active")

      if (tabId === "calendar") {
        renderCalendar()
      }
    })
  })

  // Task form submission
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const taskTitle = taskTitleInput.value.trim()
    const taskNotes = taskNotesInput.value.trim()
    const taskDueDate = taskDueDateInput.value
    const taskFolder = taskFolderSelect.value
    const taskNotify = Number.parseInt(taskNotifySelect.value)

    if (!taskTitle) return

    if (editingTaskId) {
      // Update existing task
      const taskIndex = tasks.findIndex((task) => task.id === editingTaskId)
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          title: taskTitle,
          notes: taskNotes,
          dueDate: taskDueDate,
          folderId: taskFolder,
          notifyBefore: taskNotify,
          notified: false,
          voiceMessage: recordedAudioURL, // Add voice message
        }
      }
      editingTaskId = null
      document.getElementById("form-title").textContent = "Add New Task"
      submitBtn.textContent = "Add Task"
      cancelBtn.style.display = "none"
    } else {
      // Add new task
      const newTask = {
        id: "task_" + Date.now(),
        title: taskTitle,
        notes: taskNotes,
        dueDate: taskDueDate,
        folderId: taskFolder,
        completed: false,
        createdAt: new Date().toISOString(),
        notifyBefore: taskNotify,
        notified: false,
        voiceMessage: recordedAudioURL, // Add voice message
      }
      tasks.push(newTask)
    }

    localStorage.setItem("tasks", JSON.stringify(tasks))
    taskForm.reset()
    renderTasks()
    renderCalendar()

    // Reset the voice recording after form submission
    recordedAudioURL = null
    audioPlayer.src = ""
    audioPreview.style.display = "none"
  })

  // Cancel editing
  cancelBtn.addEventListener("click", () => {
    editingTaskId = null
    taskForm.reset()
    document.getElementById("form-title").textContent = "Add New Task"
    submitBtn.textContent = "Add Task"
    cancelBtn.style.display = "none"

    // Reset voice recording
    recordedAudioURL = null
    audioPlayer.src = ""
    audioPreview.style.display = "none"
  })

  // Calendar navigation
  prevMonthBtn.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1)
    renderCalendar()
  })

  nextMonthBtn.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1)
    renderCalendar()
  })

  // Google Calendar connect
  connectGoogleBtn.addEventListener("click", () => {
    // Simulate authentication
    syncContent.innerHTML = `
            <div class="alert alert-success">
                <span>✓</span> Connected to Google Calendar
            </div>
            <div style="border: 1px solid #e0e0e0; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                <h3 style="margin-bottom: 10px; font-size: 16px;">Sync Options</h3>
                <p style="margin-bottom: 15px; font-size: 14px; color: #666;">
                    You have ${tasks.length} tasks that can be synced to your Google Calendar.
                </p>
                <button id="sync-tasks-btn" class="btn btn-primary" style="width: 100%;">
                    Sync Tasks to Google Calendar
                </button>
            </div>
        `

    document.getElementById("sync-tasks-btn").addEventListener("click", () => {
      // Simulate syncing
      const syncBtn = document.getElementById("sync-tasks-btn")
      syncBtn.textContent = "Syncing..."
      syncBtn.disabled = true

      setTimeout(() => {
        syncContent.innerHTML = `
                    <div class="alert alert-success">
                        <span>✓</span> Connected to Google Calendar
                    </div>
                    <div style="border: 1px solid #e0e0e0; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
                        <h3 style="margin-bottom: 10px; font-size: 16px;">Sync Options</h3>
                        <p style="margin-bottom: 15px; font-size: 14px; color: #666;">
                            You have ${tasks.length} tasks that can be synced to your Google Calendar.
                        </p>
                        <button id="sync-tasks-btn" class="btn btn-primary" style="width: 100%;">
                            Sync Tasks to Google Calendar
                        </button>
                    </div>
                    <div class="alert alert-success">
                        <strong>Success!</strong> Your tasks have been successfully synced with Google Calendar.
                    </div>
                `

        document.getElementById("sync-tasks-btn").addEventListener("click", () => {
          // Re-attach event listener
          syncContent.querySelector(".alert-success:last-child").remove()
          document.getElementById("sync-tasks-btn").textContent = "Syncing..."
          document.getElementById("sync-tasks-btn").disabled = true

          setTimeout(() => {
            syncContent.innerHTML += `
                            <div class="alert alert-success">
                                <strong>Success!</strong> Your tasks have been successfully synced with Google Calendar.
                            </div>
                        `
            document.getElementById("sync-tasks-btn").textContent = "Sync Tasks to Google Calendar"
            document.getElementById("sync-tasks-btn").disabled = false
          }, 1500)
        })
      }, 1500)
    })
  })

  // Voice recording functionality
  recordBtn.addEventListener("click", toggleRecording)
  deleteRecordingBtn.addEventListener("click", deleteRecording)
}

// Add these functions for voice recording

// Toggle recording state
function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording()
  } else {
    startRecording()
  }
}

// Start recording
function startRecording() {
  // Reset previous recording
  audioChunks = []

  // Request microphone access
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorder = new MediaRecorder(stream)

      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunks.push(event.data)
      })

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" })
        recordedAudioURL = URL.createObjectURL(audioBlob)

        // Convert to base64 for storage
        const reader = new FileReader()
        reader.readAsDataURL(audioBlob)
        reader.onloadend = () => {
          recordedAudioURL = reader.result // This is a base64 string
          audioPlayer.src = recordedAudioURL
          audioPreview.style.display = "flex"
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        recordingStatus.textContent = ""
        recordingStatus.classList.remove("active")
        recordBtn.textContent = "🎤 Record Voice"
      })

      // Start recording
      mediaRecorder.start()
      recordingStatus.textContent = "Recording... (click again to stop)"
      recordingStatus.classList.add("active")
      recordBtn.textContent = "⏹️ Stop Recording"
    })
    .catch((error) => {
      console.error("Error accessing microphone:", error)
      recordingStatus.textContent = "Error: Could not access microphone"
    })
}

// Stop recording
function stopRecording() {
  if (mediaRecorder) {
    mediaRecorder.stop()
  }
}

// Delete recording
function deleteRecording() {
  recordedAudioURL = null
  audioPlayer.src = ""
  audioPreview.style.display = "none"
  recordingStatus.textContent = ""
}

// Render folders
function renderFolders() {
  foldersList.innerHTML = ""

  folders.forEach((folder) => {
    const li = document.createElement("li")
    li.dataset.folder = folder.id
    li.textContent = folder.name
    if (folder.id === activeFolder) {
      li.classList.add("active")
    }
    foldersList.appendChild(li)
  })

  updateTaskFolderOptions()
}

// Update task folder select options
function updateTaskFolderOptions() {
  taskFolderSelect.innerHTML = ""

  folders.forEach((folder) => {
    const option = document.createElement("option")
    option.value = folder.id
    option.textContent = folder.name
    taskFolderSelect.appendChild(option)
  })
}

// Filter tasks based on active folder
function getFilteredTasks() {
  return tasks.filter((task) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const taskDate = task.dueDate ? new Date(task.dueDate) : null
    if (taskDate) {
      taskDate.setHours(0, 0, 0, 0)
    }

    if (activeFolder === "today") {
      return taskDate && isSameDay(taskDate, today)
    } else if (activeFolder === "upcoming") {
      return taskDate && taskDate > today
    } else if (activeFolder === "all") {
      return true
    } else {
      return task.folderId === activeFolder
    }
  })
}

// Group tasks by date
function groupTasksByDate(tasks) {
  const grouped = {}

  tasks.forEach((task) => {
    if (!task.dueDate) {
      const key = "No Due Date"
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(task)
      return
    }

    const date = new Date(task.dueDate)
    let dateKey

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (isSameDay(date, today)) {
      dateKey = "Today"
    } else if (isSameDay(date, tomorrow)) {
      dateKey = "Tomorrow"
    } else {
      dateKey = date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    }

    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }

    grouped[dateKey].push(task)
  })

  return grouped
}

// Check if two dates are the same day
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Render tasks
function renderTasks() {
  const filteredTasks = getFilteredTasks()
  const groupedTasks = groupTasksByDate(filteredTasks)

  tasksContainer.innerHTML = ""

  if (Object.keys(groupedTasks).length === 0) {
    tasksContainer.innerHTML =
      '<div class="text-center" style="padding: 30px; color: #888;">No tasks found. Add a new task to get started!</div>'
    return
  }

  // Sort the date groups
  const sortedDates = Object.keys(groupedTasks).sort((a, b) => {
    if (a === "Today") return -1
    if (b === "Today") return 1
    if (a === "Tomorrow") return -1
    if (b === "Tomorrow") return 1
    if (a === "No Due Date") return 1
    if (b === "No Due Date") return -1

    // Try to parse dates
    const dateA = new Date(
      a
        .replace("Monday, ", "")
        .replace("Tuesday, ", "")
        .replace("Wednesday, ", "")
        .replace("Thursday, ", "")
        .replace("Friday, ", "")
        .replace("Saturday, ", "")
        .replace("Sunday, ", ""),
    )
    const dateB = new Date(
      b
        .replace("Monday, ", "")
        .replace("Tuesday, ", "")
        .replace("Wednesday, ", "")
        .replace("Thursday, ", "")
        .replace("Friday, ", "")
        .replace("Saturday, ", "")
        .replace("Sunday, ", ""),
    )

    return dateA - dateB
  })

  sortedDates.forEach((dateKey) => {
    const tasks = groupedTasks[dateKey]

    const taskGroup = document.createElement("div")
    taskGroup.className = "task-group"

    const taskGroupHeader = document.createElement("div")
    taskGroupHeader.className = "task-group-header"
    taskGroupHeader.innerHTML = `
            <span>${dateKey}</span>
            <span class="toggle-icon">▼</span>
        `

    const taskList = document.createElement("ul")
    taskList.className = "task-list"

    tasks.forEach((task) => {
      const taskItem = document.createElement("li")
      taskItem.className = `task-item ${task.completed ? "task-completed" : ""}`

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.className = "task-checkbox"
      checkbox.checked = task.completed
      checkbox.addEventListener("change", () => {
        toggleTaskCompletion(task.id)
      })

      const taskContent = document.createElement("div")
      taskContent.className = "task-content"

      const taskTitle = document.createElement("div")
      taskTitle.className = "task-title"
      taskTitle.textContent = task.title

      taskContent.appendChild(taskTitle)

      if (task.notes) {
        const taskNotes = document.createElement("div")
        taskNotes.className = "task-notes"
        taskNotes.textContent = task.notes
        taskContent.appendChild(taskNotes)
      }

      // Add voice message player if exists
      if (task.voiceMessage) {
        const taskVoice = document.createElement("div")
        taskVoice.className = "task-voice"

        const audioElement = document.createElement("audio")
        audioElement.controls = true
        audioElement.src = task.voiceMessage

        taskVoice.appendChild(audioElement)
        taskContent.appendChild(taskVoice)
      }

      if (task.dueDate) {
        const taskDue = document.createElement("div")
        taskDue.className = "task-due"
        taskDue.innerHTML = `
                    <span>⏰</span> ${new Date(task.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    ${task.notifyBefore ? `(Reminder: ${task.notifyBefore} min before)` : ""}
                `
        taskContent.appendChild(taskDue)
      }

      const taskActions = document.createElement("div")
      taskActions.className = "task-actions"

      const editBtn = document.createElement("button")
      editBtn.className = "btn-task"
      editBtn.innerHTML = "✏️"
      editBtn.addEventListener("click", () => {
        editTask(task.id)
      })

      const deleteBtn = document.createElement("button")
      deleteBtn.className = "btn-task"
      deleteBtn.innerHTML = "🗑️"
      deleteBtn.addEventListener("click", () => {
        deleteTask(task.id)
      })

      taskActions.appendChild(editBtn)
      taskActions.appendChild(deleteBtn)

      taskItem.appendChild(checkbox)
      taskItem.appendChild(taskContent)
      taskItem.appendChild(taskActions)

      taskList.appendChild(taskItem)
    })

    taskGroup.appendChild(taskGroupHeader)
    taskGroup.appendChild(taskList)

    tasksContainer.appendChild(taskGroup)

    // Add toggle functionality
    taskGroupHeader.addEventListener("click", () => {
      taskList.style.display = taskList.style.display === "none" ? "block" : "none"
      taskGroupHeader.querySelector(".toggle-icon").textContent = taskList.style.display === "none" ? "▶" : "▼"
    })
  })
}

// Toggle task completion
function toggleTaskCompletion(taskId) {
  const taskIndex = tasks.findIndex((task) => task.id === taskId)
  if (taskIndex !== -1) {
    tasks[taskIndex].completed = !tasks[taskIndex].completed
    localStorage.setItem("tasks", JSON.stringify(tasks))
    renderTasks()
    renderCalendar()
  }
}

// Edit task
function editTask(taskId) {
  const task = tasks.find((task) => task.id === taskId)
  if (!task) return

  editingTaskId = taskId

  taskTitleInput.value = task.title
  taskNotesInput.value = task.notes || ""
  taskDueDateInput.value = task.dueDate || ""
  taskFolderSelect.value = task.folderId
  taskNotifySelect.value = task.notifyBefore

  // Load voice message if exists
  if (task.voiceMessage) {
    recordedAudioURL = task.voiceMessage
    audioPlayer.src = task.voiceMessage
    audioPreview.style.display = "flex"
  } else {
    recordedAudioURL = null
    audioPlayer.src = ""
    audioPreview.style.display = "none"
  }

  document.getElementById("form-title").textContent = "Edit Task"
  submitBtn.textContent = "Update Task"
  cancelBtn.style.display = "inline-block"

  // Scroll to form
  taskForm.scrollIntoView({ behavior: "smooth" })
}

// Delete task
function deleteTask(taskId) {
  if (confirm("Are you sure you want to delete this task?")) {
    tasks = tasks.filter((task) => task.id !== taskId)
    localStorage.setItem("tasks", JSON.stringify(tasks))
    renderTasks()
    renderCalendar()
  }
}

// Render calendar
function renderCalendar() {
  // Update calendar title
  calendarTitle.textContent = currentMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })

  // Get first day of month
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)

  // Get last day of month
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

  // Get day of week for first day (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = firstDay.getDay()

  // Calculate days from previous month to show
  const daysFromPrevMonth = firstDayOfWeek

  // Calculate total days to show (previous month days + current month days)
  const totalDays = daysFromPrevMonth + lastDay.getDate()

  // Calculate rows needed (ceil to account for partial weeks)
  const rows = Math.ceil(totalDays / 7)

  // Clear calendar days
  calendarDays.innerHTML = ""

  // Get today's date for highlighting
  const today = new Date()

  // Current date being processed
  const currentDate = new Date(firstDay)
  currentDate.setDate(currentDate.getDate() - daysFromPrevMonth)

  // Create calendar grid
  for (let i = 0; i < rows * 7; i++) {
    const dayElement = document.createElement("div")
    dayElement.className = "calendar-day"

    // Check if day is from current month
    const isCurrentMonth = currentDate.getMonth() === currentMonth.getMonth()
    if (!isCurrentMonth) {
      dayElement.classList.add("other-month")
    }

    // Check if day is today
    const isToday = isSameDay(currentDate, today)
    if (isToday) {
      dayElement.classList.add("today")
    }

    // Add day number
    const dayNumber = document.createElement("div")
    dayNumber.className = "calendar-day-number"
    dayNumber.textContent = currentDate.getDate()
    dayElement.appendChild(dayNumber)

    // Add tasks for this day
    const dayTasks = tasks.filter((task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return isSameDay(taskDate, currentDate)
    })

    dayTasks.forEach((task) => {
      const taskElement = document.createElement("div")
      taskElement.className = `calendar-task ${task.completed ? "completed" : ""}`
      taskElement.textContent = task.title
      taskElement.addEventListener("click", () => {
        editTask(task.id)

        // Switch to list view
        tabButtons.forEach((btn) => btn.classList.remove("active"))
        tabContents.forEach((content) => content.classList.remove("active"))

        document.querySelector('[data-tab="list"]').classList.add("active")
        document.getElementById("list-view").classList.add("active")
      })
      dayElement.appendChild(taskElement)
    })

    calendarDays.appendChild(dayElement)

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
}

// Check for tasks that need notifications
function checkNotifications() {
  const now = new Date()

  tasks.forEach((task) => {
    if (task.dueDate && task.notifyBefore && !task.notified) {
      const dueDate = new Date(task.dueDate)
      const notifyTime = new Date(dueDate.getTime() - task.notifyBefore * 60000)

      if (now >= notifyTime && now < dueDate) {
        // Show notification
        if (Notification.permission === "granted") {
          new Notification("Task Reminder", {
            body: `"${task.title}" is due in ${task.notifyBefore} minutes!`,
            icon: "/favicon.ico",
          })

          // Mark as notified
          const taskIndex = tasks.findIndex((t) => t.id === task.id)
          if (taskIndex !== -1) {
            tasks[taskIndex].notified = true
            localStorage.setItem("tasks", JSON.stringify(tasks))
          }
        }
      }
    }
  })
}

// Initialize the app
init()
