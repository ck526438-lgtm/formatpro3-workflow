import { describe, expect, it } from 'vitest';
import { executeWorkflow, topoOrder } from '../src/engine/engine';
import { edge, node, recorder, trigger } from './helpers';
import type { FlowNode } from '../src/types';
import type { EngineEdge } from '../src/engine/engine';

async function run(nodes: FlowNode[], edges: EngineEdge[], creds?: Record<string, string>) {
  const { hooks, records } = recorder();
  await executeWorkflow({ nodes, edges, hooks, minNodeMs: 0, flowMs: 0, creds });
  return records;
}

const people = [
  { nom: 'Awa', age: 31, ville: 'Abidjan' },
  { nom: 'Koffi', age: 24, ville: 'Bouaké' },
  { nom: 'Mariam', age: 42, ville: 'Abidjan' },
  { nom: 'Awa', age: 31, ville: 'Abidjan' },
];

/** Déclencheur + Éclater : produit un élément par personne. */
function source() {
  const t = trigger({ personnes: people });
  const split = node('splitOut', { field: 'personnes' });
  return { t, split, nodes: [t, split], edges: [edge(t, split)] };
}

describe('topoOrder', () => {
  it('ordonne les nœuds selon leurs dépendances', () => {
    const a = node('manualTrigger'), b = node('noOp'), c = node('noOp');
    const { order, cycle } = topoOrder([c, b, a], [edge(a, b), edge(b, c)]);
    expect(cycle).toBe(false);
    expect(order.map((n) => n.id)).toEqual([a.id, b.id, c.id]);
  });

  it('détecte une boucle', () => {
    const a = node('noOp'), b = node('noOp');
    expect(topoOrder([a, b], [edge(a, b), edge(b, a)]).cycle).toBe(true);
  });

  it('refuse d’exécuter un flux qui boucle', async () => {
    const t = trigger({}), a = node('noOp'), b = node('noOp');
    await expect(run([t, a, b], [edge(t, a), edge(a, b), edge(b, a)])).rejects.toThrow(/Boucle/);
  });
});

describe('executeWorkflow — orchestration', () => {
  it('fait circuler les données du déclencheur aux nœuds suivants', async () => {
    const { nodes, edges, split } = source();
    const recs = await run(nodes, edges);
    expect(recs.get(split.id)?.status).toBe('success');
    expect(recs.get(split.id)?.output).toHaveLength(4);
  });

  it('ignore un nœud racine qui n’est pas un déclencheur', async () => {
    const orphan = node('noOp');
    const recs = await run([orphan], []);
    expect(recs.get(orphan.id)?.status).toBe('skipped');
  });

  it('n’exécute pas les nœuds désactivés ni ceux en aval', async () => {
    const t = trigger({ x: 1 });
    const off = { ...node('noOp'), data: { ...node('noOp').data, disabled: true } };
    const after = node('noOp');
    const recs = await run([t, off, after], [edge(t, off), edge(off, after)]);
    expect(recs.has(off.id)).toBe(false);
    expect(recs.get(after.id)?.status).toBe('skipped');
  });

  it('suit la branche Vrai / Faux d’une Condition', async () => {
    const { nodes, edges, split } = source();
    const cond = node('if', { left: '{{ $json.age }}', operator: 'gt', right: '30' });
    const yes = node('noOp', {}, 'Oui'), no = node('noOp', {}, 'Non');
    const recs = await run([...nodes, cond, yes, no], [...edges, edge(split, cond), edge(cond, yes, 0), edge(cond, no, 1)]);
    expect(recs.get(yes.id)?.output.map((p) => p.nom)).toEqual(['Awa', 'Mariam', 'Awa']);
    expect(recs.get(no.id)?.output.map((p) => p.nom)).toEqual(['Koffi']);
  });

  it('saute une branche qui ne reçoit aucun élément', async () => {
    const t = trigger({ statut: 'ok' });
    const cond = node('if', { left: '{{ $json.statut }}', operator: 'equals', right: 'ok' });
    const yes = node('noOp'), no = node('noOp');
    const recs = await run([t, cond, yes, no], [edge(t, cond), edge(cond, yes, 0), edge(cond, no, 1)]);
    expect(recs.get(yes.id)?.status).toBe('success');
    expect(recs.get(no.id)?.status).toBe('skipped');
  });

  it('route avec l’Aiguillage (cas 1, cas 2, défaut)', async () => {
    const { nodes, edges, split } = source();
    const sw = node('switch', { value: '{{ $json.ville }}', case1: 'Abidjan', case2: 'Bouaké' });
    const [p0, p1, p2] = [node('noOp'), node('noOp'), node('noOp')];
    const recs = await run([...nodes, sw, p0, p1, p2], [...edges, edge(split, sw), edge(sw, p0, 0), edge(sw, p1, 1), edge(sw, p2, 2)]);
    expect(recs.get(p0.id)?.output).toHaveLength(3);
    expect(recs.get(p1.id)?.output).toHaveLength(1);
    expect(recs.get(p2.id)?.status).toBe('skipped');
  });

  it('remonte l’erreur d’un nœud et la consigne dans son journal', async () => {
    const t = trigger({});
    const code = node('code', { code: 'throw new Error("boum");' });
    const { hooks, records } = recorder();
    await expect(executeWorkflow({ nodes: [t, code], edges: [edge(t, code)], hooks, minNodeMs: 0, flowMs: 0 })).rejects.toThrow('boum');
    expect(records.get(code.id)).toMatchObject({ status: 'error', error: 'boum' });
  });

  it('s’arrête quand shouldAbort renvoie vrai', async () => {
    const t = trigger({}), a = node('noOp');
    const { hooks, records } = recorder();
    hooks.shouldAbort = () => true;
    await executeWorkflow({ nodes: [t, a], edges: [edge(t, a)], hooks, minNodeMs: 0, flowMs: 0 });
    expect(records.size).toBe(0);
  });

  it('expose les sorties précédentes via $node["Libellé"]', async () => {
    const t = node('manualTrigger', { sample: '{"client":"ACME"}' }, 'Départ');
    const set = node('set', { keepOnly: true, fields: [{ key: 'repris', value: '{{ $node["Départ"].json.client }}' }] });
    const recs = await run([t, set], [edge(t, set)]);
    expect(recs.get(set.id)?.output).toEqual([{ repris: 'ACME' }]);
  });
});

describe('executeWorkflow — nœuds de données', () => {
  async function through(n: FlowNode) {
    const { nodes, edges, split } = source();
    const recs = await run([...nodes, n], [...edges, edge(split, n)]);
    const rec = recs.get(n.id)!;
    expect(rec.status, rec.error).toBe('success');
    return rec.output;
  }

  it('Filtrer', async () => {
    const out = await through(node('filter', { left: '{{ $json.ville }}', operator: 'equals', right: 'Abidjan' }));
    expect(out).toHaveLength(3);
  });

  it('Limiter', async () => {
    expect(await through(node('limit', { max: 2 }))).toHaveLength(2);
  });

  it('Trier (numérique, décroissant)', async () => {
    const out = await through(node('sort', { field: 'age', order: 'desc' }));
    expect(out.map((p) => p.age)).toEqual([42, 31, 31, 24]);
  });

  it('Dédoublonner sur un champ', async () => {
    const out = await through(node('removeDuplicates', { field: 'nom' }));
    expect(out.map((p) => p.nom)).toEqual(['Awa', 'Koffi', 'Mariam']);
  });

  it('Agréger (somme)', async () => {
    const out = await through(node('aggregate', { mode: 'sum', field: 'age' }));
    expect(out).toEqual([{ champ: 'age', somme: 128, nombre: 4 }]);
  });

  it('Agréger (compte)', async () => {
    expect(await through(node('aggregate', { mode: 'count' }))).toEqual([{ nombre: 4 }]);
  });

  it('Éditer les champs avec expressions', async () => {
    const out = await through(
      node('set', { keepOnly: true, fields: [{ key: 'label', value: '{{ $json.nom }} ({{ $json.age }})' }] }),
    );
    expect(out[1]).toEqual({ label: 'Koffi (24)' });
  });

  it('Code JS', async () => {
    const out = await through(node('code', { code: 'return items.map((i) => ({ json: { majeur: i.age >= 18 } }));' }));
    expect(out.every((i) => i.majeur === true)).toBe(true);
  });

  it('Crypto (SHA-256, Base64, Hex)', async () => {
    const [sha] = await through(node('crypto', { field: 'nom', algorithm: 'SHA-256', target: 'h' }));
    expect(sha.h).toBe('c866087348018f399651ef2dcfd662e68713d6be58df66552a452ba1f6e9f69e');
    const [b64] = await through(node('crypto', { field: 'nom', algorithm: 'Base64', target: 'h' }));
    expect(b64.h).toBe('QXdh');
    const [hex] = await through(node('crypto', { field: 'nom', algorithm: 'Hexadécimal', target: 'h' }));
    expect(hex.h).toBe('417761');
  });

  it('Parser JSON signale une entrée invalide', async () => {
    const t = trigger({ brut: '{"ok":true}' });
    const bad = trigger({ brut: 'pas du json' });
    const p1 = node('jsonParse', { field: 'brut' }), p2 = node('jsonParse', { field: 'brut' });
    const recs = await run([t, bad, p1, p2], [edge(t, p1), edge(bad, p2)]);
    expect(recs.get(p1.id)?.output[0].brut).toEqual({ ok: true });
    expect(recs.get(p2.id)?.output[0]._erreurParse).toBe(true);
  });

  it('Fusionner par index combine deux branches', async () => {
    const a = trigger({ x: 1 }), b = trigger({ y: 2 });
    const merge = node('merge', { mode: 'index' });
    const recs = await run([a, b, merge], [edge(a, merge), edge(b, merge)]);
    expect(recs.get(merge.id)?.output).toEqual([{ x: 1, y: 2 }]);
  });
});

describe('executeWorkflow — nœuds IA locaux (sans clé)', () => {
  it('Sentiment détecte un texte positif', async () => {
    const t = trigger({ avis: 'Excellent service, très satisfait, je recommande !' });
    const s = node('aiSentiment', { text: '{{ $json.avis }}' });
    const recs = await run([t, s], [edge(t, s)]);
    const rec = recs.get(s.id)!;
    expect(rec.status, rec.error).toBe('success');
    expect(JSON.stringify(rec.output[0])).toMatch(/positif/i);
  });

  it('Résumer fonctionne hors ligne', async () => {
    const texte = 'Le projet avance bien. L’équipe a livré la version deux. Les clients sont satisfaits. La suite arrive bientôt.';
    const t = trigger({ texte });
    const s = node('aiSummarize', { text: '{{ $json.texte }}', provider: 'local' });
    const recs = await run([t, s], [edge(t, s)]);
    expect(recs.get(s.id)?.output[0]).toMatchObject({ moteur: 'local' });
    expect(typeof recs.get(s.id)?.output[0].resume).toBe('string');
  });
});
