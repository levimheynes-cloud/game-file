/*
 * Book Batches — cutout sticker drawings.
 * Each sticker is drawn on a 200 x 200 grid in a crayon-like style and
 * wrapped with a white cutout edge and a soft shadow by stickerSvg().
 */
(function () {
  const INK = "#2b2118";

  function starPoints(cx, cy, outer, inner, points) {
    const list = [];
    for (let i = 0; i < points * 2; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / points;
      list.push((cx + radius * Math.cos(angle)).toFixed(1) + "," + (cy + radius * Math.sin(angle)).toFixed(1));
    }
    return list.join(" ");
  }

  function star(cx, cy, size, fill) {
    return '<polygon points="' + starPoints(cx, cy, size, size * 0.45, 5) + '" fill="' + (fill || "#ffe066") + '"/>';
  }

  function sparkle(cx, cy, size) {
    return '<path d="M' + cx + " " + (cy - size) + " L" + cx + " " + (cy + size) + " M" + (cx - size) + " " + cy + " L" + (cx + size) + " " + cy + '" stroke-width="3"/>';
  }

  function face(cx, cy, gap, mouth) {
    return (
      '<circle cx="' + (cx - gap) + '" cy="' + cy + '" r="4" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="' + (cx + gap) + '" cy="' + cy + '" r="4" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="' + (cx - gap - 6) + '" cy="' + (cy + 9) + '" r="5" fill="#ff9fb0" stroke="none"/>' +
      '<circle cx="' + (cx + gap + 6) + '" cy="' + (cy + 9) + '" r="5" fill="#ff9fb0" stroke="none"/>' +
      '<path d="M' + (cx - mouth) + " " + (cy + 10) + " Q" + cx + " " + (cy + 10 + mouth) + " " + (cx + mouth) + " " + (cy + 10) + '" fill="none"/>'
    );
  }

  function rainbowBand(radius, width, fill) {
    const inner = radius - width;
    return (
      '<path d="M' + (100 - radius) + " 140 A" + radius + " " + radius + " 0 0 1 " + (100 + radius) + " 140 L" +
      (100 + inner) + " 140 A" + inner + " " + inner + " 0 0 0 " + (100 - inner) + ' 140 Z" fill="' + fill + '"/>'
    );
  }

  function cloud(cx, cy) {
    return (
      '<path d="M' + (cx - 26) + " " + (cy + 12) + " Q" + (cx - 38) + " " + cy + " " + (cx - 22) + " " + (cy - 8) +
      " Q" + (cx - 16) + " " + (cy - 26) + " " + cx + " " + (cy - 18) + " Q" + (cx + 18) + " " + (cy - 28) + " " +
      (cx + 24) + " " + (cy - 6) + " Q" + (cx + 40) + " " + (cy + 2) + " " + (cx + 28) + " " + (cy + 12) + ' Z" fill="#ffffff"/>'
    );
  }

  function sunRays() {
    let rays = "";
    for (let i = 0; i < 12; i += 1) {
      const angle = (i * Math.PI) / 6;
      const tip = { x: 100 + 86 * Math.cos(angle), y: 100 + 86 * Math.sin(angle) };
      const left = { x: 100 + 54 * Math.cos(angle - 0.2), y: 100 + 54 * Math.sin(angle - 0.2) };
      const right = { x: 100 + 54 * Math.cos(angle + 0.2), y: 100 + 54 * Math.sin(angle + 0.2) };
      rays += '<polygon points="' + [tip, left, right].map((p) => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ") + '" fill="#ffb703"/>';
    }
    return rays;
  }

  const drawings = {
    Dragon:
      '<path d="M92 82 C70 40 40 34 26 46 C44 52 48 64 44 74 C58 68 70 74 76 88 Z" fill="#9be08a"/>' +
      '<path d="M66 138 C36 150 20 130 26 108 C34 122 48 126 64 120 Z" fill="#5cbf5a"/>' +
      '<path d="M60 112 L54 98 L68 104 L66 90 L80 98 L82 86 L92 96" fill="#f39c4a"/>' +
      '<ellipse cx="98" cy="128" rx="42" ry="34" fill="#5cbf5a"/>' +
      '<ellipse cx="104" cy="136" rx="22" ry="20" fill="#f6e27a"/>' +
      '<path d="M78 156 L76 178 L94 178 L94 160 Z" fill="#5cbf5a"/>' +
      '<path d="M112 160 L112 178 L130 178 L126 156 Z" fill="#5cbf5a"/>' +
      '<path d="M124 58 L116 34 L136 52 Z" fill="#f6e27a"/>' +
      '<path d="M144 54 L150 32 L158 58 Z" fill="#f6e27a"/>' +
      '<circle cx="136" cy="82" r="30" fill="#5cbf5a"/>' +
      '<ellipse cx="160" cy="94" rx="20" ry="14" fill="#5cbf5a"/>' +
      '<circle cx="134" cy="74" r="9" fill="#ffffff"/>' +
      '<circle cx="136" cy="75" r="4" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="170" cy="88" r="2.5" fill="' + INK + '" stroke="none"/>' +
      '<path d="M148 102 Q158 108 168 101" fill="none"/>' +
      '<path d="M180 96 C190 88 196 98 188 104 C198 106 196 118 184 114 C186 122 174 122 176 110 Z" fill="#ff8c42"/>',

    Fairy:
      '<ellipse cx="70" cy="84" rx="28" ry="40" transform="rotate(-28 70 84)" fill="#bfe6ff"/>' +
      '<ellipse cx="130" cy="84" rx="28" ry="40" transform="rotate(28 130 84)" fill="#bfe6ff"/>' +
      '<path d="M90 162 L88 184 M110 162 L112 184" fill="none"/>' +
      '<path d="M100 94 L64 162 Q100 176 136 162 Z" fill="#ff8fc8"/>' +
      '<path d="M90 106 L70 124 M110 106 L142 88" fill="none"/>' +
      '<path d="M142 88 L160 58" fill="none"/>' +
      star(162, 52, 14) +
      '<circle cx="100" cy="72" r="22" fill="#ffd9b8"/>' +
      '<path d="M78 70 Q78 42 100 44 Q124 42 122 70 Q112 56 100 58 Q88 56 78 70 Z" fill="#f2b950"/>' +
      face(100, 72, 8, 6) +
      sparkle(40, 150, 7) + sparkle(160, 140, 6) + sparkle(46, 36, 5),

    Books:
      '<rect x="30" y="134" width="140" height="30" rx="4" fill="#d9534f"/>' +
      '<rect x="150" y="138" width="14" height="22" fill="#fff7e0"/>' +
      '<rect x="44" y="104" width="122" height="30" rx="4" fill="#4a90d9"/>' +
      '<rect x="48" y="108" width="14" height="22" fill="#fff7e0"/>' +
      '<rect x="36" y="74" width="128" height="30" rx="4" fill="#f0ad4e"/>' +
      '<rect x="144" y="78" width="14" height="22" fill="#fff7e0"/>' +
      '<path d="M44 149 L120 149 M74 119 L150 119 M50 89 L120 89" fill="none" stroke-width="3"/>' +
      '<circle cx="104" cy="56" r="16" fill="#e74c3c"/>' +
      '<path d="M104 40 Q106 32 112 30" fill="none"/>' +
      '<path d="M108 36 Q120 28 124 38 Q114 42 108 36 Z" fill="#5cbf5a"/>',

    "Magic book":
      '<path d="M22 152 Q60 144 100 160 Q140 144 178 152 L178 162 Q140 154 100 170 Q60 154 22 162 Z" fill="#8e44ad"/>' +
      '<path d="M100 152 Q70 138 28 146 L28 76 Q70 68 100 82 Z" fill="#fff7e0"/>' +
      '<path d="M100 152 Q130 138 172 146 L172 76 Q130 68 100 82 Z" fill="#fff7e0"/>' +
      '<path d="M42 96 Q66 90 88 98 M42 112 Q66 106 88 114 M42 128 Q66 122 88 130 M112 98 Q134 90 158 96 M112 114 Q134 106 158 112 M112 130 Q134 122 158 128" fill="none" stroke-width="3"/>' +
      star(72, 40, 14) + star(126, 28, 11, "#ffd23f") + star(156, 54, 9) +
      sparkle(98, 50, 6) + sparkle(46, 60, 5),

    Castle:
      '<rect x="50" y="92" width="100" height="80" fill="#c9c3e6"/>' +
      '<rect x="56" y="80" width="14" height="14" fill="#c9c3e6"/>' +
      '<rect x="93" y="80" width="14" height="14" fill="#c9c3e6"/>' +
      '<rect x="130" y="80" width="14" height="14" fill="#c9c3e6"/>' +
      '<rect x="28" y="72" width="36" height="100" fill="#b3abd9"/>' +
      '<rect x="136" y="72" width="36" height="100" fill="#b3abd9"/>' +
      '<polygon points="22,74 46,32 70,74" fill="#e74c6c"/>' +
      '<polygon points="130,74 154,32 178,74" fill="#e74c6c"/>' +
      '<path d="M46 32 L46 14 M154 32 L154 14" fill="none"/>' +
      '<polygon points="46,14 64,20 46,26" fill="#ff8c42"/>' +
      '<polygon points="154,14 172,20 154,26" fill="#ff8c42"/>' +
      '<path d="M84 172 L84 142 Q100 122 116 142 L116 172 Z" fill="#8b5a2b"/>' +
      '<rect x="38" y="96" width="14" height="18" rx="7" fill="#ffe066"/>' +
      '<rect x="148" y="96" width="14" height="18" rx="7" fill="#ffe066"/>',

    Unicorn:
      '<path d="M54 112 Q24 104 28 140 Q40 126 54 130 Z" fill="#c77dff"/>' +
      '<rect x="64" y="136" width="13" height="36" rx="5" fill="#ffffff"/>' +
      '<rect x="86" y="140" width="13" height="34" rx="5" fill="#ffffff"/>' +
      '<rect x="108" y="140" width="13" height="34" rx="5" fill="#ffffff"/>' +
      '<rect x="128" y="136" width="13" height="36" rx="5" fill="#ffffff"/>' +
      '<ellipse cx="98" cy="122" rx="50" ry="30" fill="#ffffff"/>' +
      '<path d="M128 106 L138 70 L160 76 L150 112 Z" fill="#ffffff"/>' +
      '<polygon points="140,52 156,14 160,56" fill="#ffe066"/>' +
      '<circle cx="150" cy="70" r="22" fill="#ffffff"/>' +
      '<ellipse cx="170" cy="82" rx="16" ry="12" fill="#ffffff"/>' +
      '<circle cx="132" cy="58" r="10" fill="#ff8fc8"/>' +
      '<circle cx="124" cy="74" r="10" fill="#c77dff"/>' +
      '<circle cx="122" cy="92" r="10" fill="#7ec8f0"/>' +
      '<circle cx="152" cy="66" r="4" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="176" cy="80" r="2" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="160" cy="78" r="5" fill="#ff9fb0" stroke="none"/>',

    "Wizard hat":
      '<path d="M54 160 Q90 120 102 22 Q116 112 148 160 Z" fill="#3d5a9e"/>' +
      '<ellipse cx="100" cy="162" rx="76" ry="16" fill="#2e4682"/>' +
      '<path d="M66 140 Q100 152 136 140 L142 152 Q100 166 60 152 Z" fill="#ffe066"/>' +
      star(98, 96, 13) + star(116, 62, 8) +
      '<path d="M80 120 A12 12 0 1 0 92 108 A9 9 0 1 1 80 120 Z" fill="#ffe066"/>' +
      sparkle(160, 60, 7) + sparkle(42, 84, 6),

    Rocket:
      '<path d="M80 132 Q100 190 120 132 Z" fill="#ff8c42"/>' +
      '<path d="M90 132 Q100 164 110 132 Z" fill="#ffe066"/>' +
      '<path d="M72 108 L46 142 L74 136 Z" fill="#e74c3c"/>' +
      '<path d="M128 108 L154 142 L126 136 Z" fill="#e74c3c"/>' +
      '<path d="M100 22 Q138 60 130 134 L70 134 Q62 60 100 22 Z" fill="#f2f2f2"/>' +
      '<path d="M100 22 Q120 42 125 60 L75 60 Q80 42 100 22 Z" fill="#e74c3c"/>' +
      '<circle cx="100" cy="88" r="15" fill="#7ec8f0"/>' +
      sparkle(40, 50, 6) + sparkle(162, 80, 6) + star(156, 30, 8),

    Rainbow:
      rainbowBand(80, 12, "#ff6b6b") + rainbowBand(68, 12, "#ffa94d") + rainbowBand(56, 12, "#ffe066") +
      rainbowBand(44, 12, "#69db7c") + rainbowBand(32, 12, "#4dabf7") +
      cloud(38, 140) + cloud(162, 140),

    Cat:
      '<path d="M136 158 Q182 162 174 108 Q166 102 160 110 Q166 146 132 144 Z" fill="#f39c4a"/>' +
      '<ellipse cx="100" cy="142" rx="44" ry="36" fill="#f39c4a"/>' +
      '<polygon points="70,64 66,26 96,52" fill="#f39c4a"/>' +
      '<polygon points="130,64 134,26 104,52" fill="#f39c4a"/>' +
      '<circle cx="100" cy="84" r="34" fill="#f39c4a"/>' +
      '<polygon points="74,56 72,38 88,52" fill="#ff9fb0" stroke="none"/>' +
      '<polygon points="126,56 128,38 112,52" fill="#ff9fb0" stroke="none"/>' +
      '<path d="M88 54 L92 64 M100 52 L100 62 M112 54 L108 64" fill="none" stroke-width="3"/>' +
      '<ellipse cx="88" cy="82" rx="5" ry="7" fill="' + INK + '" stroke="none"/>' +
      '<ellipse cx="112" cy="82" rx="5" ry="7" fill="' + INK + '" stroke="none"/>' +
      '<polygon points="95,94 105,94 100,100" fill="#ff9fb0"/>' +
      '<path d="M100 100 Q94 108 88 104 M100 100 Q106 108 112 104" fill="none" stroke-width="3"/>' +
      '<path d="M60 92 L82 96 M60 102 L82 100 M140 92 L118 96 M140 102 L118 100" fill="none" stroke-width="2.5"/>',

    Owl:
      '<polygon points="54,64 58,34 80,54" fill="#a0673a"/>' +
      '<polygon points="146,64 142,34 120,54" fill="#a0673a"/>' +
      '<ellipse cx="100" cy="110" rx="54" ry="64" fill="#a0673a"/>' +
      '<path d="M50 100 Q36 140 62 160 Q66 130 58 104 Z" fill="#8a5530"/>' +
      '<path d="M150 100 Q164 140 138 160 Q134 130 142 104 Z" fill="#8a5530"/>' +
      '<ellipse cx="100" cy="132" rx="32" ry="36" fill="#e8c79a"/>' +
      '<path d="M84 128 Q90 134 96 128 M104 128 Q110 134 116 128 M90 144 Q96 150 102 144 M98 144 Q104 150 110 144" fill="none" stroke-width="2.5"/>' +
      '<circle cx="80" cy="88" r="19" fill="#ffffff"/>' +
      '<circle cx="120" cy="88" r="19" fill="#ffffff"/>' +
      '<circle cx="82" cy="90" r="8" fill="' + INK + '" stroke="none"/>' +
      '<circle cx="118" cy="90" r="8" fill="' + INK + '" stroke="none"/>' +
      '<polygon points="93,104 107,104 100,118" fill="#f6b93b"/>' +
      '<path d="M84 174 L84 182 M92 174 L92 182 M108 174 L108 182 M116 174 L116 182" stroke="#f6b93b" stroke-width="5"/>',

    Crown:
      '<path d="M40 142 L34 70 L70 106 L100 52 L130 106 L166 70 L160 142 Z" fill="#ffd23f"/>' +
      '<rect x="38" y="132" width="124" height="24" rx="4" fill="#f6b93b"/>' +
      '<circle cx="34" cy="68" r="9" fill="#e74c3c"/>' +
      '<circle cx="100" cy="50" r="10" fill="#4dabf7"/>' +
      '<circle cx="166" cy="68" r="9" fill="#e74c3c"/>' +
      '<circle cx="70" cy="144" r="6" fill="#69db7c"/>' +
      '<circle cx="100" cy="144" r="7" fill="#e74c3c"/>' +
      '<circle cx="130" cy="144" r="6" fill="#4dabf7"/>' +
      sparkle(170, 30, 6) + sparkle(28, 30, 5),

    "Happy star":
      '<polygon points="' + starPoints(100, 106, 80, 36, 5) + '" fill="#ffe066"/>' +
      face(100, 100, 12, 9) + sparkle(30, 30, 6) + sparkle(172, 170, 6),

    Ghost:
      '<path d="M54 172 L54 94 Q54 38 100 38 Q146 38 146 94 L146 172 L131 157 L116 172 L100 157 L84 172 L69 157 Z" fill="#ffffff"/>' +
      '<ellipse cx="84" cy="90" rx="7" ry="10" fill="' + INK + '" stroke="none"/>' +
      '<ellipse cx="116" cy="90" rx="7" ry="10" fill="' + INK + '" stroke="none"/>' +
      '<ellipse cx="100" cy="118" rx="9" ry="11" fill="' + INK + '"/>' +
      '<circle cx="72" cy="108" r="6" fill="#ff9fb0" stroke="none"/>' +
      '<circle cx="128" cy="108" r="6" fill="#ff9fb0" stroke="none"/>' +
      '<path d="M54 112 Q34 110 30 126 Q44 124 54 130 M146 112 Q166 110 170 126 Q156 124 146 130" fill="#ffffff"/>',

    Mushroom:
      '<path d="M78 112 Q74 160 70 174 L130 174 Q126 160 122 112 Z" fill="#fff3dc"/>' +
      '<path d="M24 118 Q32 42 100 38 Q168 42 176 118 Q100 136 24 118 Z" fill="#e74c3c"/>' +
      '<circle cx="62" cy="80" r="11" fill="#ffffff"/>' +
      '<circle cx="104" cy="62" r="13" fill="#ffffff"/>' +
      '<circle cx="144" cy="86" r="10" fill="#ffffff"/>' +
      '<circle cx="96" cy="102" r="7" fill="#ffffff"/>' +
      face(100, 140, 9, 6),

    Sun:
      sunRays() +
      '<circle cx="100" cy="100" r="48" fill="#ffd23f"/>' +
      face(100, 96, 14, 10),

    Treasure:
      '<path d="M36 92 Q36 52 100 52 Q164 52 164 92 Z" fill="#b5651d"/>' +
      '<rect x="36" y="92" width="128" height="74" rx="6" fill="#c97a2c"/>' +
      '<path d="M36 92 L164 92" fill="none"/>' +
      '<rect x="88" y="84" width="24" height="28" rx="4" fill="#ffd23f"/>' +
      '<circle cx="100" cy="98" r="4" fill="' + INK + '" stroke="none"/>' +
      '<path d="M60 56 L60 166 M140 56 L140 166" stroke="#ffd23f" stroke-width="7"/>' +
      '<circle cx="62" cy="44" r="10" fill="#ffd23f"/>' +
      '<circle cx="86" cy="38" r="10" fill="#ffd23f"/>' +
      star(130, 36, 12, "#4dabf7") + sparkle(164, 40, 6),

    Butterfly:
      '<path d="M100 96 Q60 30 30 60 Q16 92 96 104 Z" fill="#ff8fc8"/>' +
      '<path d="M100 96 Q140 30 170 60 Q184 92 104 104 Z" fill="#c77dff"/>' +
      '<path d="M96 108 Q40 112 46 150 Q66 168 98 116 Z" fill="#7ec8f0"/>' +
      '<path d="M104 108 Q160 112 154 150 Q134 168 102 116 Z" fill="#69db7c"/>' +
      '<circle cx="58" cy="70" r="8" fill="#ffe066"/>' +
      '<circle cx="142" cy="70" r="8" fill="#ffe066"/>' +
      '<ellipse cx="100" cy="112" rx="8" ry="36" fill="' + INK + '"/>' +
      '<path d="M96 78 Q86 56 78 50 M104 78 Q114 56 122 50" fill="none" stroke-width="3"/>'
  };

  function stickerSvg(inner) {
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="456" height="456" viewBox="-14 -14 228 228">' +
      "<defs>" +
      '<filter id="cut" x="-15%" y="-15%" width="130%" height="130%">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="6" result="edge"/>' +
      '<feOffset in="edge" dx="2" dy="4" result="drop"/>' +
      '<feGaussianBlur in="drop" stdDeviation="3" result="soft"/>' +
      '<feFlood flood-color="#000000" flood-opacity="0.22"/>' +
      '<feComposite in2="soft" operator="in" result="shadow"/>' +
      '<feFlood flood-color="#ffffff"/>' +
      '<feComposite in2="edge" operator="in" result="paper"/>' +
      '<feMerge><feMergeNode in="shadow"/><feMergeNode in="paper"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      "</filter>" +
      "</defs>" +
      '<g filter="url(#cut)" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">' +
      inner +
      "</g></svg>"
    );
  }

  window.BOOK_STICKERS = Object.keys(drawings).map((name) => ({
    name,
    url: "data:image/svg+xml;charset=utf-8," + encodeURIComponent(stickerSvg(drawings[name]))
  }));
})();
