import { defaultParams, getDef } from '../src/data/catalog';
import type { EngineEdge, EngineHooks } from '../src/engine/engine';
import type { FlowNode, RunRecord } from '../src/types';

let seq = 0;

/** Crée un nœud de test avec les paramètres par défaut du catalogue. */
export function node(defType: string, params: Record<string, unknown> = {}, label?: string): FlowNode {
  seq += 1;
  return {
    id: `n${seq}`,
    type: 'flux',
    position: { x: 0, y: 0 },
    data: { defType, label: label ?? getDef(defType).label, params: { ...defaultParams(defType), ...params } },
  };
}

/** Relie deux nœuds (port de sortie optionnel, pour Condition / Aiguillage). */
export function edge(source: FlowNode, target: FlowNode, port = 0): EngineEdge {
  return { id: `e_${source.id}_${target.id}_${port}`, source: source.id, target: target.id, sourceHandle: `out-${port}` };
}

/** Hooks qui enregistrent chaque résultat de nœud, indexés par id. */
export function recorder() {
  const records = new Map<string, RunRecord>();
  const hooks: EngineHooks = {
    onNodeStart: () => {},
    onNodeFinish: (rec) => records.set(rec.nodeId, rec),
    onEdgeActive: () => {},
    onEdgeDone: () => {},
    shouldAbort: () => false,
  };
  return { hooks, records };
}

/** Déclencheur manuel qui émet l'objet ou le tableau JSON fourni. */
export function trigger(sample: unknown): FlowNode {
  return node('manualTrigger', { sample: JSON.stringify(sample) });
}
