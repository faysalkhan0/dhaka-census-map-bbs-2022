"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import Link from "next/link";
import { INDICATORS, LEVEL_ORDER, humanizeField, formatValue } from "../lib/indicators";

const INITIAL = {
  center: [90.4125, 23.78],
  zoom: 9.6,
};

function navParent(feature) {
  return feature?.properties?.navigation_parent_key || feature?.properties?.parent_geo_uid || null;
}

function label(feature) {
  return feature?.properties?.location_label || feature?.properties?.admin_label || feature?.properties?.matched_key;
}

function getFeatureLevel(feature) {
  return feature?.properties?.map_level || "district";
}

function makeFeatureCollection(features) {
  return { type: "FeatureCollection", features };
}

function buildDataMap(payload) {
  const map = new Map();
  for (const row of payload.rows) {
    const obj = {};
    payload.columns.forEach((col, i) => {
      obj[col] = row[i + 1];
    });
    map.set(row[0], obj);
  }
  return map;
}

function extentOf(features) {
  const coords = [];
  const walk = (c) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number" && typeof c[1] === "number") coords.push(c);
    else c.forEach(walk);
  };
  features.forEach((f) => walk(f.geometry?.coordinates));
  if (!coords.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  coords.forEach(([x, y]) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); });
  return [[minX, minY], [maxX, maxY]];
}

export default function MapExplorer({ indicator }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const mapReady = useRef(false);
  const popupRef = useRef(null);

  const [overview, setOverview] = useState(null);
  const [deepGeometry, setDeepGeometry] = useState(null);
  const [dataMap, setDataMap] = useState(new Map());
  const [selected, setSelected] = useState(null);
  const [currentParentId, setCurrentParentId] = useState("D_3026");
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);

  const allFeatures = useMemo(() => {
    return [
      ...(overview?.features || []),
      ...(deepGeometry?.features || []),
    ];
  }, [overview, deepGeometry]);

  const byId = useMemo(() => new Map(allFeatures.map((f) => [f.properties.matched_key, f])), [allFeatures]);

  const current = byId.get(currentParentId) || overview?.features?.find((f) => f.properties.matched_key === "D_3026");
  const currentLevel = getFeatureLevel(current);

  // Navigation parent is deliberate: city_thana records use navigation_parent_key so they sit under City Corporation.
  const children = useMemo(() => {
    return allFeatures.filter((f) => navParent(f) === currentParentId);
  }, [allFeatures, currentParentId]);

  const displayChildren = useMemo(() => {
    // Map only displayable geometries. city_thana is navigation/support only in the source data.
    const direct = children.filter((f) => f.properties.displayable !== 0 && f.properties.map_level !== "support");
    return direct.length ? direct : children.filter((f) => f.properties.displayable !== 0);
  }, [children]);

  const currentData = selected ? dataMap.get(selected.properties.matched_key) : null;

  const breadcrumbs = useMemo(() => {
    const trail = [];
    let cursor = current;
    const seen = new Set();
    while (cursor && !seen.has(cursor.properties.matched_key)) {
      seen.add(cursor.properties.matched_key);
      trail.unshift(cursor);
      if (cursor.properties.matched_key === "D_3026") break;
      const p = navParent(cursor);
      cursor = byId.get(p);
      if (!cursor && p === "D_3026") cursor = byId.get("D_3026");
    }
    return trail;
  }, [current, byId]);

  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      try {
        const res = await fetch("/data/geography/overview.geojson");
        if (!res.ok) throw new Error("Could not load map boundaries.");
        const json = await res.json();
        if (!cancelled) setOverview(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadOverview();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadIndicatorData() {
      setDataLoading(true);
      try {
        const res = await fetch(`/data/census/${indicator.key}.json`, { cache: "force-cache" });
        if (!res.ok) throw new Error("Could not load indicator data.");
        const payload = await res.json();
        const map = buildDataMap(payload);
        if (!cancelled) setDataMap(map);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    loadIndicatorData();
    return () => { cancelled = true; };
  }, [indicator.key]);

  useEffect(() => {
    if (!overview || mapRef.current || !mapContainer.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setError("Mapbox token is missing. Add NEXT_PUBLIC_MAPBOX_TOKEN in Vercel.");
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: INITIAL.center,
      zoom: INITIAL.zoom,
      attributionControl: true,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");

    map.on("load", () => {
      mapReady.current = true;
      map.addSource("geo", { type: "geojson", data: makeFeatureCollection([]) });
      map.addLayer({
        id: "fill",
        type: "fill",
        source: "geo",
        paint: {
          "fill-color": [
            "interpolate", ["linear"], ["coalesce", ["get", "__value"], 0],
            0, "#E8F3F7", 10, "#9FCFE0", 30, "#53A8C1", 60, "#267D9B", 100, "#14556E"
          ],
          "fill-opacity": 0.68,
        },
      });
      map.addLayer({
        id: "outline",
        type: "line",
        source: "geo",
        paint: { "line-color": "#FFFFFF", "line-width": 1.15, "line-opacity": 0.95 },
      });
      map.addLayer({
        id: "selected-outline",
        type: "line",
        source: "geo",
        filter: ["==", ["get", "matched_key"], ""],
        paint: { "line-color": "#111111", "line-width": 2.5 },
      });

      map.on("mousemove", "fill", (e) => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "fill", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "fill", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const original = byId.get(feature.properties.matched_key) || feature;
        setSelected(original);
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(`<div class="map-popup"><strong>${label(original)}</strong><span>${indicator.title}</span><b>${formatValue(Number(feature.properties.__value), indicator.format)}</b></div>`)
          .addTo(map);
        map.setFilter("selected-outline", ["==", ["get", "matched_key"], feature.properties.matched_key]);
      });
    });

    mapRef.current = map;
    return () => {
      if (popupRef.current) popupRef.current.remove();
      map.remove();
      mapRef.current = null;
      mapReady.current = false;
    };
  }, [overview]);

  useEffect(() => {
    let cancelled = false;
    async function loadDeep() {
      const needDeep = currentLevel === "union" || currentLevel === "ward" || currentLevel === "paurashava" || currentLevel === "support" || currentLevel === "mauza_village";
      if (!needDeep) return;
      if (deepGeometry) return;
      try {
        const res = await fetch("/data/geography/mauza-village.geojson", { cache: "force-cache" });
        if (!res.ok) throw new Error("Could not load Mauza/Village boundaries.");
        const json = await res.json();
        if (!cancelled) setDeepGeometry(json);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    loadDeep();
    return () => { cancelled = true; };
  }, [currentLevel, deepGeometry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady.current) return;

    const source = map.getSource("geo");
    if (!source) return;

    const visible = displayChildren.map((feature) => {
      const value = Number(dataMap.get(feature.properties.matched_key)?.[indicator.mapField]);
      return {
        ...feature,
        properties: { ...feature.properties, __value: Number.isFinite(value) ? value : 0 },
      };
    });
    source.setData(makeFeatureCollection(visible));

    const values = visible.map((f) => Number(f.properties.__value)).filter((v) => Number.isFinite(v));
    if (values.length && map.getLayer("fill")) {
      const sorted = [...values].sort((a, b) => a - b);
      const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
      const stops = [
        [q(0), "#E8F3F7"],
        [q(0.25), "#9FCFE0"],
        [q(0.5), "#53A8C1"],
        [q(0.75), "#267D9B"],
        [q(1), "#14556E"],
      ];
      const deduped = stops.filter((stop, i) => i === 0 || stop[0] > stops[i - 1][0]);
      if (deduped.length === 1) deduped.push([deduped[0][0] + 1, "#14556E"]);
      const expression = ["interpolate", ["linear"], ["coalesce", ["get", "__value"], 0], ...deduped.flat()];
      map.setPaintProperty("fill", "fill-color", expression);
    }

    if (visible.length) {
      const box = extentOf(visible);
      if (box) map.fitBounds(box, { padding: { top: 120, right: 450, bottom: 100, left: 80 }, duration: 700, maxZoom: 12 });
    }

    if (selected && !visible.some((f) => f.properties.matched_key === selected.properties.matched_key)) {
      setSelected(null);
      if (popupRef.current) popupRef.current.remove();
      map.setFilter("selected-outline", ["==", ["get", "matched_key"], ""]);
    }
  }, [displayChildren, dataMap, indicator.mapField, selected]);

  function goTo(feature) {
    setSelected(null);
    if (popupRef.current) popupRef.current.remove();
    setCurrentParentId(feature.properties.matched_key);
    setNavOpen(false);
  }

  function goUp() {
    const parent = navParent(current);
    if (parent && byId.has(parent)) {
      goTo(byId.get(parent));
    } else {
      setCurrentParentId("D_3026");
    }
  }

  const searchResults = search.trim()
    ? allFeatures.filter((f) => label(f).toLowerCase().includes(search.toLowerCase())).slice(0, 12)
    : [];

  return (
    <main className="app-shell">
      <div ref={mapContainer} className="map" />

      <section className="title-card">
        <div className="eyebrow">BBS Population & Housing Census 2022</div>
        <h1>{indicator.title}</h1>
        <p>{indicator.description}</p>
      </section>

      <section className="top-nav">
        <button className="nav-pill" onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen}>
          Explore data
          <span>⌄</span>
        </button>
        <Link className="home-link" href="/explore/population">Dhaka Census 2022</Link>
      </section>

      {navOpen && (
        <section className="indicator-menu">
          <div className="menu-title">Indicators</div>
          <div className="indicator-list">
            {INDICATORS.map((item) => (
              <Link key={item.slug} href={`/explore/${item.slug}`} className={item.key === indicator.key ? "indicator active" : "indicator"} onClick={() => setNavOpen(false)}>
                <span>{item.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="geo-card">
        <div className="small-label">GEOGRAPHY</div>
        <div className="breadcrumbs">
          {breadcrumbs.map((item, idx) => (
            <button key={item.properties.matched_key} onClick={() => goTo(item)} className={idx === breadcrumbs.length - 1 ? "crumb active" : "crumb"}>
              {label(item)}
            </button>
          ))}
        </div>
        {current?.properties?.matched_key !== "D_3026" && (
          <button className="up-button" onClick={goUp}>← Up one level</button>
        )}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a place" />
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((item) => (
              <button key={item.properties.matched_key} onClick={() => goTo(item)}>{label(item)}</button>
            ))}
          </div>
        )}
        <div className="children-list">
          {children.filter((f) => f.properties.map_level !== "mauza_village").map((item) => (
            <button key={item.properties.matched_key} onClick={() => goTo(item)}>{label(item)}</button>
          ))}
        </div>
      </section>

      <section className="legend-card">
        <div className="legend-title">{indicator.title}</div>
        <div className="legend-scale"><span></span><span></span><span></span><span></span><span></span></div>
        <div className="legend-labels"><span>Lower</span><span>Higher</span></div>
      </section>

      {selected && (
        <aside className="profile-card">
          <button className="close" onClick={() => { setSelected(null); if (popupRef.current) popupRef.current.remove(); mapRef.current?.setFilter("selected-outline", ["==", ["get", "matched_key"], ""]); }}>×</button>
          <div className="small-label">{selected.properties?.admin_label || selected.properties?.map_level}</div>
          <h2>{label(selected)}</h2>
          <p className="profile-sub">{breadcrumbs.map((x) => label(x)).join(" / ")}</p>
          <div className="profile-scroll">
            {currentData ? Object.entries(currentData).map(([key, value]) => (
              <div className="stat-row" key={key}>
                <span>{humanizeField(key)}</span>
                <strong>{formatValue(value, indicator.format === "percent" && key === indicator.mapField ? "percent" : "number")}</strong>
              </div>
            )) : <div className="loading-copy">{dataLoading ? "Loading data…" : "No data available for this geography."}</div>}
          </div>
        </aside>
      )}

      <div className="status-bar">
        {error ? error : loading ? "Loading boundaries…" : dataLoading ? "Loading indicator…" : `${displayChildren.length.toLocaleString("en-US")} mapped areas`}
      </div>
    </main>
  );
}
