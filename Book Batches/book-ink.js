/*
 * Book Batches – styled writing.
 *
 * The chosen font and colour apply to text written from then on. Text typed
 * in a different style than the one at the caret is wrapped in a <span data-ink>
 * carrying its own font and colour, so earlier writing keeps its look. A style
 * is { font, tracking, color }. Selecting existing text and choosing a font or
 * colour restyles only that selection, leaving the rest of each run as it was.
 */

window.BookInk = (() => {
  function sameStyle(a, b) {
    return a.font === b.font && a.color === b.color;
  }

  function styleOf(element, editor, base) {
    const span = element && element.closest ? element.closest("[data-ink]") : null;
    if (!span || !editor.contains(span)) return base;
    return {
      font: span.dataset.font,
      tracking: span.dataset.tracking || base.tracking,
      color: span.dataset.color
    };
  }

  function caretRange(editor) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return editor.contains(range.startContainer) ? range : null;
  }

  function styleAtCaret(editor, base) {
    const range = caretRange(editor);
    if (!range) return base;
    const node = range.startContainer;
    return styleOf(node.nodeType === Node.TEXT_NODE ? node.parentElement : node, editor, base);
  }

  function inkSpan(style, withTracking) {
    const span = document.createElement("span");
    span.dataset.ink = "";
    span.dataset.font = style.font;
    span.dataset.color = style.color;
    span.style.fontFamily = style.font;
    span.style.color = style.color;
    if (withTracking) {
      span.dataset.tracking = style.tracking;
      span.style.letterSpacing = style.tracking;
    }
    return span;
  }

  /** Inserts text at the caret in the pen style; returns false if nothing was inserted. */
  function insertText(editor, text, pen, base, withTracking) {
    const range = caretRange(editor);
    if (!range || !text) return false;
    range.deleteContents();
    const node = document.createTextNode(text.replace(/^ | $/g, "\u00a0"));
    const needsSpan = !sameStyle(styleAtCaret(editor, base), pen);
    const inserted = needsSpan ? inkSpan(pen, withTracking) : node;
    if (needsSpan) inserted.append(node);
    range.insertNode(inserted);
    const caret = document.createRange();
    caret.setStart(node, node.length);
    caret.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(caret);
    return true;
  }

  /** Turns non-breaking spaces that now have text after them back into normal spaces. */
  function relaxSpaces(editor) {
    const selection = window.getSelection();
    const current = selection.rangeCount ? selection.getRangeAt(0) : null;
    const saved = current && {
      startNode: current.startContainer,
      startOffset: current.startOffset,
      endNode: current.endContainer,
      endOffset: current.endOffset
    };
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let changed = false;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const value = node.nodeValue;
      for (let index = 0; index < value.length; index += 1) {
        if (value[index] !== "\u00a0") continue;
        const before = index > 0 ? value[index - 1] : "x";
        const after = value[index + 1];
        if (after && /\S/.test(after) && after !== "\u00a0" && !/\s/.test(before)) {
          node.replaceData(index, 1, " ");
          changed = true;
        }
      }
    }
    if (changed && saved) {
      const range = document.createRange();
      range.setStart(saved.startNode, saved.startOffset);
      range.setEnd(saved.endNode, saved.endOffset);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  /**
   * Keeps typed characters in the pen style. Typing that already matches the
   * style at the caret is left to the browser so undo keeps working.
   */
  function followPen(editor, getPen, getBase, withTracking) {
    editor.addEventListener("beforeinput", (event) => {
      if (event.isComposing || event.inputType !== "insertText" || !event.data) return;
      const pen = getPen();
      const base = getBase();
      const range = caretRange(editor);
      const caretStyle = styleAtCaret(editor, base);
      if (range && range.collapsed && sameStyle(caretStyle, pen)) return;
      event.preventDefault();
      if (insertText(editor, event.data, pen, base, withTracking)) {
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    editor.addEventListener("input", () => relaxSpaces(editor));
  }

  const BLOCKS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "BLOCKQUOTE"]);

  /** Splits editor HTML into paragraphs of styled runs: [[{ text, font, tracking, color }]]. */
  function paragraphs(html, base) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    const holder = document.createElement("div");
    holder.append(template.content);
    const result = [[]];
    const newParagraph = () => result.push([]);

    function walk(node, style) {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.nodeValue.replace(/\s+/g, " ");
          if (text) result[result.length - 1].push({ text, ...style });
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        if (child.tagName === "BR") {
          const closesBlock = !child.nextSibling && BLOCKS.has(child.parentNode.tagName);
          if (!closesBlock) newParagraph();
          return;
        }
        const childStyle = child.hasAttribute("data-ink")
          ? { font: child.dataset.font, tracking: child.dataset.tracking || style.tracking, color: child.dataset.color }
          : style;
        const block = BLOCKS.has(child.tagName);
        if (block && result[result.length - 1].length) newParagraph();
        walk(child, childStyle);
        if (block) newParagraph();
      });
    }

    walk(holder, base);
    while (result.length > 1 && !result[result.length - 1].length) result.pop();
    return result;
  }

  function plainText(paragraphList) {
    return paragraphList.map((runs) => runs.map((run) => run.text).join("")).join("\n");
  }

  function fontFor(run, size) {
    return "400 " + size + "px " + run.font;
  }

  function measure(ctx, run, text, size, tracking) {
    ctx.font = fontFor(run, size);
    ctx.letterSpacing = tracking || run.tracking || "0px";
    return ctx.measureText(text).width;
  }

  /** Breaks styled runs into lines of pieces that fit the width. */
  function layoutLines(ctx, paragraphList, width, size, tracking) {
    const lines = [];
    paragraphList.forEach((runs) => {
      let line = [];
      let lineWidth = 0;
      const pushPiece = (run, text) => {
        const pieceWidth = measure(ctx, run, text, size, tracking);
        const isSpace = /^\s+$/.test(text);
        if (lineWidth + pieceWidth > width && line.length) {
          lines.push(line);
          line = [];
          lineWidth = 0;
          if (isSpace) return;
        }
        if (pieceWidth > width && !isSpace) {
          Array.from(text).forEach((char) => pushPiece(run, char));
          return;
        }
        line.push({ run, text, width: pieceWidth });
        lineWidth += pieceWidth;
      };
      runs.forEach((run) => {
        run.text.split(/(\s+)/).filter(Boolean).forEach((part) => pushPiece(run, part));
      });
      lines.push(line);
    });
    return lines.map((line) => {
      while (line.length && /^\s+$/.test(line[line.length - 1].text)) line.pop();
      return line;
    });
  }

  /** Draws styled paragraphs inside a box; style is { size, leading, align, tracking? }. */
  function drawBlock(ctx, paragraphList, box, style) {
    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const lines = layoutLines(ctx, paragraphList, box.width, style.size, style.tracking);
    const lineHeight = style.size * style.leading;
    const block = lines.length * lineHeight;
    let y = style.align === "center" ? box.y + Math.max(0, (box.height - block) / 2) : box.y;
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    ctx.clip();
    lines.forEach((line) => {
      const lineWidth = line.reduce((sum, piece) => sum + piece.width, 0);
      let x = style.align === "center" ? box.x + (box.width - lineWidth) / 2 : box.x;
      if (y < box.y + box.height) {
        line.forEach((piece) => {
          ctx.font = fontFor(piece.run, style.size);
          ctx.letterSpacing = style.tracking || piece.run.tracking || "0px";
          ctx.fillStyle = piece.run.color;
          ctx.fillText(piece.text, x, y);
          x += piece.width;
        });
      }
      y += lineHeight;
    });
    ctx.restore();
  }

  const SAFE_VALUE = /^[\w\s#,.'"()-]*$/;
  const DROPPED = new Set(["SCRIPT", "STYLE", "TEMPLATE", "IFRAME", "OBJECT", "SVG", "MATH"]);

  /** Rebuilds saved HTML keeping only text, line breaks, blocks and ink spans. */
  function clean(html) {
    const source = document.createElement("template");
    source.innerHTML = html || "";
    const output = document.createElement("div");

    function copy(from, into) {
      from.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          into.append(child.nodeValue);
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        if (DROPPED.has(child.tagName.toUpperCase())) return;
        if (child.tagName === "BR") {
          into.append(document.createElement("br"));
          return;
        }
        if (child.hasAttribute("data-ink")) {
          const { font = "", color = "", tracking = "" } = child.dataset;
          if (SAFE_VALUE.test(font) && SAFE_VALUE.test(color) && SAFE_VALUE.test(tracking)) {
            const span = inkSpan({ font, color, tracking }, Boolean(tracking));
            copy(child, span);
            into.append(span);
            return;
          }
        }
        if (BLOCKS.has(child.tagName)) {
          const block = document.createElement("div");
          copy(child, block);
          into.append(block);
          return;
        }
        copy(child, into);
      });
    }

    copy(source.content, output);
    return output.innerHTML;
  }

  /** Pulls the text node out so its ink span, if any, contains nothing else. */
  function splitInkAround(node) {
    const parent = node.parentElement;
    if (!parent || !parent.hasAttribute("data-ink")) return;
    if (node.previousSibling) {
      const before = parent.cloneNode(false);
      while (parent.firstChild && parent.firstChild !== node) before.append(parent.firstChild);
      parent.before(before);
    }
    if (node.nextSibling) {
      const after = parent.cloneNode(false);
      while (node.nextSibling) after.append(node.nextSibling);
      parent.after(after);
    }
  }

  function writeInk(span, style, withTracking) {
    span.dataset.font = style.font;
    span.dataset.color = style.color;
    span.style.fontFamily = style.font;
    span.style.color = style.color;
    if (withTracking) {
      span.dataset.tracking = style.tracking;
      span.style.letterSpacing = style.tracking;
    }
  }

  /** The part of a text node that falls inside the range, or null. */
  function selectedOffsets(node, range) {
    const length = node.nodeValue.length;
    if (!length) return null;
    let atStart;
    let atEnd;
    try {
      atStart = range.comparePoint(node, 0);
      atEnd = range.comparePoint(node, length);
    } catch (error) {
      return null;
    }
    if (atStart === 1 || atEnd === -1) return null;
    if (atStart === 0 && atEnd === 0) return { start: 0, end: length };
    let start = 0;
    let end = length;
    if (atStart === -1) {
      if (range.startContainer !== node) return null;
      start = range.startOffset;
    }
    if (atEnd === 1) {
      if (range.endContainer !== node) return null;
      end = range.endOffset;
    }
    if (start >= end) return null;
    return { start, end };
  }

  function paintNode(editor, node, patch, withTracking, base) {
    splitInkAround(node);
    const parent = node.parentElement;
    const inInk = Boolean(parent && parent.hasAttribute("data-ink") && parent.childNodes.length === 1 && editor.contains(parent));
    const current = inInk
      ? {
          font: parent.dataset.font || base.font,
          tracking: parent.dataset.tracking || base.tracking,
          color: parent.dataset.color || base.color
        }
      : { font: base.font, tracking: base.tracking, color: base.color };
    const next = {
      font: Object.prototype.hasOwnProperty.call(patch, "font") ? patch.font : current.font,
      tracking: Object.prototype.hasOwnProperty.call(patch, "tracking") ? patch.tracking : current.tracking,
      color: Object.prototype.hasOwnProperty.call(patch, "color") ? patch.color : current.color
    };
    const matchesBase = next.font === base.font && next.color === base.color && (!withTracking || next.tracking === base.tracking);
    if (matchesBase) {
      if (inInk) parent.replaceWith(node);
      return;
    }
    if (inInk) {
      writeInk(parent, next, withTracking);
      return;
    }
    const span = inkSpan(next, withTracking);
    node.replaceWith(span);
    span.append(node);
  }

  function mergeAdjacentInk(editor) {
    editor.querySelectorAll("[data-ink]").forEach((span) => {
      if (!span.isConnected) return;
      let next = span.nextSibling;
      while (next && next.nodeType === Node.TEXT_NODE && !next.nodeValue) next = next.nextSibling;
      if (!next || next.nodeType !== Node.ELEMENT_NODE || !next.hasAttribute("data-ink")) return;
      if (next.dataset.font !== span.dataset.font || next.dataset.color !== span.dataset.color) return;
      if ((next.dataset.tracking || "") !== (span.dataset.tracking || "")) return;
      while (next.firstChild) span.append(next.firstChild);
      next.remove();
    });
  }

  /**
   * Applies a font and/or colour patch to the text inside range.
   * Unpatched fields stay as they are on each run. Returns false if nothing was selected.
   */
  function restyle(editor, range, patch, withTracking, base) {
    if (!editor || !range || range.collapsed) return false;
    const slices = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const offsets = selectedOffsets(walker.currentNode, range);
      if (offsets) slices.push({ node: walker.currentNode, start: offsets.start, end: offsets.end });
    }
    if (!slices.length) return false;

    const styled = [];
    for (let index = slices.length - 1; index >= 0; index -= 1) {
      const slice = slices[index];
      if (!slice.node.isConnected) continue;
      let target = slice.node;
      const length = target.nodeValue.length;
      const cutEnd = Math.min(slice.end, length);
      const cutStart = Math.max(0, Math.min(slice.start, cutEnd));
      if (cutStart >= cutEnd) continue;
      if (cutEnd < length) target.splitText(cutEnd);
      if (cutStart > 0) target = target.splitText(cutStart);
      paintNode(editor, target, patch, withTracking, base);
      styled.push(target);
    }
    if (!styled.length) return false;
    mergeAdjacentInk(editor);
    styled.reverse();
    const first = styled.find((node) => node.isConnected);
    const last = [...styled].reverse().find((node) => node.isConnected);
    if (!first || !last) return true;
    const next = document.createRange();
    next.setStart(first, 0);
    next.setEnd(last, last.nodeValue.length);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(next);
    return true;
  }

  /** The style of the first visible character, or the base style. */
  function leadingStyle(editor, base) {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.trim()) return styleOf(walker.currentNode.parentElement, editor, base);
    }
    return base;
  }

  return { followPen, insertText, paragraphs, plainText, drawBlock, leadingStyle, clean, restyle };
})();
