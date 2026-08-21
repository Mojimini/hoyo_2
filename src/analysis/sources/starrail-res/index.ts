import type { AnalysisSourceRef } from "../../contracts";

export const STAR_RAIL_RES_DEFAULT_REVISION = "b95e75c7e1273d819d20c530c0b7e13a3ef19fb4";
export const STAR_RAIL_RES_DEFAULT_LOCALE = "en";

const STAR_RAIL_RES_REPOSITORY = "https://github.com/Mar-7th/StarRailRes";
const STAR_RAIL_RES_RAW_BASE = "https://raw.githubusercontent.com/Mar-7th/StarRailRes";

export type StarRailResDataset =
  | "characters"
  | "properties"
  | "relics"
  | "relic_sets"
  | "relic_main_affixes"
  | "relic_sub_affixes";

export interface StarRailResTransport {
  getJson(dataset: StarRailResDataset, locale: string, signal?: AbortSignal): Promise<unknown>;
}

export interface StarRailResCharacterMetadata {
  id: string;
  name: string;
  rarity: number;
  path: string;
  element: string;
  tag?: string;
  maxSp?: number;
}

export interface StarRailResPropertyMetadata {
  type: string;
  name: string;
  field: string;
  affix: boolean;
  ratio: boolean;
  percent: boolean;
  order: number;
}

export interface StarRailResRelicMetadata {
  id: string;
  setId: string;
  name: string;
  rarity: number;
  type: string;
  maxLevel: number;
  mainAffixId: string;
  subAffixId: string;
}

export interface StarRailResRelicSetProperty {
  type: string;
  value: number;
}

export interface StarRailResRelicSetMetadata {
  id: string;
  name: string;
  descriptions: readonly string[];
  properties: readonly (readonly StarRailResRelicSetProperty[])[];
}

export interface StarRailResMainAffixMetadata {
  affixId: string;
  property: string;
  base: number;
  step: number;
}

export interface StarRailResMainAffixGroup {
  id: string;
  affixes: Readonly<Record<string, StarRailResMainAffixMetadata>>;
}

export interface StarRailResSubAffixMetadata extends StarRailResMainAffixMetadata {
  stepNum: number;
}

export interface StarRailResSubAffixGroup {
  id: string;
  affixes: Readonly<Record<string, StarRailResSubAffixMetadata>>;
}

export interface StarRailResMetadataSnapshot {
  source: AnalysisSourceRef;
  characters: Readonly<Record<string, StarRailResCharacterMetadata>>;
  properties: Readonly<Record<string, StarRailResPropertyMetadata>>;
  relics: Readonly<Record<string, StarRailResRelicMetadata>>;
  relicSets: Readonly<Record<string, StarRailResRelicSetMetadata>>;
  relicMainAffixes: Readonly<Record<string, StarRailResMainAffixGroup>>;
  relicSubAffixes: Readonly<Record<string, StarRailResSubAffixGroup>>;
}

export interface StarRailResAdapterOptions {
  transport: StarRailResTransport;
  revision?: string;
  locale?: string;
  now?: () => Date;
}

export interface StarRailResFetchTransportOptions {
  revision?: string;
  fetchImpl?: typeof fetch;
  rawBaseUrl?: string;
}

export class StarRailResSchemaError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`Invalid StarRailRes data at ${path}: ${message}`);
    this.name = "StarRailResSchemaError";
    this.path = path;
  }
}

export class StarRailResTransportError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "StarRailResTransportError";
    this.status = status;
  }
}

export function createStarRailResFetchTransport(
  options: StarRailResFetchTransportOptions = {},
): StarRailResTransport {
  const revision = requireNonEmptyString(
    options.revision ?? STAR_RAIL_RES_DEFAULT_REVISION,
    "transport.revision",
  );
  const fetchImpl = options.fetchImpl ?? fetch;
  const rawBaseUrl = (options.rawBaseUrl ?? STAR_RAIL_RES_RAW_BASE).replace(/\/$/, "");

  return {
    async getJson(dataset, locale, signal) {
      const safeLocale = validateLocale(locale);
      const url = `${rawBaseUrl}/${encodeURIComponent(revision)}/index_new/${safeLocale}/${dataset}.json`;
      let response: Response;

      try {
        response = await fetchImpl(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal,
        });
      } catch (error) {
        if (error instanceof StarRailResTransportError) {
          throw error;
        }
        throw new StarRailResTransportError(
          error instanceof Error ? error.message : "StarRailRes request failed",
        );
      }

      if (!response.ok) {
        throw new StarRailResTransportError(
          `StarRailRes request failed with HTTP ${response.status}`,
          response.status,
        );
      }

      try {
        return await response.json();
      } catch {
        throw new StarRailResTransportError("StarRailRes response was not valid JSON", response.status);
      }
    },
  };
}

export class StarRailResAdapter {
  private readonly transport: StarRailResTransport;
  private readonly revision: string;
  private readonly locale: string;
  private readonly now: () => Date;

  constructor(options: StarRailResAdapterOptions) {
    this.transport = options.transport;
    this.revision = requireNonEmptyString(
      options.revision ?? STAR_RAIL_RES_DEFAULT_REVISION,
      "adapter.revision",
    );
    this.locale = validateLocale(options.locale ?? STAR_RAIL_RES_DEFAULT_LOCALE);
    this.now = options.now ?? (() => new Date());
  }

  async loadMetadata(signal?: AbortSignal): Promise<StarRailResMetadataSnapshot> {
    const [charactersRaw, propertiesRaw, relicsRaw, relicSetsRaw, mainAffixesRaw, subAffixesRaw] =
      await Promise.all([
        this.transport.getJson("characters", this.locale, signal),
        this.transport.getJson("properties", this.locale, signal),
        this.transport.getJson("relics", this.locale, signal),
        this.transport.getJson("relic_sets", this.locale, signal),
        this.transport.getJson("relic_main_affixes", this.locale, signal),
        this.transport.getJson("relic_sub_affixes", this.locale, signal),
      ]);

    const characters = parseCharacters(charactersRaw);
    const properties = parseProperties(propertiesRaw);
    const relics = parseRelics(relicsRaw);
    const relicSets = parseRelicSets(relicSetsRaw);
    const relicMainAffixes = parseMainAffixGroups(mainAffixesRaw);
    const relicSubAffixes = parseSubAffixGroups(subAffixesRaw);

    validateReferences({
      properties,
      relics,
      relicSets,
      relicMainAffixes,
      relicSubAffixes,
    });

    const fetchedAt = this.now().toISOString();
    if (fetchedAt === "Invalid Date") {
      throw new StarRailResSchemaError("source.fetchedAt", "clock returned an invalid date");
    }

    return {
      source: {
        kind: "game-metadata",
        name: "StarRailRes",
        revision: this.revision,
        fetchedAt,
        reference: `${STAR_RAIL_RES_REPOSITORY}/tree/${encodeURIComponent(this.revision)}/index_new/${this.locale}`,
      },
      characters,
      properties,
      relics,
      relicSets,
      relicMainAffixes,
      relicSubAffixes,
    };
  }
}

function parseCharacters(value: unknown): Readonly<Record<string, StarRailResCharacterMetadata>> {
  return parseKeyedRecord(value, "characters", (entry, path) => {
    const id = requiredString(entry, "id", path);
    return {
      id,
      name: requiredString(entry, "name", path),
      rarity: requiredInteger(entry, "rarity", path, 1),
      path: requiredString(entry, "path", path),
      element: requiredString(entry, "element", path),
      tag: optionalString(entry, "tag", path),
      maxSp: optionalFiniteNumber(entry, "max_sp", path),
    };
  });
}

function parseProperties(value: unknown): Readonly<Record<string, StarRailResPropertyMetadata>> {
  return parseKeyedRecord(value, "properties", (entry, path, key) => {
    const type = requiredString(entry, "type", path);
    if (type !== key) {
      throw new StarRailResSchemaError(`${path}.type`, `expected ${key}, received ${type}`);
    }
    return {
      type,
      name: requiredStringAllowEmpty(entry, "name", path),
      field: requiredStringAllowEmpty(entry, "field", path),
      affix: requiredBoolean(entry, "affix", path),
      ratio: requiredBoolean(entry, "ratio", path),
      percent: requiredBoolean(entry, "percent", path),
      order: requiredInteger(entry, "order", path, 0),
    };
  });
}

function parseRelics(value: unknown): Readonly<Record<string, StarRailResRelicMetadata>> {
  return parseKeyedRecord(value, "relics", (entry, path) => ({
    id: requiredString(entry, "id", path),
    setId: requiredString(entry, "set_id", path),
    name: requiredString(entry, "name", path),
    rarity: requiredInteger(entry, "rarity", path, 1),
    type: requiredString(entry, "type", path),
    maxLevel: requiredInteger(entry, "max_level", path, 0),
    mainAffixId: requiredString(entry, "main_affix_id", path),
    subAffixId: requiredString(entry, "sub_affix_id", path),
  }));
}

function parseRelicSets(value: unknown): Readonly<Record<string, StarRailResRelicSetMetadata>> {
  return parseKeyedRecord(value, "relic_sets", (entry, path) => {
    const descriptions = requiredArray(entry, "desc", path).map((item, index) =>
      expectStringAllowEmpty(item, `${path}.desc[${index}]`),
    );
    const propertyGroups = requiredArray(entry, "properties", path).map((group, groupIndex) =>
      expectArray(group, `${path}.properties[${groupIndex}]`).map((item, itemIndex) => {
        const property = expectRecord(item, `${path}.properties[${groupIndex}][${itemIndex}]`);
        return {
          type: requiredString(property, "type", `${path}.properties[${groupIndex}][${itemIndex}]`),
          value: requiredFiniteNumber(property, "value", `${path}.properties[${groupIndex}][${itemIndex}]`),
        };
      }),
    );

    return {
      id: requiredString(entry, "id", path),
      name: requiredString(entry, "name", path),
      descriptions,
      properties: propertyGroups,
    };
  });
}

function parseMainAffixGroups(value: unknown): Readonly<Record<string, StarRailResMainAffixGroup>> {
  return parseKeyedRecord(value, "relic_main_affixes", (entry, path) => ({
    id: requiredString(entry, "id", path),
    affixes: parseAffixRecord(entry.affixes, `${path}.affixes`, false),
  }));
}

function parseSubAffixGroups(value: unknown): Readonly<Record<string, StarRailResSubAffixGroup>> {
  return parseKeyedRecord(value, "relic_sub_affixes", (entry, path) => ({
    id: requiredString(entry, "id", path),
    affixes: parseAffixRecord(entry.affixes, `${path}.affixes`, true),
  }));
}

function parseAffixRecord(
  value: unknown,
  path: string,
  withStepNum: false,
): Readonly<Record<string, StarRailResMainAffixMetadata>>;
function parseAffixRecord(
  value: unknown,
  path: string,
  withStepNum: true,
): Readonly<Record<string, StarRailResSubAffixMetadata>>;
function parseAffixRecord(
  value: unknown,
  path: string,
  withStepNum: boolean,
): Readonly<Record<string, StarRailResMainAffixMetadata | StarRailResSubAffixMetadata>> {
  const record = expectRecord(value, path);
  const parsed: Record<string, StarRailResMainAffixMetadata | StarRailResSubAffixMetadata> = {};

  for (const [key, rawAffix] of Object.entries(record)) {
    const affixPath = `${path}.${key}`;
    const affix = expectRecord(rawAffix, affixPath);
    const affixId = requiredString(affix, "affix_id", affixPath);
    if (affixId !== key) {
      throw new StarRailResSchemaError(`${affixPath}.affix_id`, `expected ${key}, received ${affixId}`);
    }

    const base = {
      affixId,
      property: requiredString(affix, "property", affixPath),
      base: requiredFiniteNumber(affix, "base", affixPath),
      step: requiredFiniteNumber(affix, "step", affixPath),
    };

    parsed[key] = withStepNum
      ? { ...base, stepNum: requiredInteger(affix, "step_num", affixPath, 0) }
      : base;
  }

  return parsed;
}

function validateReferences(input: {
  properties: Readonly<Record<string, StarRailResPropertyMetadata>>;
  relics: Readonly<Record<string, StarRailResRelicMetadata>>;
  relicSets: Readonly<Record<string, StarRailResRelicSetMetadata>>;
  relicMainAffixes: Readonly<Record<string, StarRailResMainAffixGroup>>;
  relicSubAffixes: Readonly<Record<string, StarRailResSubAffixGroup>>;
}): void {
  for (const relic of Object.values(input.relics)) {
    if (!(relic.setId in input.relicSets)) {
      throw new StarRailResSchemaError(`relics.${relic.id}.set_id`, `unknown relic set ${relic.setId}`);
    }
    if (!(relic.mainAffixId in input.relicMainAffixes)) {
      throw new StarRailResSchemaError(
        `relics.${relic.id}.main_affix_id`,
        `unknown main affix group ${relic.mainAffixId}`,
      );
    }
    if (!(relic.subAffixId in input.relicSubAffixes)) {
      throw new StarRailResSchemaError(
        `relics.${relic.id}.sub_affix_id`,
        `unknown sub affix group ${relic.subAffixId}`,
      );
    }
  }

  for (const set of Object.values(input.relicSets)) {
    for (const [groupIndex, group] of set.properties.entries()) {
      for (const [propertyIndex, property] of group.entries()) {
        if (!(property.type in input.properties)) {
          throw new StarRailResSchemaError(
            `relic_sets.${set.id}.properties[${groupIndex}][${propertyIndex}].type`,
            `unknown property ${property.type}`,
          );
        }
      }
    }
  }

  validateAffixPropertyReferences("relic_main_affixes", input.relicMainAffixes, input.properties);
  validateAffixPropertyReferences("relic_sub_affixes", input.relicSubAffixes, input.properties);
}

function validateAffixPropertyReferences(
  dataset: "relic_main_affixes" | "relic_sub_affixes",
  groups: Readonly<Record<string, StarRailResMainAffixGroup | StarRailResSubAffixGroup>>,
  properties: Readonly<Record<string, StarRailResPropertyMetadata>>,
): void {
  for (const group of Object.values(groups)) {
    for (const affix of Object.values(group.affixes)) {
      if (!(affix.property in properties)) {
        throw new StarRailResSchemaError(
          `${dataset}.${group.id}.affixes.${affix.affixId}.property`,
          `unknown property ${affix.property}`,
        );
      }
    }
  }
}

function parseKeyedRecord<T>(
  value: unknown,
  path: string,
  parser: (entry: Record<string, unknown>, entryPath: string, key: string) => T & { id?: string },
): Readonly<Record<string, T>> {
  const record = expectRecord(value, path);
  const parsed: Record<string, T> = {};

  for (const [key, rawEntry] of Object.entries(record)) {
    if (key.length === 0) {
      throw new StarRailResSchemaError(path, "empty record key");
    }
    const entryPath = `${path}.${key}`;
    const item = parser(expectRecord(rawEntry, entryPath), entryPath, key);
    if (typeof item.id === "string" && item.id !== key) {
      throw new StarRailResSchemaError(`${entryPath}.id`, `expected ${key}, received ${item.id}`);
    }
    parsed[key] = item;
  }

  return parsed;
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new StarRailResSchemaError(path, "expected object");
  }
  return value as Record<string, unknown>;
}

function expectArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new StarRailResSchemaError(path, "expected array");
  }
  return value;
}

function requiredArray(record: Record<string, unknown>, key: string, path: string): readonly unknown[] {
  return expectArray(record[key], `${path}.${key}`);
}

function expectStringAllowEmpty(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new StarRailResSchemaError(path, "expected string");
  }
  return value;
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new StarRailResSchemaError(path, "expected non-empty string");
  }
  return value;
}

function requiredString(record: Record<string, unknown>, key: string, path: string): string {
  return requireNonEmptyString(record[key], `${path}.${key}`);
}

function requiredStringAllowEmpty(record: Record<string, unknown>, key: string, path: string): string {
  return expectStringAllowEmpty(record[key], `${path}.${key}`);
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  return requireNonEmptyString(value, `${path}.${key}`);
}

function requiredBoolean(record: Record<string, unknown>, key: string, path: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new StarRailResSchemaError(`${path}.${key}`, "expected boolean");
  }
  return value;
}

function requiredFiniteNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new StarRailResSchemaError(`${path}.${key}`, "expected finite number");
  }
  return value;
}

function optionalFiniteNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number | undefined {
  if (record[key] === undefined) {
    return undefined;
  }
  return requiredFiniteNumber(record, key, path);
}

function requiredInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
  minimum: number,
): number {
  const value = requiredFiniteNumber(record, key, path);
  if (!Number.isInteger(value) || value < minimum) {
    throw new StarRailResSchemaError(
      `${path}.${key}`,
      `expected integer greater than or equal to ${minimum}`,
    );
  }
  return value;
}

function validateLocale(locale: string): string {
  if (!/^[a-z]{2}(?:-[a-z]{2})?$/i.test(locale)) {
    throw new StarRailResSchemaError("locale", "expected a language tag such as en or zh-cn");
  }
  return locale.toLowerCase();
}
