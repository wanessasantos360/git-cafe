// GraphRenderer — renders the git commit DAG as SVG

class GraphRenderer {
  constructor(svgEl, emptyEl) {
    this.svg   = svgEl;
    this.empty = emptyEl;
    this.tooltip = null;

    // lane colors match CSS variables
    this.laneColors = [
      '#58a6ff', // blue   (main)
      '#3fb950', // green
      '#bc8cff', // purple
      '#ffa657', // orange
      '#f85149', // red
      '#39c5cf', // cyan
    ];

    this.NODE_R  = 8;
    this.ROW_H   = 48;
    this.COL_W   = 28;
    this.PAD_L   = 20;
    this.PAD_T   = 24;
    this.PAD_R   = 16;
    this.LABEL_X = 0; // set after lane calc
  }

  render(sim) {
    const commits = sim.commits;

    if (!commits.length) {
      this.svg.style.display = 'none';
      this.empty.classList.remove('hidden');
      return;
    }

    this.svg.style.display = 'block';
    this.empty.classList.add('hidden');
    this.svg.innerHTML = '';

    // ── Layout ──────────────────────────────────────────────────────────────
    // Sort commits newest → oldest (for top-to-bottom display)
    const ordered = [...commits].sort((a, b) => b.timestamp - a.timestamp);

    // Assign lanes (columns) per branch
    const branchLane = {};
    let nextLane = 0;
    // main always gets lane 0
    branchLane['main'] = 0;
    nextLane = 1;

    // assign other branches in order of first appearance
    for (const c of ordered) {
      const br = c.branch;
      if (br && branchLane[br] === undefined) {
        branchLane[br] = nextLane++;
      }
    }

    // For commits with multiple parents (merges), use parent's lane
    const hashToRow  = {};
    const hashToLane = {};
    const activeLanes = new Map(); // lane -> hash of most recent commit on it

    for (let i = 0; i < ordered.length; i++) {
      const c = ordered[i];
      hashToRow[c.hash] = i;

      let lane = branchLane[c.branch] ?? 0;
      // if it's a merge commit from a non-tracked branch, keep existing lane
      hashToLane[c.hash] = lane;
    }

    // Override lane for commits that are only reachable via detached HEAD
    // (rare in game context — skip for now)

    const numLanes = Math.max(nextLane, 1);
    const svgW = this.PAD_L + numLanes * this.COL_W + 200; // room for labels
    const svgH = this.PAD_T + ordered.length * this.ROW_H + this.PAD_T;

    this.svg.setAttribute('width', svgW);
    this.svg.setAttribute('height', svgH);
    this.svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);

    const cx = (lane) => this.PAD_L + lane * this.COL_W + this.NODE_R;
    const cy = (row)  => this.PAD_T + row * this.ROW_H;
    const labelX = this.PAD_L + numLanes * this.COL_W + 12;

    // ── Draw edges ───────────────────────────────────────────────────────────
    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('class', 'edges');

    for (const c of ordered) {
      const row  = hashToRow[c.hash];
      const lane = hashToLane[c.hash];
      const x1   = cx(lane);
      const y1   = cy(row);

      for (const parentHash of (c.parents || [])) {
        const pRow  = hashToRow[parentHash];
        const pLane = hashToLane[parentHash];
        if (pRow === undefined) continue;
        const x2 = cx(pLane);
        const y2 = cy(pRow);
        const color = this.laneColors[lane % this.laneColors.length];

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let d;
        if (lane === pLane) {
          d = `M ${x1} ${y1} L ${x2} ${y2}`;
        } else {
          // bezier curve for branch/merge edges
          const midY = (y1 + y2) / 2;
          d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        }
        path.setAttribute('d', d);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.7');
        edgeGroup.appendChild(path);
      }
    }
    this.svg.appendChild(edgeGroup);

    // ── Draw nodes ───────────────────────────────────────────────────────────
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.setAttribute('class', 'nodes');

    // Build branch-label map
    const hashToBranches = {};
    for (const [name, hash] of Object.entries(sim.branches)) {
      if (!hash) continue;
      if (!hashToBranches[hash]) hashToBranches[hash] = [];
      hashToBranches[hash].push(name);
    }
    const headHash = sim.headDetached ? sim.HEAD : sim.branches[sim.HEAD];
    const headBranch = sim.headDetached ? null : sim.HEAD;

    for (const c of ordered) {
      const row  = hashToRow[c.hash];
      const lane = hashToLane[c.hash];
      const x    = cx(lane);
      const y    = cy(row);
      const color = this.laneColors[lane % this.laneColors.length];
      const isHead = c.hash === headHash;

      // glow ring for HEAD
      if (isHead) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', x);
        ring.setAttribute('cy', y);
        ring.setAttribute('r', this.NODE_R + 4);
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#d29922');
        ring.setAttribute('stroke-width', '2');
        ring.setAttribute('opacity', '0.7');
        nodeGroup.appendChild(ring);
      }

      // commit circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', this.NODE_R);
      circle.setAttribute('fill', color);
      circle.setAttribute('stroke', isHead ? '#d29922' : '#0d1117');
      circle.setAttribute('stroke-width', isHead ? '2.5' : '1.5');
      circle.setAttribute('class', 'git-node');
      circle.dataset.hash = c.shortHash;
      circle.dataset.msg  = c.message;
      nodeGroup.appendChild(circle);

      // merge indicator (dot in center)
      if (c.mergeCommit) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', 3);
        dot.setAttribute('fill', '#0d1117');
        nodeGroup.appendChild(dot);
      }

      // short hash label
      const hashLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      hashLabel.setAttribute('x', labelX);
      hashLabel.setAttribute('y', y + 4);
      hashLabel.setAttribute('class', 'commit-label');
      hashLabel.textContent = c.shortHash;
      nodeGroup.appendChild(hashLabel);

      // commit message (truncated)
      const msgLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      msgLabel.setAttribute('x', labelX + 52);
      msgLabel.setAttribute('y', y + 4);
      msgLabel.setAttribute('class', 'commit-label');
      msgLabel.setAttribute('fill', '#8b949e');
      const truncMsg = c.message.length > 28 ? c.message.slice(0, 26) + '…' : c.message;
      msgLabel.textContent = truncMsg;
      nodeGroup.appendChild(msgLabel);

      // Branch labels (chips above node)
      const branches = hashToBranches[c.hash] || [];
      let chipX = labelX;
      const chipY = y - 14;

      // HEAD label
      if (isHead && !sim.headDetached) {
        const headLbl = this._makeChip('HEAD', '#d29922', '#1c1a00', chipX, chipY);
        chipX += headLbl._width + 4;
        nodeGroup.appendChild(headLbl);
      } else if (sim.headDetached && c.hash === sim.HEAD) {
        const headLbl = this._makeChip('HEAD', '#d29922', '#1c1a00', chipX, chipY);
        chipX += headLbl._width + 4;
        nodeGroup.appendChild(headLbl);
      }

      for (const br of branches) {
        const laneIdx = branchLane[br] ?? 0;
        const clr = this.laneColors[laneIdx % this.laneColors.length];
        const isCurrentBr = br === headBranch;
        const chip = this._makeChip(br, clr, '#0d1117', chipX, chipY, isCurrentBr);
        chipX += chip._width + 4;
        nodeGroup.appendChild(chip);
      }

      // tooltip on hover
      circle.addEventListener('mouseenter', (e) => this._showTooltip(e, c));
      circle.addEventListener('mouseleave', () => this._hideTooltip());
    }

    this.svg.appendChild(nodeGroup);
  }

  _makeChip(text, textColor, bgColor, x, y, bold = false) {
    const pad = 5;
    const fakeW = text.length * 6.5 + pad * 2;
    const h = 14;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g._width = fakeW;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y - h / 2);
    rect.setAttribute('width', fakeW);
    rect.setAttribute('height', h);
    rect.setAttribute('rx', h / 2);
    rect.setAttribute('fill', bgColor);
    rect.setAttribute('stroke', textColor);
    rect.setAttribute('stroke-width', bold ? '1.5' : '1');
    rect.setAttribute('opacity', bold ? '1' : '0.85');
    g.appendChild(rect);

    const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lbl.setAttribute('x', x + fakeW / 2);
    lbl.setAttribute('y', y + 4);
    lbl.setAttribute('text-anchor', 'middle');
    lbl.setAttribute('class', 'branch-label');
    lbl.setAttribute('fill', textColor);
    lbl.setAttribute('font-weight', bold ? 'bold' : 'normal');
    lbl.textContent = text;
    g.appendChild(lbl);

    return g;
  }

  _showTooltip(e, commit) {
    this._hideTooltip();
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.innerHTML = `<strong>${commit.shortHash}</strong> ${commit.message}<br><small>${new Date(commit.timestamp).toLocaleString('pt-BR')}</small>`;
    document.body.appendChild(tip);
    this.tooltip = tip;

    const rect = e.target.getBoundingClientRect();
    tip.style.left = (rect.right + 8) + 'px';
    tip.style.top  = (rect.top - 10) + 'px';
  }

  _hideTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}
