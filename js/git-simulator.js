// GitSimulator — virtual git state machine for the game

class GitSimulator {
  constructor() {
    this.reset();
  }

  reset() {
    this.initialized   = false;
    this.workingTree   = {};  // {path: content}
    this.index         = {};  // staging area {path: content | '__DELETED__'}
    this.commits       = [];  // [{hash, shortHash, message, parents, tree, timestamp, author}]
    this.branches      = {};  // {name: hash | null}
    this.HEAD          = 'main';
    this.headDetached  = false;
    this.tags          = {};  // {name: hash}
    this.stash         = [];
    this.mergeState    = null; // {branch, parent, hasConflict, conflictFiles}
    this.remotes       = {};  // {name: {url, refs, commits}}
    this.user          = { name: 'Jogador', email: 'jogador@gitquest.com' };
    this._hashCounter  = 0;
    this._history      = [];  // command history
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  _hash() {
    const h = 'abcdef0123456789';
    let s = '';
    for (let i = 0; i < 40; i++) s += h[Math.floor(Math.random() * 16)];
    // make it deterministic-ish for reproducibility
    this._hashCounter++;
    return s;
  }

  _short(hash) { return hash ? hash.slice(0, 7) : null; }

  _resolveRef(ref) {
    if (!ref || ref === 'HEAD') {
      if (this.headDetached) return this.HEAD;
      return this.branches[this.HEAD] || null;
    }
    // HEAD~N and HEAD^N
    const tildeMatch = ref.match(/^(.+?)~(\d+)$/);
    if (tildeMatch) {
      let hash = this._resolveRef(tildeMatch[1]);
      const n = parseInt(tildeMatch[2], 10);
      for (let i = 0; i < n && hash; i++) {
        const c = this.commits.find(x => x.hash === hash);
        hash = c?.parents[0] || null;
      }
      return hash;
    }
    const caretMatch = ref.match(/^(.+?)\^(\d*)$/);
    if (caretMatch) {
      let hash = this._resolveRef(caretMatch[1]);
      const n = caretMatch[2] ? parseInt(caretMatch[2], 10) : 1;
      const c = this.commits.find(x => x.hash === hash);
      return c?.parents[n - 1] || null;
    }
    if (this.branches[ref] !== undefined) return this.branches[ref];
    if (this.tags[ref]) return this.tags[ref];
    const found = this.commits.find(c => c.hash.startsWith(ref));
    return found ? found.hash : null;
  }

  _getCommit(hashOrRef) {
    const hash = this._resolveRef(hashOrRef);
    if (!hash) return null;
    return this.commits.find(c => c.hash === hash) || null;
  }

  _currentHash() {
    if (this.headDetached) return this.HEAD;
    return this.branches[this.HEAD] || null;
  }

  _currentBranch() {
    return this.headDetached ? null : this.HEAD;
  }

  _headTree() {
    const h = this._currentHash();
    if (!h) return {};
    const c = this.commits.find(c => c.hash === h);
    return c ? { ...c.tree } : {};
  }

  // Status: what's staged vs unstaged vs untracked
  getStatus() {
    const headTree = this._headTree();
    const staged   = [];
    const unstaged = [];
    const untracked= [];

    // staged = diff between index and headTree
    const allPaths = new Set([...Object.keys(this.index), ...Object.keys(headTree)]);
    for (const path of allPaths) {
      const idxVal  = this.index[path];
      const headVal = headTree[path];
      if (idxVal === '__DELETED__') {
        if (headVal !== undefined) staged.push({ path, status: 'deleted' });
      } else if (idxVal !== undefined && headVal === undefined) {
        staged.push({ path, status: 'new file' });
      } else if (idxVal !== undefined && idxVal !== headVal) {
        staged.push({ path, status: 'modified' });
      }
    }

    // unstaged = diff between workingTree and index (or headTree for tracked files)
    const effective = { ...headTree };
    for (const [p, v] of Object.entries(this.index)) {
      if (v === '__DELETED__') delete effective[p];
      else effective[p] = v;
    }

    const wtPaths = new Set([...Object.keys(this.workingTree), ...Object.keys(effective)]);
    for (const path of wtPaths) {
      const wtVal  = this.workingTree[path];
      const effVal = effective[path];
      if (wtVal !== undefined && effVal === undefined) {
        untracked.push(path);
      } else if (wtVal === undefined && effVal !== undefined) {
        unstaged.push({ path, status: 'deleted' });
      } else if (wtVal !== effVal) {
        unstaged.push({ path, status: 'modified' });
      }
    }

    return { staged, unstaged, untracked };
  }

  // ─── Shell commands ────────────────────────────────────────────────────────

  _cmdLs(args) {
    const files = Object.keys(this.workingTree).sort();
    if (files.length === 0) return this._ok('');
    const flag_la = args.includes('-la') || args.includes('-al') || (args.includes('-l') && args.includes('-a'));
    if (flag_la) {
      const lines = ['total ' + files.length];
      for (const f of files) {
        const content = this.workingTree[f] || '';
        const size = content.length;
        lines.push(`-rw-r--r--  1 jogador  staff  ${String(size).padStart(6)}  ${f}`);
      }
      return this._ok(lines.join('\n'));
    }
    return this._ok(files.join('  '));
  }

  _cmdCat(args) {
    if (!args[0]) return this._err('cat: faltando argumento');
    const path = args[0];
    if (this.workingTree[path] === undefined) return this._err(`cat: ${path}: Arquivo não encontrado`);
    return this._ok(this.workingTree[path]);
  }

  _cmdTouch(args) {
    if (!args[0]) return this._err('touch: faltando argumento');
    for (const f of args) {
      if (this.workingTree[f] === undefined) this.workingTree[f] = '';
    }
    return this._ok('');
  }

  _cmdEcho(raw) {
    // Handle: echo "content" > file   echo "content" >> file   echo content
    const redir = raw.indexOf('>');
    if (redir !== -1) {
      const append = raw[redir + 1] === '>';
      const fileStart = append ? redir + 2 : redir + 1;
      const filePart = raw.slice(fileStart).trim();
      const contentPart = raw.slice(0, redir).trim();
      // strip leading 'echo '
      let content = contentPart.replace(/^echo\s+/i, '').replace(/^["']|["']$/g, '');
      const filename = filePart.replace(/^["']|["']$/g, '');
      if (append && this.workingTree[filename] !== undefined) {
        this.workingTree[filename] += '\n' + content;
      } else {
        this.workingTree[filename] = content;
      }
      return this._ok('');
    }
    // plain echo
    const msg = raw.replace(/^echo\s+/i, '').replace(/^["']|["']$/g, '');
    return this._ok(msg);
  }

  _cmdRm(args) {
    if (!args[0]) return this._err('rm: faltando argumento');
    const path = args.filter(a => !a.startsWith('-'))[0];
    if (!path) return this._err('rm: faltando argumento');
    if (this.workingTree[path] === undefined) return this._err(`rm: ${path}: Arquivo não encontrado`);
    delete this.workingTree[path];
    return this._ok('');
  }

  _cmdMv(args) {
    if (args.length < 2) return this._err('mv: faltando argumento');
    const [src, dst] = args;
    if (this.workingTree[src] === undefined) return this._err(`mv: ${src}: Arquivo não encontrado`);
    this.workingTree[dst] = this.workingTree[src];
    delete this.workingTree[src];
    return this._ok('');
  }

  _cmdCp(args) {
    if (args.length < 2) return this._err('cp: faltando argumento');
    const [src, dst] = args;
    if (this.workingTree[src] === undefined) return this._err(`cp: ${src}: Arquivo não encontrado`);
    this.workingTree[dst] = this.workingTree[src];
    return this._ok('');
  }

  // ─── Git commands ──────────────────────────────────────────────────────────

  _gitInit() {
    if (this.initialized) return this._warn('Repositório Git já inicializado em /home/jogador/repo/.git/');
    this.initialized = true;
    this.branches = { main: null };
    this.HEAD = 'main';
    this.index = {};
    return this._ok('Repositório Git vazio inicializado em /home/jogador/repo/.git/', true);
  }

  _gitStatus() {
    if (!this.initialized) return this._err('fatal: não é um repositório git (ou qualquer diretório pai)');
    const { staged, unstaged, untracked } = this.getStatus();
    const lines = [];
    const branch = this._currentBranch();

    if (this.mergeState) {
      lines.push('No meio de um merge; todos os conflitos devem ser resolvidos.');
      lines.push('  (use "git merge --abort" para cancelar o merge)');
      lines.push('');
    }

    if (branch) {
      const hash = this.branches[branch];
      if (!hash) {
        lines.push(`No ramo ${branch}`);
        lines.push('');
        lines.push('No commits yet');
      } else {
        lines.push(`No ramo ${branch}`);
      }
    } else {
      lines.push(`HEAD desanexado em ${this._short(this.HEAD)}`);
    }
    lines.push('');

    if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
      lines.push('nada a submeter, árvore de trabalho limpa');
      return this._ok(lines.join('\n'));
    }

    if (staged.length > 0) {
      lines.push('Mudanças a serem submetidas:');
      lines.push('  (use "git restore --staged <arquivo>..." para retirar da área de stage)');
      for (const f of staged) {
        lines.push(`\t\x1b[32m${f.status}:\t${f.path}\x1b[0m`);
      }
      lines.push('');
    }

    if (unstaged.length > 0) {
      lines.push('Mudanças não preparadas para commit:');
      lines.push('  (use "git add <arquivo>..." para atualizar o que será submetido)');
      lines.push('  (use "git restore <arquivo>..." para descartar mudanças no diretório de trabalho)');
      for (const f of unstaged) {
        lines.push(`\t\x1b[31m${f.status}:\t${f.path}\x1b[0m`);
      }
      lines.push('');
    }

    const visibleUntracked = untracked.filter(f => !this._isIgnored(f));
    if (visibleUntracked.length > 0) {
      lines.push('Arquivos não rastreados:');
      lines.push('  (use "git add <arquivo>..." para incluir no que será submetido)');
      for (const f of visibleUntracked) {
        lines.push(`\t\x1b[31m${f}\x1b[0m`);
      }
      lines.push('');
    }

    return this._ok(lines.join('\n'));
  }

  _gitAdd(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    if (!args[0]) return this._err('Nada especificado, nada adicionado.');

    const headTree = this._headTree();
    const paths = args[0] === '.' || args[0] === '-A'
      ? Object.keys(this.workingTree)
      : args.filter(a => !a.startsWith('-'));

    if (args[0] === '.' || args[0] === '-A') {
      // also stage deletes for tracked files no longer in workingTree
      const effective = { ...headTree, ...this.index };
      for (const p of Object.keys(effective)) {
        if (effective[p] !== '__DELETED__' && this.workingTree[p] === undefined) {
          this.index[p] = '__DELETED__';
        }
      }
    }

    for (const path of paths) {
      if (this.workingTree[path] === undefined) {
        // maybe staging a delete
        if (headTree[path] !== undefined) {
          this.index[path] = '__DELETED__';
        } else {
          return this._err(`fatal: pathspec '${path}' não correspondeu a nenhum arquivo`);
        }
      } else {
        this.index[path] = this.workingTree[path];
      }
    }

    return this._ok('', true);
  }

  _gitCommit(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');

    // parse -m "message"
    let message = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-m') { message = args[i + 1]; break; }
      if (args[i].startsWith('-m')) { message = args[i].slice(2); break; }
    }

    if (!message) {
      return this._err('error: opção -m requerida\nUso: git commit -m "sua mensagem"');
    }

    if (this.mergeState && this.mergeState.hasConflict) {
      const stillConflicted = this.mergeState.conflictFiles.filter(f => {
        const v = this.index[f];
        return v === undefined || v.includes('<<<<<<<');
      });
      if (stillConflicted.length > 0) {
        return this._err(`error: não é possível commitar com conflitos.\nResolva os conflitos em: ${stillConflicted.join(', ')}\nApós editar, use: git add <arquivo>`);
      }
      const resolved = { ...this._headTree() };
      for (const [p, v] of Object.entries(this.index)) {
        if (v === '__DELETED__') delete resolved[p];
        else resolved[p] = v;
      }
      this.mergeState.hasConflict = false;
      this.mergeState.mergedTree = resolved;
    }

    if (this.mergeState && !this.mergeState.hasConflict) {
      return this._commitMerge(message);
    }

    const { staged } = this.getStatus();
    if (staged.length === 0 && !this.mergeState) {
      return this._err('nada a submeter, árvore de trabalho limpa');
    }

    const parentHash = this._currentHash();
    const parents = parentHash ? [parentHash] : [];
    const tree = { ...this._headTree() };

    // apply index to tree
    for (const [p, v] of Object.entries(this.index)) {
      if (v === '__DELETED__') delete tree[p];
      else tree[p] = v;
    }

    const hash = this._hash();
    const commit = {
      hash,
      shortHash: this._short(hash),
      message,
      parents,
      tree,
      timestamp: Date.now(),
      author: { ...this.user },
      branch: this._currentBranch(),
    };

    this.commits.push(commit);

    if (!this.headDetached) {
      this.branches[this.HEAD] = hash;
    } else {
      this.HEAD = hash;
    }

    // Reset index to match new tree
    this.index = { ...tree };

    return this._ok(`[${this._currentBranch() || this._short(hash)} ${this._short(hash)}] ${message}\n ${staged.length} arquivo(s) alterado(s)`, true);
  }

  _commitMerge(message) {
    const ms = this.mergeState;
    const parentHash = this._currentHash();
    const parents = [parentHash, ms.parent];
    const tree = { ...ms.mergedTree };

    const hash = this._hash();
    const commit = {
      hash,
      shortHash: this._short(hash),
      message,
      parents,
      tree,
      timestamp: Date.now(),
      author: { ...this.user },
      branch: this._currentBranch(),
      mergeCommit: true,
    };

    this.commits.push(commit);
    this.branches[this.HEAD] = hash;
    this.index = { ...tree };
    this.workingTree = { ...tree };
    this.mergeState = null;

    return this._ok(`[${this._currentBranch()} ${this._short(hash)}] ${message}\nMerge completo.`, true);
  }

  _gitLog(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const hash = this._currentHash();
    if (!hash) return this._ok('No ramo atual não há commits ainda.');

    const oneline  = args.includes('--oneline');
    const all      = args.includes('--all');
    const follow   = args.includes('--follow');
    const patch    = args.includes('-p') || args.includes('--patch');
    const fileArg  = args.filter(a => !a.startsWith('-'))[0];

    const visited = new Set();
    const queue   = [];
    if (all) {
      for (const h of Object.values(this.branches)) { if (h) queue.push(h); }
    } else {
      queue.push(hash);
    }

    const ordered = [];
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || visited.has(cur)) continue;
      visited.add(cur);
      const c = this.commits.find(x => x.hash === cur);
      if (!c) continue;
      if (!fileArg || fileArg in c.tree || c.parents.some(p => {
        const pt = this.commits.find(x => x.hash === p)?.tree || {};
        return c.tree[fileArg] !== pt[fileArg];
      })) {
        ordered.push(c);
      }
      for (const p of (c.parents || [])) queue.push(p);
    }
    ordered.sort((a, b) => b.timestamp - a.timestamp);

    const lines = [];
    const branchMap = {};
    for (const [name, h] of Object.entries(this.branches)) {
      if (!branchMap[h]) branchMap[h] = [];
      branchMap[h].push(name);
    }

    for (const c of ordered) {
      const refs = [];
      if (branchMap[c.hash]) refs.push(...branchMap[c.hash].map(n => `ramo: ${n}`));
      if (c.hash === this._currentHash() && !this.headDetached) refs.unshift('HEAD');
      const refStr = refs.length ? ` \x1b[34m(${refs.join(', ')})\x1b[0m` : '';

      if (oneline) {
        lines.push(`\x1b[33m${c.shortHash}\x1b[0m${refStr} ${c.message}`);
      } else {
        lines.push(`\x1b[33mcommit ${c.hash}${refStr}\x1b[0m`);
        if (c.mergeCommit) lines.push(`Merge: ${c.parents.map(p => this._short(p)).join(' ')}`);
        lines.push(`Autor: ${c.author.name} <${c.author.email}>`);
        lines.push(`Data:  ${new Date(c.timestamp).toLocaleString('pt-BR')}`);
        lines.push('');
        lines.push(`    ${c.message}`);
        lines.push('');
        if (patch) {
          const pt = c.parents[0] ? (this.commits.find(x => x.hash === c.parents[0])?.tree || {}) : {};
          const paths = new Set([...Object.keys(c.tree), ...Object.keys(pt)]);
          for (const p of paths) {
            if (c.tree[p] === pt[p]) continue;
            lines.push(`\x1b[33mdiff --git a/${p} b/${p}\x1b[0m`);
            for (const l of (pt[p] || '').split('\n')) lines.push(`\x1b[31m-${l}\x1b[0m`);
            for (const l of (c.tree[p] || '').split('\n')) lines.push(`\x1b[32m+${l}\x1b[0m`);
          }
          lines.push('');
        }
      }
    }

    return this._ok(lines.join('\n'));
  }

  _gitBranch(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');

    const deleteFlag = args.includes('-d') || args.includes('-D');
    const verboseFlag = args.includes('-v') || args.includes('-vv');
    const listAll = args.includes('-a');

    const names = args.filter(a => !a.startsWith('-'));
    const newName = names[0];

    if (deleteFlag) {
      if (!newName) return this._err('error: ramo não especificado para deletar');
      if (newName === this.HEAD) return this._err(`error: não é possível deletar o ramo atual '${newName}'`);
      if (!this.branches[newName]) return this._err(`error: ramo '${newName}' não encontrado`);
      delete this.branches[newName];
      return this._ok(`Ramo ${newName} deletado.`, true);
    }

    if (newName) {
      // create branch at current HEAD
      if (this.branches[newName] !== undefined) return this._err(`fatal: O ramo '${newName}' já existe.`);
      this.branches[newName] = this._currentHash();
      return this._ok(``, true);
    }

    // list branches
    const current = this._currentBranch();
    const lines = [];
    for (const [name, h] of Object.entries(this.branches)) {
      const isCurrent = name === current;
      const star = isCurrent ? '* ' : '  ';
      const color = isCurrent ? '\x1b[32m' : '';
      const reset = isCurrent ? '\x1b[0m' : '';
      const shortH = h ? ` ${this._short(h)}` : ' (sem commits)';
      const msg = h ? (this.commits.find(c => c.hash === h)?.message || '') : '';
      lines.push(`${color}${star}${name}${shortH} ${msg}${reset}`);
    }
    return this._ok(lines.join('\n'));
  }

  _gitSwitch(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const createFlag = args.includes('-c') || args.includes('--create');
    const names = args.filter(a => !a.startsWith('-'));
    const target = names[0];

    if (!target) return this._err('error: nome do ramo não informado');

    if (createFlag) {
      if (this.branches[target] !== undefined) return this._err(`fatal: O ramo '${target}' já existe.`);
      this.branches[target] = this._currentHash();
      this.HEAD = target;
      this.headDetached = false;
      this._syncIndexToHead();
      return this._ok(`Trocado para o novo ramo '${target}'`, true);
    }

    if (this.branches[target] === undefined) {
      return this._err(`error: pathspec '${target}' não correspondeu a nenhum ramo`);
    }

    this.HEAD = target;
    this.headDetached = false;
    this._syncIndexToHead();
    this.workingTree = { ...this._headTree() };
    return this._ok(`Trocado para o ramo '${target}'`, true);
  }

  _gitCheckout(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const createFlag = args.includes('-b');
    const names = args.filter(a => !a.startsWith('-'));
    const target = names[0];

    if (!target) return this._err('error: destino não informado');

    if (createFlag) {
      if (this.branches[target] !== undefined) return this._err(`fatal: O ramo '${target}' já existe.`);
      this.branches[target] = this._currentHash();
      this.HEAD = target;
      this.headDetached = false;
      this._syncIndexToHead();
      return this._ok(`Trocado para o novo ramo '${target}'`, true);
    }

    // switch to branch
    if (this.branches[target] !== undefined) {
      this.HEAD = target;
      this.headDetached = false;
      this._syncIndexToHead();
      this.workingTree = { ...this._headTree() };
      return this._ok(`Trocado para o ramo '${target}'`, true);
    }

    // detach HEAD to commit hash?
    const hash = this._resolveRef(target);
    if (hash) {
      this.HEAD = hash;
      this.headDetached = true;
      this._syncIndexToHead();
      this.workingTree = { ...this._headTree() };
      return this._ok(`HEAD desanexado em ${this._short(hash)}`, true);
    }

    return this._err(`error: pathspec '${target}' não correspondeu a nenhum arquivo ou ramo`);
  }

  _syncIndexToHead() {
    this.index = { ...this._headTree() };
  }

  _gitMerge(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');

    if (args.includes('--abort')) {
      if (!this.mergeState) return this._err('fatal: não há merge em andamento');
      this.mergeState = null;
      this._syncIndexToHead();
      this.workingTree = { ...this._headTree() };
      return this._ok('Merge abortado.', true);
    }

    const branchName = args.filter(a => !a.startsWith('-'))[0];
    if (!branchName) return this._err('error: nome do ramo não informado');
    if (this.branches[branchName] === undefined) return this._err(`merge: ${branchName} - não é algo que pode ser mergeado`);

    const theirHash = this.branches[branchName];
    const ourHash   = this._currentHash();

    if (!ourHash) return this._err('fatal: nenhum commit no ramo atual');
    if (!theirHash) return this._err(`fatal: o ramo '${branchName}' não tem commits`);
    if (theirHash === ourHash) return this._ok('Já atualizado.');

    // Check if already merged (their ancestor is us)
    if (this._isAncestor(ourHash, theirHash)) {
      // fast-forward
      this.branches[this.HEAD] = theirHash;
      this._syncIndexToHead();
      this.workingTree = { ...this._headTree() };
      return this._ok(`Fast-forward\nAtualizado ${this._short(ourHash)}..${this._short(theirHash)}`, true);
    }

    if (this._isAncestor(theirHash, ourHash)) {
      return this._ok('Já atualizado.');
    }

    // 3-way merge
    const baseHash = this._findCommonAncestor(ourHash, theirHash);
    const baseTree  = baseHash ? (this.commits.find(c => c.hash === baseHash)?.tree || {}) : {};
    const ourTree   = this.commits.find(c => c.hash === ourHash)?.tree || {};
    const theirTree = this.commits.find(c => c.hash === theirHash)?.tree || {};

    const merged = {};
    const conflicts = [];
    const allPaths = new Set([...Object.keys(ourTree), ...Object.keys(theirTree), ...Object.keys(baseTree)]);

    for (const p of allPaths) {
      const base  = baseTree[p];
      const ours  = ourTree[p];
      const theirs = theirTree[p];

      if (ours === theirs) { if (ours) merged[p] = ours; continue; }
      if (ours === base)   { if (theirs) merged[p] = theirs; continue; }
      if (theirs === base) { if (ours) merged[p] = ours; continue; }

      // conflict
      merged[p] = `<<<<<<< HEAD\n${ours || ''}\n=======\n${theirs || ''}\n>>>>>>> ${branchName}`;
      conflicts.push(p);
    }

    if (conflicts.length > 0) {
      this.mergeState = { branch: branchName, parent: theirHash, hasConflict: true, conflictFiles: conflicts, mergedTree: merged };
      this.workingTree = { ...merged };
      this.index = { ...ourTree };
      const lines = [
        `Merge automático de ${conflicts.join(', ')} falhou; corrija os conflitos e então realize o commit do resultado.`,
        `CONFLICT (content): conflito de Merge em ${conflicts.join(', ')}`,
        `Merge automático falhou; corrija os conflitos e então realize o commit do resultado.`
      ];
      return this._ok(lines.join('\n'), true);
    }

    // clean merge — set up mergeState for user to commit
    this.mergeState = { branch: branchName, parent: theirHash, hasConflict: false, mergedTree: merged };
    this.workingTree = { ...merged };
    this.index = { ...merged };
    return this._ok(`Merge realizado pela estratégia 'ort'.\nUse 'git commit -m "Merge branch ${branchName}"' para finalizar o merge.`, true);
  }

  _isAncestor(ancestorHash, descendantHash) {
    // BFS
    const visited = new Set();
    const queue = [descendantHash];
    while (queue.length) {
      const cur = queue.shift();
      if (!cur || visited.has(cur)) continue;
      if (cur === ancestorHash) return true;
      visited.add(cur);
      const c = this.commits.find(x => x.hash === cur);
      if (c) for (const p of c.parents) queue.push(p);
    }
    return false;
  }

  _isIgnored(path) {
    const raw = this.workingTree['.gitignore'] || '';
    for (const line of raw.split('\n')) {
      const pat = line.trim();
      if (!pat || pat.startsWith('#')) continue;
      if (this._matchGlob(pat, path)) return true;
    }
    return false;
  }

  _matchGlob(pattern, path) {
    const re = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`(^|/)${re}$`).test(path);
  }

  _findCommonAncestor(a, b) {
    const aAncs = new Set();
    const q = [a];
    while (q.length) {
      const cur = q.shift();
      if (!cur || aAncs.has(cur)) continue;
      aAncs.add(cur);
      const c = this.commits.find(x => x.hash === cur);
      if (c) for (const p of c.parents) q.push(p);
    }
    const q2 = [b];
    const vis = new Set();
    while (q2.length) {
      const cur = q2.shift();
      if (!cur || vis.has(cur)) continue;
      if (aAncs.has(cur)) return cur;
      vis.add(cur);
      const c = this.commits.find(x => x.hash === cur);
      if (c) for (const p of c.parents) q2.push(p);
    }
    return null;
  }

  _gitDiff(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');

    // branch...branch or branch..branch
    const refArg = args.find(a => !a.startsWith('-') && (a.includes('...') || a.includes('..')));
    if (refArg) {
      const threeDot = refArg.includes('...');
      const [r1, r2] = refArg.split(threeDot ? '...' : '..');
      const h1 = this._resolveRef(r1 || 'HEAD');
      const h2 = this._resolveRef(r2 || 'HEAD');
      const base = threeDot ? this._findCommonAncestor(h1, h2) : h1;
      const tree1 = (base ? this.commits.find(c => c.hash === base) : null)?.tree || {};
      const tree2 = this.commits.find(c => c.hash === h2)?.tree || {};
      return this._ok(this._diffTrees(tree1, tree2));
    }

    const staged = args.includes('--staged') || args.includes('--cached');
    const { staged: stagedList, unstaged: unstagedList } = this.getStatus();
    const list = staged ? stagedList : unstagedList;

    if (list.length === 0) return this._ok(staged ? '(sem mudanças na área de stage)' : '(sem mudanças no diretório de trabalho)');

    const headTree = this._headTree();
    const lines = [];
    for (const item of list) {
      const before = staged ? (headTree[item.path] || '') : (this.index[item.path] || headTree[item.path] || '');
      const after  = staged ? (this.index[item.path] || '') : (this.workingTree[item.path] || '');
      lines.push(this._diffTrees({ [item.path]: before }, { [item.path]: after }));
    }
    return this._ok(lines.join('\n'));
  }

  _diffTrees(treeA, treeB) {
    const lines = [];
    const paths = new Set([...Object.keys(treeA), ...Object.keys(treeB)]);
    for (const p of paths) {
      const a = treeA[p]; const b = treeB[p];
      if (a === b) continue;
      lines.push(`\x1b[33mdiff --git a/${p} b/${p}\x1b[0m`);
      lines.push(`--- ${a !== undefined ? 'a/' + p : '/dev/null'}`);
      lines.push(`+++ ${b !== undefined ? 'b/' + p : '/dev/null'}`);
      for (const l of (a || '').split('\n')) lines.push(`\x1b[31m-${l}\x1b[0m`);
      for (const l of (b || '').split('\n')) lines.push(`\x1b[32m+${l}\x1b[0m`);
      lines.push('');
    }
    return lines.join('\n');
  }

  _gitRestore(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const stagedFlag = args.includes('--staged');
    const files = args.filter(a => !a.startsWith('-'));
    if (!files[0]) return this._err('error: arquivo não especificado');

    for (const path of files) {
      if (stagedFlag) {
        const headTree = this._headTree();
        if (headTree[path] !== undefined) this.index[path] = headTree[path];
        else delete this.index[path];
      } else {
        const effective = this.index[path] !== undefined ? this.index[path] : this._headTree()[path];
        if (effective !== undefined) this.workingTree[path] = effective;
        else delete this.workingTree[path];
      }
    }
    return this._ok('', true);
  }

  _gitReset(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const soft  = args.includes('--soft');
    const hard  = args.includes('--hard');
    const mixed = !soft && !hard;
    const targets = args.filter(a => !a.startsWith('-'));

    // Determine if first target is a commit ref or a file path
    const first = targets[0];
    const isCommitRef = !first || first === 'HEAD' || !!this._resolveRef(first);
    const filePaths = isCommitRef ? targets.slice(1) : targets;
    const commitTarget = isCommitRef ? first : undefined;

    // File unstage: git reset [HEAD] <file...>
    if (filePaths.length > 0) {
      const headTree = this._headTree();
      for (const f of filePaths) {
        if (headTree[f] !== undefined) this.index[f] = headTree[f];
        else delete this.index[f];
      }
      return this._ok('', true);
    }

    // No target or HEAD — unstage everything
    if (!commitTarget || commitTarget === 'HEAD') {
      if (mixed || soft) {
        this._syncIndexToHead();
        return this._ok('Resetado.', true);
      }
      return this._ok('');
    }

    // Commit-level reset
    const hash = this._resolveRef(commitTarget);
    if (!hash) return this._err(`fatal: argumento ambíguo '${commitTarget}': revisão desconhecida`);

    const commit = this.commits.find(c => c.hash === hash);
    if (!commit) return this._err(`fatal: commit '${commitTarget}' não encontrado`);

    if (!this.headDetached) this.branches[this.HEAD] = hash;
    else this.HEAD = hash;

    if (!soft)  this.index = { ...commit.tree };
    if (hard)   this.workingTree = { ...commit.tree };

    return this._ok(`HEAD agora em ${this._short(hash)} ${commit.message}`, true);
  }

  _gitRevert(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const target = args.filter(a => !a.startsWith('-'))[0];
    if (!target) return this._err('error: nenhum commit especificado');

    const hash = this._resolveRef(target);
    if (!hash) return this._err(`fatal: commit '${target}' não encontrado`);

    const commit = this.commits.find(c => c.hash === hash);
    if (!commit) return this._err(`fatal: commit não encontrado`);

    const parentHash = commit.parents[0];
    const parentTree = parentHash ? (this.commits.find(c => c.hash === parentHash)?.tree || {}) : {};
    const currentTree = this._headTree();
    const merged = { ...currentTree };

    // revert changes introduced by this commit
    for (const [path, content] of Object.entries(commit.tree)) {
      if (parentTree[path] !== undefined) merged[path] = parentTree[path];
      else delete merged[path];
    }
    for (const path of Object.keys(parentTree)) {
      merged[path] = parentTree[path];
    }

    const newHash = this._hash();
    const newCommit = {
      hash: newHash,
      shortHash: this._short(newHash),
      message: `Revert "${commit.message}"`,
      parents: [this._currentHash()],
      tree: merged,
      timestamp: Date.now(),
      author: { ...this.user },
      branch: this._currentBranch(),
    };

    this.commits.push(newCommit);
    if (!this.headDetached) this.branches[this.HEAD] = newHash;
    else this.HEAD = newHash;

    this.index = { ...merged };
    this.workingTree = { ...merged };

    return this._ok(`[${this._currentBranch() || this._short(newHash)} ${this._short(newHash)}] Revert "${commit.message}"`, true);
  }

  _gitStash(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const sub = args[0] || 'push';

    if (sub === 'push' || sub === 'save' || !sub.startsWith('pop') && !sub.startsWith('list') && !sub.startsWith('drop')) {
      const { staged, unstaged } = this.getStatus();
      if (staged.length === 0 && unstaged.length === 0) return this._ok('Sem mudanças locais para guardar');
      const entry = {
        message: args[1] || `WIP on ${this._currentBranch()}: ${this._short(this._currentHash())}`,
        workingTree: { ...this.workingTree },
        index: { ...this.index },
      };
      this.stash.unshift(entry);
      // restore to HEAD state
      this.workingTree = { ...this._headTree() };
      this._syncIndexToHead();
      return this._ok(`Saved working directory and index state "${entry.message}"`, true);
    }

    if (sub === 'pop' || sub === 'apply') {
      if (this.stash.length === 0) return this._err('error: nenhum item guardado encontrado');
      const entry = sub === 'pop' ? this.stash.shift() : this.stash[0];
      this.workingTree = { ...entry.workingTree };
      this.index = { ...entry.index };
      return this._ok(`Aplicado "${entry.message}"`, true);
    }

    if (sub === 'list') {
      if (this.stash.length === 0) return this._ok('');
      return this._ok(this.stash.map((e, i) => `stash@{${i}}: ${e.message}`).join('\n'));
    }

    if (sub === 'drop') {
      if (this.stash.length === 0) return this._err('error: nenhum item guardado');
      this.stash.shift();
      return this._ok('Dropped stash@{0}', true);
    }

    return this._err(`git stash: subcomando desconhecido '${sub}'`);
  }

  _gitTag(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    if (!args[0]) {
      // list tags
      return this._ok(Object.keys(this.tags).join('\n'));
    }
    const name = args[0];
    const hash = args[1] ? this._resolveRef(args[1]) : this._currentHash();
    if (!hash) return this._err('error: nenhum commit para marcar');
    this.tags[name] = hash;
    return this._ok('', true);
  }

  _gitConfig(args) {
    const list = args.includes('--list') || args.includes('-l');
    if (list) return this._ok(`user.name=${this.user.name}\nuser.email=${this.user.email}\ncolor.ui=auto`);
    const keys = args.filter(a => !a.startsWith('-'));
    const key = keys[0]; const value = keys[1];
    if (!key) return this._err('uso: git config [--global] <chave> [<valor>]');
    if (!value) {
      if (key === 'user.name')  return this._ok(this.user.name);
      if (key === 'user.email') return this._ok(this.user.email);
      return this._ok('');
    }
    if (key === 'user.name')  { this.user.name  = value; return this._ok(''); }
    if (key === 'user.email') { this.user.email = value; return this._ok(''); }
    if (key === 'color.ui')   return this._ok('');
    if (key.startsWith('alias.')) {
      this.aliases = this.aliases || {};
      this.aliases[key.slice(6)] = value;
      return this._ok('');
    }
    return this._ok('');
  }

  _gitMv(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const files = args.filter(a => !a.startsWith('-'));
    if (files.length < 2) return this._err('uso: git mv <origem> <destino>');
    const [src, dst] = files;
    if (this.workingTree[src] === undefined) return this._err(`fatal: não foi possível mover '${src}': Arquivo não encontrado`);
    this.workingTree[dst] = this.workingTree[src];
    delete this.workingTree[src];
    const ht = this._headTree();
    if (ht[src] !== undefined) this.index[src] = '__DELETED__';
    else delete this.index[src];
    this.index[dst] = this.workingTree[dst];
    return this._ok('', true);
  }

  _gitShow(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const target = args.filter(a => !a.startsWith('-'))[0] || 'HEAD';
    const hash = this._resolveRef(target);
    if (!hash) return this._err(`fatal: argumento ambíguo '${target}': revisão desconhecida`);
    const commit = this.commits.find(c => c.hash === hash);
    if (!commit) return this._err('fatal: commit não encontrado');
    const pt = commit.parents[0] ? (this.commits.find(c => c.hash === commit.parents[0])?.tree || {}) : {};
    const lines = [
      `\x1b[33mcommit ${commit.hash}\x1b[0m`,
      `Autor: ${commit.author.name} <${commit.author.email}>`,
      `Data:  ${new Date(commit.timestamp).toLocaleString('pt-BR')}`,
      '', `    ${commit.message}`, '',
    ];
    lines.push(this._diffTrees(pt, commit.tree));
    return this._ok(lines.join('\n'));
  }

  _gitRemote(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const sub = args[0];
    const verboseFlag = args.includes('-v');
    if (!sub || verboseFlag) {
      if (Object.keys(this.remotes).length === 0) return this._ok('');
      const lines = [];
      for (const [name, r] of Object.entries(this.remotes)) {
        if (verboseFlag) { lines.push(`${name}\t${r.url} (fetch)`); lines.push(`${name}\t${r.url} (push)`); }
        else lines.push(name);
      }
      return this._ok(lines.join('\n'));
    }
    if (sub === 'add') {
      const [, name, url] = args;
      if (!name || !url) return this._err('uso: git remote add <nome> <url>');
      if (this.remotes[name]) return this._err(`erro: remote ${name} já existe.`);
      this.remotes[name] = { url, refs: {}, commits: [] };
      return this._ok('');
    }
    if (sub === 'remove' || sub === 'rm') {
      const name = args[1];
      if (!this.remotes[name]) return this._err(`erro: nenhum remote com o nome '${name}'`);
      delete this.remotes[name]; return this._ok('');
    }
    if (sub === '-v') return this._gitRemote([...args.filter(a => a !== '-v'), '-v']);
    return this._err(`git remote: '${sub}' não é um subcomando do git remote.`);
  }

  _gitPush(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const positional = args.filter(a => !a.startsWith('-'));
    const remoteName = positional[0] || 'origin';
    const branchName = positional[1] || this._currentBranch();
    if (!this.remotes[remoteName]) return this._err(`fatal: '${remoteName}' não parece ser um repositório git`);
    const hash = this.branches[branchName];
    if (!hash) return this._err(`error: src refspec ${branchName} não corresponde a nada`);
    const remote = this.remotes[remoteName];
    const prev = remote.refs[branchName];
    remote.refs[branchName] = hash;
    remote.commits = this.commits.map(c => ({...c}));
    // Simulate a collaborator commit so fetch/pull has something to do
    if (!remote._colAdded) {
      remote._colAdded = true;
      const base = this.commits.find(c => c.hash === hash);
      if (base) {
        const colTree = { ...base.tree, 'COLABORADOR.md': '# Nota do Colaborador\n\nEsta mudança foi feita por outra pessoa!' };
        const colHash = this._hash();
        remote.commits.push({ hash: colHash, shortHash: colHash.slice(0,7), message: 'feat: nota do colaborador', parents: [hash], tree: colTree, timestamp: Date.now() + 1000, author: { name: 'Colaborador', email: 'colega@gitquest.com' }, branch: branchName });
        remote.refs[branchName] = colHash;
      }
    }
    const setUpstream = args.includes('-u') || args.includes('--set-upstream');
    const lines = prev ? [` ${this._short(prev)}..${this._short(hash)}  ${branchName} -> ${branchName}`] : [` * [novo branch]      ${branchName} -> ${branchName}`];
    if (setUpstream) lines.push(`Branch '${branchName}' configurado para rastrear o branch remoto '${branchName}' de '${remoteName}'.`);
    return this._ok(lines.join('\n'), true);
  }

  _gitFetch(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const remoteName = args.filter(a => !a.startsWith('-'))[0] || 'origin';
    const remote = this.remotes[remoteName];
    if (!remote) return this._err(`fatal: '${remoteName}' não parece ser um repositório git`);
    const lines = [`De ${remote.url}`];
    for (const [br, h] of Object.entries(remote.refs)) {
      this.branches[`${remoteName}/${br}`] = h;
      lines.push(` * branch            ${br}     -> FETCH_HEAD`);
    }
    for (const c of (remote.commits || [])) {
      if (!this.commits.find(x => x.hash === c.hash)) this.commits.push({...c});
    }
    return this._ok(lines.join('\n'), true);
  }

  _gitPull(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const remoteName = args.filter(a => !a.startsWith('-'))[0] || 'origin';
    const branchName = args.filter(a => !a.startsWith('-'))[1] || this._currentBranch();
    if (!this.remotes[remoteName]) return this._err(`fatal: '${remoteName}' não parece ser um repositório git`);
    this._gitFetch([remoteName]);
    const remoteHash = this.branches[`${remoteName}/${branchName}`];
    if (!remoteHash) return this._ok('Já atualizado.');
    const ourHash = this._currentHash();
    if (ourHash === remoteHash) return this._ok('Já atualizado.');
    if (this._isAncestor(ourHash, remoteHash)) {
      this.branches[this._currentBranch()] = remoteHash;
      this._syncIndexToHead();
      this.workingTree = { ...this._headTree() };
      return this._ok(`Atualizando ${this._short(ourHash)}..${this._short(remoteHash)}\nFast-forward`, true);
    }
    return this._ok('Já atualizado.');
  }

  _gitLsFiles(args) {
    if (!this.initialized) return this._err('fatal: não é um repositório git');
    const others = args.includes('--others') || args.includes('-o');
    const ignored = args.includes('--ignored') || args.includes('-i');
    const excludeStd = args.includes('--exclude-standard');
    if (others && ignored) {
      return this._ok(Object.keys(this.workingTree).filter(p => this._isIgnored(p)).join('\n'));
    }
    if (others) {
      const tracked = new Set(Object.keys(this._headTree()));
      return this._ok(Object.keys(this.workingTree).filter(p => !tracked.has(p) && (!excludeStd || !this._isIgnored(p))).join('\n'));
    }
    return this._ok(Object.keys(this._headTree()).sort().join('\n'));
  }

  _gitHelp() {
    const text = [
      'Estes são os comandos Git disponíveis no Git Café:',
      '',
      '  git init          Inicializa um repositório',
      '  git status        Mostra o estado dos arquivos',
      '  git add <file>    Adiciona arquivo à área de stage',
      '  git commit -m ""  Registra as mudanças',
      '  git log           Mostra o histórico de commits',
      '  git branch        Lista/cria ramos',
      '  git switch        Muda de ramo',
      '  git checkout      Muda de ramo ou commit',
      '  git merge         Junta ramos',
      '  git diff          Mostra diferenças',
      '  git restore       Descarta mudanças',
      '  git reset         Desfaz commits',
      '  git revert        Cria commit que desfaz outro',
      '  git stash         Guarda mudanças temporariamente',
      '  git tag           Cria etiquetas',
    ];
    return this._ok(text.join('\n'));
  }

  // ─── Result helpers ────────────────────────────────────────────────────────

  _ok(output, graphChanged = false) {
    return { success: true, output, graphChanged };
  }

  _err(output) {
    return { success: false, output, graphChanged: false };
  }

  _warn(output, graphChanged = false) {
    return { success: true, output, graphChanged, isWarn: true };
  }

  // ─── Main execute ──────────────────────────────────────────────────────────

  execute(cmdString) {
    if (!cmdString.trim()) return this._ok('');

    // Handle && chained commands
    if (cmdString.includes(' && ')) {
      const cmds = cmdString.split(' && ');
      let lastResult = this._ok('');
      const allOutputs = [];
      let graphChanged = false;
      for (const sub of cmds) {
        const r = this.execute(sub.trim());
        if (r.output) allOutputs.push(r.output);
        if (r.graphChanged) graphChanged = true;
        lastResult = r;
        if (!r.success) break;
      }
      return { ...lastResult, output: allOutputs.filter(Boolean).join('\n'), graphChanged };
    }

    this._history.push(cmdString);

    // Handle echo specially (raw string needed)
    if (/^echo\s/i.test(cmdString.trim())) {
      return this._cmdEcho(cmdString.trim());
    }

    const parts = this._parse(cmdString.trim());
    if (!parts.length) return this._ok('');

    const [cmd, ...args] = parts;

    switch (cmd) {
      case 'ls':    return this._cmdLs(args);
      case 'cat':   return this._cmdCat(args);
      case 'touch': return this._cmdTouch(args);
      case 'rm':    return this._cmdRm(args);
      case 'mv':    return this._cmdMv(args);
      case 'cp':    return this._cmdCp(args);
      case 'clear': return { success: true, output: '__CLEAR__', graphChanged: false };
      case 'pwd':   return this._ok('/home/jogador/repo');
      case 'cd':    return this._ok('');
      case 'help':  return this._ok('Comandos disponíveis: ls, cat, touch, rm, mv, echo, git, clear, pwd\nDigite "git help" para ajuda do git.');
      case 'git':   return this._execGit(args);
      default:      return this._err(`${cmd}: comando não encontrado\nTente "help" para ver os comandos disponíveis.`);
    }
  }

  _execGit(args) {
    if (!args.length) return this._ok('uso: git <comando> [<args>]\n\nDigite "git help" para mais informações.');
    const [sub, ...rest] = args;
    switch (sub) {
      case 'init':     return this._gitInit();
      case 'status':   return this._gitStatus();
      case 'add':      return this._gitAdd(rest);
      case 'commit':   return this._gitCommit(rest);
      case 'log':      return this._gitLog(rest);
      case 'branch':   return this._gitBranch(rest);
      case 'switch':   return this._gitSwitch(rest);
      case 'checkout': return this._gitCheckout(rest);
      case 'merge':    return this._gitMerge(rest);
      case 'diff':     return this._gitDiff(rest);
      case 'restore':  return this._gitRestore(rest);
      case 'reset':    return this._gitReset(rest);
      case 'revert':   return this._gitRevert(rest);
      case 'stash':    return this._gitStash(rest);
      case 'tag':      return this._gitTag(rest);
      case 'config':   return this._gitConfig(rest);
      case 'mv':       return this._gitMv(rest);
      case 'show':     return this._gitShow(rest);
      case 'remote':   return this._gitRemote(rest);
      case 'push':     return this._gitPush(rest);
      case 'fetch':    return this._gitFetch(rest);
      case 'pull':     return this._gitPull(rest);
      case 'ls-files': return this._gitLsFiles(rest);
      case 'help':     return this._gitHelp();
      default:         return this._err(`git: '${sub}' não é um comando git. Veja 'git help'.`);
    }
  }

  _parse(cmd) {
    const parts = [];
    let cur = '', inQ = null, esc = false;
    for (const ch of cmd) {
      if (esc) { cur += ch; esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (inQ) {
        if (ch === inQ) inQ = null;
        else cur += ch;
      } else if (ch === '"' || ch === "'") {
        inQ = ch;
      } else if (ch === ' ' || ch === '\t') {
        if (cur) { parts.push(cur); cur = ''; }
      } else {
        cur += ch;
      }
    }
    if (cur) parts.push(cur);
    return parts;
  }
}
