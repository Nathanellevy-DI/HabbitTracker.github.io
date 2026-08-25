import React, { useState, useMemo, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import './HabitDashboard.css';

const DAYS_OF_WEEK = [
  { id: 'Mon', label: 'M', fullName: 'Monday' },
  { id: 'Tue', label: 'T', fullName: 'Tuesday' },
  { id: 'Wed', label: 'W', fullName: 'Wednesday' },
  { id: 'Thu', label: 'T', fullName: 'Thursday' },
  { id: 'Fri', label: 'F', fullName: 'Friday' },
  { id: 'Sat', label: 'S', fullName: 'Saturday' },
  { id: 'Sun', label: 'S', fullName: 'Sunday' },
];

const ALL_DAY_IDS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper to get formatted ISO date string YYYY-MM-DD
const getTodayStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

// Helper to get Day ID ('Mon', 'Tue', etc.)
const getDayIdFromDate = (dateObj) => {
  const dayIndex = dateObj.getDay();
  const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return map[dayIndex];
};

const DEFAULT_HABITS = [
  {
    id: 'h1',
    name: 'Morning Meditation & Breathwork',
    description: '10 minutes of mindfulness before starting work',
    category: 'Mindset',
    color: '#2563eb',
    targetDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStreak: 5,
    longestStreak: 12,
    completedDates: [getTodayStr(-4), getTodayStr(-3), getTodayStr(-2), getTodayStr(-1), getTodayStr(0)],
    createdAt: '2026-08-01',
  },
  {
    id: 'h2',
    name: 'Read 20 Pages of Non-Fiction',
    description: 'Focus on technology or psychology books',
    category: 'Learning',
    color: '#059669',
    targetDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    currentStreak: 3,
    longestStreak: 8,
    completedDates: [getTodayStr(-2), getTodayStr(-1), getTodayStr(0)],
    createdAt: '2026-08-05',
  },
  {
    id: 'h3_private',
    name: 'Personal Reflection & Journaling',
    description: 'Private personal reflection entry',
    category: 'Private',
    color: '#7c3aed',
    targetDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    currentStreak: 4,
    longestStreak: 7,
    completedDates: [getTodayStr(-3), getTodayStr(-2), getTodayStr(-1), getTodayStr(0)],
    createdAt: '2026-08-01',
  },
];

const DEFAULT_CATEGORIES = ['Health & Fitness', 'Productivity', 'Learning', 'Mindset', 'General', 'Private'];
const PALETTE = ['#0f172a', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0284c7'];

const STORAGE_KEYS = {
  HABITS: 'habit_tracker_habits_v2',
  CATEGORIES: 'habit_tracker_categories_v2',
  THEME: 'habit_tracker_theme_v2',
};

export default function HabitDashboard() {
  const fileInputRef = useRef(null);

  const [habits, setHabits] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HABITS);
      return saved ? JSON.parse(saved) : DEFAULT_HABITS;
    } catch {
      return DEFAULT_HABITS;
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      let parsed = saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
      if (!parsed.includes('Private')) {
        parsed.push('Private');
      }
      return parsed;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [filterCategory, setFilterCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);

  // New habit form states
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState(categories[0] || 'General');
  const [newHabitColor, setNewHabitColor] = useState('#2563eb');
  const [newTargetDays, setNewTargetDays] = useState(ALL_DAY_IDS);

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const todayStr = getTodayStr(0);
  const todayDateObj = new Date();
  const todayDayId = getDayIdFromDate(todayDateObj);

  // LocalStorage Persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    } catch (e) {
      console.error('Failed to save habits to localStorage:', e);
    }
  }, [habits]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories to localStorage:', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(isDarkMode));
    } catch (e) {
      console.error('Failed to save theme to localStorage:', e);
    }
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  // Streak calculation taking custom target days into account
  const calculateStreak = (completedDatesArr, targetDaysArr) => {
    const datesSet = new Set(completedDatesArr);
    const targetSet = new Set(targetDaysArr);
    if (targetSet.size === 0) return 0;

    let streak = 0;
    let checkDate = new Date();

    const todayFormatted = checkDate.toISOString().split('T')[0];
    const isTodayTarget = targetSet.has(getDayIdFromDate(checkDate));
    const isTodayDone = datesSet.has(todayFormatted);

    if (isTodayTarget && !isTodayDone) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
      const formatted = checkDate.toISOString().split('T')[0];
      const dayId = getDayIdFromDate(checkDate);

      if (targetSet.has(dayId)) {
        if (datesSet.has(formatted)) {
          streak++;
        } else {
          break;
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  };

  // Toggle habit completion
  const handleToggleHabit = (habitId) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id !== habitId) return habit;

        const isCompletedToday = habit.completedDates.includes(todayStr);
        let updatedDates;

        if (isCompletedToday) {
          updatedDates = habit.completedDates.filter((d) => d !== todayStr);
        } else {
          updatedDates = [...habit.completedDates, todayStr];
        }

        const newStreak = calculateStreak(updatedDates, habit.targetDays);
        const newLongest = Math.max(habit.longestStreak, newStreak);

        return {
          ...habit,
          completedDates: updatedDates,
          currentStreak: newStreak,
          longestStreak: newLongest,
        };
      })
    );
  };

  // Delete habit
  const handleDeleteHabit = (habitId) => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      setHabits(habits.filter((h) => h.id !== habitId));
    }
  };

  // Clear habits in current view
  const handleClearAllHabits = () => {
    const isPrivateView = filterCategory === 'Private';
    const msg = isPrivateView
      ? 'Are you sure you want to delete ALL Private habits?'
      : 'Are you sure you want to delete ALL public habits?';

    if (window.confirm(msg)) {
      if (isPrivateView) {
        setHabits(habits.filter((h) => h.category !== 'Private'));
      } else {
        setHabits(habits.filter((h) => h.category === 'Private'));
      }
    }
  };

  // Target days selector helpers
  const toggleTargetDay = (dayId) => {
    if (newTargetDays.includes(dayId)) {
      if (newTargetDays.length === 1) return;
      setNewTargetDays(newTargetDays.filter((d) => d !== dayId));
    } else {
      setNewTargetDays([...newTargetDays, dayId]);
    }
  };

  const selectPresetDays = (preset) => {
    if (preset === 'everyday') setNewTargetDays(ALL_DAY_IDS);
    if (preset === 'weekdays') setNewTargetDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    if (preset === 'weekends') setNewTargetDays(['Sat', 'Sun']);
  };

  // Add new habit
  const handleAddHabit = (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit = {
      id: `h_${Date.now()}`,
      name: newHabitName.trim(),
      description: newHabitDesc.trim(),
      category: newHabitCategory,
      color: newHabitColor,
      targetDays: newTargetDays,
      currentStreak: 0,
      longestStreak: 0,
      completedDates: [],
      createdAt: todayStr,
    };

    setHabits([newHabit, ...habits]);
    setNewHabitName('');
    setNewHabitDesc('');
    setNewTargetDays(ALL_DAY_IDS);
    setShowAddModal(false);
  };

  // Category management
  const handleAddCategory = (e) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('Category already exists!');
      return;
    }
    setCategories([...categories, trimmed]);
    setNewCategoryInput('');
  };

  const handleRemoveCategory = (catToRemove) => {
    if (catToRemove === 'Private') {
      alert('The Private category is built-in and cannot be removed.');
      return;
    }
    if (categories.length <= 1) {
      alert('You must have at least one category.');
      return;
    }
    if (window.confirm(`Remove category "${catToRemove}"? Habits in this category will be reassigned to General.`)) {
      setCategories(categories.filter((c) => c !== catToRemove));
      setHabits(
        habits.map((h) => (h.category === catToRemove ? { ...h, category: 'General' } : h))
      );
      if (filterCategory === catToRemove) {
        setFilterCategory('All');
      }
    }
  };

  // Export & Import Data
  const handleExportZipData = async () => {
    try {
      const backupPayload = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        habits: habits,
        categories: categories,
        isDarkMode: isDarkMode,
      };

      const zip = new JSZip();
      zip.file('habits_backup.json', JSON.stringify(backupPayload, null, 2));

      const blob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `habit_tracker_backup_${todayStr}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setSyncStatusMsg('✅ Backup ZIP created and downloaded successfully!');
      setTimeout(() => setSyncStatusMsg(''), 4000);
    } catch (err) {
      console.error('Error generating ZIP export:', err);
      alert('Failed to generate ZIP export file.');
    }
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let payloadJson = null;

      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const unzipped = await zip.loadAsync(file);
        
        const jsonFileName = Object.keys(unzipped.files).find((name) => name.endsWith('.json'));
        if (!jsonFileName) {
          alert('Invalid ZIP backup: No JSON data file found inside archive.');
          return;
        }

        const jsonText = await unzipped.files[jsonFileName].async('string');
        payloadJson = JSON.parse(jsonText);
      } else if (file.name.endsWith('.json')) {
        const jsonText = await file.text();
        payloadJson = JSON.parse(jsonText);
      } else {
        alert('Please select a valid .zip or .json backup file.');
        return;
      }

      if (!payloadJson || !Array.isArray(payloadJson.habits)) {
        alert('Invalid backup structure: Habits list missing.');
        return;
      }

      setHabits(payloadJson.habits);
      if (Array.isArray(payloadJson.categories) && payloadJson.categories.length > 0) {
        setCategories(payloadJson.categories);
      }
      if (typeof payloadJson.isDarkMode === 'boolean') {
        setIsDarkMode(payloadJson.isDarkMode);
      }

      setSyncStatusMsg(`🎉 Restored ${payloadJson.habits.length} habits successfully!`);
      setTimeout(() => {
        setSyncStatusMsg('');
        setShowDataModal(false);
      }, 2500);
    } catch (err) {
      console.error('Error importing backup file:', err);
      alert('Error reading backup file. Please check file format.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getScheduleBadgeText = (targetDays) => {
    if (!targetDays || targetDays.length === 7) return 'Everyday';
    if (targetDays.length === 5 && !targetDays.includes('Sat') && !targetDays.includes('Sun')) return 'Weekdays';
    if (targetDays.length === 2 && targetDays.includes('Sat') && targetDays.includes('Sun')) return 'Weekends';
    return targetDays.join(', ');
  };

  // ==========================================
  // PRIVACY FILTERING LOGIC
  // - "All" tab shows all PUBLIC habits only (excludes Private).
  // - "Private" category pill tab shows ONLY Private habits.
  // ==========================================
  const relevantHabits = useMemo(() => {
    if (filterCategory === 'Private') {
      return habits.filter((h) => h.category === 'Private');
    }
    if (filterCategory === 'All') {
      return habits.filter((h) => h.category !== 'Private');
    }
    return habits.filter((h) => h.category === filterCategory);
  }, [habits, filterCategory]);

  const habitsForToday = useMemo(() => {
    return relevantHabits.filter((h) => h.targetDays.includes(todayDayId));
  }, [relevantHabits, todayDayId]);

  const filteredHabits = useMemo(() => {
    return relevantHabits.filter((habit) => {
      const isDoneToday = habit.completedDates.includes(todayStr);
      const isScheduledToday = habit.targetDays.includes(todayDayId);

      if (activeTab === 'pending') return isScheduledToday && !isDoneToday;
      if (activeTab === 'completed') return isDoneToday;

      return true;
    });
  }, [relevantHabits, activeTab, todayStr, todayDayId]);

  const completedTodayCount = habitsForToday.filter((h) => h.completedDates.includes(todayStr)).length;
  const totalTodayScheduledCount = habitsForToday.length;
  const completionPercentage = totalTodayScheduledCount > 0 ? Math.round((completedTodayCount / totalTodayScheduledCount) * 100) : 0;
  const totalActiveStreaks = relevantHabits.reduce((acc, h) => acc + h.currentStreak, 0);

  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      dayId: getDayIdFromDate(d),
      isToday: i === 6,
    };
  });

  const formattedCurrentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={`habit-dashboard ${isDarkMode ? 'dark' : 'light'}`}>
      {/* HEADER BAR */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-badge-row">
            <img src="./icon.svg" alt="Habit Chain Logo" className="app-header-logo" />
            <span className="brand-badge">⚡ DON'T BREAK THE CHAIN</span>
          </div>
          <h1 className="header-title">
            {filterCategory === 'Private' ? '🔒 Private Habits' : 'Daily Habits'}
          </h1>
          <p className="header-subtitle">
            {filterCategory === 'Private'
              ? 'Your private habits (hidden from All view)'
              : `${formattedCurrentDate} • Stay consistent day by day.`}
          </p>
        </div>

        <div className="header-actions">
          {/* THEME TOGGLE */}
          <button
            className="btn-theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          {/* BACKUP / DATA TRANSFER BUTTON */}
          <button
            className="btn-manage-cat"
            onClick={() => setShowDataModal(true)}
            title="Transfer & Backup Data"
          >
            📦 Backup & Sync
          </button>

          {/* CATEGORIES BUTTON */}
          <button
            className="btn-manage-cat"
            onClick={() => setShowCategoryModal(true)}
            title="Manage Categories"
          >
            🏷️ Categories
          </button>

          {/* ADD HABIT BUTTON */}
          <button className="btn-add-habit" onClick={() => setShowAddModal(true)}>
            <span className="btn-icon">+</span> New Habit
          </button>
        </div>
      </header>

      {/* METRICS HERO CARD */}
      <div className="metrics-card">
        <div className="metrics-main">
          <div className="metric-box">
            <span className="metric-label">Today's Goal ({todayDayId})</span>
            <div className="metric-val-row">
              <span className="metric-value">{completedTodayCount} of {totalTodayScheduledCount}</span>
              <span className="metric-percentage">{completionPercentage}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${completionPercentage}%` }}></div>
            </div>
          </div>

          <div className="metric-divider"></div>

          <div className="metric-box">
            <span className="metric-label">Active Streak Power</span>
            <div className="metric-val-row">
              <span className="metric-value streak-glow">⚡ {totalActiveStreaks} Days</span>
            </div>
            <span className="metric-subtext">Across {relevantHabits.length} habits</span>
          </div>
        </div>
      </div>

      {/* FILTERS & CONTROLS */}
      <div className="controls-row">
        {/* Status Tabs */}
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({relevantHabits.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            To Do Today ({totalTodayScheduledCount - completedTodayCount})
          </button>
          <button
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({completedTodayCount})
          </button>
        </div>

        {/* Category Pills & Clear Action */}
        <div className="category-pills-row">
          <div className="category-pills">
            <button
              className={`pill-btn ${filterCategory === 'All' ? 'active' : ''}`}
              onClick={() => setFilterCategory('All')}
            >
              All
            </button>
            {categories.map((cat) => {
              const isPrivate = cat === 'Private';
              return (
                <button
                  key={cat}
                  className={`pill-btn ${filterCategory === cat ? 'active' : ''} ${isPrivate ? 'pill-private' : ''}`}
                  onClick={() => setFilterCategory(cat)}
                >
                  {isPrivate ? '🔒 Private' : cat}
                </button>
              );
            })}
          </div>

          {relevantHabits.length > 0 && (
            <button className="btn-clear-all" onClick={handleClearAllHabits} title="Delete habits in view">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* HABITS CHECKLIST */}
      <main className="habits-list">
        {filteredHabits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{filterCategory === 'Private' ? '🔒' : '✓'}</div>
            <h3>
              {filterCategory === 'Private' ? 'No private habits' : 'No habits in this view'}
            </h3>
            <p>
              {filterCategory === 'Private'
                ? 'Create a habit and select "Private" category to keep it hidden from the main view.'
                : 'Click "New Habit" above to create a habit for your schedule.'}
            </p>
          </div>
        ) : (
          filteredHabits.map((habit) => {
            const isCompletedToday = habit.completedDates.includes(todayStr);
            const isScheduledToday = habit.targetDays.includes(todayDayId);
            const isPrivate = habit.category === 'Private';

            return (
              <div
                key={habit.id}
                className={`habit-card ${isCompletedToday ? 'completed' : ''} ${!isScheduledToday ? 'off-day' : ''} ${isPrivate ? 'card-private' : ''}`}
              >
                {/* CHECKBOX TRIGGER */}
                <button
                  className={`check-button ${isCompletedToday ? 'checked' : ''}`}
                  onClick={() => handleToggleHabit(habit.id)}
                  title={isCompletedToday ? 'Mark as incomplete' : 'Mark as done today'}
                >
                  {isCompletedToday && (
                    <svg viewBox="0 0 24 24" className="checkmark-icon">
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                {/* HABIT DETAILS */}
                <div className="habit-info">
                  <div className="habit-header-row">
                    <h3 className="habit-name">{habit.name}</h3>
                    <span className={`category-badge ${isPrivate ? 'badge-private' : ''}`}>
                      {isPrivate ? '🔒 Private' : habit.category}
                    </span>
                    <span className="schedule-badge">📅 {getScheduleBadgeText(habit.targetDays)}</span>
                  </div>
                  {habit.description && <p className="habit-desc">{habit.description}</p>}

                  {/* 7-DAY MINI CHAIN VISUALIZER */}
                  <div className="chain-visualizer">
                    <span className="chain-label">7-Day Chain:</span>
                    <div className="chain-dots">
                      {past7Days.map((day) => {
                        const isDone = habit.completedDates.includes(day.dateStr);
                        const isTargetDay = habit.targetDays.includes(day.dayId);

                        return (
                          <div
                            key={day.dateStr}
                            className={`chain-dot ${isDone ? 'done' : ''} ${day.isToday ? 'today' : ''} ${!isTargetDay ? 'rest-day' : ''}`}
                            title={`${day.dateStr} (${day.dayId}): ${!isTargetDay ? 'Scheduled Rest Day' : isDone ? 'Completed' : 'Missed'}`}
                          >
                            <span className="dot-day">{day.dayName}</span>
                            <span className="dot-circle">
                              {!isTargetDay && <span className="rest-dash">—</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* STREAK COUNTER BADGE & DELETE BUTTON */}
                <div className="streak-badge-container">
                  <div className={`streak-badge ${habit.currentStreak > 0 ? 'active-streak' : 'zero-streak'}`}>
                    <span className="flame-icon">🔥</span>
                    <div className="streak-text-block">
                      <span className="streak-count">{habit.currentStreak} Days</span>
                      <span className="streak-sub">
                        {habit.currentStreak > 0 ? 'Streak' : 'Start Today'}
                      </span>
                    </div>
                  </div>

                  <div className="card-footer-actions">
                    <span className="record-streak">Record: <strong>{habit.longestStreak}d</strong></span>
                    <button
                      className="btn-delete-habit"
                      onClick={() => handleDeleteHabit(habit.id)}
                      title="Delete habit"
                    >
                      <svg viewBox="0 0 24 24" className="trash-icon">
                        <path
                          fill="currentColor"
                          d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ADD HABIT MODAL */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Habit</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddHabit} className="add-habit-form">
              <div className="form-group">
                <label>Habit Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Read 20 pages, Morning Workout"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description / Goal</label>
                <textarea
                  placeholder="Optional details..."
                  value={newHabitDesc}
                  onChange={(e) => setNewHabitDesc(e.target.value)}
                  rows="2"
                />
              </div>

              {/* TARGET DAYS SELECTOR */}
              <div className="form-group">
                <div className="label-with-presets">
                  <label>Repeat Days *</label>
                  <div className="preset-links">
                    <button type="button" onClick={() => selectPresetDays('everyday')}>Everyday</button>
                    <span>•</span>
                    <button type="button" onClick={() => selectPresetDays('weekdays')}>Weekdays</button>
                    <span>•</span>
                    <button type="button" onClick={() => selectPresetDays('weekends')}>Weekends</button>
                  </div>
                </div>

                <div className="day-circles-picker">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = newTargetDays.includes(day.id);
                    return (
                      <button
                        type="button"
                        key={day.id}
                        className={`day-circle-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleTargetDay(day.id)}
                        title={day.fullName}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category</label>
                  <select
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'Private' ? '🔒 Private (Hidden from All)' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>Theme</label>
                  <div className="color-palette">
                    {PALETTE.map((color) => (
                      <button
                        type="button"
                        key={color}
                        className={`color-swatch ${newHabitColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewHabitColor(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE CATEGORIES MODAL */}
      {showCategoryModal && (
        <div className="modal-backdrop" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Categories</h2>
              <button className="close-btn" onClick={() => setShowCategoryModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddCategory} className="add-category-form">
              <div className="form-group">
                <label>Add New Category</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    placeholder="e.g. Finance, Mindfulness, Languages"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                  />
                  <button type="submit" className="btn-primary btn-sm">Add</button>
                </div>
              </div>
            </form>

            <div className="category-manager-list">
              <label className="section-label">Existing Categories</label>
              <div className="cat-tags-grid">
                {categories.map((cat) => (
                  <div key={cat} className={`cat-tag-item ${cat === 'Private' ? 'item-private' : ''}`}>
                    <span>{cat === 'Private' ? '🔒 Private (Built-in)' : cat}</span>
                    {cat !== 'Private' && (
                      <button
                        type="button"
                        className="btn-remove-cat"
                        onClick={() => handleRemoveCategory(cat)}
                        title={`Delete ${cat}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-primary" onClick={() => setShowCategoryModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BACKUP & DATA TRANSFER MODAL */}
      {showDataModal && (
        <div className="modal-backdrop" onClick={() => setShowDataModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📦 Device Data Sync & Backup</h2>
              <button className="close-btn" onClick={() => setShowDataModal(false)}>×</button>
            </div>

            <div className="data-transfer-body">
              <p className="data-transfer-desc">
                Transfer your habits, streaks, and completion history between your phone, tablet, and computer using ZIP backup files.
              </p>

              {syncStatusMsg && (
                <div className="sync-status-alert">
                  {syncStatusMsg}
                </div>
              )}

              <div className="data-action-card">
                <div className="action-card-info">
                  <h3>1. Export Backup (.zip)</h3>
                  <p>Download a single ZIP archive containing all your current habits and streaks.</p>
                </div>
                <button type="button" className="btn-primary" onClick={handleExportZipData}>
                  ⬇️ Download ZIP Backup
                </button>
              </div>

              <div className="data-action-card">
                <div className="action-card-info">
                  <h3>2. Restore / Import Backup</h3>
                  <p>Upload a `.zip` or `.json` backup file from another device to restore all your habits.</p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".zip,.json"
                  onChange={handleImportFileChange}
                  style={{ display: 'none' }}
                />

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Select Backup File (.zip)
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDataModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
