import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_ORDER, NODE_DEFS, defaultParams, getDef } from '../src/data/catalog';
import { TEMPLATES } from '../src/data/templates';
import { topoOrder } from '../src/engine/engine';

describe('catalogue des nœuds', () => {
  it('contient 44 nœuds aux types uniques', () => {
    expect(NODE_DEFS).toHaveLength(44);
    expect(new Set(NODE_DEFS.map((d) => d.type)).size).toBe(NODE_DEFS.length);
  });

  it('associe chaque nœud à une catégorie connue', () => {
    for (const d of NODE_DEFS) {
      expect(CATEGORIES[d.category], d.type).toBeDefined();
      expect(CATEGORY_ORDER).toContain(d.category);
    }
  });

  it('déclare des paramètres aux clés uniques et des options pour chaque liste', () => {
    for (const d of NODE_DEFS) {
      const keys = d.params.map((p) => p.key);
      expect(new Set(keys).size, d.type).toBe(keys.length);
      for (const p of d.params) if (p.type === 'select') expect(p.options?.length, `${d.type}.${p.key}`).toBeGreaterThan(0);
    }
  });

  it('les déclencheurs n’ont pas d’entrée', () => {
    for (const d of NODE_DEFS.filter((x) => x.category === 'trigger')) expect(d.inputs, d.type).toBe(0);
  });

  it('defaultParams renvoie des copies indépendantes', () => {
    const a = defaultParams('set'), b = defaultParams('set');
    expect(a).toEqual(b);
    if (Array.isArray(a.fields)) expect(a.fields).not.toBe(b.fields);
  });

  it('getDef retombe sur un nœud valide pour un type inconnu', () => {
    expect(getDef('type-inexistant')).toBe(NODE_DEFS[0]);
  });
});

describe('modèles', () => {
  it.each(TEMPLATES.map((t) => [t.name, t] as const))('« %s » produit un graphe valide et sans boucle', (_name, tpl) => {
    const { nodes, edges } = tpl.build();
    expect(nodes.length).toBeGreaterThan(1);
    const ids = new Set(nodes.map((n) => n.id));
    for (const e of edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
    for (const n of nodes) expect(NODE_DEFS.some((d) => d.type === n.data.defType), n.data.defType).toBe(true);
    expect(topoOrder(nodes, edges).cycle).toBe(false);
    expect(nodes.some((n) => getDef(n.data.defType).category === 'trigger')).toBe(true);
  });
});
