# Git Café

Jogo interativo no navegador para aprender Git — inspirado no [Oh My Git!](https://ohmygit.org/).

## Sobre o projeto

Git Café ensina controle de versão de forma prática: você digita comandos reais do Git em um terminal emulado e vê o grafo de commits se atualizar em tempo real. São 40 missões progressivas, cada uma construída sobre o estado da anterior.

## Funcionalidades

- **40 missões** cobrindo do `git config` ao `git reset HEAD~1`
- **Grafo de commits SVG** renderizado em tempo real (DAG com suporte a merge commits e branches paralelos)
- **Terminal emulado** com histórico de comandos (seta ↑/↓), autocomplete (Tab), cores ANSI e suporte a `&&`
- **Sistema de dicas progressivo** — cada clique revela uma dica mais específica, nunca mostrando o comando exato
- **Timeline de 40 pontos** no cabeçalho para navegar entre missões
- **Painel de comandos aprendidos** acumulativo (mostra os comandos das missões anteriores)

## Como jogar

Abra `index.html` direto no navegador — não precisa de servidor ou instalação.

```bash
open index.html   # macOS
# ou arraste o arquivo para o navegador
```

## Estrutura

```
jogo-de-git/
├── index.html              # Layout principal (4 quadrantes + header)
├── assets/                 # Favicon e ícones
├── css/
│   └── style.css           # Tema escuro estilo GitHub
└── js/
    ├── git-simulator.js    # Máquina de estados Git virtual
    ├── levels.js           # 40 missões + buildUpTo() helper
    ├── graph-renderer.js   # Renderização SVG do grafo de commits
    ├── terminal.js         # Emulador de terminal
    └── main.js             # GameManager
```

## Comandos suportados no simulador

| Categoria | Comandos |
|---|---|
| Configuração | `git config` |
| Repositório | `git init`, `git status` |
| Staging | `git add`, `git reset <arquivo>` |
| Commits | `git commit`, `git log`, `git show`, `git diff` |
| Branches | `git branch`, `git checkout`, `git merge` |
| Histórico | `git log --oneline --graph`, `git log --follow` |
| Ignorar | `.gitignore`, `git ls-files --ignored` |
| Remoto | `git remote`, `git push`, `git fetch`, `git pull` |
| Stash | `git stash`, `git stash list`, `git stash pop` |
| Desfazer | `git reset HEAD~1`, `git revert`, `git mv` |
| Shell | `ls`, `cat`, `touch`, `echo`, `rm`, `mv`, `cp` |

## Conteúdo das missões

| Nível | Missões | Tema |
|---|---|---|
| Introdução | M01–M05 | Configuração e primeiro repositório |
| Arquivos | M06–M15 | Criar, versionar, stage, commit, renomear |
| Branches | M16–M22 | Criar, mudar, deletar branches |
| Merge | M23–M26 | Fast-forward, merge commit, conflitos |
| Histórico | M27–M32 | Log, diff, show, .gitignore |
| Sincronizar | M33–M36 | Remote, push, fetch, pull |
| Stash | M37–M39 | Guardar e restaurar mudanças |
| Desfazer | M40 | git reset |

## Tecnologias

- HTML/CSS/JavaScript puro — sem dependências externas
- SVG para o grafo de commits
- Emulação de Git 100% no navegador (sem backend)
