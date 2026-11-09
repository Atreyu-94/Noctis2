import { readFileSync } from 'node:fs';
import { createMatchers } from './references/textmate-scope-matcher.mjs';

// An offline model, not a claim to have inspected rendered editor pixels.
// Mirrors selector scoring and property-wise precedence from VS Code 1.145.2:
// tokenClassificationRegistry.ts::parseTokenSelector and colorThemeData.ts::getTokenStyle.
export const semanticModelVersion = '1.145.2';
const defaults = JSON.parse(readFileSync(new URL('./references/semantic-defaults.json', import.meta.url))).rules;
const properties = ['foreground', 'bold', 'italic', 'underline', 'strikethrough'];
function nameMatcher(identifiers, scopes) {
  if (scopes.length < identifiers.length) return -1;
  let score;
  const every = identifiers.every(identifier => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i] === identifier || scopes[i].startsWith(identifier + '.')) {
        score = (i + 1) * 0x10000 + identifier.length;
        return true;
      }
    }
    return false;
  });
  return every && score !== undefined ? score : -1;
}
export function createSemanticStyleModel(theme, extensions) {
  const parents = new Map([['member', 'method']]);
  const fallbackRules = [...defaults];
  for (const extension of Object.values(extensions)) {
    for (const type of extension.semanticTokenTypes ?? []) if (type.superType) parents.set(type.id, type.superType);
    for (const contribution of extension.semanticTokenScopes ?? []) {
      for (const [selector, scopes] of Object.entries(contribution.scopes)) {
        fallbackRules.push({ selector: selector + (contribution.language ? ':' + contribution.language : ''), scopes: scopes.map(scope => scope.split(' ')) });
      }
    }
  }
  function score(selector, token, language) {
    const [classifier, restricted] = selector.split(':');
    if (restricted && restricted !== language) return -1;
    const [type, ...modifiers] = classifier.split('.');
    if (!modifiers.every(modifier => token.modifiers.includes(modifier))) return -1;
    let result = (restricted ? 10 : 0) + modifiers.length * 100;
    if (type !== '*') {
      const hierarchy = [token.type];
      while (parents.has(hierarchy.at(-1)) && !hierarchy.includes(parents.get(hierarchy.at(-1)))) hierarchy.push(parents.get(hierarchy.at(-1)));
      const level = hierarchy.indexOf(type);
      if (level < 0) return -1;
      result += 100 - level;
    }
    return result;
  }
  const scopeRules = theme.tokenColors.map(rule => {
    const matchers = [];
    for (const selector of typeof rule.scope === 'string' ? [rule.scope] : rule.scope ?? []) createMatchers(selector, nameMatcher, matchers);
    return { settings: rule.settings, match: scopes => matchers.length ? Math.max(...matchers.map(m => m.matcher(scopes))) : -1 };
  });
  function resolveScopes(probes) {
    for (const scopes of probes) {
      let foreground, fontStyle, foregroundScore = -1, fontScore = -1;
      for (const rule of scopeRules) {
        const weight = rule.match(scopes);
        if (weight < 0) continue;
        if (rule.settings.foreground && weight >= foregroundScore) { foreground = rule.settings.foreground; foregroundScore = weight; }
        if (typeof rule.settings.fontStyle === 'string' && weight >= fontScore) { fontStyle = rule.settings.fontStyle; fontScore = weight; }
      }
      if (foreground !== undefined || fontStyle !== undefined) {
        const result = {};
        if (foreground !== undefined) result.foreground = foreground;
        if (fontStyle !== undefined) for (const property of properties.slice(1)) result[property] = fontStyle.split(' ').includes(property);
        return result;
      }
    }
    return undefined;
  }
  return token => {
    const result = {}, provenance = {}, scores = Object.fromEntries(properties.map(property => [property, -1]));
    function apply(style, weight, source) {
      for (const property of properties) if (style[property] !== undefined && weight >= scores[property]) {
        result[property] = style[property]; scores[property] = weight; provenance[property] = source;
      }
    }
    for (const [selector, setting] of Object.entries(theme.semanticTokenColors ?? {})) {
      const weight = score(selector, token, token.languageId);
      if (weight >= 0) apply(typeof setting === 'string' ? { foreground: setting } : setting, weight, { kind: 'theme', selector });
    }
    for (const property of properties) if (scores[property] >= 0) scores[property] = Number.MAX_VALUE;
    for (const rule of fallbackRules) {
      const weight = score(rule.selector, token, token.languageId);
      if (weight < 0) continue;
      const style = resolveScopes(rule.scopes);
      if (style) apply(style, weight, { kind: 'scope-fallback', selector: rule.selector, scopes: rule.scopes });
    }
    return { style: result, provenance };
  };
}
