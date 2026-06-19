// TerminalManager — handles terminal UI, input, history, output

class TerminalManager {
  constructor(outputEl, inputEl, promptEl, onCommand) {
    this.output   = outputEl;
    this.input    = inputEl;
    this.prompt   = promptEl;
    this.onCmd    = onCommand;

    this.history    = [];
    this.historyIdx = -1;
    this.currentDraft = '';

    this._bindEvents();
    this.print('Bem-vindo ao <span style="color:#58a6ff;font-weight:bold">Git Café</span>! Terminal pronto.', 'info');
    this.print('Digite <code style="color:#ffa657">help</code> para ver os comandos disponíveis.', 'dim');
    this.print('', 'out');
  }

  _bindEvents() {
    this.input.addEventListener('keydown', (e) => this._onKeyDown(e));
    this.input.addEventListener('keyup',   () => { this.historyIdx = -1; });
    // clicking anywhere in terminal focuses input
    document.getElementById('terminal-panel').addEventListener('click', () => this.input.focus());
    document.getElementById('clear-btn').addEventListener('click', () => this.clear());
    // auto-focus
    this.input.focus();
  }

  _onKeyDown(e) {
    if (e.key === 'Enter') {
      const cmd = this.input.value.trim();
      this.input.value = '';
      this.historyIdx = -1;
      this.currentDraft = '';
      if (!cmd) return;
      this.history.unshift(cmd);
      if (this.history.length > 100) this.history.pop();
      this._printCommand(cmd);
      this.onCmd(cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.historyIdx === -1) this.currentDraft = this.input.value;
      if (this.historyIdx < this.history.length - 1) {
        this.historyIdx++;
        this.input.value = this.history[this.historyIdx];
        // move cursor to end
        setTimeout(() => this.input.setSelectionRange(this.input.value.length, this.input.value.length), 0);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIdx > 0) {
        this.historyIdx--;
        this.input.value = this.history[this.historyIdx];
      } else if (this.historyIdx === 0) {
        this.historyIdx = -1;
        this.input.value = this.currentDraft;
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this._autocomplete();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      this.clear();
    }
  }

  _autocomplete() {
    const val = this.input.value;
    const completions = [
      'git init', 'git status', 'git add ', 'git add .', 'git commit -m ""',
      'git log', 'git log --oneline', 'git log --oneline --graph',
      'git branch', 'git branch ', 'git switch ', 'git switch -c ',
      'git checkout ', 'git checkout -b ',
      'git merge ', 'git diff', 'git diff --staged',
      'git restore ', 'git restore --staged ',
      'git reset', 'git reset --hard', 'git reset --soft',
      'git revert ', 'git stash', 'git stash pop', 'git stash list',
      'git tag ', 'git help',
      'ls', 'ls -la', 'cat ', 'touch ', 'rm ', 'echo ',
      'clear', 'pwd', 'help',
    ];
    const matches = completions.filter(c => c.startsWith(val) && c !== val);
    if (matches.length === 1) {
      this.input.value = matches[0];
    } else if (matches.length > 1) {
      this.print(matches.join('  '), 'dim');
    }
  }

  _printCommand(cmd) {
    const promptText = this.prompt.textContent;
    const line = document.createElement('div');
    line.className = 'term-line cmd';
    line.innerHTML = `<span class="term-prompt-display">${this._escHtml(promptText)}</span><span>${this._escHtml(cmd)}</span>`;
    this.output.appendChild(line);
    this._scroll();
  }

  print(text, type = 'out') {
    if (text === '__CLEAR__') { this.clear(); return; }

    // Handle ANSI-like escape codes (simplified)
    const lines = text.split('\n');
    for (const rawLine of lines) {
      const div = document.createElement('div');
      div.className = `term-line ${type}`;
      div.innerHTML = this._formatLine(rawLine);
      this.output.appendChild(div);
    }
    this._scroll();
  }

  _formatLine(text) {
    // Convert simplified \x1b[Xm color codes to spans
    let html = this._escHtml(text);
    // \x1b[32m = green, \x1b[31m = red, \x1b[33m = yellow, \x1b[34m = blue
    // We'll handle the escaped versions
    html = html
      .replace(/\\x1b\[32m(.*?)\\x1b\[0m/g, '<span style="color:#3fb950">$1</span>')
      .replace(/\\x1b\[31m(.*?)\\x1b\[0m/g, '<span style="color:#f85149">$1</span>')
      .replace(/\\x1b\[33m(.*?)\\x1b\[0m/g, '<span style="color:#d29922">$1</span>')
      .replace(/\\x1b\[34m(.*?)\\x1b\[0m/g, '<span style="color:#58a6ff">$1</span>');

    // Handle actual escape sequences if they survived
    html = html
      .replace(/\[32m([\s\S]*?)\[0m/g, '<span style="color:#3fb950">$1</span>')
      .replace(/\[31m([\s\S]*?)\[0m/g, '<span style="color:#f85149">$1</span>')
      .replace(/\[33m([\s\S]*?)\[0m/g, '<span style="color:#d29922">$1</span>')
      .replace(/\[34m([\s\S]*?)\[0m/g, '<span style="color:#58a6ff">$1</span>')
      .replace(/\[0m/g, '</span>');

    return html;
  }

  _escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  updatePrompt(sim) {
    const branch = sim.initialized
      ? (sim.headDetached
          ? `(HEAD desanexado em ${sim._short(sim.HEAD)})`
          : `(${sim.HEAD})`)
      : '';
    this.prompt.innerHTML = branch
      ? `<span style="color:#3fb950">~/repo</span> <span style="color:#58a6ff">${branch}</span><span style="color:#3fb950"> $ </span>`
      : `<span style="color:#3fb950">~/repo $ </span>`;
  }

  clear() {
    this.output.innerHTML = '';
  }

  _scroll() {
    this.output.scrollTop = this.output.scrollHeight;
  }

  focus() { this.input.focus(); }
}
