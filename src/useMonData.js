import { useCallback, useEffect, useRef, useState } from "react";
import { TOTAL_MON } from "./monList";

// PokeAPI statt Supabase-DB für Monster-Daten.

// In-Memory-Cache, damit wir nicht doppelt fetten.
const cache = new Map();

// Hilfsfunktion: PokeAPI Pokemon normalisieren auf unser internes Format.
async function fetchPokeMon(id) {
  if (cache.has(id)) return cache.get(id);

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!res.ok) throw new Error(`PokeAPI ${id}: ${res.status}`);
  const json = await res.json();

  const types = json.types.map((t) => t.type.name);
  const stats = json.stats.map((s) => ({
    name: s.stat.name,
    value: s.base_stat,
  }));
  const strength = Math.round(
    stats.reduce((acc, s) => acc + s.value, 0) / stats.length
  );

  const mon = {
    id: json.id,
    name_en: json.name,
    name_de: json.name,
    artwork: json.sprites?.other?.["official-artwork"]?.front_default || json.sprites?.front_default || "",
    types,
    strength,
    stats,
    height: json.height,
    weight: json.weight,
  };

  cache.set(id, mon);
  return mon;
}

// Einfacher Shuffle, wie vorher.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Zufällige IDs aus dem nationalen Dex-Bereich.
function randomIds(count = TOTAL_MON, max = TOTAL_MON) {
  return shuffle(Array.from({ length: max }, (_, i) => i + 1)).slice(0, count);
}

// Such-Auflösung: Nummer oder Name -> ID.
async function resolveQuery(raw) {
  const q = String(raw).trim().toLowerCase();
  if (!q) throw new Error("Bitte eine Nummer oder einen Namen eingeben.");

  if (/^\d+$/.test(q)) {
    const id = parseInt(q, 10);
    if (id < 1 || id > TOTAL_MON) {
      throw new Error(`Nummer außerhalb des Bereichs 1–${TOTAL_MON}.`);
    }
    return id;
  }

  const res = await fetch(
    `https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0`
  );
  if (!res.ok) throw new Error("Suche fehlgeschlagen.");
  const json = await res.json();

  const results = json.pokemon_species
    .filter((p) => p.name.includes(q))
    .slice(0, 10)
    .map((p, idx) => ({ name: p.name, id: idx + 1 }));

  if (!results.length) {
    throw new Error(
      `Nicht gefunden – Nummer (1–${TOTAL_MON}) oder Name (z.B. pikachu, charizard).`
    );
  }

  const best = results[0];
  return best.id;
}

export function useMonData(count = TOTAL_MON) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState({ loading: false, result: null, error: null });
  const [allData, setAllData] = useState(null);

  const idsRef = useRef(null);
  if (idsRef.current === null) idsRef.current = randomIds(count);

  const loadIds = useCallback((ids) => {
    let cancelled = false;
    setError(null);
    setProgress(0);
    setData(null);
    (async () => {
      try {
        const results = [];
        for (let i = 0; i < ids.length; i++) {
          const mon = await fetchPokeMon(ids[i]);
          results.push(mon);
          if (!cancelled) setProgress(Math.round(((i + 1) / ids.length) * 100));
        }
        if (!cancelled) setData(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const reset = useCallback(() => {
    const ids = randomIds(count);
    idsRef.current = ids;
    loadIds(ids);
  }, [count, loadIds]);

  useEffect(() => loadIds(idsRef.current), [loadIds]);

  // Alle Monster aus dem gefilterten Bereich für Arena/RNG-Gegner.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = [];
        for (let id = 1; id <= TOTAL_MON; id++) {
          all.push(await fetchPokeMon(id));
        }
        if (!cancelled) setAllData(all);
      } catch {
        // nicht kritisch
      }
    })();
    return () => { cancelled = true; };
  }, [TOTAL_MON]);

  const runSearch = useCallback(async (query) => {
    setSearch({ loading: true, result: null, error: null });
    try {
      const id = await resolveQuery(query);
      const mon = await fetchPokeMon(id);
      setSearch({ loading: false, result: mon, error: null });
    } catch (e) {
      setSearch({ loading: false, result: null, error: e.message });
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearch({ loading: false, result: null, error: null });
  }, []);

  return { data, error, progress, search, runSearch, clearSearch, reset, allData };
}
