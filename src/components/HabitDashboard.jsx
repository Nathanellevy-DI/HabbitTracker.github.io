import React, { useState, useMemo, useEffect } from 'react';
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

// Initial default habits if localStorage is empty
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
];

const DEFAULT_CATEGORIES = ['Health & Fitness', 'Productivity', 'Learning', 'Mindset', 'General'];
const PALETTE = ['#0f172a', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0284c7'];

// LocalStorage Keys
const STORAGE_KEYS = {
  HABITS: 'habit_tracker_habits_v2',
  CATEGORIES: 'habit_tracker_categories_v2',
  THEME: 'habit_tracker_theme_v2',
};

export default function HabitDashboard() {
  // Load initial states from localStorage with fallbacks
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
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
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
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'completed'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // New habit form states
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState(categories[0] || 'General');
  const [newHabitColor, setNewHabitColor] = useState('#2563eb');
  const [newTargetDays, setNewTargetDays] = useState(ALL_DAY_IDS);

  const [newCategoryInput, setNewCategoryInput] = useState('');

  const todayStr = getTodayStr(0);
  const todayDateObj = new Date();
  const todayDayId = getDayIdFromDate(todayDateObj);

  // Persist habits to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
    } catch (e) {
      console.error('Failed to save habits to localStorage:', e);
    }
  }, [habits]);

  // Persist categories to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories to localStorage:', e);
    }
  }, [categories]);

  // Persist theme & toggle dark mode class on change
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

  // Toggle habit completion for today
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

  // Clear all habits
  const handleClearAllHabits = () => {
    if (window.confirm('Are you sure you want to delete ALL habits? This action cannot be undone.')) {
      setHabits([]);
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

  const getScheduleBadgeText = (targetDays) => {
    if (!targetDays || targetDays.length === 7) return 'Everyday';
    if (targetDays.length === 5 && !targetDays.includes('Sat') && !targetDays.includes('Sun')) return 'Weekdays';
    if (targetDays.length === 2 && targetDays.includes('Sat') && targetDays.includes('Sun')) return 'Weekends';
    return targetDays.join(', ');
  };

  const habitsForToday = useMemo(() => {
    return habits.filter((h) => h.targetDays.includes(todayDayId));
  }, [habits, todayDayId]);

  const filteredHabits = useMemo(() => {
    return habits.filter((habit) => {
      const isDoneToday = habit.completedDates.includes(todayStr);
      const isScheduledToday = habit.targetDays.includes(todayDayId);

      if (filterCategory !== 'All' && habit.category !== filterCategory) {
        return false;
      }

      if (activeTab === 'pending') return isScheduledToday && !isDoneToday;
      if (activeTab === 'completed') return isDoneToday;

      return true;
    });
  }, [habits, filterCategory, activeTab, todayStr, todayDayId]);

  const completedTodayCount = habitsForToday.filter((h) => h.completedDates.includes(todayStr)).length;
  const totalTodayScheduledCount = habitsForToday.length;
  const completionPercentage = totalTodayScheduledCount > 0 ? Math.round((completedTodayCount / totalTodayScheduledCount) * 100) : 0;
  const totalActiveStreaks = habits.reduce((acc, h) => acc + h.currentStreak, 0);

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
            <span className="brand-badge">⚡ DON'T BREAK THE CHAIN</span>
          </div>
          <h1 className="header-title">Daily Habits</h1>
          <p className="header-subtitle">{formattedCurrentDate} • Stay consistent day by day.</p>
        </div>

        <div className="header-actions">
          <button
            className="btn-theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          <button
            className="btn-manage-cat"
            onClick={() => setShowCategoryModal(true)}
            title="Manage Categories"
          >
            🏷️ Categories
          </button>

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
            <span className="metric-subtext">Across {habits.length} habits</span>
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
            All ({habits.length})
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
            {categories.map((cat) => (
              <button
                key={cat}
                className={`pill-btn ${filterCategory === cat ? 'active' : ''}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {habits.length > 0 && (
            <button className="btn-clear-all" onClick={handleClearAllHabits} title="Delete all habits">
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* HABITS CHECKLIST */}
      <main className="habits-list">
        {filteredHabits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>No habits in this view</h3>
            <p>Click "New Habit" above to create a habit for your schedule.</p>
          </div>
        ) : (
          filteredHabits.map((habit) => {
            const isCompletedToday = habit.completedDates.includes(todayStr);
            const isScheduledToday = habit.targetDays.includes(todayDayId);

            return (
              <div
                key={habit.id}
                className={`habit-card ${isCompletedToday ? 'completed' : ''} ${!isScheduledToday ? 'off-day' : ''}`}
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
                    <span className="category-badge">{habit.category}</span>
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
                      <option key={cat} value={cat}>{cat}</option>
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
                  <div key={cat} className="cat-tag-item">
                    <span>{cat}</span>
                    <button
                      type="button"
                      className="btn-remove-cat"
                      onClick={() => handleRemoveCategory(cat)}
                      title={`Delete ${cat}`}
                    >
                      ×
                    </button>
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
    </div>
  );
}
