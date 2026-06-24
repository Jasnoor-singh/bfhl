const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// ─── YOUR CREDENTIALS ──────────────────────────────────────────────────────
const USER_ID = process.env.USER_ID || "jasnoorsinghkanwar_12012005";
const EMAIL_ID = process.env.EMAIL_ID || "jasnoor4784.be23@chitkara.edu.in";
const COLLEGE_ROLL = process.env.COLLEGE_ROLL || "2310994784";
// ───────────────────────────────────────────────────────────────────────────

// Valid node format: single uppercase letter -> single uppercase letter (not same)
const VALID_NODE_RE = /^([A-Z])->([A-Z])$/;

function parseAndProcess(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const seen_edges = new Set();
  const valid_edges = []; // [parent, child]

  for (let raw of data) {
    const entry = typeof raw === 'string' ? raw.trim() : String(raw).trim();

    // Validate format
    const match = entry.match(VALID_NODE_RE);
    if (!match) {
      invalid_entries.push(raw);
      continue;
    }

    const [, parent, child] = match;

    // Self-loop check
    if (parent === child) {
      invalid_entries.push(raw);
      continue;
    }

    // Duplicate check
    const edgeKey = `${parent}->${child}`;
    if (seen_edges.has(edgeKey)) {
      if (!duplicate_edges.includes(edgeKey)) {
        duplicate_edges.push(edgeKey);
      }
      continue;
    }

    seen_edges.add(edgeKey);
    valid_edges.push([parent, child]);
  }

  // Build adjacency structures
  const childParent = new Map();
  const parentChildren = new Map();
  const allNodes = new Set();

  for (const [parent, child] of valid_edges) {
    allNodes.add(parent);
    allNodes.add(child);

    // Diamond: if child already has a parent, discard this edge silently
    if (childParent.has(child)) {
      continue;
    }
    childParent.set(child, parent);

    if (!parentChildren.has(parent)) parentChildren.set(parent, []);
    parentChildren.get(parent).push(child);
  }

  // Find connected components using Union-Find on allNodes
  const parent_uf = {};
  for (const n of allNodes) parent_uf[n] = n;

  function find(x) {
    if (parent_uf[x] !== x) parent_uf[x] = find(parent_uf[x]);
    return parent_uf[x];
  }

  function union(x, y) {
    parent_uf[find(x)] = find(y);
  }

  for (const [p, c] of valid_edges) {
    union(p, c);
  }

  const components = new Map();
  for (const n of allNodes) {
    const root = find(n);
    if (!components.has(root)) components.set(root, new Set());
    components.get(root).add(n);
  }

  const hierarchies = [];

  for (const [, compNodes] of components) {
    const roots = [...compNodes].filter(n => !childParent.has(n));

    const componentRoot = roots.length > 0
      ? roots.sort()[0]
      : [...compNodes].sort()[0];

    const hasCycle = detectCycle(compNodes, parentChildren);

    if (hasCycle) {
      hierarchies.push({
        root: componentRoot,
        tree: {},
        has_cycle: true
      });
    } else {
      const tree = buildTree(componentRoot, parentChildren);
      const depth = calcDepth(componentRoot, parentChildren);
      hierarchies.push({
        root: componentRoot,
        tree,
        depth
      });
    }
  }

  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclic = hierarchies.filter(h => h.has_cycle);

  let largest_tree_root = "";
  if (nonCyclic.length > 0) {
    let maxDepth = -1;
    for (const h of nonCyclic) {
      if (h.depth > maxDepth || (h.depth === maxDepth && h.root < largest_tree_root)) {
        maxDepth = h.depth;
        largest_tree_root = h.root;
      }
    }
  }

  const summary = {
    total_trees: nonCyclic.length,
    total_cycles: cyclic.length,
    largest_tree_root
  };

  return { hierarchies, invalid_entries, duplicate_edges, summary };
}

function detectCycle(nodes, parentChildren) {
  const visited = new Set();
  const inStack = new Set();

  function dfs(node) {
    visited.add(node);
    inStack.add(node);
    const children = parentChildren.get(node) || [];
    for (const child of children) {
      if (!nodes.has(child)) continue;
      if (!visited.has(child)) {
        if (dfs(child)) return true;
      } else if (inStack.has(child)) {
        return true;
      }
    }
    inStack.delete(node);
    return false;
  }

  for (const n of nodes) {
    if (!visited.has(n)) {
      if (dfs(n)) return true;
    }
  }
  return false;
}

function buildTree(node, parentChildren) {
  const children = parentChildren.get(node) || [];
  const subtree = {};

  for (const child of children) {
    subtree[child] = buildTree(child, parentChildren)[child];
  }

  return {
    [node]: subtree
  };
}

function calcDepth(node, parentChildren) {
  const children = parentChildren.get(node) || [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(c => calcDepth(c, parentChildren)));
}

// POST /bfhl
app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Request body must have a 'data' array." });
    }

    const { hierarchies, invalid_entries, duplicate_edges, summary } = parseAndProcess(data);

    res.json({
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: COLLEGE_ROLL,
      hierarchies,
      invalid_entries,
      duplicate_edges,
      summary
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  }
});
app.get("/", (req, res) => {
  res.send("BFHL API is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
