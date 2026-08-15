(function () {
  const PAGE_WIDTH = 1240;
  const PAGE_HEIGHT = 1754;

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("No fue posible cargar la fotografía para el PDF."));
      image.src = url;
    });
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function windowPath(ctx, centerX, top, width, height) {
    const left = centerX - width / 2;
    const right = centerX + width / 2;
    const bottom = top + height;
    ctx.beginPath();
    ctx.moveTo(left, bottom - 48);
    ctx.lineTo(left, top + 92);
    ctx.bezierCurveTo(left, top + 42, centerX - 55, top + 12, centerX, top);
    ctx.bezierCurveTo(centerX + 55, top + 12, right, top + 42, right, top + 92);
    ctx.lineTo(right, bottom - 48);
    ctx.quadraticCurveTo(centerX + 72, bottom - 4, centerX, bottom + 24);
    ctx.quadraticCurveTo(centerX - 72, bottom - 4, left, bottom - 48);
    ctx.closePath();
  }

  function drawImageCover(ctx, image, x, y, width, height) {
    const sourceRatio = image.width / image.height;
    const targetRatio = width / height;
    let sx = 0;
    let sy = 0;
    let sw = image.width;
    let sh = image.height;
    if (sourceRatio > targetRatio) {
      sw = image.height * targetRatio;
      sx = (image.width - sw) / 2;
    } else {
      sh = image.width / targetRatio;
      sy = Math.max(0, (image.height - sh) * 0.22);
    }
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  function drawLeaf(ctx, x, y, angle, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(17, -20, 33, -16, 35, -3);
    ctx.bezierCurveTo(20, 4, 9, 7, 0, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(27, -7);
    ctx.stroke();
    ctx.restore();
  }

  function drawOrnamentalWindow(ctx, image, centerX, top) {
    const width = 292;
    const height = 322;
    const gradient = ctx.createLinearGradient(centerX - width / 2, top, centerX + width / 2, top + height);
    gradient.addColorStop(0, "#f1d78f");
    gradient.addColorStop(.38, "#9c722b");
    gradient.addColorStop(.72, "#dec174");
    gradient.addColorStop(1, "#76529a");

    ctx.save();
    ctx.shadowColor = "rgba(82, 56, 115, .24)";
    ctx.shadowBlur = 30;
    windowPath(ctx, centerX, top, width, height);
    ctx.fillStyle = "#f6ead0";
    ctx.fill();
    ctx.restore();

    ctx.save();
    windowPath(ctx, centerX, top + 9, width - 22, height - 29);
    ctx.clip();
    drawImageCover(ctx, image, centerX - (width - 22) / 2, top + 9, width - 22, height + 20);
    const shade = ctx.createLinearGradient(0, top, 0, top + height);
    shade.addColorStop(0, "rgba(21, 13, 38, 0)");
    shade.addColorStop(.82, "rgba(24, 15, 41, .06)");
    shade.addColorStop(1, "rgba(24, 15, 41, .34)");
    ctx.fillStyle = shade;
    ctx.fillRect(centerX - width / 2, top, width, height + 30);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 8;
    windowPath(ctx, centerX, top, width, height);
    ctx.stroke();
    ctx.lineWidth = 2.5;
    windowPath(ctx, centerX, top + 13, width - 30, height - 38);
    ctx.stroke();

    ctx.lineWidth = 3;
    drawLeaf(ctx, centerX - 122, top + 45, -2.55, 1.15);
    drawLeaf(ctx, centerX + 122, top + 45, -.58, 1.15);
    drawLeaf(ctx, centerX - 134, top + 214, 2.72, 1.05);
    drawLeaf(ctx, centerX + 134, top + 214, .42, 1.05);
    drawLeaf(ctx, centerX - 44, top - 3, -1.55, .9);
    drawLeaf(ctx, centerX + 44, top - 3, -1.6, .9);

    ctx.beginPath();
    ctx.moveTo(centerX, top - 35);
    ctx.lineTo(centerX + 13, top - 13);
    ctx.lineTo(centerX, top + 8);
    ctx.lineTo(centerX - 13, top - 13);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function wrapLines(ctx, text, maxWidth, maxLines) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !current) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
    if (maxLines && lines.length > maxLines) {
      const clipped = lines.slice(0, maxLines);
      clipped[maxLines - 1] = `${clipped[maxLines - 1].replace(/[.,;:]?$/, "")}…`;
      return clipped;
    }
    return lines;
  }

  function centeredText(ctx, text, centerX, y, maxWidth, lineHeight, maxLines) {
    const lines = wrapLines(ctx, text, maxWidth, maxLines);
    lines.forEach((line, index) => ctx.fillText(line, centerX, y + index * lineHeight));
    return y + Math.max(lines.length, 1) * lineHeight;
  }

  function drawStar(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * .24, -size * .23);
    ctx.lineTo(size, 0);
    ctx.lineTo(size * .24, size * .23);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * .24, size * .23);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size * .24, -size * .23);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDivider(ctx, y) {
    const gradientLeft = ctx.createLinearGradient(330, 0, 585, 0);
    gradientLeft.addColorStop(0, "rgba(173,130,48,0)");
    gradientLeft.addColorStop(1, "#b38a3d");
    const gradientRight = ctx.createLinearGradient(655, 0, 910, 0);
    gradientRight.addColorStop(0, "#b38a3d");
    gradientRight.addColorStop(1, "rgba(173,130,48,0)");
    ctx.fillStyle = gradientLeft;
    ctx.fillRect(330, y, 255, 2);
    ctx.fillStyle = gradientRight;
    ctx.fillRect(655, y, 255, 2);
    drawStar(ctx, 620, y + 1, 13, "#b38a3d");
  }

  function drawDetailBox(ctx, x, y, width, title, primary, secondary) {
    roundedRect(ctx, x, y, width, 150, 24);
    ctx.fillStyle = "rgba(103,76,157,.055)";
    ctx.fill();
    ctx.strokeStyle = "rgba(103,76,157,.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#76529a";
    ctx.font = "700 20px Arial, sans-serif";
    ctx.fillText(title.toUpperCase(), x + width / 2, y + 37);
    ctx.fillStyle = "#32264d";
    ctx.font = "700 29px Georgia, serif";
    const primaryLines = wrapLines(ctx, primary, width - 54, 2);
    primaryLines.forEach((line, index) => ctx.fillText(line, x + width / 2, y + 78 + index * 31));
    if (secondary) {
      ctx.fillStyle = "#756d80";
      ctx.font = "22px Arial, sans-serif";
      ctx.fillText(secondary, x + width / 2, y + 130);
    }
  }

  function drawBadge(ctx, x, y, width, text) {
    roundedRect(ctx, x, y, width, 70, 35);
    ctx.fillStyle = "rgba(103,76,157,.07)";
    ctx.fill();
    ctx.fillStyle = "#6f657e";
    ctx.font = "24px Arial, sans-serif";
    ctx.textAlign = "center";
    const lines = wrapLines(ctx, text, width - 34, 1);
    ctx.fillText(lines[0] || "", x + width / 2, y + 44);
  }

  async function renderCard(invitation, event, imageUrl) {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false });
    const portrait = await loadImage(imageUrl);

    const night = ctx.createLinearGradient(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    night.addColorStop(0, "#120c29");
    night.addColorStop(.5, "#2a194b");
    night.addColorStop(1, "#0c091f");
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    for (let index = 0; index < 46; index += 1) {
      const x = 32 + ((index * 193) % 1175);
      const y = 25 + ((index * 107) % 1695);
      drawStar(ctx, x, y, index % 5 === 0 ? 6 : 3, index % 3 === 0 ? "rgba(239,210,139,.62)" : "rgba(255,255,255,.38)");
    }

    roundedRect(ctx, 58, 50, 1124, 1654, 42);
    ctx.fillStyle = "#fffaf0";
    ctx.fill();
    ctx.shadowColor = "rgba(4,2,16,.35)";
    ctx.shadowBlur = 45;
    ctx.strokeStyle = "#d4b46b";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    roundedRect(ctx, 89, 82, 1062, 1590, 30);
    ctx.strokeStyle = "rgba(168,124,47,.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    roundedRect(ctx, 101, 94, 1038, 1566, 24);
    ctx.strokeStyle = "rgba(111,78,154,.18)";
    ctx.stroke();

    drawStar(ctx, 111, 104, 11, "#b38a3d");
    drawStar(ctx, 1129, 104, 11, "#b38a3d");
    drawStar(ctx, 111, 1650, 11, "#b38a3d");
    drawStar(ctx, 1129, 1650, 11, "#b38a3d");

    ctx.textAlign = "center";
    ctx.fillStyle = "#76529a";
    ctx.font = "700 22px Arial, sans-serif";
    ctx.fillText("UNA INVITACIÓN MÁGICA", PAGE_WIDTH / 2, 155);
    drawDivider(ctx, 188);

    ctx.fillStyle = "#4d3478";
    ctx.font = "italic 700 67px Georgia, serif";
    centeredText(ctx, event.title || "Mi cumpleaños", PAGE_WIDTH / 2, 255, 850, 72, 2);

    drawOrnamentalWindow(ctx, portrait, PAGE_WIDTH / 2, 380);

    const greeting = ["Sr/a", invitation.primaryName, invitation.salutationDetail].filter(Boolean).join(" ");
    ctx.fillStyle = "#4d3478";
    ctx.font = "700 43px Georgia, serif";
    centeredText(ctx, greeting, PAGE_WIDTH / 2, 770, 880, 51, 2);

    ctx.fillStyle = "#665e74";
    ctx.font = "31px Georgia, serif";
    centeredText(ctx, event.message || "La compañía de ustedes hará que esta celebración sea aún más inolvidable.", PAGE_WIDTH / 2, 885, 790, 43, 3);

    drawDivider(ctx, 1030);
    drawDetailBox(ctx, 150, 1080, 445, "Fecha y hora", event.date || "Fecha por confirmar", event.time || "Hora por confirmar");
    drawDetailBox(ctx, 645, 1080, 445, "Lugar", event.place || "Lugar por confirmar", event.address || "Dirección por confirmar");

    const badges = [];
    if (event.dressCode) badges.push(`Código de vestuario: ${event.dressCode}`);
    if (invitation.tableName) badges.push(`Mesa asignada: ${invitation.tableName}`);
    if (badges.length === 1) drawBadge(ctx, 350, 1270, 540, badges[0]);
    if (badges.length >= 2) {
      drawBadge(ctx, 145, 1270, 455, badges[0]);
      drawBadge(ctx, 640, 1270, 455, badges[1]);
    }

    ctx.fillStyle = "#9b7837";
    ctx.font = "700 21px Arial, sans-serif";
    ctx.fillText("CONSERVA ESTA INVITACIÓN COMO RECUERDO", PAGE_WIDTH / 2, 1435);
    ctx.fillStyle = "#776f82";
    ctx.font = "24px Georgia, serif";
    ctx.fillText("Será maravilloso celebrar juntos", PAGE_WIDTH / 2, 1485);
    drawStar(ctx, PAGE_WIDTH / 2 - 43, 1545, 10, "#d1ae60");
    drawStar(ctx, PAGE_WIDTH / 2, 1545, 15, "#76529a");
    drawStar(ctx, PAGE_WIDTH / 2 + 43, 1545, 10, "#d1ae60");

    return canvas;
  }

  function dataUrlBytes(dataUrl) {
    const binary = atob(dataUrl.split(",")[1]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function ascii(text) {
    return new TextEncoder().encode(text);
  }

  function concatenate(parts) {
    const size = parts.reduce((total, part) => total + part.length, 0);
    const result = new Uint8Array(size);
    let offset = 0;
    parts.forEach((part) => {
      result.set(part, offset);
      offset += part.length;
    });
    return result;
  }

  function pdfFromJpeg(jpeg, imageWidth, imageHeight) {
    const header = concatenate([ascii("%PDF-1.4\n%"), new Uint8Array([255, 255, 255, 255]), ascii("\n")]);
    const content = ascii("q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n");
    const objects = [
      ascii("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
      ascii("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
      ascii("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n"),
      concatenate([ascii(`4 0 obj\n<< /Length ${content.length} >>\nstream\n`), content, ascii("endstream\nendobj\n")]),
      concatenate([
        ascii(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
        jpeg,
        ascii("\nendstream\nendobj\n")
      ])
    ];

    const offsets = [0];
    let cursor = header.length;
    objects.forEach((object) => {
      offsets.push(cursor);
      cursor += object.length;
    });
    const xrefOffset = cursor;
    const xref = ["xref\n0 6\n0000000000 65535 f \n"];
    offsets.slice(1).forEach((offset) => xref.push(`${String(offset).padStart(10, "0")} 00000 n \n`));
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return concatenate([header, ...objects, ascii(xref.join("")), ascii(trailer)]);
  }

  function safeFilename(value) {
    const normalized = String(value || "invitado").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normalized.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "invitado";
  }

  async function download(options) {
    const canvas = await renderCard(options.invitation, options.event, options.imageUrl);
    const jpeg = dataUrlBytes(canvas.toDataURL("image/jpeg", .94));
    const pdf = pdfFromJpeg(jpeg, canvas.width, canvas.height);
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `invitacion-${safeFilename(options.invitation.primaryName)}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  window.InvitationPdf = { download };
})();
