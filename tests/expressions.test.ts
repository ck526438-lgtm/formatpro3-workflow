import { describe, expect, it } from 'vitest';
import { defaultCtx, evalExpression, resolveDeep, resolveString, type ExprContext } from '../src/engine/expressions';

const ctx = (over: Partial<ExprContext> = {}): ExprContext => ({
  ...defaultCtx({ 'Requête HTTP': [{ statut: 200 }, { statut: 404 }] }),
  json: { nom: 'Awa', montant: 4900, tags: ['vip'], adresse: { ville: 'Abidjan' } },
  items: [{ a: 1 }, { a: 2 }, { a: 3 }],
  index: 2,
  creds: { brevo: 'cle-secrete' },
  ...over,
});

describe('evalExpression', () => {
  it('lit $json, $items, $index et $creds', () => {
    expect(evalExpression('$json.nom', ctx())).toBe('Awa');
    expect(evalExpression('$items.length', ctx())).toBe(3);
    expect(evalExpression('$index + 1', ctx())).toBe(3);
    expect(evalExpression('$creds.brevo', ctx())).toBe('cle-secrete');
  });

  it('accède aux sorties d’un autre nœud via $node["…"]', () => {
    expect(evalExpression('$node["Requête HTTP"].json.statut', ctx())).toBe(200);
    expect(evalExpression('$node["Requête HTTP"].items.length', ctx())).toBe(2);
    expect(evalExpression('$node["Inconnu"].json', ctx())).toEqual({});
  });

  it('renvoie undefined au lieu de lever sur une erreur', () => {
    expect(evalExpression('$json.absent.profond', ctx())).toBeUndefined();
    expect(evalExpression('syntaxe ((( invalide', ctx())).toBeUndefined();
  });
});

describe('resolveString', () => {
  it('laisse intacte une chaîne sans expression', () => {
    expect(resolveString('Bonjour', ctx())).toBe('Bonjour');
  });

  it('conserve le type quand la chaîne est une expression unique', () => {
    expect(resolveString('{{ $json.montant }}', ctx())).toBe(4900);
    expect(resolveString('  {{ $json.tags }} ', ctx())).toEqual(['vip']);
  });

  it('résout une chaîne qui commence et finit par une expression (régression)', () => {
    expect(resolveString('{{ $json.nom }} {{ $json.montant }}', ctx())).toBe('Awa 4900');
  });

  it('interpole plusieurs expressions dans un texte', () => {
    expect(resolveString('{{ $json.nom }} habite {{ $json.adresse.ville }}', ctx())).toBe('Awa habite Abidjan');
  });

  it('sérialise les objets en JSON et null en chaîne vide', () => {
    expect(resolveString('x={{ $json.adresse }}', ctx())).toBe('x={"ville":"Abidjan"}');
    expect(resolveString('[{{ null }}]', ctx())).toBe('[]');
  });

  it('garde le texte d’origine quand l’expression échoue', () => {
    expect(resolveString('{{ $json.absent.x }}', ctx())).toBe('{{ $json.absent.x }}');
    expect(resolveString('a {{ $json.absent.x }} b', ctx())).toBe('a {{ $json.absent.x }} b');
  });
});

describe('resolveDeep', () => {
  it('résout récursivement objets et tableaux sans toucher aux autres types', () => {
    const out = resolveDeep(
      { titre: '{{ $json.nom }}', liste: ['{{ $index }}', 7, true], meta: { vide: null, ville: '{{ $json.adresse.ville }}' } },
      ctx(),
    );
    expect(out).toEqual({ titre: 'Awa', liste: [2, 7, true], meta: { vide: null, ville: 'Abidjan' } });
  });
});
