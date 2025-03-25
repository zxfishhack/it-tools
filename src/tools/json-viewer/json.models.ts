import { type MaybeRef, get } from '@vueuse/core';
import JSON5 from 'json5';
import jp from 'jsonpath';

export { sortObjectKeys, formatJson };

function sortObjectKeys<T>(obj: T): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys) as unknown as T;
  }

  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .reduce((sortedObj, key) => {
      sortedObj[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
      return sortedObj;
    }, {} as Record<string, unknown>) as T;
}

function unescapeUnicodeJSON(str: string) {
  return str.replace(/\\u([\dA-Fa-f]{4})/g, (match, grp) =>
    String.fromCharCode(Number.parseInt(grp, 16)),
  );
}

function filterJson(raw: string, jsonPath: string) {
  try {
    const res = jp.query(JSON.parse(raw), jsonPath);
    if (res.length > 0) {
      if (res.length === 1) {
        return JSON.stringify(res[0]);
      }
      return JSON.stringify(res);
    }
    return null;
  }
  catch (e) {
    return null;
  }
}

let lastValidJSONPath = '';

function formatJson({
  rawJson,
  sortKeys = true,
  indentSize = 3,
  unescapeUnicode = false,
  jsonPath = '',
}: {
  rawJson: MaybeRef<string>
  sortKeys?: MaybeRef<boolean>
  indentSize?: MaybeRef<number>
  unescapeUnicode?: MaybeRef<boolean>
  jsonPath?: MaybeRef<string>
}) {
  let raw = get(rawJson);
  const jsonPathStr = get(jsonPath);
  if (jsonPathStr) {
    let res = filterJson(raw, jsonPathStr);
    if (res) {
      lastValidJSONPath = jsonPathStr;
      raw = res;
    }
    else if (lastValidJSONPath) {
      res = filterJson(raw, lastValidJSONPath);
      if (res) {
        raw = res;
      }
    }
  }
  const parsedObject = JSON5.parse(get(unescapeUnicode) ? unescapeUnicodeJSON(raw) : raw);

  return JSON.stringify(get(sortKeys) ? sortObjectKeys(parsedObject) : parsedObject, null, get(indentSize));
}
