import $ from "jquery";
import type { MediaItem, MediaMatchContext } from "../core/types";
import { buildSelectorForElement, isInfoUiElement } from "./common";

const SRCSET_SPLIT_PATTERN = /\s*,\s*/;

const MEDIA_EXTENSION_MIME_MAP: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  oga: "audio/ogg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  pdf: "application/pdf",
  html: "text/html",
  htm: "text/html",
};

const FALLBACK_KIND_MIME: Record<MediaItem["kind"], string> = {
  image: "image/*",
  picture: "image/*",
  video: "video/*",
  audio: "audio/*",
  source: "application/octet-stream",
  iframe: "text/html",
  embed: "application/octet-stream",
  object: "application/octet-stream",
  svg: "image/svg+xml",
  canvas: "image/png",
  background: "image/*",
};

export const normalizeMediaUrl = (raw: string) => {
  const value = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!value) {
    return "";
  }

  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
};

const getPrimarySrcsetUrl = (srcset: string) => {
  const firstCandidate = srcset
    .split(SRCSET_SPLIT_PATTERN)
    .map((part) => part.trim())
    .find(Boolean);
  if (!firstCandidate) {
    return "";
  }

  const [urlPart] = firstCandidate.split(/\s+/);
  return urlPart ?? "";
};

const parseDataUrlMimeType = (url: string) => {
  const match = url.match(/^data:([^;,]+)[;,]/i);
  return match?.[1] ?? "";
};

const inferMediaMimeType = (kind: MediaItem["kind"], url: string, hint?: string) => {
  const hintValue = hint?.trim();
  if (hintValue) {
    return hintValue;
  }

  const normalizedUrl = normalizeMediaUrl(url);
  if (!normalizedUrl) {
    return FALLBACK_KIND_MIME[kind];
  }

  if (normalizedUrl.startsWith("data:")) {
    return parseDataUrlMimeType(normalizedUrl) || FALLBACK_KIND_MIME[kind];
  }

  try {
    const parsed = new URL(normalizedUrl, window.location.href);
    const pathname = parsed.pathname || "";
    const extension = pathname.includes(".") ? pathname.split(".").pop()?.toLowerCase() : "";
    if (extension && MEDIA_EXTENSION_MIME_MAP[extension]) {
      return MEDIA_EXTENSION_MIME_MAP[extension];
    }
  } catch {
    const extension = normalizedUrl.includes(".") ? normalizedUrl.split(".").pop()?.split(/[?#]/)[0].toLowerCase() : "";
    if (extension && MEDIA_EXTENSION_MIME_MAP[extension]) {
      return MEDIA_EXTENSION_MIME_MAP[extension];
    }
  }

  return FALLBACK_KIND_MIME[kind];
};

export const getMediaRenderElement = (element: Element) => {
  if (element instanceof HTMLSourceElement) {
    const parent = element.parentElement;
    if (parent instanceof HTMLPictureElement) {
      return $(parent).find("img").first().get(0) ?? parent;
    }
    return parent ?? element;
  }

  if (element instanceof HTMLPictureElement) {
    return $(element).find("img").first().get(0) ?? element;
  }

  return element;
};

const getRenderedSize = (element: Element) => {
  const renderElement = getMediaRenderElement(element);
  const rect = renderElement.getBoundingClientRect();
  let width = Math.max(0, Math.round(rect.width));
  let height = Math.max(0, Math.round(rect.height));

  if (width > 0 || height > 0) {
    return { width, height };
  }

  if (renderElement instanceof HTMLElement) {
    width = Math.max(width, renderElement.offsetWidth, renderElement.clientWidth);
    height = Math.max(height, renderElement.offsetHeight, renderElement.clientHeight);
  }

  if (renderElement instanceof HTMLImageElement) {
    width = Math.max(width, renderElement.naturalWidth);
    height = Math.max(height, renderElement.naturalHeight);
  } else if (renderElement instanceof HTMLVideoElement) {
    width = Math.max(width, renderElement.videoWidth);
    height = Math.max(height, renderElement.videoHeight);
  } else if (renderElement instanceof HTMLCanvasElement) {
    width = Math.max(width, renderElement.width);
    height = Math.max(height, renderElement.height);
  } else if (renderElement instanceof SVGGraphicsElement) {
    try {
      const box = renderElement.getBBox();
      width = Math.max(width, Math.round(box.width));
      height = Math.max(height, Math.round(box.height));
    } catch {
      // ignore unsupported SVG geometry reads
    }
  }

  if (width === 0 && height === 0) {
    const computed = window.getComputedStyle(renderElement);
    const computedWidth = Number.parseFloat(computed.width);
    const computedHeight = Number.parseFloat(computed.height);
    if (Number.isFinite(computedWidth) && computedWidth > 0) {
      width = Math.round(computedWidth);
    }
    if (Number.isFinite(computedHeight) && computedHeight > 0) {
      height = Math.round(computedHeight);
    }
  }

  return {
    width: Math.max(0, width),
    height: Math.max(0, height),
  };
};

const collectMediaOnElement = (element: Element): MediaItem[] => {
  const mediaItems: MediaItem[] = [];
  const pushMedia = (
    entry: Omit<MediaItem, "selector" | "url" | "mimeType"> & { url?: string; mimeTypeHint?: string; mimeType?: string }
  ) => {
    const normalizedUrl = normalizeMediaUrl(entry.url ?? "");
    const mimeType = entry.mimeType ?? inferMediaMimeType(entry.kind, normalizedUrl, entry.mimeTypeHint);
    mediaItems.push({
      element: entry.element,
      kind: entry.kind,
      url: normalizedUrl,
      mimeType,
      intrinsic: entry.intrinsic,
      rendered: entry.rendered,
      selector: buildSelectorForElement(entry.element),
    });
  };

  const appendBackgroundMedia = (node: Element) => {
    const computed = window.getComputedStyle(node);
    const backgroundImage = computed.backgroundImage;
    if (!backgroundImage || backgroundImage === "none") {
      return;
    }
    const matches = Array.from(backgroundImage.matchAll(/url\((['"]?)(.*?)\1\)/g));
    matches.forEach((match) => {
      const url = match[2];
      if (!url) {
        return;
      }
      pushMedia({
        element: node,
        kind: "background",
        url,
        intrinsic: null,
        rendered: getRenderedSize(node),
      });
    });
  };

  if (element instanceof HTMLPictureElement) {
    const pictureRendered = getRenderedSize(element);
    const image = $(element).children("img").first().get(0);
    pushMedia({
      element,
      kind: "picture",
      url: image?.currentSrc || image?.src || "",
      mimeTypeHint: "image/*",
      intrinsic: image ? { width: image.naturalWidth, height: image.naturalHeight } : null,
      rendered: pictureRendered,
    });
    $(element)
      .children("source")
      .each((_index, source) => {
        if (!(source instanceof HTMLSourceElement)) {
          return;
        }
        pushMedia({
          element: source,
          kind: "source",
          url: source.src || getPrimarySrcsetUrl(source.srcset),
          mimeTypeHint: source.type,
          intrinsic: null,
          rendered: getRenderedSize(source),
        });
      });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLImageElement) {
    pushMedia({
      element,
      kind: "image",
      url: element.currentSrc || element.src,
      intrinsic: { width: element.naturalWidth, height: element.naturalHeight },
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLVideoElement) {
    pushMedia({
      element,
      kind: "video",
      url: element.currentSrc || element.src,
      intrinsic: { width: element.videoWidth, height: element.videoHeight },
      rendered: getRenderedSize(element),
    });
    $(element)
      .children("source")
      .each((_index, source) => {
        if (!(source instanceof HTMLSourceElement)) {
          return;
        }
        pushMedia({
          element: source,
          kind: "source",
          url: source.src || getPrimarySrcsetUrl(source.srcset),
          mimeTypeHint: source.type || "video/*",
          intrinsic: null,
          rendered: getRenderedSize(source),
        });
      });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLAudioElement) {
    pushMedia({
      element,
      kind: "audio",
      url: element.currentSrc || element.src,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    $(element)
      .children("source")
      .each((_index, source) => {
        if (!(source instanceof HTMLSourceElement)) {
          return;
        }
        pushMedia({
          element: source,
          kind: "source",
          url: source.src || getPrimarySrcsetUrl(source.srcset),
          mimeTypeHint: source.type || "audio/*",
          intrinsic: null,
          rendered: getRenderedSize(source),
        });
      });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLSourceElement) {
    pushMedia({
      element,
      kind: "source",
      url: element.src || getPrimarySrcsetUrl(element.srcset),
      mimeTypeHint: element.type,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
  } else if (element instanceof HTMLIFrameElement) {
    pushMedia({
      element,
      kind: "iframe",
      url: element.src,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLEmbedElement) {
    pushMedia({
      element,
      kind: "embed",
      url: element.src,
      mimeTypeHint: element.type,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLObjectElement) {
    pushMedia({
      element,
      kind: "object",
      url: element.data,
      mimeTypeHint: element.type,
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof SVGElement && element.tagName.toLowerCase() === "svg") {
    pushMedia({
      element,
      kind: "svg",
      url: "",
      mimeType: "image/svg+xml",
      intrinsic: null,
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else if (element instanceof HTMLCanvasElement) {
    pushMedia({
      element,
      kind: "canvas",
      url: "",
      mimeType: "image/png",
      intrinsic: { width: element.width, height: element.height },
      rendered: getRenderedSize(element),
    });
    appendBackgroundMedia(element);
  } else {
    appendBackgroundMedia(element);
  }

  return mediaItems.filter((item, index, list) => {
    const dedupeKey = `${item.kind}::${item.url || "(none)"}::${item.selector}`;
    return (
      list.findIndex((candidate) => {
        const candidateKey = `${candidate.kind}::${candidate.url || "(none)"}::${candidate.selector}`;
        return candidateKey === dedupeKey;
      }) === index
    );
  });
};

const collectMediaInSubtree = (root: Element, maxScan = 2400) => {
  const queue: Element[] = [root];
  let scanned = 0;
  const collected: MediaItem[] = [];
  const seen = new Set<string>();
  while (queue.length > 0 && scanned < maxScan) {
    const node = queue.shift();
    if (!node) {
      break;
    }
    scanned += 1;
    if (isInfoUiElement(node) || node.hasAttribute("data-wilderness-info")) {
      continue;
    }
    const items = collectMediaOnElement(node);
    items.forEach((item) => {
      const key = `${item.kind}::${item.url || "(none)"}::${item.selector}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      collected.push(item);
    });
    queue.push(...Array.from(node.children));
  }
  if (!collected.length) {
    return null;
  }
  return { element: root, items: collected };
};

export const findClosestMediaMatch = (element: Element): MediaMatchContext | null => {
  const selectedSubtreeMatch = collectMediaInSubtree(element);
  if (selectedSubtreeMatch) {
    return { element, items: selectedSubtreeMatch.items, relation: "selected" };
  }

  let currentAncestor = element.parentElement;
  while (currentAncestor) {
    const ancestorMatch = collectMediaInSubtree(currentAncestor);
    if (ancestorMatch) {
      return {
        element: currentAncestor,
        items: ancestorMatch.items,
        relation: "ancestor",
      };
    }
    currentAncestor = currentAncestor.parentElement;
  }

  let currentBranch: Element | null = element;
  while (currentBranch?.parentElement) {
    const parent: Element = currentBranch.parentElement;
    const siblings = Array.from(parent.children).filter(
      (child) => child !== currentBranch && !isInfoUiElement(child) && !child.hasAttribute("data-wilderness-info")
    );
    for (const sibling of siblings) {
      const nearbyMatch = collectMediaInSubtree(sibling);
      if (nearbyMatch) {
        return {
          element: nearbyMatch.element,
          items: nearbyMatch.items,
          relation: "nearby",
        };
      }
    }
    currentBranch = parent;
  }

  return null;
};

export const getMediaRelationLabel = (relation: MediaMatchContext["relation"]) => {
  if (relation === "ancestor") {
    return "Closest ancestor media";
  }
  if (relation === "nearby") {
    return "Nearby media";
  }
  return "Selected subtree media";
};
