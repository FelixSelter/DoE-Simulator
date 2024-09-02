import { AssignmentNode, SymbolNode } from "mathjs";
import { none, Option, some } from "ts-option";

export function getUnknownsFromFormula(parsed: math.MathNode) {
  const unknowns = new Set<string>();
  const targets = new Set<string>();

  parsed.traverse((node) => {
    switch (node.type) {
      case "SymbolNode": {
        const symbolNode = node as SymbolNode;
        if (!targets.has(symbolNode.name)) unknowns.add(symbolNode.name);
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

export function uniformRandom(lowerBound: number, upperBound: number) {
  const mean = (lowerBound + upperBound) / 2;
  const half = mean - lowerBound;

  return mean + (Math.random() - 0.5) * 2 * half;
}

let boxMuellerCache: Option<number> = none;
export function boxMueller(lowerBound: number, upperBound: number) {
  const mean = (lowerBound + upperBound) / 2;
  // Sigma rules tell that 99.7% of values are in the interval from mean-3*standardDeviation to mean+3*standardDeviation.
  // Therefore a= mean-3*standardDeviation and b=mean+3*standardDeviation because we want the generated values to be inside that interval
  //standardDeviation = (b-mean)/3. Plug in mean formula
  //standardDeviation = (b-(a + b) / 2)/3 = (b-a)/6
  const standardDeviation = (upperBound - lowerBound) / 6;

  let randomNumber;
  do {
    let value;
    if (boxMuellerCache.isDefined) {
      value = boxMuellerCache.get;
      boxMuellerCache = none;
    } else {
      const a = Math.random();
      const b = Math.random();

      boxMuellerCache = some(
        Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b)
      );
      value = Math.sqrt(-2 * Math.log(a)) * Math.sin(2 * Math.PI * b);
    }

    randomNumber = value * standardDeviation + mean;

    //Dont forget to check if we are unlucky and gut the 0.3% that our value lies outside the interval
  } while (randomNumber < lowerBound || randomNumber > upperBound);

  return randomNumber;
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
