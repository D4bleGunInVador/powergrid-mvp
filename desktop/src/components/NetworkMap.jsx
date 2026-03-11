import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-polylinedecorator";
import "../styles/map.css";

function statusColor(status) {
  if (status === "Online") return "#2e7d32";
  if (status === "Warning") return "#cc8800";
  return "#b00020";
}

function kindShape(kind = "Substation") {
  // прості форми: підстанція — квадрат, трансформатор — коло, ЛЕП/лінія — трикутник
  if (kind.toLowerCase().includes("transform")) return "circle";
  if (kind.toLowerCase().includes("line") || kind.toLowerCase().includes("lep")) return "triangle";
  return "square";
}

function makeNodeIcon({ kind, status }) {
  const color = statusColor(status);
  const shape = kindShape(kind);

  const pulse = status === "Warning" || status === "Offline";
  const pulseClass = pulse ? `pulse ${status === "Offline" ? "offline" : ""}` : "";

  // SVG 28x28
  const svg = (() => {
    if (shape === "circle") {
      return `
        <svg viewBox="0 0 28 28" aria-hidden="true">
          <circle cx="14" cy="14" r="10" fill="${color}" stroke="#ffffff" stroke-width="2"></circle>
        </svg>`;
    }
    if (shape === "triangle") {
      return `
        <svg viewBox="0 0 28 28" aria-hidden="true">
          <path d="M14 4 L25 23 H3 Z" fill="${color}" stroke="#ffffff" stroke-width="2"></path>
        </svg>`;
    }
    // square
    return `
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <rect x="5" y="5" width="18" height="18" rx="3" fill="${color}" stroke="#ffffff" stroke-width="2"></rect>
      </svg>`;
  })();

  return L.divIcon({
    className: "", // важливо: щоб Leaflet не додавав свої стилі
    html: `<div class="pg-marker ${pulseClass}">${svg}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/** Стрілки напрямку потоків */
function FlowArrows({ lines }) {
  const map = useMap();
  const decoratorsRef = useRef([]);

  useEffect(() => {
    // очистити попередні
    decoratorsRef.current.forEach(d => d.remove());
    decoratorsRef.current = [];

    lines.forEach(l => {
      const color =
        l.status === "Down" ? "#b00020" : l.status === "Overload" ? "#cc8800" : "#2e7d32";

      const decorator = L.polylineDecorator(l.positions, {
        patterns: [
          {
            offset: 25,
            repeat: 60,
            symbol: L.Symbol.arrowHead({
              pixelSize: 10,
              polygon: false,
              pathOptions: { stroke: true, color, weight: 2, opacity: 0.9 },
            }),
          },
        ],
      });

      decorator.addTo(map);
      decoratorsRef.current.push(decorator);
    });

    return () => {
      decoratorsRef.current.forEach(d => d.remove());
      decoratorsRef.current = [];
    };
  }, [map, lines]);

  return null;
}

export default function NetworkMap({
  nodes = [],
  flows = [],
  selectedRegions = [],
  onToggleRegion,
  loading = false,
}) {
  const nav = useNavigate();
  const [oblasts, setOblasts] = useState(null);
  const [raions, setRaions] = useState(null);

  const oblastLayerRef = useRef([]);

  useEffect(() => {
    fetch("/ua_oblasts.geojson").then(r => r.json()).then(setOblasts).catch(() => setOblasts(null));
    // райони опційно
    fetch("/ua_raions.geojson").then(r => r.json()).then(setRaions).catch(() => setRaions(null));
  }, []);

  const nodesWithCoords = useMemo(
    () => nodes.filter(n => typeof n.lat === "number" && typeof n.lng === "number"),
    [nodes]
  );

  const nodeById = useMemo(() => {
    const m = new Map();
    nodesWithCoords.forEach(n => m.set(n.id, n));
    return m;
  }, [nodesWithCoords]);

  const lines = useMemo(() => {
    return flows
      .map(f => {
        const a = nodeById.get(f.from_id);
        const b = nodeById.get(f.to_id);
        if (!a || !b) return null;
        return {
          id: `${f.from_id}-${f.to_id}`,
          positions: [[a.lat, a.lng], [b.lat, b.lng]],
          status: f.status,
          mw: f.mw,
        };
      })
      .filter(Boolean);
  }, [flows, nodeById]);

  function oblastStyle(feature) {
    const name =
      feature?.properties?.name ||
      feature?.properties?.NAME_1 ||
      feature?.properties?.oblast ||
      "—";

    const isSelected = selectedRegions.length === 0 ? true : selectedRegions.includes(name);

    return {
      color: "#444",
      weight: isSelected ? 2 : 1,
      fillColor: "#4a90e2",
      fillOpacity: isSelected ? 0.18 : 0.03,
      opacity: isSelected ? 0.8 : 0.15,
    };
  }

  function raionStyle() {
    return {
      color: "#666",
      weight: 1,
      dashArray: "5 6",
      fillOpacity: 0,
      opacity: selectedRegions.length ? 0.35 : 0.25,
    };
  }

  function onEachOblast(feature, layer) {
    const name =
      feature?.properties?.name ||
      feature?.properties?.NAME_1 ||
      feature?.properties?.oblast ||
      "—";

    layer.on("click", () => onToggleRegion?.(name));
    layer.bindTooltip(name, { sticky: true });

    oblastLayerRef.current.push(layer);
  }

  useEffect(() => {
    if (!oblastLayerRef.current.length) return;
    oblastLayerRef.current.forEach(layer => {
      const f = layer.feature;
      const name =
        f?.properties?.name || f?.properties?.NAME_1 || f?.properties?.oblast || "—";
      if (selectedRegions.includes(name)) layer.bringToFront();
    });
  }, [selectedRegions]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {loading ? (
        <div className="pg-map-loading">
          <div className="pg-spinner" />
          Завантаження даних…
        </div>
      ) : null}

      <MapContainer center={[49.0, 31.0]} zoom={6} minZoom={5} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {oblasts ? (
          <GeoJSON data={oblasts} style={oblastStyle} onEachFeature={onEachOblast} />
        ) : null}

        {raions ? (
          <GeoJSON data={raions} style={raionStyle} />
        ) : null}

        {/* Лінії потоків (анімація пунктиру через className) */}
        {lines.map(l => {
          const color =
            l.status === "Down" ? "#b00020" : l.status === "Overload" ? "#cc8800" : "#2e7d32";

          const cls =
            l.status === "Down"
              ? "pg-flow pg-flow-down"
              : l.status === "Overload"
              ? "pg-flow pg-flow-overload"
              : "pg-flow pg-flow-normal";

          return (
            <Polyline
              key={l.id}
              positions={l.positions}
              pathOptions={{
                color,
                weight: 3,
                opacity: 0.75,
                className: cls,
              }}
            >
              <Tooltip sticky>{`${l.mw} MW • ${l.status}`}</Tooltip>
            </Polyline>
          );
        })}

        {/* Стрілки напрямку */}
        <FlowArrows lines={lines} />

        {/* Маркери вузлів зі спец-іконками */}
        {nodesWithCoords.map(n => (
          <Marker
            key={n.id}
            position={[n.lat, n.lng]}
            icon={makeNodeIcon({ kind: n.kind || "Substation", status: n.status })}
            eventHandlers={{ click: () => nav(`/nodes/${n.id}`) }}
          >
            <Tooltip sticky>
              <div style={{ fontWeight: 800 }}>{n.name}</div>
              <div>{n.id} • {n.region}</div>
              <div>{n.kind || "Node"} • {n.status}</div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}