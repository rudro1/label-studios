import { ff } from "@humansignal/core";
import { observer } from "mobx-react";
import { type FC, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePersistentJSONState } from "@humansignal/core/lib/hooks/usePersistentState";
import { TimelineContextProvider } from "../../../components/Timeline/Context";
import { ErrorMessage } from "../../../components/ErrorMessage/ErrorMessage";
import { Controls } from "../../../components/Timeline/Controls";
import type { TimelineSettings } from "../../../components/Timeline/Types";
import { Hotkey } from "../../../core/Hotkey";
import { useWaveform } from "../../../lib/AudioUltra/react";
import type { Region } from "../../../lib/AudioUltra/Regions/Region";
import type { Segment } from "../../../lib/AudioUltra/Regions/Segment";
import type { Regions } from "../../../lib/AudioUltra/Regions/Regions";
import { cn } from "../../../utils/bem";
import { useSpectrogramControls as useSpectrogramControlsHook } from "../../../lib/AudioUltra/hooks/useSpectrogramControls";
import { getCurrentTheme } from "@humansignal/ui";
import { FF_AUDIO_SPECTROGRAMS, isFF } from "../../../utils/feature-flags";

import "./view.prefix.css";

declare global {
  interface Window {
    LS_TOAST?: any;
  }
}

// Define Defaults
const NORMALIZED_STEP = 0.1;

const isAudioSpectrograms = isFF(FF_AUDIO_SPECTROGRAMS);

const useSpectrogramControls = isAudioSpectrograms ? useSpectrogramControlsHook : () => {};

const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);

// Fixensy Whisper bot — fire-and-forget transcribe, then push text into a TextArea
// control on the same task. Skipped silently when backend has no OPENAI_API_KEY.
const FIXENSY_TRANSCRIBE_INFLIGHT = new WeakSet<object>();
const FIXENSY_AUTO_SEGMENT_INFLIGHT = new WeakSet<object>();
const FIXENSY_AUTO_SEGMENT_DONE = new WeakSet<object>();
const FIXENSY_TRANSCRIPTION_META_KEY = "__fixensy_transcription_meta__";
const FIXENSY_ZOOM_STEP = 0.2;
const FIXENSY_ZOOM_DURATION = 280;
const FIXENSY_WAVE_HEIGHT_SCALE = 2.5;
const FIXENSY_DEFAULT_HEIGHT = 280;
const FIXENSY_DEFAULT_WAVE_HEIGHT = 160;

function getTranscriptionMetaStore(): Map<string, any> | null {
  try {
    const root = window as any;

    if (!root[FIXENSY_TRANSCRIPTION_META_KEY]) {
      root[FIXENSY_TRANSCRIPTION_META_KEY] = new Map();
    }

    return root[FIXENSY_TRANSCRIPTION_META_KEY];
  } catch (_) {
    return null;
  }
}

function getRegionMetaKey(region: any): string {
  const raw = region?.pid ?? region?.id ?? region?._ws_region?.id ?? region?._ws?.id ?? "";

  return String(raw);
}

function rememberTranscriptionMeta(item: any, region: any, payload: any) {
  const key = getRegionMetaKey(region);

  if (!key) return;
  const store = getTranscriptionMetaStore();

  if (!store) return;
  store.set(key, {
    originalText: payload?.text ?? "",
    audioUrl: item?._value ?? "",
    segmentStart: typeof region?.start === "number" ? region.start : Number(region?.start ?? 0),
    segmentEnd: typeof region?.end === "number" ? region.end : Number(region?.end ?? 0),
    language: payload?.language ?? null,
    engine: payload?.engine ?? null,
    updatedAt: Date.now(),
  });
}

function autoTranscribeSegment(item: any, region: any) {
  if (!region || FIXENSY_TRANSCRIBE_INFLIGHT.has(region)) return Promise.resolve(false);
  const audioUrl = item?._value;
  if (!audioUrl) return Promise.resolve(false);
  const start = typeof region.start === "number" ? region.start : Number(region.start ?? 0);
  const end = typeof region.end === "number" ? region.end : Number(region.end ?? 0);
  if (!isFinite(start) || !isFinite(end) || end <= start) return Promise.resolve(false);

  FIXENSY_TRANSCRIBE_INFLIGHT.add(region);

  const csrfToken = (() => {
    try {
      const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : "";
    } catch (_) {
      return "";
    }
  })();

  return fetch("/api/tasks/transcribe-segment/", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify({ audio_url: audioUrl, start, end, task: "transcribe" }),
  })
    .then(async (r) => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const msg = typeof body?.error === "string" && body.error ? body.error : `HTTP ${r.status}`;
        throw new Error(msg);
      }
      return r.json();
    })
    .then((data) => {
      if (!data) return false;
      if (data.error) {
        (window as any).LS_TOAST?.show({
          message: `Transcription: ${data.error}`,
          type: "error",
        });
        return false;
      }
      if (!data.text) return false;
      pushTranscriptionIntoTextArea(item, region, data.text);
      rememberTranscriptionMeta(item, region, data);
      return true;
    })
    .catch((err) => {
      throw err;
    })
    .finally(() => {
      FIXENSY_TRANSCRIBE_INFLIGHT.delete(region);
    });
}

function autoTranscribeAllSegments(item: any, waveform: any) {
  if (!item || !waveform) return;
  if (FIXENSY_AUTO_SEGMENT_INFLIGHT.has(item) || FIXENSY_AUTO_SEGMENT_DONE.has(item)) return;
  if (Array.isArray(item?.regs) && item.regs.length > 0) {
    FIXENSY_AUTO_SEGMENT_DONE.add(item);
    return;
  }

  const audioUrl = item?._value;
  if (!audioUrl) return;

  FIXENSY_AUTO_SEGMENT_INFLIGHT.add(item);

  const csrfToken = (() => {
    try {
      const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : "";
    } catch (_) {
      return "";
    }
  })();

  fetch("/api/tasks/transcribe-auto-segments/", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify({ audio_url: audioUrl, max_segments: 500, task: "transcribe" }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || data.configured === false) return;
      if (!Array.isArray(data.segments)) return;

      FIXENSY_AUTO_SEGMENT_DONE.add(item);

      if (data.segments.length === 0) return;
      if (Array.isArray(item?.regs) && item.regs.length > 0) return;

      const ws = item?._ws;
      if (!ws) return;

      for (const seg of data.segments) {
        const start = Number(seg?.start);
        const end = Number(seg?.end);
        const text = typeof seg?.text === "string" ? seg.text.trim() : "";

        if (!isFinite(start) || !isFinite(end) || end <= start || !text) continue;

        const wsRegion = ws.addRegion({ start, end, selected: false }, false);
        const region = item.addRegion(wsRegion) ?? item.findRegionByWsRegion?.(wsRegion);

        if (region) {
          pushTranscriptionIntoTextArea(item, region, text);
          rememberTranscriptionMeta(item, region, {
            text,
            language: data?.language ?? seg?.language ?? null,
            engine: data?.engine ?? null,
          });
        }
      }

      ws.regions?.redraw?.();
      waveform.syncCursor?.();
    })
    .catch(() => {})
    .finally(() => {
      FIXENSY_AUTO_SEGMENT_INFLIGHT.delete(item);
    });
}

function pushTranscriptionIntoTextArea(item: any, region: any, text: string) {
  try {
    const annotation = item?.annotation;
    if (!annotation) return;
    // Find a TextArea control attached to this region or to the same target
    const names = annotation?.names;
    if (!names) return;
    let textareaTag: any = null;
    names.forEach?.((tag: any) => {
      if (textareaTag) return;
      const t = (tag?.type || "").toLowerCase();
      if (t === "textarea") {
        const sameTarget = !tag.toname || tag.toname === item?.name;
        // When we have a segment object, allow per-region TextArea binding even before
        // UI selected-state has fully propagated.
        const matchesRegion = !tag.perregion || !!region;
        if (sameTarget && matchesRegion) textareaTag = tag;
      }
    });
    if (!textareaTag) return;
    const regionPid = region?.pid ?? region?.id;
    if (typeof textareaTag.addText === "function") {
      textareaTag.addText(text, regionPid);
    } else if (typeof textareaTag.setValue === "function") {
      textareaTag.setValue(text);
    }
  } catch (_) {}
}

interface AudioProps {
  item: any;
  settings?: TimelineSettings;
  changeSetting?: (key: string, value: any) => void;
  children: ReactNode;
}

const AudioView: FC<AudioProps> = observer(
  ({ item, children, settings = {}, changeSetting = () => {} }: AudioProps) => {
    const rootRef = useRef<HTMLElement | null>();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const audioTagRef = useRef<HTMLDivElement | null>(null);
    const zoomAnimationRef = useRef<number | null>(null);
    const wheelZoomRafRef = useRef<number | null>(null);
    const wheelZoomDeltaRef = useRef<number>(0);
    const pinchStateRef = useRef<{ baseDist: number; baseZoom: number } | null>(null);
    const isDarkMode = getCurrentTheme() === "Dark";
    const [hasRegions, setHasRegions] = useState(false);
    const [selectedSegment, setSelectedSegment] = useState<any>(null);
    const [isManualTranscribing, setIsManualTranscribing] = useState(false);
    const [manualTranscribeError, setManualTranscribeError] = useState<string>("");
    const [stickyMeta, setStickyMeta] = useState({
      pinned: false,
      top: 48,
      left: 0,
      width: 0,
      height: 0,
    });

    // body তে sync করো যাতে Template CSS কাজ করে
    useEffect(() => {
      if (hasRegions) {
        document.body.setAttribute("data-has-audio-regions", "true");
      } else {
        document.body.removeAttribute("data-has-audio-regions");
      }
    }, [hasRegions]);

    useEffect(() => {
      return () => {
        if (zoomAnimationRef.current !== null) {
          cancelAnimationFrame(zoomAnimationRef.current);
          zoomAnimationRef.current = null;
        }
      };
    }, []);

    const { waveform, ...controls } = useWaveform(rootRef, {
      src: item._value,
      autoLoad: false,
      waveColor: isDarkMode ? "rgba(100, 180, 240, 0.85)" : "rgba(150,150,150,0.8)",
      gridColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(150,150,150,0.9)",
      gridWidth: 1,
      backgroundColor: isDarkMode ? "#0f172a" : "rgba(255,255,255,0.8)",
      autoCenter: true,
      zoomToCursor: true,
      height: item.height && !isNaN(Number(item.height)) ? Number(item.height) * FIXENSY_WAVE_HEIGHT_SCALE : FIXENSY_DEFAULT_HEIGHT,
      waveHeight:
        item.waveheight && !isNaN(Number(item.waveheight))
          ? Number(item.waveheight) * FIXENSY_WAVE_HEIGHT_SCALE
          : FIXENSY_DEFAULT_WAVE_HEIGHT,
      splitChannels: item.splitchannels,
      decoderType: item.decoder,
      playerType: item.player,
      volume: item.defaultvolume ? Number(item.defaultvolume) : 1,
      amp: item.defaultscale ? Number(item.defaultscale) : 1,
      zoom: item.defaultzoom ? Number(item.defaultzoom) : 1,

      showLabels: item.annotationStore.store.settings.showLabels,
      rate: item.defaultspeed ? Number(item.defaultspeed) : 1,
      muted: item.muted === "true",
      buffering: item.isBuffering,
      onBuffering: item.handleBuffering,
      onLoad: (wf) => {
        if (isAudioSpectrograms) {
          const spectrogramLayer = wf.getLayer("spectrogram");
          if (spectrogramLayer) {
            spectrogramLayer.setVisibility(item.spectrogram);
          }
        }
        item.onLoad(wf);
        // Run one-shot full-audio auto segmentation/transcription for fresh tasks.
        setTimeout(() => autoTranscribeAllSegments(item, wf), 0);
      },
      onPlaying: item.onPlaying,
      onSeek: item.onSeek,
      onRateChange: item.onRateChange,
      onError: item.onError,
      regions: {
        createable: !item.readonly,
      },
      timeline: {
        backgroundColor: isDarkMode ? "#1e293b" : "rgba(255,255,255,0.8)",
      },
      experimental: {
        backgroundCompute: true,
        denoize: true,
      },
      onFrameChanged: (frameState) => {
        item.setWFFrame(frameState);
      },
    });

    const focusSegmentByDirection = useCallback(
      (direction: 1 | -1) => {
        const wf = waveform.current as any;
        const regionList = (wf?.regions?.list ?? wf?.regions?.regions ?? []).filter((region: any) => !region?.external);

        if (!regionList.length) return;

        const ordered = regionList.slice().sort((a: any, b: any) => {
          if (a.start !== b.start) return a.start - b.start;
          if (a.end !== b.end) return a.end - b.end;
          return String(a.id).localeCompare(String(b.id));
        });

        const currentId = selectedSegment?.id ? String(selectedSegment.id) : "";
        let index = ordered.findIndex((region: any) => String(region.id) === currentId);

        if (index < 0) {
          index = direction > 0 ? -1 : 0;
        }

        const next = ordered[(index + direction + ordered.length) % ordered.length];
        if (!next) return;

        // Force selection logic same as selectRegion click
        const itemRegion = item.findRegionByWsRegion(next);

        if (itemRegion) {
          try { item.annotation.regionStore.toggleSelection?.(itemRegion, true); } catch (_) {}
          try { item.annotation.regionStore.highlight?.(itemRegion); } catch (_) {
            try { item.annotation.selectArea(itemRegion); } catch (__) {}
          }
        }

        ordered.forEach((region: any) => {
          region.handleSelected?.(String(region.id) === String(next.id));
        });

        setSelectedSegment(next);
        next.scrollToRegion?.();

        try {
          waveform.current?.seek(next.start);
          waveform.current?.syncCursor();

          // Fixensy: play the segment when navigating via Tab
          const wfPlayer = (waveform.current as any)?.player;

          if (wfPlayer) {
            if (wfPlayer.playing) wfPlayer.pause();
            wfPlayer.loop = { start: next.start, end: next.end };
            wfPlayer.play();
          }
        } catch (_) {}
      },
      [selectedSegment, item],
    );

    const handleAudioKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Tab") return;

        const activeElement = document.activeElement as HTMLElement | null;
        if (!activeElement || !hostRef.current?.contains(activeElement)) return;
        if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA" || activeElement.isContentEditable) {
          return;
        }

        event.preventDefault();
        focusSegmentByDirection(event.shiftKey ? -1 : 1);
      },
      [focusSegmentByDirection],
    );

    const adjustZoom = useCallback(
      (delta: number) => {
        const startZoom = controls.zoom;
        const targetZoom = Math.max(1, Number((startZoom + delta).toFixed(3)));

        if (zoomAnimationRef.current !== null) {
          cancelAnimationFrame(zoomAnimationRef.current);
          zoomAnimationRef.current = null;
        }

        if (Math.abs(targetZoom - startZoom) < 0.001) {
          return;
        }

        const duration = FIXENSY_ZOOM_DURATION;
        const startTime = performance.now();
        const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);

        const tick = (now: number) => {
          const progress = Math.min(1, (now - startTime) / duration);
          const nextZoom = startZoom + (targetZoom - startZoom) * easeOutQuart(progress);

          controls.setZoom(Number(nextZoom.toFixed(3)));

          if (progress < 1) {
            zoomAnimationRef.current = requestAnimationFrame(tick);
          } else {
            zoomAnimationRef.current = null;
            controls.setZoom(targetZoom);
          }
        };

        zoomAnimationRef.current = requestAnimationFrame(tick);
      },
      [controls.zoom, controls.setZoom],
    );

    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 2) return;
      const [t1, t2] = [event.touches[0], event.touches[1]];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      pinchStateRef.current = {
        baseDist: Math.hypot(dx, dy) || 1,
        baseZoom: controls.zoom,
      };
    }, [controls.zoom]);

    const handleTouchMove = useCallback(
      (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length !== 2 || !pinchStateRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        const [t1, t2] = [event.touches[0], event.touches[1]];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY) || 1;
        const ratio = dist / pinchStateRef.current.baseDist;
        const targetZoom = Math.max(1, Number((pinchStateRef.current.baseZoom * ratio).toFixed(3)));
        controls.setZoom(targetZoom);
      },
      [controls.setZoom],
    );

    const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length < 2) {
        pinchStateRef.current = null;
      }
    }, []);

    const handleWheelZoom = useCallback(
      (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const baseStep = FIXENSY_ZOOM_STEP;
        const intensity = Math.min(2.4, Math.max(0.7, Math.abs(event.deltaY) / 120));
        const direction = event.deltaY > 0 ? -1 : 1;

        wheelZoomDeltaRef.current += direction * baseStep * intensity;

        if (wheelZoomRafRef.current !== null) {
          return;
        }

        wheelZoomRafRef.current = requestAnimationFrame(() => {
          wheelZoomRafRef.current = null;
          const delta = wheelZoomDeltaRef.current;
          wheelZoomDeltaRef.current = 0;

          if (delta !== 0) {
            adjustZoom(delta);
          }
        });
      },
      [adjustZoom],
    );

    useSpectrogramControls(waveform);

    useEffect(() => {
      const hotkeys = Hotkey("Audio", "Audio Segmentation");

      waveform.current?.load();

      const updateBeforeRegionDraw = (regions: Regions) => {
        const regionColor = item.getRegionColor();
        const regionLabels = item.activeState?.selectedValues();

        if (regionColor && regionLabels) {
          regions.regionDrawableTarget();
          regions.setDrawingColor(regionColor);
          regions.setLabels(regionLabels);
        }
      };

      const updateAfterRegionDraw = (regions: Regions) => {
        regions.resetDrawableTarget();
        regions.resetDrawingColor();
        regions.resetLabels();
      };

      const createRegion = (region: Region | Segment) => {
        // Fixensy: Whole Audio Invalid active থাকলে block
        if (item._fixensy_wholeAudioSegId) {
          return;
        }
        const r = item.addRegion(region);
        setHasRegions(true);
        // Fixensy: segment তৈরির পর auto-select → visibleWhen="region-selected" panel দেখাবে
        if (r) {
          try {
            item.annotation.selectArea(r);
          } catch(_) {}
          setSelectedSegment(r);
        } else {
          setSelectedSegment(region);
        }
        // Fixensy Whisper bot: auto-transcribe new segment if backend is configured
        try {
          autoTranscribeSegment(item, r ?? region);
        } catch (_) {}
      };

      const selectRegion = (region: Region | Segment, event: MouseEvent) => {
        setSelectedSegment(region);
        // Fixensy: Whole Audio Invalid segment click block
        if (item._fixensy_wholeAudioSegId && region.id === item._fixensy_wholeAudioSegId) {
          return;
        }
        const annotation = item.annotation;
        const growSelection = event.metaKey || event.ctrlKey;

        if (!growSelection) {
          try { annotation.regionStore.clearSelection?.(); } catch (_) {}
          try { annotation.regionStore.unselectAll?.(); } catch (_) {}
          try { annotation.unselectAreas?.(); } catch (_) {}
        }

        // Fixensy: authoritative area resolution — match annotation.areas by ws region id first,
        // then fall back to the regs list / ws region reference lookup.
        let itemRegion =
          annotation?.areas?.get?.(region.id) ??
          annotation?.areas?.get?.(String(region.id)) ??
          item.findRegionByWsRegion?.(region) ??
          item.regs.find((obj: any) => String(obj._ws_region?.id ?? obj.id) === String(region.id));

        if (itemRegion && typeof itemRegion.setWSRegion === "function") {
          try { itemRegion.setWSRegion(region); } catch (_) {}
        }

        if (!itemRegion) {
          itemRegion = region.isRegion ? item.updateRegion?.(region) : item.addRegion?.(region);
        }

        if (annotation.isLinkingMode && itemRegion) {
          annotation.addLinkedRegion(itemRegion);
          annotation.stopLinkingMode();
          annotation.regionStore.unselectAll();
          region.handleSelected(false);
          return;
        }

        // Clear prior selection then select this exact region so per-region panel re-binds.
        if (itemRegion) {
          try { annotation.regionStore.toggleSelection?.(itemRegion, true); } catch (_) {}
          // selectArea bails early if already highlighted; force highlight to re-run perRegion updates.
          try { annotation.regionStore.highlight?.(itemRegion); } catch (_) {
            try { annotation.selectArea(itemRegion); } catch (__) {}
          }
        }

        // WS-side selection indicators
        const targetInWave = item._ws.regions.findRegion(region.id);
        if (targetInWave) targetInWave.handleSelected(true);
        if (!growSelection) {
          item._ws.regions.regions.forEach((obj: any) => {
            if (obj.id !== region.id) obj.handleSelected?.(false);
          });
        }

        if (itemRegion) {
          try { annotation.selectArea(itemRegion); } catch (_) {}
          
          // Fixensy: Validate on click to show toast errors
          if (typeof itemRegion.validate === "function") {
            itemRegion.validate();
          }
        }

        // Fixensy: on segment click, always loop-play only this segment.
        const wf = waveform.current as any;
        if (!region.isRegion && wf?.player) {
          // Start from clicked point inside segment; fallback to segment start.
          let seekTo = region.start;

          try {
            const visualizer = wf.visualizer;
            const container = visualizer?.container;
            const duration = Number(wf.duration ?? 0);

            if (container && duration > 0) {
              const rect = container.getBoundingClientRect();
              const x = Math.max(0, Math.min(event.clientX - rect.left, container.clientWidth));
              const scrollLeft = typeof visualizer.getScrollLeft === "function" ? visualizer.getScrollLeft() : 0;
              const zoom = Number(wf.zoom ?? 1);

              const currentPosition = scrollLeft + x / container.clientWidth / zoom;
              const clickedTime = currentPosition * duration;

              seekTo = Math.min(region.end, Math.max(region.start, clickedTime));
            }
          } catch (_) {}

          setTimeout(() => {
            if (wf.player.playing) wf.player.pause();
            wf.player.loop = { start: region.start, end: region.end };
            wf.player.seek(seekTo);
            wf.player.play();
          }, 0);
        }
      };

      const updateRegion = (region: Region | Segment) => {
        item.updateRegion(region);
        setSelectedSegment((prev: any) => {
          if (!prev) return prev;
          return String(prev.id) === String(region.id) ? region : prev;
        });
      };

      const checkRegionCount = () => {
        try {
          const count = item.regs ? item.regs.length : 0;
          setHasRegions(count > 0);
          if (!count) {
            setSelectedSegment(null);
          }
        } catch (_) {}
      };

      waveform.current?.on("beforeRegionsDraw", updateBeforeRegionDraw);
      waveform.current?.on("afterRegionsDraw", updateAfterRegionDraw);
      waveform.current?.on("regionSelected", selectRegion);
      waveform.current?.on("regionCreated", createRegion);
      waveform.current?.on("regionUpdatedEnd", updateRegion);

      waveform.current?.on("regionRemoved", checkRegionCount);

      hotkeys.addNamed("region:delete", () => {
        waveform.current?.regions.clearSegments(false);
        setTimeout(checkRegionCount, 100);
      });

      hotkeys.addNamed("segment:delete", () => {
        waveform.current?.regions.clearSegments(false);
        setTimeout(checkRegionCount, 100);
      });

      hotkeys.addNamed("region:delete-all", () => {
        waveform.current?.regions.clearSegments();
        setTimeout(checkRegionCount, 100);
      });

      return () => {
        hotkeys.unbindAll();
        if (zoomAnimationRef.current !== null) {
          cancelAnimationFrame(zoomAnimationRef.current);
        }
        if (wheelZoomRafRef.current !== null) {
          cancelAnimationFrame(wheelZoomRafRef.current);
        }
      };
    }, []);

    const manualTranscribeSelected = useCallback(() => {
      if (!selectedSegment || isManualTranscribing) return;
      setManualTranscribeError("");
      setIsManualTranscribing(true);
      
      // Auto-detect language is default in Whisper
      Promise.resolve(autoTranscribeSegment(item, selectedSegment))
        .then((ok) => {
          if (!ok) {
            setManualTranscribeError("No speech detected in this selected segment.");
          }
        })
        .catch((err) => {
          const msg = typeof err?.message === "string" && err.message ? err.message : "Transcription failed";
          setManualTranscribeError(msg);
        })
        .finally(() => {
          setIsManualTranscribing(false);
        });
    }, [item, selectedSegment, isManualTranscribing]);

    const splitSelectedSegment = useCallback(() => {
      if (!selectedSegment || !waveform.current) return;
      
      const currentTime = waveform.current.currentTime;
      const start = selectedSegment.start;
      const end = selectedSegment.end;

      if (currentTime > start && currentTime < end) {
        const ws = waveform.current;
        const annotation = item.annotation;

        // 1. Create two new segments
        const seg1 = ws.addRegion({ start: start, end: currentTime, selected: false }, false);
        const seg2 = ws.addRegion({ start: currentTime, end: end, selected: true }, false);

        // 2. Add them to MST model
        const r1 = item.addRegion(seg1);
        const r2 = item.addRegion(seg2);

        // 3. Remove the original segment
        if (selectedSegment.isRegion) {
          // It's a MST region
          selectedSegment.deleteRegion();
        } else {
          // It's a WS region, find its MST counterpart
          const r = item.findRegionByWsRegion(selectedSegment);
          if (r) r.deleteRegion();
          else selectedSegment.remove();
        }

        // 4. Update selection
        if (r2) {
          annotation.selectArea(r2);
          setSelectedSegment(seg2);
        }
        
        ws.regions?.redraw?.();
      }
    }, [item, selectedSegment]);

    useEffect(() => {
      const host = hostRef.current;
      const tag = audioTagRef.current;

      if (!host || !tag) return;

      let raf = 0;
      const listeners: Array<{ el: EventTarget; fn: EventListener }> = [];

      const getScrollParents = (element: HTMLElement) => {
        const parents: EventTarget[] = [];
        let current: HTMLElement | null = element.parentElement;

        while (current) {
          const style = window.getComputedStyle(current);
          const overflowY = style.overflowY;
          const overflowX = style.overflowX;
          const canScrollY = /(auto|scroll|overlay)/.test(overflowY);
          const canScrollX = /(auto|scroll|overlay)/.test(overflowX);

          if (canScrollY || canScrollX) {
            parents.push(current);
          }

          current = current.parentElement;
        }

        parents.push(window);
        return parents;
      };

      const getStickyOffset = () => {
        const cssValue = getComputedStyle(document.documentElement).getPropertyValue("--sticky-items-offset").trim();
        const parsed = Number.parseFloat(cssValue || "");

        return Number.isFinite(parsed) ? parsed : 48;
      };

      const updateSticky = () => {
        const hostRect = host.getBoundingClientRect();
        const tagRect = tag.getBoundingClientRect();
        const stickyTop = getStickyOffset();
        const canPin = hostRect.top <= stickyTop && hostRect.bottom > stickyTop + tagRect.height;

        setStickyMeta((prev) => {
          const next = {
            pinned: canPin,
            top: stickyTop,
            left: hostRect.left,
            width: hostRect.width,
            height: tagRect.height,
          };

          if (
            prev.pinned === next.pinned &&
            prev.top === next.top &&
            prev.left === next.left &&
            prev.width === next.width &&
            prev.height === next.height
          ) {
            return prev;
          }

          return next;
        });
      };

      const scheduleUpdate = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(updateSticky);
      };

      updateSticky();

      const scrollParents = getScrollParents(host);

      scrollParents.forEach((el) => {
        const fn = scheduleUpdate as EventListener;

        el.addEventListener("scroll", fn, { passive: true });
        listeners.push({ el, fn });
      });

      const resizeFn = scheduleUpdate as EventListener;

      window.addEventListener("resize", resizeFn);
      listeners.push({ el: window, fn: resizeFn });

      const resizeObserver = new ResizeObserver(scheduleUpdate);

      resizeObserver.observe(host);
      resizeObserver.observe(tag);

      return () => {
        cancelAnimationFrame(raf);
        listeners.forEach(({ el, fn }) => {
          el.removeEventListener("scroll", fn);
          el.removeEventListener("resize", fn);
        });
        resizeObserver.disconnect();
      };
    }, []);

    const exportTaskJSON = useCallback(() => {
      const taskID = item.annotation.task.id;
      const projectID = item.annotation.project.id;
      // Use standard export with only current task ID and JSON format
      const url = `/api/projects/${projectID}/export?ids=${taskID}&exportType=JSON&download_all_tasks=false`;
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', ''); // Filename will be set by server Content-Disposition
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [item]);

    return (
      <div
        className={cn("audio-tag-host").mod({ pinned: stickyMeta.pinned }).toClassName()}
        ref={hostRef}
        tabIndex={0}
        onKeyDown={handleAudioKeyDown}
        style={stickyMeta.pinned ? { minHeight: `${Math.ceil(stickyMeta.height)}px` } : undefined}
      >
        <div
          ref={audioTagRef}
          className={cn("audio-tag").mod({ pinned: stickyMeta.pinned }).toClassName()}
          data-has-regions={hasRegions ? "true" : "false"}
          onWheel={handleWheelZoom}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={
            stickyMeta.pinned
              ? {
                  top: `${stickyMeta.top}px`,
                  left: `${stickyMeta.left}px`,
                  width: `${stickyMeta.width}px`,
                }
              : undefined
          }
        >
          {children}
          <div
            ref={(el) => {
              rootRef.current = el;
              item.stageRef.current = el;
            }}
          />
          <Controls
          position={controls.currentTime}
          playing={isSyncedBuffering && item.isBuffering ? item.wasPlayingBeforeBuffering : controls.playing}
          buffering={item.isBuffering}
          volume={controls.volume}
          speed={controls.rate}
          zoom={controls.zoom}
          duration={controls.duration}
          length={controls.duration}
          frameRate={30}
          collapsed={false}
          fullscreen={false}
          onPlay={() => {
            if (isSyncedBuffering && item.isBuffering) {
              item.triggerSyncPlay(true);
            } else {
              controls.setPlaying(true);
            }
          }}
          onPause={() => {
            if (isSyncedBuffering && item.isBuffering) {
              item.triggerSyncPause(true);
            } else {
              controls.setPlaying(false);
            }
          }}
          allowFullscreen={false}
          onVolumeChange={(vol) => controls.setVolume(vol)}
          onStepBackward={() => {
            waveform.current?.seekBackward(NORMALIZED_STEP);
            waveform.current?.syncCursor();
          }}
          onStepForward={() => {
            waveform.current?.seekForward(NORMALIZED_STEP);
            waveform.current?.syncCursor();
          }}
          onPositionChange={(pos) => {
            waveform.current?.seek(pos);
            waveform.current?.syncCursor();
          }}
          onSpeedChange={(speed) => controls.setRate(speed)}
          onZoom={(zoom) => controls.setZoom(zoom)}
          amp={controls.amp}
          onAmpChange={(amp) => controls.setAmp(amp)}
          mediaType="audio"
          toggleVisibility={(layerName: string, isVisible: boolean) => {
            if (waveform.current) {
              const layer = waveform.current?.getLayer(layerName);

              if (layer) {
                layer.setVisibility(isVisible);
              }
            }
          }}
          layerVisibility={controls.layerVisibility}
          onFullScreenToggle={() => {}}
          onToggleCollapsed={() => {}}
          onRewind={() => {}}
          onForward={() => {}}
          />
          <div className={cn("audio-tag").elem("zoom-controls").toClassName()}>
            <button
              type="button"
              className={cn("audio-tag").elem("zoom-button").toClassName()}
              data-variant="zoom-out"
              aria-label="Zoom out waveform"
              title="Zoom out"
              onClick={() => adjustZoom(-FIXENSY_ZOOM_STEP)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <span className={cn("audio-tag").elem("zoom-value").toClassName()}>{Math.round(controls.zoom * 100)}%</span>
            <button
              type="button"
              className={cn("audio-tag").elem("zoom-button").toClassName()}
              data-variant="zoom-in"
              aria-label="Zoom in waveform"
              title="Zoom in"
              onClick={() => adjustZoom(FIXENSY_ZOOM_STEP)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
          <div className={cn("audio-tag").elem("actions").toClassName()}>
            <button
              type="button"
              className={cn("audio-tag").elem("action-button").toClassName()}
              data-variant="transcribe"
              onClick={manualTranscribeSelected}
              disabled={!selectedSegment || isManualTranscribing}
            >
              {isManualTranscribing ? "Transcribing..." : "Transcribe Selected Segment"}
            </button>
            <button
              type="button"
              className={cn("audio-tag").elem("action-button").toClassName()}
              data-variant="split"
              onClick={splitSelectedSegment}
              disabled={!selectedSegment || (waveform.current?.currentTime ?? 0) <= (selectedSegment?.start ?? 0) || (waveform.current?.currentTime ?? 0) >= (selectedSegment?.end ?? 0)}
              style={{ marginLeft: '10px' }}
            >
              Split Segment
            </button>
            <button
              type="button"
              className={cn("audio-tag").elem("action-button").toClassName()}
              data-variant="export"
              onClick={exportTaskJSON}
              style={{ marginLeft: '10px', background: '#059669', color: '#fff' }}
            >
              Export Task JSON
            </button>
          </div>
          {manualTranscribeError ? (
            <div className={cn("audio-tag").elem("transcribe-error").toClassName()}>{manualTranscribeError}</div>
          ) : null}
        </div>
      </div>
    );
  },
);

const AudioWithSettings: FC<AudioProps> = ({ item }) => {
  const [settings, setSettings] = usePersistentJSONState<TimelineSettings>("ls:audio-tag:settings", {
    // @todo this hotkey should be moved from these settings for a more appropriate place;
    // @todo we are planning to have a central hotkeys management, that would be a better option.
    playpauseHotkey: "audio:playpause",
    stepBackHotkey: "audio:step-backward",
    stepForwardHotkey: "audio:step-forward",
    // Fixensy default: keep replaying the selected segment for precise QA/listening
    loopRegion: true,
    autoPlayNewSegments: true,
    autoLoopSelectedSegment: true,
    allowNestedSegments: true,
    continuousPlay: false,
  } as any);

  useEffect(() => {
    // Force-enable segment auto-loop for this workflow, even when older persisted settings exist.
    setSettings((prev) => ({
      ...prev,
      loopRegion: true,
      autoLoopSelectedSegment: true,
    }));
  }, [setSettings]);

  const changeSetting = useCallback((key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // @todo seems like this context is not used at all; and its values are static; better to check and remove
  const contextValue = useMemo(() => {
    return {
      position: 0,
      length: 0,
      regions: [],
      step: 10,
      playing: false,
      visibleWidth: 0,
      seekOffset: 0,
      data: undefined,
      settings,
      changeSetting,
    };
  }, [settings]);

  return (
    <TimelineContextProvider value={contextValue}>
      <AudioView item={item}>
        {item.errors?.map((error: any, i: number) => (
          <ErrorMessage key={`err-${i}`} error={error} />
        ))}
      </AudioView>
    </TimelineContextProvider>
  );
};

export const Audio = observer(AudioWithSettings);
