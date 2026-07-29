// Pokemon-Fetch-Layer: PokéAPI, Kanto 1..151, clientseitig gecacht.
import { useState, useEffect, useRef, useCallback } from "react";
import { TOTAL_MON } from "./monList";

const API = "https://pokeapi.co/api/v2";
const CACHE_KEY = "pokiman_pokemon_cache_v1";
const CACHE_TTL_MS = 1000 * 60 * 60;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.ts && Date.now() - parsed.ts < CACHE_TTL_MS) return parsed.data;
  } catch {
    // ignore corrupt cache
  }
  return null;
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore quota errors
  }
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return res.json();
}

async function loadPokemonDetail(id) {
  return fetchJSON(`${API}/pokemon/${id}`);
}

async function loadPokemonSpecies(id) {
  return fetchJSON(`${API}/pokemon-species/${id}`);
}

async function loadEvolutionChain(url) {
  const data = await fetchJSON(url);
  const chain = [];
  let current = data.chain;
  while (current) {
    const speciesId = Number(String(current.species.url).split("/").filter(Boolean).at(-1));
    chain.push({ name: current.species.name, id: speciesId });
    current = current.evolves_to[0] || null;
  }
  return chain;
}

export async function fetchAllPokemon() {
  const cached = readCache();
  if (cached) return cached;

  const results = [];
  for (let id = 1; id <= TOTAL_MON; id++) {
    try {
      const [detail, species] = await Promise.all([
        loadPokemonDetail(id),
        loadPokemonSpecies(id).catch(() => null),
      ]);

      const mainType = detail.types?.[0]?.type?.name || "normal";
      const types = (detail.types || []).map((t) => t.type.name);

      const stats = (detail.stats || []).map((s) => ({
        name: s.stat.name,
        value: s.base_stat,
        effort: s.effort,
      }));

      const sprites = detail.sprites || {};
      const artwork =
        sprites?.other?.["official-artwork"]?.front_default ||
        sprites?.other?.home?.front_default ||
        sprites?.front_default ||
        "";

      const nameEntry = (species?.names || []).find((n) => n.language.name === "de");
      const name_en = detail.name;
      const name_de = nameEntry?.name || detail.name;

      let evolutionChain = null;
      if (species?.evolution_chain?.url) {
        evolutionChain = await loadEvolutionChain(species.evolution_chain.url).catch(() => null);
      }

      results.push({
        id: detail.id,
        name: detail.name,
        name_de,
        name_en,
        types,
        mainType,
        strength: stats.find((s) => s.name === "attack")?.value || 0,
        hp: stats.find((s) => s.name === "hp")?.value || 0,
        defense: stats.find((s) => s.name === "defense")?.value || 0,
        speed: stats.find((s) => s.name === "speed")?.value || 0,
        stats,
        artwork,
        sprite: sprites?.front_default || "",
        speciesUrl: species?.evolution_chain?.url || "",
        evolutionChain,
      });
    } catch (e) {
      console.warn("[pokiman] Pokemon", id, "failed:", e);
    }
  }

  writeCache(results);
  return results;
}

export function useMonData(limit) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState({ query: "", result: null, loading: false, error: null });

  const allData = data;
  const searchRef = useRef({ query: "", result: null, loading: false, error: null });

  // Load all Pokemon once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await fetchAllPokemon();
        if (!cancelled) {
          setData(all || []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Fehler beim Laden");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const runSearch = useCallback((q) => {
    const query = (q || "").trim();
    setSearch((s) => ({ ...s, loading: Boolean(query), error: null, result: null }));
    setTimeout(() => {
      if (!query) {
        setSearch({ query: "", result: null, loading: false, error: null });
        return;
      }
      try {
        const qNum = Number(query);
        const qStr = String(query).toLowerCase();
        let result = null;
        if (Number.isInteger(qNum) && qNum > 0) {
          result = data.find((p) => p.id === qNum) || null;
        }
        result = result || data.find((p) => p.name === qStr || String(p.id) === qStr) || null;
        result = result || data.find((p) => (p.name_de || "").toLowerCase().includes(qStr)) || null;
        setSearch({ query, result, loading: false, error: null });
      } catch {
        setSearch({ query, result: null, loading: false, error: "Suche fehlgeschlagen" });
      }
    }, 120);
  }, [data]);

  const clearSearch = useCallback(() => setSearch({ query: "", result: null, loading: false, error: null }), []);
  const reset = useCallback(() => { /* no-op to keep compat */ }, []);

  return {
    data: (search.result ? [search.result] : data.slice(0, limit)),
    error,
    search,
    runSearch,
    clearSearch,
    reset,
    allData,
    loading,
  };
}
