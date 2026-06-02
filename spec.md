# VS Code Extension Specification — Sudoku.com Clone

## Goal

Create a VS Code extension that reproduces the core experience of Sudoku.com inside VS Code, including:

* Complete Sudoku gameplay
* Multiple difficulty levels
* Notes (pencil marks)
* Mistake tracking
* Hints
* Timer
* Statistics
* Daily challenges
* Themes
* Keyboard-first gameplay
* Fully customizable input mappings (users can map any keys such as `A Z E Q S D W X C` instead of numbers)

The extension must feel like a polished standalone game rather than a simple Sudoku grid.

---

# Product Name

**Sudoku VS**

Extension ID:

```
sudoku-vs
```

---

# Architecture

## Frontend

VS Code Webview

Technologies:

* TypeScript
* React
* Vite
* CSS

## Backend

VS Code Extension API

Responsibilities:

* Open game panel
* Save progress
* Store settings
* Track statistics
* Generate puzzles

---

# Main Commands

## Start New Game

Command:

```
Sudoku: New Game
```

Opens difficulty selection.

---

## Continue Game

Command:

```
Sudoku: Continue Game
```

Loads last saved game.

---

## Daily Challenge

Command:

```
Sudoku: Daily Challenge
```

Loads today's challenge.

---

## Statistics

Command:

```
Sudoku: Statistics
```

Opens statistics panel.

---

## Settings

Command:

```
Sudoku: Settings
```

Opens Sudoku settings page.

---

# Game Board

## Grid

9×9 standard Sudoku

81 cells

Each cell contains:

```
value
notes[]
isGiven
isError
isSelected
isHighlighted
```

---

## Selection

User can select cells using:

### Mouse

Single click

### Keyboard

Arrow keys

or

Configurable movement keys

Example:

```
W = up
S = down
A = left
D = right
```

---

# Sudoku Rules

Must enforce:

* Numbers 1-9
* Unique per row
* Unique per column
* Unique per 3×3 block

Puzzle must always have exactly one valid solution.

---

# Difficulties

## Easy

* More starting numbers
* Simple solving required

## Medium

* Fewer givens

## Hard

* Advanced solving

## Expert

* Very few givens

## Extreme

* Sudoku.com equivalent hardest level

Difficulty affects:

* Number of givens
* Solving complexity

Not random clue count only.

Use real Sudoku solving techniques to rate puzzles.

---

# Input System

## Core Requirement

Input must be completely configurable.

User can map any keyboard key.

Example:

```json
{
  "1": "A",
  "2": "Z",
  "3": "E",
  "4": "Q",
  "5": "S",
  "6": "D",
  "7": "W",
  "8": "X",
  "9": "C"
}
```

Then:

Pressing:

```
A
```

fills:

```
1
```

---

## Multiple Layout Profiles

Support:

### Default

```
1-9
```

### AZERTY

```
A Z E
Q S D
W X C
```

### QWERTY

Custom profile

### User Defined

Unlimited profiles

---

# Notes Mode

Equivalent to Sudoku.com pencil marks.

## Toggle

Shortcut:

```
N
```

or configurable

---

## Behavior

If Notes Mode ON:

Input adds note.

Example:

Cell notes:

```
[1,3,7]
```

---

## Auto Notes

Optional feature.

When enabled:

Automatically calculate possible candidates.

---

# Mistakes

## Mistake Counter

Configurable.

Default:

```
3 mistakes allowed
```

Mistake:

* Wrong value inserted

Counter:

```
0 / 3
1 / 3
2 / 3
3 / 3
```

Game over at limit.

---

## Alternative Mode

Mistakes disabled.

Used for purists.

---

# Hints

## Hint Button

Reveals one valid move.

Hint types:

### Easy Hint

Fill a cell.

### Smart Hint

Explain why.

Example:

```
Row 5 can only contain a 7 in column 3.
```

---

# Eraser

Removes:

* Cell value
* Notes

Shortcut configurable.

---

# Undo / Redo

Unlimited

Keyboard:

```
Ctrl+Z
Ctrl+Y
```

Maintain move history.

---

# Highlighting

## Selected Number

If user selects:

```
5
```

All 5s highlight.

---

## Row/Column Highlight

Selected cell highlights:

* Row
* Column
* Box

---

## Same Number Highlight

Like Sudoku.com.

---

# Timer

Per game timer.

Example:

```
12:34
```

Pause when:

* Game hidden
* VS Code closed

Resume later.

---

# Pause

Pause button.

Hide board.

Stop timer.

---

# Daily Challenge

Generate deterministic puzzle based on date.

Example:

```
2026-06-01
```

same puzzle for everyone.

Store completion.

---

# Statistics

Track:

## Games

* Played
* Won
* Lost

## Difficulty Stats

Per difficulty:

* Games played
* Wins
* Average time

## Streaks

* Current streak
* Best streak

## Daily Challenge

* Completed
* Consecutive days

---

# Achievements

Examples:

### First Win

Win first game.

### Speed Runner

Finish under 5 minutes.

### Perfectionist

No mistakes.

### Daily Master

Complete 30 daily challenges.

---

# Themes

## Light

## Dark

## Classic Sudoku.com

## VS Code Native

Follow current VS Code theme.

---

# Save System

Auto-save every move.

Store:

```json
{
  "board": [],
  "notes": [],
  "difficulty": "hard",
  "time": 600,
  "mistakes": 1
}
```

Must survive:

* VS Code restart
* Extension update

---

# Puzzle Generator

## Requirement

Do NOT hardcode puzzles.

Must generate:

1. Valid solved board
2. Remove clues
3. Verify unique solution
4. Rate difficulty

Generated puzzle requirements:

* Always solvable
* Single solution only
* Difficulty verified

---

# Accessibility

## Color Blind Support

Alternative highlight mode.

---

## Keyboard Only

Entire game playable without mouse.

---

## Screen Reader

Basic support.

---

# Performance

Requirements:

* Open in < 1 second
* New puzzle < 500ms
* No UI freezing

---

# VS Code Integration

## Activity Bar Icon

Add Sudoku icon.

Click opens game.

---

## Welcome View

When extension installed:

```
Start Game
Continue
Daily Challenge
Statistics
Settings
```

---

## Status Bar

Optional:

```
🧩 Sudoku 12:34
```

Shows timer.

---

# Settings Schema

```json
{
  "sudoku.theme": "auto",
  "sudoku.autoNotes": false,
  "sudoku.maxMistakes": 3,
  "sudoku.showErrors": true,
  "sudoku.pauseOnBlur": true,
  "sudoku.enableHints": true,
  "sudoku.inputProfile": "default"
}
```

---

# Explicit Non-Goals

Do NOT:

* Embed a website
* Use iframes
* Load Sudoku.com pages
* Depend on internet access
* Store data in external servers

Everything must run locally inside the extension.

---

# MVP Acceptance Criteria

The extension is considered complete only if:

1. User can play full Sudoku games.
2. Puzzles have unique solutions.
3. All Sudoku.com core mechanics exist.
4. Progress persists after restart.
5. Keyboard-only gameplay works.
6. Key mappings are fully customizable.
7. Difficulty levels are meaningful.
8. Daily challenges work.
9. Statistics work.
10. The extension feels like a production-quality game, not a demo.
