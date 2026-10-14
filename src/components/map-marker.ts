import L from "leaflet";

const PIN_SVG = `<svg viewBox="0 0 30 40" aria-hidden="true" focusable="false"><path fill="currentColor" stroke="#fff" stroke-width="2" d="M15 1.5C7.5 1.5 1.5 7.3 1.5 14.6c0 9.6 11.6 22 12.1 22.6a1.9 1.9 0 0 0 2.8 0c.5-.6 12.1-13 12.1-22.6C28.5 7.3 22.5 1.5 15 1.5Z"/><circle cx="15" cy="14.5" r="5" fill="#fff"/></svg>`;

export function markerIcon(selected: boolean) {
  return L.divIcon({
    html: PIN_SVG,
    className: selected ? "park-marker park-marker--selected" : "park-marker",
    // A comfortable 44x44 target (WCAG 2.5.5; AA's 2.5.8 needs only 24px);
    // the pin is drawn bottom-centered in it (see .park-marker in
    // globals.css), so its tip is at (22, 42).
    iconSize: [44, 44],
    iconAnchor: [22, 42],
    popupAnchor: [0, -40],
  });
}
