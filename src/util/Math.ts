import { AssignmentNode, SymbolNode } from "mathjs";
import random from "random";

export function getUnknownsFromFormula(parsed: math.MathNode) {
  const unknowns = new Set<string>();
  const targets = new Set<string>();

  parsed.traverse((node, path, parent) => {
    switch (node.type) {
      case "SymbolNode": {
        const symbolNode = node as SymbolNode;
        if (!(path === "object" && parent.type === "AssignmentNode"))
          unknowns.add(symbolNode.name);
        break;
      }

      case "AssignmentNode": {
        const assignmentNode = node as AssignmentNode;
        targets.add(assignmentNode.object.name);
        break;
      }
    }
  });
  return [Array.from<string>(unknowns), Array.from<string>(targets)];
}

export function uniformRandom(lower: number, upper: number) {
  return random.float(lower, upper);
}

export function normalRandom(
  lower: number,
  upper: number,
  normalDistributionWidth: number,
) {
  const mean = (lower + upper) / 2;
  const sigma = (upper - lower) / normalDistributionWidth;

  return random.normal(mean, sigma)();
}

export function cyrb53(str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
