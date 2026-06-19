// levels.js — 40 missões individuais baseadas em desafios-git.md

// ── Helpers ─────────────────────────────────────────────────────────────────

function _mkCommit(sim, msg, tree, parents, branch, tsOffset) {
  const h = sim._hash();
  sim.commits.push({
    hash: h, shortHash: h.slice(0, 7), message: msg,
    parents: parents || [], tree: { ...tree },
    timestamp: Date.now() + (tsOffset || 0),
    author: { name: sim.user.name || 'Jogador', email: sim.user.email || 'jogador@gitquest.com' },
    branch: branch || 'main',
  });
  return h;
}

// Builds the cumulative state at the END of mission number `n`.
// Each level's initialSetup calls buildUpTo(sim, levelId - 1).
function buildUpTo(sim, n) {
  sim.user = { name: 'Jogador', email: 'jogador@gitquest.com' };
  if (n < 4) return;

  sim.initialized = true;
  sim.branches = { main: null };
  sim.HEAD = 'main';
  sim.headDetached = false;
  if (n <= 5) return;

  const rm1 = '# Meu Projeto Git';
  sim.workingTree['README.md'] = rm1;
  if (n === 6) return;

  sim.index['README.md'] = rm1;
  if (n === 7) return;

  const t1 = { 'README.md': rm1 };
  const h1 = _mkCommit(sim, 'docs: adiciona README inicial', t1, [], 'main', -600000);
  sim.branches.main = h1;
  sim.index = { ...t1 };
  sim.workingTree = { ...t1 };
  if (n === 8) return;

  const rm2 = rm1 + '\nAprendendo Git!';
  sim.workingTree['README.md'] = rm2;
  if (n === 9) return;

  sim.index['README.md'] = rm2;
  if (n === 10) return;

  const t2 = { 'README.md': rm2 };
  const h2 = _mkCommit(sim, 'docs: adiciona descrição ao README', t2, [h1], 'main', -480000);
  sim.branches.main = h2;
  sim.index = { ...t2 };
  sim.workingTree = { ...t2 };
  if (n === 11) return;

  sim.workingTree['index.html'] = '';
  sim.workingTree['style.css'] = '';
  sim.index['index.html'] = '';
  sim.index['style.css'] = '';
  if (n === 12) return;

  delete sim.index['style.css'];
  if (n === 13) return;

  const t3 = { 'README.md': rm2, 'index.html': '' };
  const h3 = _mkCommit(sim, 'feat: adiciona estrutura HTML inicial', t3, [h2], 'main', -360000);
  sim.branches.main = h3;
  sim.index = { ...t3 };
  sim.workingTree = { ...t3, 'style.css': '' };
  if (n === 14) return;

  sim.workingTree['app.html'] = '';
  delete sim.workingTree['index.html'];
  sim.index['app.html'] = '';
  sim.index['index.html'] = '__DELETED__';
  if (n === 15) return;

  // M16+: commit the rename + style.css for a clean committed base
  const t4 = { 'README.md': rm2, 'app.html': '', 'style.css': '' };
  const h4 = _mkCommit(sim, 'refactor: renomeia index.html para app.html', t4, [h3], 'main', -300000);
  sim.branches.main = h4;
  sim.index = { ...t4 };
  sim.workingTree = { ...t4 };
  if (n === 16) return;

  sim.branches['feature/login'] = h4;
  if (n === 17) return;

  sim.HEAD = 'feature/login';
  sim.workingTree = { ...t4 };
  sim.index = { ...t4 };
  if (n === 18) return;

  sim.branches['feature/cadastro'] = h4;
  sim.HEAD = 'feature/cadastro';
  if (n === 19) return;

  const t5 = { ...t4, 'cadastro.html': '<form>Cadastro</form>' };
  const h5 = _mkCommit(sim, 'feat: adiciona página de cadastro', t5, [h4], 'feature/cadastro', -240000);
  sim.branches['feature/cadastro'] = h5;
  sim.workingTree = { ...t5 };
  sim.index = { ...t5 };
  if (n === 20) return;

  sim.HEAD = 'main';
  sim.workingTree = { ...t4 };
  sim.index = { ...t4 };
  if (n === 21) return;

  delete sim.branches['feature/login'];
  if (n === 22) return;

  // M23: fast-forward merge of feature/cadastro into main
  sim.branches.main = h5;
  sim.workingTree = { ...t5 };
  sim.index = { ...t5 };
  if (n === 23) return;

  // M24: feature/footer + diverging commit on main + merge commit
  const t6f = { ...t5, 'footer.html': '<footer>Rodapé</footer>' };
  const h6 = _mkCommit(sim, 'feat: adiciona footer', t6f, [h5], 'feature/footer', -210000);
  sim.branches['feature/footer'] = h6;
  const rm3 = rm2 + '\nAtualizado para v2!';
  const t6m = { ...t5, 'README.md': rm3 };
  const h7 = _mkCommit(sim, 'docs: atualiza README para v2', t6m, [h5], 'main', -200000);
  sim.branches.main = h7;
  const t7 = { ...t6m, 'footer.html': '<footer>Rodapé</footer>' };
  const h8 = _mkCommit(sim, "Merge branch 'feature/footer'", t7, [h7, h6], 'main', -180000);
  const mc8 = sim.commits.find(c => c.hash === h8);
  if (mc8) mc8.mergeCommit = true;
  sim.branches.main = h8;
  sim.HEAD = 'main';
  sim.workingTree = { ...t7 };
  sim.index = { ...t7 };
  if (n === 24) return;

  // M25 end: conflict state (result of running all M25 commands)
  const t8c = { ...t7, 'conflict.txt': 'versão do branch' };
  const h9 = _mkCommit(sim, 'test: conflict file', t8c, [h8], 'feature/conflict', -150000);
  sim.branches['feature/conflict'] = h9;
  const t8m = { ...t7, 'conflict.txt': 'versão do main' };
  const h10 = _mkCommit(sim, 'test: conflict file no main', t8m, [h8], 'main', -140000);
  sim.branches.main = h10;
  const conflictContent = '<<<<<<< HEAD\nversão do main\n=======\nversão do branch\n>>>>>>> feature/conflict';
  const tConflict = { ...t7, 'conflict.txt': conflictContent };
  sim.mergeState = { branch: 'feature/conflict', parent: h9, hasConflict: true, conflictFiles: ['conflict.txt'], mergedTree: tConflict };
  sim.workingTree = { ...tConflict };
  sim.index = { ...t8m };
  if (n === 25) return;

  // M26 end: conflict resolved and merge commit created
  const t9 = { ...t7, 'conflict.txt': 'conteúdo resolvido: ambas as versões combinadas' };
  const h11 = _mkCommit(sim, 'fix: resolve conflito de merge', t9, [h10, h9], 'main', -120000);
  const mc11 = sim.commits.find(c => c.hash === h11);
  if (mc11) mc11.mergeCommit = true;
  sim.branches.main = h11;
  sim.mergeState = null;
  sim.workingTree = { ...t9 };
  sim.index = { ...t9 };
  if (n <= 31) return; // M27–M31: display-only, no state changes

  // M32: .gitignore + debug.log
  sim.workingTree['.gitignore'] = '*.log';
  sim.workingTree['debug.log'] = '';
  if (n === 32) return;

  // M33 starting: no remote yet (player needs to add it)
  if (n === 33) return;

  // M34 starting: remote exists, ready to push
  sim.remotes['origin'] = { url: 'https://github.com/jogador/missao-git.git', refs: {}, commits: [] };
  if (n === 34) return;

  // M34 end / M35 starting: pushed, collaborator commit added to remote
  const mainH = sim.branches.main;
  sim.remotes['origin'].refs['main'] = mainH;
  sim.remotes['origin'].commits = sim.commits.map(c => ({ ...c }));
  const colTree = { ...sim.workingTree, 'COLABORADOR.md': '# Nota do Colaborador\n\nMudança feita por outro dev!' };
  const colH = sim._hash();
  const colC = {
    hash: colH, shortHash: colH.slice(0, 7), message: 'feat: nota do colaborador',
    parents: [mainH], tree: colTree, timestamp: Date.now() + 1000,
    author: { name: 'Colaborador', email: 'colega@gitquest.com' }, branch: 'main',
  };
  sim.remotes['origin'].commits.push(colC);
  sim.remotes['origin'].refs['main'] = colH;
  sim.remotes['origin']._colAdded = true;
  if (n === 35) return;

  // M35 end: fetched (origin/main branch now known locally)
  sim.branches['origin/main'] = colH;
  sim.commits.push({ ...colC });
  if (n === 36) return;

  // M36 end: pulled (local main fast-forwarded to colH)
  sim.branches.main = colH;
  sim.workingTree = { ...colTree };
  sim.index = { ...colTree };
  if (n === 37) {
    sim.workingTree['README.md'] += '\nmudança temporária em andamento...';
    return;
  }

  // M37 end: stashed (working tree clean, stash has the README change)
  const stashedWT = { ...colTree, 'README.md': colTree['README.md'] + '\nmudança temporária em andamento...' };
  sim.stash = [{
    message: 'WIP on main: ' + colH.slice(0, 7) + ' feat: nota do colaborador',
    workingTree: { ...stashedWT },
    index: { ...colTree },
  }];
  sim.workingTree = { ...colTree };
  sim.index = { ...colTree };
  // M38 end = same state (stash list is display-only)
  if (n <= 38) return;

  // M39 end: stash popped (changes restored, stash empty)
  // For M40 initialSetup we need to handle this inline (see level 40 below)
  if (n === 39) return;
}

// ── 40 Levels ────────────────────────────────────────────────────────────────

const LEVELS = [

  // ─── M01 ───────────────────────────────────────────────────────────────────
  {
    id: 1, title: 'Configure seu nome',
    subtitle: 'Missão 01 · Introdução',
    description: '<p class="inst-desc">Antes de tudo, o Git precisa saber quem você é. Configure seu nome de usuário globalmente para que ele apareça em cada commit.</p>',
    objectives: [
      { id: 'm01a', text: 'Configure o user.name via git config --global',
        check: (sim, cmd, r) => r.success && /git\s+config.*user\.name/.test(cmd) && sim.user.name !== '' },
    ],
    initialSetup(sim) { buildUpTo(sim, 0); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'O Git armazena um nome de autor associado a todos os commits. Registre-o nas configurações globais.',
      'Use o comando "git config" com a flag "--global" para mudar configurações que valem em todos os repositórios.',
      'A chave de configuração para o nome é "user.name". Use: git config --global user.name "Seu Nome".',
    ],
    newCommands: [{ name: 'git config --global user.name', desc: 'define o nome do autor' }],
    successMsg: 'Nome configurado! O Git agora sabe quem você é.',
  },

  // ─── M02 ───────────────────────────────────────────────────────────────────
  {
    id: 2, title: 'Configure seu e-mail',
    subtitle: 'Missão 02 · Introdução',
    description: '<p class="inst-desc">Configure seu e-mail. Ele será vinculado a todos os commits e é importante para integração com o GitHub.</p>',
    objectives: [
      { id: 'm02a', text: 'Configure o user.email via git config --global',
        check: (sim, cmd, r) => r.success && /git\s+config.*user\.email/.test(cmd) && sim.user.email !== '' },
    ],
    initialSetup(sim) { buildUpTo(sim, 1); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Assim como o nome, o e-mail é armazenado nas configurações globais do Git.',
      'Use git config com "--global" e a chave "user.email".',
      'Sintaxe: git config --global user.email "seu@email.com".',
    ],
    newCommands: [{ name: 'git config --global user.email', desc: 'define o e-mail do autor' }],
    successMsg: 'E-mail configurado! Seus commits terão sua identidade completa.',
  },

  // ─── M03 ───────────────────────────────────────────────────────────────────
  {
    id: 3, title: 'Ative cores no terminal',
    subtitle: 'Missão 03 · Introdução',
    description: '<p class="inst-desc">Ative cores automáticas na saída do Git. Com isso, arquivos modificados ficam em vermelho e novos em verde — muito mais legível!</p>',
    objectives: [
      { id: 'm03a', text: 'Configure color.ui como auto',
        check: (sim, cmd, r) => r.success && /git\s+config.*color\.ui/.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 2); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Cores no terminal ajudam a identificar rapidamente o estado dos arquivos.',
      'Use git config com "--global" e a chave "color.ui".',
      'O valor a definir é "auto". Sintaxe: git config --global color.ui auto',
    ],
    newCommands: [{ name: 'git config --global color.ui', desc: 'ativa saída colorida' }],
    successMsg: 'Cores ativadas! git status ficará muito mais legível agora.',
  },

  // ─── M04 ───────────────────────────────────────────────────────────────────
  {
    id: 4, title: 'Crie seu primeiro repositório',
    subtitle: 'Missão 04 · Introdução',
    description: '<p class="inst-desc">Inicialize um repositório Git na pasta atual. O comando cria a pasta oculta <code>.git</code> que armazena todo o histórico do projeto.</p>',
    objectives: [
      { id: 'm04a', text: 'Inicialize o repositório com git init',
        check: (sim, cmd, r) => r.success && /^git\s+init/.test(cmd.trim()) && sim.initialized },
    ],
    initialSetup(sim) { buildUpTo(sim, 3); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Um repositório Git é uma pasta com rastreamento de versões. Você começa "inicializando-a".',
      'O subcomando que inicializa é "init" — abreviação de "initialize".',
      'Basta digitar: git init. Uma pasta oculta .git será criada automaticamente.',
    ],
    newCommands: [{ name: 'git init', desc: 'inicializa um repositório Git' }],
    successMsg: 'Repositório criado! A pasta .git agora guarda todo o histórico.',
  },

  // ─── M05 ───────────────────────────────────────────────────────────────────
  {
    id: 5, title: 'Verifique o status',
    subtitle: 'Missão 05 · Introdução',
    description: '<p class="inst-desc">Veja o estado atual do repositório recém-criado. Você verá "No commits yet" — é um repositório vazio! <code>git status</code> é o comando que você mais usará.</p>',
    objectives: [
      { id: 'm05a', text: 'Execute git status para ver o estado do repositório',
        check: (sim, cmd, r) => r.success && /^git\s+status/.test(cmd.trim()) },
    ],
    initialSetup(sim) { buildUpTo(sim, 4); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'O "status" mostra tudo que o Git está rastreando: arquivos novos, modificados, staged ou limpos.',
      'O subcomando é simplesmente "status".',
      'Digite: git status. Você verá que o repositório está vazio.',
    ],
    newCommands: [{ name: 'git status', desc: 'mostra o estado dos arquivos' }],
    successMsg: '"No commits yet" — o repositório está vazio e pronto para receber arquivos!',
  },

  // ─── M06 ───────────────────────────────────────────────────────────────────
  {
    id: 6, title: 'Crie o primeiro arquivo',
    subtitle: 'Missão 06 · Manipulando Arquivos',
    description: '<p class="inst-desc">Crie um arquivo chamado <code>README.md</code> com algum conteúdo. O Git verá como "Untracked" — ele existe mas ainda não está sendo rastreado.</p>',
    objectives: [
      { id: 'm06a', text: 'Crie README.md com algum conteúdo',
        check: (sim) => sim.workingTree['README.md'] !== undefined && sim.workingTree['README.md'] !== '' },
    ],
    initialSetup(sim) { buildUpTo(sim, 5); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"Untracked" significa que o Git vê o arquivo mas ainda não está rastreando versões dele.',
      'Use o comando "echo" para criar um arquivo com conteúdo: echo "texto" > nome-do-arquivo',
      'Crie com: echo "# Meu Projeto Git" > README.md — o ">" redireciona para o arquivo.',
    ],
    newCommands: [{ name: 'echo "texto" > arquivo', desc: 'cria arquivo com conteúdo' }],
    successMsg: 'README.md criado! Veja com git status — ele aparece como "Untracked".',
  },

  // ─── M07 ───────────────────────────────────────────────────────────────────
  {
    id: 7, title: 'Adicione ao stage',
    subtitle: 'Missão 07 · Manipulando Arquivos',
    description: '<p class="inst-desc">Adicione o <code>README.md</code> à área de staging — a "caixa de preparação" antes do commit. Após isso, <code>git status</code> mostrará o arquivo em verde.</p>',
    objectives: [
      { id: 'm07a', text: 'Adicione README.md à área de staging',
        check: (sim) => sim.index['README.md'] !== undefined && sim.index['README.md'] !== '__DELETED__' },
    ],
    initialSetup(sim) { buildUpTo(sim, 6); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'A staging area é como uma caixa de embalagem: você escolhe o que vai dentro antes de selar o pacote (commit).',
      'Existe um subcomando do git que significa literalmente "adicionar" em inglês. Use seguido do nome do arquivo.',
      'Use: git add README.md. Depois execute git status — o arquivo fica verde.',
    ],
    newCommands: [{ name: 'git add <arquivo>', desc: 'adiciona arquivo à staging area' }],
    successMsg: 'README.md está na staging area! Pronto para o primeiro commit.',
  },

  // ─── M08 ───────────────────────────────────────────────────────────────────
  {
    id: 8, title: 'Faça o primeiro commit',
    subtitle: 'Missão 08 · Manipulando Arquivos',
    description: '<p class="inst-desc">Grave permanentemente o snapshot do <code>README.md</code> no histórico. Use a flag <code>-m</code> para incluir uma mensagem. Convenção: comece com um tipo (<code>feat</code>, <code>fix</code>, <code>docs</code>).</p>',
    objectives: [
      { id: 'm08a', text: 'Faça o primeiro commit com uma mensagem descritiva',
        check: (sim, cmd, r) => r.success && /^git\s+commit/.test(cmd.trim()) && sim.commits.length > 0 },
    ],
    initialSetup(sim) { buildUpTo(sim, 7); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Um commit é como uma fotografia do projeto naquele momento — você pode voltar a ela quando quiser.',
      'O subcomando é "commit". Use a flag -m para passar a mensagem sem abrir um editor de texto.',
      'Sintaxe: git commit -m "docs: adiciona README inicial". A -m é seguida da mensagem entre aspas.',
    ],
    newCommands: [{ name: 'git commit -m "msg"', desc: 'registra um commit com mensagem' }],
    successMsg: 'Primeiro commit! O projeto tem seu primeiro ponto de restauração na história.',
  },

  // ─── M09 ───────────────────────────────────────────────────────────────────
  {
    id: 9, title: 'Edite e veja o diff',
    subtitle: 'Missão 09 · Manipulando Arquivos',
    description: '<p class="inst-desc">Edite o <code>README.md</code> adicionando uma linha. Depois use <code>git diff</code> para ver exatamente o que mudou. Linhas com <code>+</code> são adições, com <code>-</code> são remoções.</p>',
    objectives: [
      { id: 'm09a', text: 'Adicione uma linha ao README.md',
        check: (sim) => {
          const c = sim.commits.find(x => x.hash === sim.branches.main);
          return c && sim.workingTree['README.md'] !== c.tree['README.md'];
        }
      },
      { id: 'm09b', text: 'Execute git diff para ver as mudanças não staged',
        check: (sim, cmd, r) => r.success && /git\s+diff(?!\s+--staged)/.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 8); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Para acrescentar uma linha sem apagar o conteúdo existente, use ">>" (dois sinais de maior): echo "texto" >> arquivo',
      '"git diff" sem flags mostra diferenças entre o workingTree e o que foi staged — mudanças ainda não preparadas.',
      'Passo 1: echo "Aprendendo Git!" >> README.md\nPasso 2: git diff\nVeja as linhas com + em verde.',
    ],
    newCommands: [
      { name: 'git diff', desc: 'mostra mudanças não staged' },
      { name: 'echo "txt" >> arquivo', desc: 'acrescenta linha ao arquivo' },
    ],
    successMsg: 'Você viu o diff! As linhas com + são o que você adicionou.',
  },

  // ─── M10 ───────────────────────────────────────────────────────────────────
  {
    id: 10, title: 'Adicione tudo e veja diff staged',
    subtitle: 'Missão 10 · Manipulando Arquivos',
    description: '<p class="inst-desc">Adicione as mudanças ao stage e veja o diff entre staged e último commit. <code>git diff --staged</code> mostra o que <em>será</em> incluído no próximo commit.</p>',
    objectives: [
      { id: 'm10a', text: 'Adicione README.md ao stage',
        check: (sim) => {
          const c = sim.commits.find(x => x.hash === sim.branches.main);
          return c && sim.index['README.md'] !== c.tree['README.md'];
        }
      },
      { id: 'm10b', text: 'Execute git diff --staged para ver o que será commitado',
        check: (sim, cmd, r) => r.success && /git\s+diff.*--staged/.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 9); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Primeiro adicione o arquivo ao stage, depois use a variante --staged do diff.',
      '"git diff" sem flags = não staged. "git diff --staged" = staged vs último commit.',
      'Passo 1: git add README.md\nPasso 2: git diff --staged',
    ],
    newCommands: [{ name: 'git diff --staged', desc: 'mostra mudanças staged vs último commit' }],
    successMsg: 'Você sabe a diferença entre diff e diff --staged. Muito importante!',
  },

  // ─── M11 ───────────────────────────────────────────────────────────────────
  {
    id: 11, title: 'Segundo commit',
    subtitle: 'Missão 11 · Manipulando Arquivos',
    description: '<p class="inst-desc">Faça o commit das mudanças staged no README. Cada commit é um ponto de restauração. Depois verifique o histórico com <code>git log</code>.</p>',
    objectives: [
      { id: 'm11a', text: 'Faça o segundo commit',
        check: (sim, cmd, r) => r.success && /^git\s+commit/.test(cmd.trim()) && sim.commits.length >= 2 },
    ],
    initialSetup(sim) { buildUpTo(sim, 10); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'O README já está staged. Você só precisa fazer o commit.',
      'Use git commit com a flag -m e uma mensagem descritiva.',
      'Sugestão: git commit -m "docs: adiciona descrição ao README"',
    ],
    newCommands: [],
    successMsg: 'Segundo commit! O projeto tem 2 pontos de restauração na história.',
  },

  // ─── M12 ───────────────────────────────────────────────────────────────────
  {
    id: 12, title: 'Adicione múltiplos arquivos',
    subtitle: 'Missão 12 · Manipulando Arquivos',
    description: '<p class="inst-desc">Crie dois arquivos novos (<code>index.html</code> e <code>style.css</code>) e adicione ambos ao stage de uma vez usando <code>git add .</code></p>',
    objectives: [
      { id: 'm12a', text: 'Crie index.html e style.css',
        check: (sim) => sim.workingTree['index.html'] !== undefined && sim.workingTree['style.css'] !== undefined },
      { id: 'm12b', text: 'Adicione ambos ao stage com git add .',
        check: (sim) => sim.index['index.html'] !== undefined && sim.index['style.css'] !== undefined },
    ],
    initialSetup(sim) { buildUpTo(sim, 11); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'O comando "touch" cria arquivos vazios. Você pode criar vários de uma vez: touch arquivo1 arquivo2',
      '"git add ." adiciona TUDO na pasta atual ao stage — prático quando há vários arquivos.',
      'Passo 1: touch index.html style.css\nPasso 2: git add .\nVerifique com git status.',
    ],
    newCommands: [
      { name: 'touch <arquivo>', desc: 'cria arquivo vazio' },
      { name: 'git add .', desc: 'adiciona todos os arquivos ao stage' },
    ],
    successMsg: 'Dois arquivos no stage de uma vez! git add . é muito prático.',
  },

  // ─── M13 ───────────────────────────────────────────────────────────────────
  {
    id: 13, title: 'Deselecione um arquivo do stage',
    subtitle: 'Missão 13 · Manipulando Arquivos',
    description: '<p class="inst-desc">Percebeu que <code>style.css</code> não deveria ir neste commit? Remova-o do stage sem perder o conteúdo do arquivo em disco.</p>',
    objectives: [
      { id: 'm13a', text: 'Remova style.css do stage mantendo-o no disco',
        check: (sim) => sim.index['style.css'] === undefined && sim.workingTree['style.css'] !== undefined },
    ],
    initialSetup(sim) { buildUpTo(sim, 12); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Existem dois tipos de "desfazer" no Git: desfazer commits e desfazer staging. Aqui é o segundo.',
      'O comando "git reset" seguido do nome do arquivo remove-o da staging area sem apagá-lo do disco.',
      'Use: git reset style.css. Depois git status: style.css ficará vermelho (unstaged), index.html verde (staged).',
    ],
    newCommands: [{ name: 'git reset <arquivo>', desc: 'remove arquivo do stage sem apagá-lo' }],
    successMsg: 'style.css saiu do stage mas permanece em disco. Controle preciso!',
  },

  // ─── M14 ───────────────────────────────────────────────────────────────────
  {
    id: 14, title: 'Commit seletivo',
    subtitle: 'Missão 14 · Manipulando Arquivos',
    description: '<p class="inst-desc">Faça commit apenas do <code>index.html</code> (que está staged). O <code>style.css</code> ficará não rastreado — você pode commitá-lo separadamente depois.</p>',
    objectives: [
      { id: 'm14a', text: 'Faça commit apenas de index.html',
        check: (sim, cmd, r) => r.success && /^git\s+commit/.test(cmd.trim()) && (() => {
          const c = sim.commits.find(x => x.hash === sim.branches.main);
          return c && 'index.html' in c.tree && !('style.css' in c.tree);
        })() },
    ],
    initialSetup(sim) { buildUpTo(sim, 13); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Commits pequenos e focados são boa prática: um commit deve ter apenas mudanças relacionadas.',
      'index.html já está staged da missão anterior. Só precisa fazer o commit.',
      'Use: git commit -m "feat: adiciona estrutura HTML inicial".',
    ],
    newCommands: [],
    successMsg: 'Commit seletivo feito! index.html commitado, style.css ficou de fora.',
  },

  // ─── M15 ───────────────────────────────────────────────────────────────────
  {
    id: 15, title: 'Renomeie um arquivo versionado',
    subtitle: 'Missão 15 · Manipulando Arquivos',
    description: '<p class="inst-desc">Renomeie <code>index.html</code> para <code>app.html</code> usando o comando Git — não o <code>mv</code> do sistema. O Git automaticamente prepara a renomeação no stage.</p>',
    objectives: [
      { id: 'm15a', text: 'Renomeie index.html para app.html com git mv',
        check: (sim) => sim.workingTree['app.html'] !== undefined && sim.workingTree['index.html'] === undefined && sim.index['index.html'] === '__DELETED__' },
    ],
    initialSetup(sim) { buildUpTo(sim, 14); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"git mv" faz duas coisas: move/renomeia o arquivo E já coloca a mudança no stage.',
      'Diferença: "mv" do sistema apenas move o arquivo; o Git veria como deletado + novo. "git mv" rastreia o rename.',
      'Use: git mv index.html app.html. Depois git status mostrará "renamed: index.html -> app.html".',
    ],
    newCommands: [{ name: 'git mv <origem> <destino>', desc: 'renomeia arquivo já preparando no stage' }],
    successMsg: 'Arquivo renomeado! O Git rastreou corretamente como rename.',
  },

  // ─── M16 ───────────────────────────────────────────────────────────────────
  {
    id: 16, title: 'Liste os branches',
    subtitle: 'Missão 16 · Branches',
    description: '<p class="inst-desc">Veja todos os branches existentes. O asterisco (<code>*</code>) indica em qual você está. Por enquanto só existe <code>main</code>.</p>',
    objectives: [
      { id: 'm16a', text: 'Liste os branches com git branch',
        check: (sim, cmd, r) => r.success && /^git\s+branch\s*$/.test(cmd.trim()) },
    ],
    initialSetup(sim) { buildUpTo(sim, 15); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Branches são "linhas do tempo" paralelas do código. Cada branch pode ter versões diferentes.',
      'O subcomando "branch" sem argumentos lista todos os branches locais.',
      'Apenas: git branch. Você verá "* main" — o asterisco indica o branch atual.',
    ],
    newCommands: [{ name: 'git branch', desc: 'lista todos os branches locais' }],
    successMsg: 'Você listou os branches. Por enquanto só o main!',
  },

  // ─── M17 ───────────────────────────────────────────────────────────────────
  {
    id: 17, title: 'Crie um novo branch',
    subtitle: 'Missão 17 · Branches',
    description: '<p class="inst-desc">Crie um branch chamado <code>feature/login</code>. O branch é criado mas você continua no <code>main</code>. Prefixos como <code>feature/</code> organizam os branches.</p>',
    objectives: [
      { id: 'm17a', text: 'Crie o branch feature/login',
        check: (sim) => sim.branches['feature/login'] !== undefined },
    ],
    initialSetup(sim) { buildUpTo(sim, 16); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Usar prefixos como "feature/", "fix/", "docs/" organiza os branches por tipo de trabalho.',
      '"git branch" seguido de um nome cria um novo branch apontando para o commit atual.',
      'Use: git branch feature/login. Verifique com git branch — o asterisco continua no main.',
    ],
    newCommands: [{ name: 'git branch <nome>', desc: 'cria um novo branch' }],
    successMsg: 'Branch feature/login criado! Você ainda está no main.',
  },

  // ─── M18 ───────────────────────────────────────────────────────────────────
  {
    id: 18, title: 'Mude para o novo branch',
    subtitle: 'Missão 18 · Branches',
    description: '<p class="inst-desc">Troque para o branch <code>feature/login</code>. Qualquer commit feito a partir de agora ficará apenas neste branch, sem afetar o main.</p>',
    objectives: [
      { id: 'm18a', text: 'Mude para o branch feature/login',
        check: (sim) => sim.HEAD === 'feature/login' && !sim.headDetached },
    ],
    initialSetup(sim) { buildUpTo(sim, 17); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Mudar de branch é como "entrar" em outra linha do tempo — os arquivos podem ser diferentes entre branches.',
      'O subcomando "checkout" (ou o moderno "switch") muda o branch ativo.',
      'Use: git checkout feature/login. O asterisco em "git branch" moverá para feature/login.',
    ],
    newCommands: [{ name: 'git checkout <branch>', desc: 'muda para outro branch' }],
    successMsg: 'Você está no feature/login! Commits aqui ficam isolados do main.',
  },

  // ─── M19 ───────────────────────────────────────────────────────────────────
  {
    id: 19, title: 'Crie e mude de uma vez',
    subtitle: 'Missão 19 · Branches',
    description: '<p class="inst-desc">Crie e já mude para <code>feature/cadastro</code> em um único comando. A flag <code>-b</code> é um atalho para "criar + mudar". Muito mais prático!</p>',
    objectives: [
      { id: 'm19a', text: 'Crie e mude para feature/cadastro com git checkout -b',
        check: (sim) => sim.branches['feature/cadastro'] !== undefined && sim.HEAD === 'feature/cadastro' },
    ],
    initialSetup(sim) { buildUpTo(sim, 18); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Criar e mudar para um branch ao mesmo tempo é tão comum que existe um atalho com a flag -b.',
      'Use "checkout" com a flag "-b" seguido do nome do novo branch.',
      'Use: git checkout -b feature/cadastro. Equivale a dois comandos separados em um só.',
    ],
    newCommands: [{ name: 'git checkout -b <nome>', desc: 'cria e muda para novo branch' }],
    successMsg: 'Branch criado e ativado em um passo! Muito mais eficiente.',
  },

  // ─── M20 ───────────────────────────────────────────────────────────────────
  {
    id: 20, title: 'Commit no branch',
    subtitle: 'Missão 20 · Branches',
    description: '<p class="inst-desc">No branch <code>feature/cadastro</code>, crie <code>cadastro.html</code> e faça um commit. Este commit existirá <em>apenas</em> neste branch!</p>',
    objectives: [
      { id: 'm20a', text: 'Crie o arquivo cadastro.html',
        check: (sim) => sim.workingTree['cadastro.html'] !== undefined },
      { id: 'm20b', text: 'Adicione cadastro.html ao stage',
        check: (sim) => sim.index['cadastro.html'] !== undefined },
      { id: 'm20c', text: 'Faça commit de cadastro.html no branch feature/cadastro',
        check: (sim, cmd, r) => r.success && /^git\s+commit/.test(cmd.trim()) && (() => {
          const c = sim.commits.find(x => x.hash === sim.branches['feature/cadastro']);
          return c && 'cadastro.html' in c.tree;
        })() },
    ],
    initialSetup(sim) { buildUpTo(sim, 19); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Você está no feature/cadastro. Crie o arquivo, adicione ao stage, depois commite.',
      'Para criar: echo "<form>Cadastro</form>" > cadastro.html. Para staging: git add cadastro.html.',
      'Passo 1: echo "<form>Cadastro</form>" > cadastro.html\nPasso 2: git add cadastro.html\nPasso 3: git commit -m "feat: adiciona página de cadastro"',
    ],
    newCommands: [],
    successMsg: 'Commit feito no branch! O main não tem este arquivo.',
  },

  // ─── M21 ───────────────────────────────────────────────────────────────────
  {
    id: 21, title: 'Volte ao main e confirme isolamento',
    subtitle: 'Missão 21 · Branches',
    description: '<p class="inst-desc">Volte ao branch <code>main</code> e verifique que <code>cadastro.html</code> não existe lá. Isso é o poder dos branches — isolamento total das mudanças!</p>',
    objectives: [
      { id: 'm21a', text: 'Volte ao branch main',
        check: (sim) => sim.HEAD === 'main' && !sim.headDetached },
      { id: 'm21b', text: 'Confirme com ls que cadastro.html não existe no main',
        check: (sim, cmd, r) => r.success && /^ls/.test(cmd.trim()) && sim.HEAD === 'main' },
    ],
    initialSetup(sim) { buildUpTo(sim, 20); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Mudar de branch atualiza automaticamente os arquivos na pasta — cada branch tem seu próprio "snapshot".',
      'Use git checkout main para voltar ao branch principal.',
      'Passo 1: git checkout main\nPasso 2: ls (você verá que cadastro.html sumiu — está apenas no feature/cadastro)',
    ],
    newCommands: [],
    successMsg: 'Isolamento confirmado! Cada branch tem suas próprias mudanças.',
  },

  // ─── M22 ───────────────────────────────────────────────────────────────────
  {
    id: 22, title: 'Exclua um branch',
    subtitle: 'Missão 22 · Branches',
    description: '<p class="inst-desc">Delete o branch <code>feature/login</code> que criamos mas não usamos. O <code>-d</code> só funciona se o branch já foi mergeado. Use <code>-D</code> para forçar.</p>',
    objectives: [
      { id: 'm22a', text: 'Delete o branch feature/login',
        check: (sim) => sim.branches['feature/login'] === undefined },
    ],
    initialSetup(sim) { buildUpTo(sim, 21); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Branches não usados devem ser removidos para não poluir o repositório.',
      '"git branch -d" deleta um branch já mergeado. "-D" força a exclusão mesmo sem merge.',
      'Use: git branch -d feature/login. Se der erro de "não mergeado", use -D.',
    ],
    newCommands: [{ name: 'git branch -d <nome>', desc: 'deleta um branch mergeado' }],
    successMsg: 'Branch deletado! Repositório mais organizado.',
  },

  // ─── M23 ───────────────────────────────────────────────────────────────────
  {
    id: 23, title: 'Merge simples',
    subtitle: 'Missão 23 · Merge',
    description: '<p class="inst-desc">Faça o merge do branch <code>feature/cadastro</code> no <code>main</code>. Como o cadastro está à frente do main, será um <em>fast-forward</em> — o Git apenas avança o ponteiro, sem criar commit extra.</p>',
    objectives: [
      { id: 'm23a', text: 'Faça merge de feature/cadastro no main (fast-forward)',
        check: (sim) => {
          const c = sim.commits.find(x => x.hash === sim.branches.main);
          return c && 'cadastro.html' in c.tree && sim.HEAD === 'main';
        }
      },
    ],
    initialSetup(sim) { buildUpTo(sim, 22); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Para fazer merge, você deve estar no branch de destino (main). Use git merge seguido do nome do branch a integrar.',
      'Fast-forward ocorre quando o destino não teve commits desde a criação do branch — o Git simplesmente avança o ponteiro.',
      'Use: git merge feature/cadastro. O main agora apontará para o commit do cadastro.',
    ],
    newCommands: [{ name: 'git merge <branch>', desc: 'integra outro branch no atual' }],
    successMsg: 'Fast-forward merge! O ponteiro do main avançou para o commit do cadastro.',
  },

  // ─── M24 ───────────────────────────────────────────────────────────────────
  {
    id: 24, title: 'Merge com commit de merge',
    subtitle: 'Missão 24 · Merge',
    description: '<p class="inst-desc">Quando ambos os branches têm commits independentes, o Git cria um "merge commit". Crie <code>feature/footer</code>, faça commits nos dois branches, depois merge.</p>',
    objectives: [
      { id: 'm24a', text: 'Crie feature/footer, adicione footer.html e faça commit nele',
        check: (sim) => {
          const h = sim.branches['feature/footer'];
          if (!h) return false;
          const c = sim.commits.find(x => x.hash === h);
          return c && 'footer.html' in c.tree;
        }
      },
      { id: 'm24b', text: 'Volte ao main e faça um commit divergente',
        check: (sim) => {
          if (sim.HEAD !== 'main') return false;
          const mainH = sim.branches.main;
          const footerH = sim.branches['feature/footer'];
          if (!mainH || !footerH) return false;
          const mainC = sim.commits.find(c => c.hash === mainH);
          return mainC && mainH !== footerH && !mainC.mergeCommit;
        }
      },
      { id: 'm24c', text: 'Faça o merge de feature/footer (cria merge commit)',
        check: (sim) => {
          const c = sim.commits.find(x => x.hash === sim.branches.main);
          return c && c.mergeCommit && c.parents.length === 2;
        }
      },
    ],
    initialSetup(sim) { buildUpTo(sim, 23); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Você precisa que os dois branches tenham commits divergentes para gerar um merge commit real.',
      'Sequência: crie feature/footer → commit footer.html → volte ao main → faça commit no main → merge feature/footer',
      'Passo a passo:\n1. git checkout -b feature/footer\n2. echo "<footer>" > footer.html\n3. git add footer.html && git commit -m "feat: footer"\n4. git checkout main\n5. echo "update" >> README.md && git add README.md && git commit -m "docs: update"\n6. git merge feature/footer',
    ],
    newCommands: [],
    successMsg: 'Merge commit criado! O grafo agora tem um nó com dois pais.',
  },

  // ─── M25 ───────────────────────────────────────────────────────────────────
  {
    id: 25, title: 'Simule um conflito',
    subtitle: 'Missão 25 · Merge',
    description: '<p class="inst-desc">Edite o mesmo arquivo em dois branches diferentes e tente fazer o merge. O Git não saberá qual versão escolher. O arquivo terá marcadores <code>&lt;&lt;&lt;</code>, <code>===</code>, <code>&gt;&gt;&gt;</code> indicando o conflito.</p>',
    objectives: [
      { id: 'm25a', text: 'Crie um branch com conflict.txt em uma versão',
        check: (sim) => {
          return Object.entries(sim.branches).some(([n, h]) => {
            if (n === 'main' || n === 'feature/footer' || n === 'feature/cadastro' || !h) return false;
            const c = sim.commits.find(x => x.hash === h);
            return c && 'conflict.txt' in c.tree;
          });
        }
      },
      { id: 'm25b', text: 'Crie conflict.txt no main com texto diferente e commite',
        check: (sim) => {
          const c = sim.commits.find(x => x.hash === sim.branches.main);
          return c && 'conflict.txt' in c.tree && sim.HEAD === 'main';
        }
      },
      { id: 'm25c', text: 'Execute git merge e observe o conflito',
        check: (sim) => sim.mergeState && sim.mergeState.hasConflict },
    ],
    initialSetup(sim) { buildUpTo(sim, 24); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Para criar um conflito: edite o mesmo arquivo de formas diferentes em dois branches e tente mergear.',
      'Crie um branch novo → crie conflict.txt → commit → volte ao main → crie conflict.txt com texto diferente → commit → git merge <branch>',
      'Passo a passo:\n1. git checkout -b feature/conflict\n2. echo "versão do branch" > conflict.txt\n3. git add conflict.txt && git commit -m "test: conflict"\n4. git checkout main\n5. echo "versão do main" > conflict.txt\n6. git add conflict.txt && git commit -m "test: conflict no main"\n7. git merge feature/conflict',
    ],
    newCommands: [],
    successMsg: 'Conflito detectado! Na próxima missão você vai resolvê-lo.',
  },

  // ─── M26 ───────────────────────────────────────────────────────────────────
  {
    id: 26, title: 'Resolva o conflito',
    subtitle: 'Missão 26 · Merge',
    description: '<p class="inst-desc">O <code>conflict.txt</code> tem marcadores de conflito. Edite-o removendo os marcadores e escolhendo o conteúdo final. Depois adicione ao stage e complete o merge.</p>',
    objectives: [
      { id: 'm26a', text: 'Edite conflict.txt removendo todos os marcadores de conflito',
        check: (sim) => {
          const wt = sim.workingTree['conflict.txt'];
          return wt !== undefined && !wt.includes('<<<<<<<') && !wt.includes('=======') && !wt.includes('>>>>>>>');
        }
      },
      { id: 'm26b', text: 'Adicione conflict.txt ao stage',
        check: (sim) => {
          const v = sim.index['conflict.txt'];
          return v !== undefined && !v.includes('<<<<<<<');
        }
      },
      { id: 'm26c', text: 'Complete o merge com git commit',
        check: (sim) => {
          if (sim.mergeState) return false;
          const c = sim.commits.find(x => x.hash === sim.branches.main);
          return c && c.mergeCommit;
        }
      },
    ],
    initialSetup(sim) { buildUpTo(sim, 25); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'O conflict.txt tem marcadores: <<<<<<< HEAD (sua versão), ======= (divisor), >>>>>>> branch (versão deles). Remova os marcadores e deixe só o conteúdo desejado.',
      'Para editar: echo "conteúdo escolhido" > conflict.txt (sobrescreve tudo). Depois git add conflict.txt.',
      'Passo 1: echo "versão final resolvida" > conflict.txt\nPasso 2: git add conflict.txt\nPasso 3: git commit -m "fix: resolve conflito de merge"',
    ],
    newCommands: [],
    successMsg: 'Conflito resolvido com sucesso! Você tomou o controle e escolheu o conteúdo.',
  },

  // ─── M27 ───────────────────────────────────────────────────────────────────
  {
    id: 27, title: 'Veja o log completo',
    subtitle: 'Missão 27 · Histórico',
    description: '<p class="inst-desc">Liste o histórico de todos os commits do branch atual. Cada commit tem um hash único (SHA-1), autor, data e mensagem de commit.</p>',
    objectives: [
      { id: 'm27a', text: 'Execute git log para ver o histórico completo',
        check: (sim, cmd, r) => r.success && /^git\s+log\s*$/.test(cmd.trim()) },
    ],
    initialSetup(sim) { buildUpTo(sim, 26); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'O log mostra a história do projeto — quem fez o quê e quando.',
      'Apenas "git log" sem flags mostra o log completo com todos os detalhes.',
      'Digite: git log',
    ],
    newCommands: [{ name: 'git log', desc: 'mostra o histórico de commits' }],
    successMsg: 'Você explorou o histórico! Cada commit tem um hash SHA-1 único.',
  },

  // ─── M28 ───────────────────────────────────────────────────────────────────
  {
    id: 28, title: 'Log resumido e bonito',
    subtitle: 'Missão 28 · Histórico',
    description: '<p class="inst-desc">Veja o log compacto — uma linha por commit — com o gráfico de branches. A combinação <code>--oneline --graph --all</code> é a forma mais usada para visualizar a estrutura do projeto.</p>',
    objectives: [
      { id: 'm28a', text: 'Execute git log --oneline --graph --all',
        check: (sim, cmd, r) => r.success && /git\s+log.*--oneline/.test(cmd) && /--graph/.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 27); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"--oneline" = uma linha por commit. "--graph" = árvore ASCII dos branches. "--all" = todos os branches.',
      'Cada flag é opcional, mas juntas criam a view mais útil do histórico.',
      'Use: git log --oneline --graph --all',
    ],
    newCommands: [{ name: 'git log --oneline --graph --all', desc: 'log compacto com grafo de branches' }],
    successMsg: 'Vista compacta com grafo! Ótima para entender a estrutura de branches.',
  },

  // ─── M29 ───────────────────────────────────────────────────────────────────
  {
    id: 29, title: 'Histórico de um arquivo',
    subtitle: 'Missão 29 · Histórico',
    description: '<p class="inst-desc">Veja o histórico de versões especificamente do <code>README.md</code>. A flag <code>--follow</code> rastreia o arquivo mesmo se tiver sido renomeado no passado.</p>',
    objectives: [
      { id: 'm29a', text: 'Execute git log --follow README.md',
        check: (sim, cmd, r) => r.success && /git\s+log.*--follow/.test(cmd) && /README/.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 28); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"git log <arquivo>" mostra só os commits que tocaram naquele arquivo — filtragem por arquivo.',
      '"--follow" garante que o rastreamento funcione mesmo se o arquivo tiver sido renomeado.',
      'Use: git log --follow README.md',
    ],
    newCommands: [{ name: 'git log --follow <arquivo>', desc: 'histórico de um arquivo específico' }],
    successMsg: 'Histórico filtrado por arquivo! Excelente para entender a evolução de um arquivo.',
  },

  // ─── M30 ───────────────────────────────────────────────────────────────────
  {
    id: 30, title: 'Compare dois branches',
    subtitle: 'Missão 30 · Histórico',
    description: '<p class="inst-desc">Veja a diferença entre <code>main</code> e <code>feature/cadastro</code>. Os três pontos <code>...</code> mostram o que divergiu desde o ancestral comum.</p>',
    objectives: [
      { id: 'm30a', text: 'Execute git diff main...feature/cadastro',
        check: (sim, cmd, r) => r.success && /git\s+diff.*\.\.\./.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 29); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"git diff branch1...branch2" usa TRÊS pontos para mostrar o que divergiu desde o ancestral comum.',
      'Dois pontos (..) = todas as diferenças. Três pontos (...) = apenas o que divergiu de cada lado.',
      'Use: git diff main...feature/cadastro',
    ],
    newCommands: [{ name: 'git diff branch...branch', desc: 'compara o que divergiu entre dois branches' }],
    successMsg: 'Diff entre branches! Os três pontos revelam as mudanças exclusivas de cada lado.',
  },

  // ─── M31 ───────────────────────────────────────────────────────────────────
  {
    id: 31, title: 'Inspecione um commit específico',
    subtitle: 'Missão 31 · Histórico',
    description: '<p class="inst-desc">Use o hash de um commit (os 7 primeiros caracteres) para ver seus detalhes e diff. Primeiro execute <code>git log --oneline</code> para obter os hashes.</p>',
    objectives: [
      { id: 'm31a', text: 'Execute git show com o hash de algum commit',
        check: (sim, cmd, r) => r.success && /^git\s+show\s+\S/.test(cmd.trim()) },
    ],
    initialSetup(sim) { buildUpTo(sim, 30); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"git show <hash>" mostra o commit: autor, data, mensagem e o diff completo.',
      'Primeiro veja os hashes: git log --oneline. Copie qualquer hash de 7 caracteres.',
      'Use: git show <hash-copiado>. O Git aceita os primeiros 7 caracteres.',
    ],
    newCommands: [{ name: 'git show <hash>', desc: 'mostra detalhes e diff de um commit' }],
    successMsg: 'Commit inspecionado! git show é ótimo para entender o que uma mudança fez.',
  },

  // ─── M32 ───────────────────────────────────────────────────────────────────
  {
    id: 32, title: 'Liste arquivos ignorados',
    subtitle: 'Missão 32 · Histórico',
    description: '<p class="inst-desc">Crie um <code>.gitignore</code> com <code>*.log</code> e verifique que <code>debug.log</code> fica invisível ao Git. Use <code>git ls-files --others --ignored --exclude-standard</code> para listar os ignorados.</p>',
    objectives: [
      { id: 'm32a', text: 'Crie .gitignore com padrão *.log',
        check: (sim) => sim.workingTree['.gitignore'] && sim.workingTree['.gitignore'].includes('*.log') },
      { id: 'm32b', text: 'Crie o arquivo debug.log',
        check: (sim) => sim.workingTree['debug.log'] !== undefined },
      { id: 'm32c', text: 'Liste os arquivos ignorados com git ls-files',
        check: (sim, cmd, r) => r.success && /git\s+ls-files.*--ignored/.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 31); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'O .gitignore usa padrões glob — "*.log" ignora qualquer arquivo terminando em .log.',
      'Após criar o .gitignore com o padrão, o git status não mostrará mais os arquivos ignorados.',
      'Passo 1: echo "*.log" > .gitignore\nPasso 2: touch debug.log\nPasso 3: git ls-files --others --ignored --exclude-standard',
    ],
    newCommands: [
      { name: 'git ls-files --ignored', desc: 'lista arquivos ignorados pelo .gitignore' },
    ],
    successMsg: 'debug.log está ignorado! O .gitignore é essencial em todo projeto.',
  },

  // ─── M33 ───────────────────────────────────────────────────────────────────
  {
    id: 33, title: 'Adicione um remote',
    subtitle: 'Missão 33 · Sincronizar',
    description: '<p class="inst-desc">Conecte o repositório local a um remote (como o GitHub). <code>origin</code> é o nome convencional para o remote principal. Confirme a conexão com <code>git remote -v</code>.</p>',
    objectives: [
      { id: 'm33a', text: 'Adicione o remote origin com git remote add',
        check: (sim) => sim.remotes && Object.keys(sim.remotes).length > 0 },
      { id: 'm33b', text: 'Verifique a conexão com git remote -v',
        check: (sim, cmd, r) => r.success && /git\s+remote.*-v/.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 32); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"origin" é apenas um nome convencional — você poderia chamar de qualquer coisa, mas origin é o padrão universal.',
      'git remote add aceita dois argumentos: o nome do remote e a URL do repositório.',
      'Use: git remote add origin https://github.com/usuario/repositorio.git\nDepois: git remote -v para confirmar.',
    ],
    newCommands: [
      { name: 'git remote add <nome> <url>', desc: 'conecta a um repositório remoto' },
      { name: 'git remote -v', desc: 'lista remotes configurados' },
    ],
    successMsg: 'Remote configurado! Agora você pode enviar e receber código do servidor.',
  },

  // ─── M34 ───────────────────────────────────────────────────────────────────
  {
    id: 34, title: 'Envie commits para o GitHub',
    subtitle: 'Missão 34 · Sincronizar',
    description: '<p class="inst-desc">Envie o branch <code>main</code> para o repositório remoto. O remote "origin" já está configurado. Use <code>-u</code> para configurar o tracking — próximas vezes só <code>git push</code>.</p>',
    objectives: [
      { id: 'm34a', text: 'Envie o branch main para o origin com git push',
        check: (sim, cmd, r) => r.success && /git\s+push/.test(cmd) && sim.remotes['origin'] && sim.remotes['origin'].refs && sim.remotes['origin'].refs['main'] },
    ],
    initialSetup(sim) { buildUpTo(sim, 33); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"push" envia seus commits locais para o repositório remoto.',
      'Sintaxe: git push <remote> <branch>. Use -u para configurar o branch de tracking.',
      'Use: git push origin main (ou: git push -u origin main para configurar tracking).',
    ],
    newCommands: [{ name: 'git push origin <branch>', desc: 'envia commits para o remote' }],
    successMsg: 'Push feito! Seus commits agora estão no servidor remoto.',
  },

  // ─── M35 ───────────────────────────────────────────────────────────────────
  {
    id: 35, title: 'Baixe histórico do remote',
    subtitle: 'Missão 35 · Sincronizar',
    description: '<p class="inst-desc">Um colaborador fez um commit no remote! Use <code>git fetch</code> para baixar as atualizações <em>sem</em> alterar seus arquivos locais. Depois veja com <code>git log --all</code>.</p>',
    objectives: [
      { id: 'm35a', text: 'Baixe as atualizações com git fetch origin',
        check: (sim, cmd, r) => r.success && /git\s+fetch/.test(cmd) && sim.branches['origin/main'] },
      { id: 'm35b', text: 'Veja o histórico completo incluindo o remote',
        check: (sim, cmd, r) => r.success && /git\s+log.*--all/.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 34); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"fetch" é seguro — só baixa informações do remote, não altera seus arquivos locais.',
      'Após o fetch, um branch "origin/main" aparecerá mostrando o estado do remote.',
      'Passo 1: git fetch origin\nPasso 2: git log --oneline --all (veja os novos commits do colaborador)',
    ],
    newCommands: [{ name: 'git fetch origin', desc: 'baixa atualizações do remote sem integrar' }],
    successMsg: 'Fetch feito! Os commits do colaborador estão em origin/main mas não no seu main ainda.',
  },

  // ─── M36 ───────────────────────────────────────────────────────────────────
  {
    id: 36, title: 'Pull: baixe e integre',
    subtitle: 'Missão 36 · Sincronizar',
    description: '<p class="inst-desc"><code>git pull</code> = <code>git fetch</code> + <code>git merge</code>. Baixe e integre as mudanças do remote de uma vez. Ideal para se manter atualizado.</p>',
    objectives: [
      { id: 'm36a', text: 'Integre as mudanças do remote com git pull',
        check: (sim, cmd, r) => {
          if (!r.success || !/^git\s+pull/.test(cmd.trim())) return false;
          const originMain = sim.branches['origin/main'];
          return originMain && sim.branches.main === originMain;
        }
      },
    ],
    initialSetup(sim) { buildUpTo(sim, 35); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"pull" combina fetch e merge — após o pull seus arquivos locais têm as mudanças do remote.',
      'O local/main passará a apontar para o mesmo commit que origin/main.',
      'Use: git pull (ou: git pull origin main).',
    ],
    newCommands: [{ name: 'git pull', desc: 'baixa e integra mudanças do remote' }],
    successMsg: 'Pull completo! Você está em sincronia com o repositório remoto.',
  },

  // ─── M37 ───────────────────────────────────────────────────────────────────
  {
    id: 37, title: 'Salve mudanças temporariamente',
    subtitle: 'Missão 37 · Stash',
    description: '<p class="inst-desc">Faça uma mudança no README sem commitar, depois salve temporariamente com <code>git stash</code>. O stash é como uma "pilha de rascunhos" — guarda sem commitar.</p>',
    objectives: [
      { id: 'm37a', text: 'Faça uma mudança em README.md sem commitar',
        check: (sim) => {
          const wt = sim.workingTree['README.md'];
          const idx = sim.index['README.md'];
          return wt !== undefined && wt !== idx;
        }
      },
      { id: 'm37b', text: 'Guarde a mudança com git stash',
        check: (sim, cmd, r) => r.success && /^git\s+stash(?:\s+push)?\s*$/.test(cmd.trim()) && sim.stash.length > 0 },
    ],
    initialSetup(sim) { buildUpTo(sim, 36); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'O stash é como tirar os papéis da mesa e guardar numa gaveta — você volta para eles depois.',
      'Primeiro modifique o README, depois use git stash para guardar.',
      'Passo 1: echo "mudança temporária" >> README.md\nPasso 2: git stash\nDepois: git status mostrará "nothing to commit".',
    ],
    newCommands: [{ name: 'git stash', desc: 'guarda mudanças temporariamente sem commitar' }],
    successMsg: 'Mudanças guardadas no stash! O working tree está limpo.',
  },

  // ─── M38 ───────────────────────────────────────────────────────────────────
  {
    id: 38, title: 'Liste os stashes',
    subtitle: 'Missão 38 · Stash',
    description: '<p class="inst-desc">Veja todos os conjuntos de mudanças guardados no stash. Você pode ter múltiplos stashes, cada um com um índice (<code>stash@{0}</code>, <code>stash@{1}</code>...).</p>',
    objectives: [
      { id: 'm38a', text: 'Liste os stashes com git stash list',
        check: (sim, cmd, r) => r.success && /git\s+stash\s+list/.test(cmd) },
    ],
    initialSetup(sim) { buildUpTo(sim, 37); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      'Você pode acumular vários stashes — git stash list mostra todos.',
      'A entrada mais recente é sempre stash@{0}. As mais antigas têm índices maiores.',
      'Use: git stash list',
    ],
    newCommands: [{ name: 'git stash list', desc: 'lista todos os stashes salvos' }],
    successMsg: 'Você viu a lista de stashes! stash@{0} é sempre o mais recente.',
  },

  // ─── M39 ───────────────────────────────────────────────────────────────────
  {
    id: 39, title: 'Restaure o stash',
    subtitle: 'Missão 39 · Stash',
    description: '<p class="inst-desc">Restaure as mudanças do stash mais recente de volta ao diretório de trabalho. <code>pop</code> restaura E remove da pilha. Use <code>apply</code> se quiser manter o stash.</p>',
    objectives: [
      { id: 'm39a', text: 'Restaure o stash com git stash pop',
        check: (sim, cmd, r) => r.success && /git\s+stash\s+pop/.test(cmd) && sim.stash.length === 0 },
    ],
    initialSetup(sim) { buildUpTo(sim, 38); },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"pop" pega o stash@{0} (mais recente), restaura as mudanças e remove da lista.',
      'Use "apply" em vez de "pop" se quiser manter o stash disponível para outros branches.',
      'Use: git stash pop. Suas mudanças voltam ao working tree.',
    ],
    newCommands: [{ name: 'git stash pop', desc: 'restaura e remove o stash mais recente' }],
    successMsg: 'Mudanças restauradas! O stash foi removido da pilha.',
  },

  // ─── M40 ───────────────────────────────────────────────────────────────────
  {
    id: 40, title: 'Desfaça commits preservando mudanças',
    subtitle: 'Missão 40 · Desfazer',
    description: '<p class="inst-desc">O último commit tem uma mensagem horrível! Use <code>git reset HEAD~1</code> para desfazer o commit preservando os arquivos no disco. Depois refaça com uma mensagem melhor.</p>',
    objectives: [
      { id: 'm40a', text: 'Veja o commit ruim com git log --oneline',
        check: (sim, cmd, r) => r.success && /git\s+log.*--oneline/.test(cmd) },
      { id: 'm40b', text: 'Desfaça o último commit preservando os arquivos (git reset HEAD~1)',
        check: (sim, cmd, r) => {
          if (!r.success || !/git\s+reset.*HEAD~1/.test(cmd)) return false;
          return sim._initialCommitCount !== undefined && sim.commits.length < sim._initialCommitCount;
        }
      },
      { id: 'm40c', text: 'Refaça o commit com uma mensagem melhor',
        check: (sim, cmd, r) => {
          if (!r.success || !/^git\s+commit/.test(cmd.trim())) return false;
          return sim._initialCommitCount !== undefined && sim.commits.length >= sim._initialCommitCount;
        }
      },
    ],
    initialSetup(sim) {
      buildUpTo(sim, 36); // Start from a clean state after pull
      // Add a "bad commit" that the player needs to undo
      const curH = sim.branches.main;
      const curTree = sim.workingTree;
      const badTree = { ...curTree, 'RASCUNHO.md': 'trabalho em progresso...' };
      const badH = sim._hash();
      sim.commits.push({
        hash: badH, shortHash: badH.slice(0, 7),
        message: 'asdfgh: mensagem de commit horrível!!!',
        parents: curH ? [curH] : [], tree: { ...badTree },
        timestamp: Date.now() - 5000,
        author: { ...sim.user }, branch: 'main',
      });
      sim.branches.main = badH;
      sim.workingTree = { ...badTree };
      sim.index = { ...badTree };
      sim._initialCommitCount = sim.commits.length;
    },
    winCondition: (sim, cmd, obj) => Object.values(obj).every(Boolean),
    hints: [
      '"git reset HEAD~1" move o ponteiro do branch um commit para trás — o commit some mas os arquivos ficam no disco.',
      '"HEAD~1" significa "um commit antes do HEAD atual". Os arquivos continuam no working tree para você refazer.',
      'Passo 1: git log --oneline (veja o commit ruim)\nPasso 2: git reset HEAD~1 (desfaz o commit)\nPasso 3: git add . && git commit -m "uma mensagem descritiva"',
    ],
    newCommands: [{ name: 'git reset HEAD~1', desc: 'desfaz último commit preservando os arquivos' }],
    successMsg: 'Parabéns! Você completou todas as 40 missões e dominou o Git!',
  },

];
