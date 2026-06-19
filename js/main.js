// GameManager — orchestrates the entire game

class GameManager {
  constructor() {
    this.sim      = new GitSimulator();
    this.renderer = new GraphRenderer(
      document.getElementById('git-graph'),
      document.getElementById('graph-empty')
    );
    this.terminal = new TerminalManager(
      document.getElementById('terminal-output'),
      document.getElementById('terminal-input'),
      document.getElementById('term-prompt'),
      (cmd) => this.handleCommand(cmd)
    );

    this.currentLevel   = 0;
    this.hintIndex      = 0;
    this.lastCommand    = '';
    this.allLearnedCmds = [];
    this.completedLevels = new Set(); // indices of completed levels
    this.objState = {};
    this.wrongToastTimer = null;

    this._buildTimeline();
    this._bindUI();
    this.loadLevel(0);
  }

  // ── Level management ───────────────────────────────────────────────────────

  loadLevel(idx) {
    if (idx >= LEVELS.length) {
      this._showVictory();
      return;
    }

    this.currentLevel = idx;
    this.hintIndex    = 0;
    this.lastCommand  = '';

    const level = LEVELS[idx];

    // Reset simulator and apply level setup
    this.sim.reset();
    level.initialSetup(this.sim);

    // init objectives tracking
    this.objState = {};
    for (const obj of (level.objectives || [])) {
      this.objState[obj.id] = false;
    }

    // Update header title
    document.getElementById('nav-level-title').textContent = `Nível ${level.id}: ${level.title}`;

    // Update timeline dots
    this._updateTimeline();

    // Render instructions
    this._renderInstructions(level);

    // Render commands panel and restore normal view
    this._renderCommands(level);
    this._hideLevelComplete();

    // Reset hint
    document.getElementById('hint-text').classList.remove('visible');
    document.getElementById('hint-text').innerHTML = '';
    document.getElementById('hint-btn').textContent = '💡 Revelar Dica';

    // Update graph
    this.renderer.render(this.sim);

    // Update prompt
    this.terminal.updatePrompt(this.sim);

    // Hide wrong command toast from previous level
    this._hideWrongToast();

    // Welcome message in terminal
    this.terminal.clear();
    this.terminal.print(`── Nível ${level.id}: ${level.title} ──`, 'header');
    this.terminal.print('', 'out');

    // Show initial ls output
    const files = Object.keys(this.sim.workingTree);
    if (files.length > 0) {
      this.terminal.print(`Arquivos na pasta: ${files.join(', ')}`, 'dim');
      this.terminal.print('', 'out');
    }

    this.terminal.focus();
  }

  _renderInstructions(level) {
    const body = document.getElementById('instructions-body');
    const objHtml = (level.objectives || []).map(obj =>
      `<div class="obj-item" id="obj-${obj.id}">
        <div class="obj-check" id="check-${obj.id}"></div>
        <div class="obj-text">${obj.text}</div>
      </div>`
    ).join('');

    body.innerHTML = `
      <div class="inst-subtitle">${level.subtitle}</div>
      <div class="inst-title">${level.title}</div>
      ${level.description}
      <div class="inst-objectives">
        <div class="inst-objectives-title">Objetivos</div>
        ${objHtml}
      </div>
    `;
  }

  _renderCommands(level) {
    const list = document.getElementById('commands-list');

    // Accumulate learned commands from previous levels
    if (level.newCommands) {
      for (const cmd of level.newCommands) {
        if (!this.allLearnedCmds.find(c => c.name === cmd.name)) {
          this.allLearnedCmds.push(cmd);
        }
      }
    }

    // Show learned commands from PREVIOUS levels only (current level's are "new")
    const prevCmds = [];
    for (let i = 0; i < this.currentLevel; i++) {
      for (const cmd of (LEVELS[i].newCommands || [])) {
        if (!prevCmds.find(c => c.name === cmd.name)) {
          prevCmds.push(cmd);
        }
      }
    }

    if (prevCmds.length === 0) {
      list.innerHTML = '<div class="no-commands">Nenhum comando aprendido ainda.</div>';
    } else {
      list.innerHTML = prevCmds.reverse().map(cmd => `
        <div class="cmd-chip">
          <span class="cmd-chip-name">${this._esc(cmd.name)}</span>
          <span class="cmd-chip-desc">— ${this._esc(cmd.desc)}</span>
        </div>
      `).join('');
    }
  }

  // ── Command handling ───────────────────────────────────────────────────────

  handleCommand(cmd) {
    this.lastCommand = cmd;

    const result = this.sim.execute(cmd);

    // Print output
    if (result.output === '__CLEAR__') {
      this.terminal.clear();
    } else if (result.output) {
      const type = !result.success ? 'err' : (result.isWarn ? 'warn' : 'out');
      // print with ANSI color support
      this._printColored(result.output, type);
    }

    // Update prompt
    this.terminal.updatePrompt(this.sim);

    // Update graph if anything changed
    if (result.graphChanged) {
      this.renderer.render(this.sim);
    }

    // Check objectives and win condition
    this._checkProgress(cmd, result);
  }

  _printColored(text, defaultType) {
    // The simulator uses \x1b[Xm escape codes in some outputs
    // We'll parse lines and handle the color escapes
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes('\x1b[')) {
        // Output as raw but convert escape codes
        const div = document.createElement('div');
        div.className = 'term-line out';
        div.innerHTML = this._ansiToHtml(this._esc(line));
        document.getElementById('terminal-output').appendChild(div);
      } else {
        this.terminal.print(line, defaultType);
      }
    }
    document.getElementById('terminal-output').scrollTop = document.getElementById('terminal-output').scrollHeight;
  }

  _ansiToHtml(escaped) {
    // The text has been HTML-escaped, so \x1b becomes literal chars
    // We work with the raw text instead — re-escape carefully
    return escaped; // handled in terminal.js _formatLine
  }

  // ── Objective tracking ─────────────────────────────────────────────────────

  _checkProgress(cmd, result) {
    const level = LEVELS[this.currentLevel];
    if (!level) return;

    const prevCount = Object.values(this.objState).filter(Boolean).length;

    this._updateObjectives(level, cmd, result);

    if (result.success !== false) {
      const won = level.winCondition(this.sim, cmd, this.objState);
      if (won) {
        setTimeout(() => this._winLevel(level), 400);
        return;
      }
    }

    const newCount = Object.values(this.objState).filter(Boolean).length;
    if (newCount > prevCount) {
      this._hideWrongToast();
    } else if (!this._isExploratory(cmd)) {
      this._showWrongToast();
    }
  }

  _isExploratory(cmd) {
    const c = cmd.trim().toLowerCase();
    return /^(ls|pwd|clear)/.test(c) ||
           /^cat\s/.test(c) ||
           /^git\s+(status|log|diff|show|ls-files|stash\s+list)/.test(c) ||
           /^git\s+branch\s*$/.test(c) ||
           /^git\s+remote(\s+-v)?\s*$/.test(c);
  }

  _showWrongToast() {
    const level = LEVELS[this.currentLevel];
    const hints = level.hints || [];
    const hintText = hints.length > 0
      ? hints[Math.min(this.hintIndex, hints.length - 1)]
      : 'Leia a descrição da missão e tente de novo.';

    document.getElementById('wrong-toast-text').textContent = hintText;
    document.getElementById('wrong-toast').classList.add('active');

    this.terminal.print('Leia a dica e tente mais uma vez... vamos lá!', 'warn');

    clearTimeout(this.wrongToastTimer);
    this.wrongToastTimer = setTimeout(() => this._hideWrongToast(), 5000);
  }

  _hideWrongToast() {
    clearTimeout(this.wrongToastTimer);
    document.getElementById('wrong-toast').classList.remove('active');
  }

  _markDone(objId) {
    if (this.objState[objId]) return;
    this.objState[objId] = true;
    const el = document.getElementById(`check-${objId}`);
    if (el) { el.textContent = '✓'; el.classList.add('done'); }
  }

  _updateObjectives(level, cmd, result) {
    for (const obj of (level.objectives || [])) {
      if (this.objState[obj.id]) continue;
      try {
        if (obj.check && obj.check(this.sim, cmd, result)) {
          this._markDone(obj.id);
        }
      } catch (_) { /* ignore check errors */ }
    }
  }

  _winLevel(level) {
    // Don't trigger if already showing level complete
    if (document.getElementById('level-complete-panel').classList.contains('active')) return;

    // Mark level as completed and refresh timeline
    this.completedLevels.add(this.currentLevel);
    this._updateTimeline();

    // Fill the level complete panel
    document.getElementById('lcp-msg').textContent = level.successMsg;
    document.getElementById('lcp-unlocked').innerHTML = (level.newCommands || []).map(cmd =>
      `<span class="unlocked-badge">${cmd.name}</span>`
    ).join('');

    // Swap commands panel content → level complete panel
    document.getElementById('commands-list').style.display = 'none';
    document.getElementById('hint-area').style.display = 'none';
    document.getElementById('level-complete-panel').classList.add('active');

    this._celebrate();
  }

  _hideLevelComplete() {
    document.getElementById('level-complete-panel').classList.remove('active');
    document.getElementById('commands-list').style.display = '';
    document.getElementById('hint-area').style.display = '';
  }

  _celebrate() {
    const confetti = document.getElementById('lcp-confetti');
    confetti.innerHTML = '';
    const colors = ['#3fb950', '#58a6ff', '#bc8cff', '#ffa657', '#d29922'];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      const size = 5 + Math.random() * 5;
      const x = 10 + Math.random() * 80;
      const y = 5 + Math.random() * 30;
      const delay = Math.random() * 0.4;
      const dur = 0.8 + Math.random() * 0.6;
      const dy = 40 + Math.random() * 40;
      p.style.cssText = [
        `position:absolute`,
        `width:${size}px`, `height:${size}px`,
        `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
        `background:${colors[i % colors.length]}`,
        `left:${x}%`, `top:${y}%`,
        `animation:confetti-fall ${dur}s ${delay}s ease-out forwards`,
        `transform-origin:center`,
      ].join(';');
      confetti.appendChild(p);
    }

    // Inject keyframes once
    if (!document.getElementById('confetti-style')) {
      const s = document.createElement('style');
      s.id = 'confetti-style';
      s.textContent = `@keyframes confetti-fall {
        0%   { opacity:1; transform: translateY(0) rotate(0deg); }
        100% { opacity:0; transform: translateY(60px) rotate(360deg); }
      }`;
      document.head.appendChild(s);
    }
  }

  // ── Hints ──────────────────────────────────────────────────────────────────

  showHint() {
    const level = LEVELS[this.currentLevel];
    const hints = level.hints || [];
    if (!hints.length) return;

    if (this.hintIndex >= hints.length) {
      this.terminal.print('Você já viu todas as dicas! Tente aplicar os passos descritos.', 'warn');
      return;
    }

    const hintEl = document.getElementById('hint-text');
    hintEl.classList.add('visible');

    // Add next hint step
    const step = document.createElement('div');
    step.className = 'hint-step';
    step.textContent = hints[this.hintIndex];
    hintEl.appendChild(step);

    this.hintIndex++;
    const remaining = hints.length - this.hintIndex;
    document.getElementById('hint-btn').textContent =
      remaining > 0 ? `💡 Mais uma dica (${remaining} restante${remaining !== 1 ? 's' : ''})` : '💡 Sem mais dicas';
  }

  // ── Timeline ───────────────────────────────────────────────────────────────

  _buildTimeline() {
    const container = document.getElementById('level-timeline');
    container.innerHTML = '';

    for (let i = 0; i < LEVELS.length; i++) {
      // dot
      const btn = document.createElement('button');
      btn.className = 'level-dot';
      btn.dataset.idx = i;
      btn.title = `Nível ${LEVELS[i].id}: ${LEVELS[i].title}`;

      const num = document.createElement('span');
      num.className = 'dot-num';
      num.textContent = LEVELS[i].id;
      btn.appendChild(num);

      btn.addEventListener('click', () => this._navigateTo(i));
      container.appendChild(btn);

      // connector line (not after last dot)
      if (i < LEVELS.length - 1) {
        const line = document.createElement('div');
        line.className = 'dot-line';
        line.dataset.lineIdx = i;
        container.appendChild(line);
      }
    }
  }

  _updateTimeline() {
    const cur = this.currentLevel;

    for (let i = 0; i < LEVELS.length; i++) {
      const dot = document.querySelector(`.level-dot[data-idx="${i}"]`);
      if (!dot) continue;

      dot.classList.remove('done', 'current');

      if (this.completedLevels.has(i)) {
        dot.classList.add('done');
      } else if (i === cur) {
        dot.classList.add('current');
      }
    }

    // Update connector lines: line[i] = between dot i and dot i+1; color if i is completed
    for (let i = 0; i < LEVELS.length - 1; i++) {
      const line = document.querySelector(`.dot-line[data-line-idx="${i}"]`);
      if (!line) continue;
      line.classList.toggle('done', this.completedLevels.has(i));
    }

    // Prev/next buttons
    const prevBtn = document.getElementById('nav-prev');
    const nextBtn = document.getElementById('nav-next');
    prevBtn.disabled = cur === 0;
    nextBtn.disabled = cur === LEVELS.length - 1;
  }

  _navigateTo(idx) {
    if (idx === this.currentLevel) return;
    this.loadLevel(idx);
  }

  // ── UI binding ─────────────────────────────────────────────────────────────

  _bindUI() {
    document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
    document.getElementById('wrong-toast-close').addEventListener('click', () => this._hideWrongToast());

    document.getElementById('btn-next').addEventListener('click', () => {
      this.loadLevel(this.currentLevel + 1);
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      document.getElementById('victory-overlay').style.display = 'none';
      this.allLearnedCmds = [];
      this.completedLevels.clear();
      this.loadLevel(0);
    });

    document.getElementById('nav-prev').addEventListener('click', () => {
      if (this.currentLevel > 0) this._navigateTo(this.currentLevel - 1);
    });

    document.getElementById('nav-next').addEventListener('click', () => {
      if (this.currentLevel < LEVELS.length - 1) this._navigateTo(this.currentLevel + 1);
    });

    // Ctrl+Enter or Cmd+Enter advances to next level when level is complete
    document.addEventListener('keydown', (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && e.key === 'Enter') {
        const panel = document.getElementById('level-complete-panel');
        if (panel.classList.contains('active')) {
          e.preventDefault();
          this.loadLevel(this.currentLevel + 1);
        }
      }
    });
  }

  _showVictory() {
    document.getElementById('victory-overlay').style.display = 'flex';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// ── Handle ANSI in terminal output ──────────────────────────────────────────

// Patch TerminalManager to handle real ANSI escape codes from simulator
const origPrint = TerminalManager.prototype.print;
TerminalManager.prototype.print = function(text, type) {
  if (text === '__CLEAR__') { this.clear(); return; }
  const lines = String(text).split('\n');
  for (const line of lines) {
    const div = document.createElement('div');
    div.className = `term-line ${type}`;
    div.innerHTML = ansiToHtml(line);
    this.output.appendChild(div);
  }
  this._scroll();
};

function ansiToHtml(raw) {
  const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Process ANSI color codes
  let result = '';
  let i = 0;
  let openSpan = false;

  while (i < raw.length) {
    if (raw[i] === '\x1b' && raw[i+1] === '[') {
      // find end of code
      let j = i + 2;
      while (j < raw.length && raw[j] !== 'm') j++;
      const code = raw.slice(i+2, j);
      i = j + 1;

      if (openSpan) { result += '</span>'; openSpan = false; }

      if (code === '0' || code === '') continue;

      const colorMap = {
        '30': '#4a5568', '31': '#f85149', '32': '#3fb950', '33': '#d29922',
        '34': '#58a6ff', '35': '#bc8cff', '36': '#39c5cf', '37': '#c9d1d9',
        '90': '#6e7681', '91': '#ff7b72', '92': '#56d364', '93': '#e3b341',
        '94': '#79c0ff', '95': '#d2a8ff', '96': '#56d8e4', '97': '#f0f6fc',
      };
      const color = colorMap[code];
      if (color) { result += `<span style="color:${color}">`; openSpan = true; }
    } else {
      result += esc(raw[i]);
      i++;
    }
  }
  if (openSpan) result += '</span>';
  return result;
}

// ── Boot ─────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  window.game = new GameManager();
});
