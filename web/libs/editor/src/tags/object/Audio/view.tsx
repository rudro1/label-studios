import { ff } from "@humansignal/core";
import { observer } from "mobx-react";
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Define Defaults
const NORMALIZED_STEP = 0.1;

const isAudioSpectrograms = isFF(FF_AUDIO_SPECTROGRAMS);

const useSpectrogramControls = isAudioSpectrograms ? useSpectrogramControlsHook : () => {};

const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);

// Fixensy Whisper bot — fire-and-forget transcribe, then push text into a TextArea
// control on the same task. Skipped silently when backend has no OPENAI_API_KEY.
const FIXENSY_TRANSCRIBE_INFLIGHT = new WeakSet<object>();

function autoTranscribeSegment(item: any, region: any) {
  if (!region || FIXENSY_TRANSCRIBE_INFLIGHT.has(region)) return;
  const audioUrl = item?._value;
  if (!audioUrl) return;
  const start = typeof region.start === "number" ? region.start : Number(region.start ?? 0);
  const end = typeof region.end === "number" ? region.end : Number(region.end ?? 0);
  if (!isFinite(start) || !isFinite(end) || end <= start) return;

  FIXENSY_TRANSCRIBE_INFLIGHT.add(region);

  const csrfToken = (() => {
    try {
      const m = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : "";
    } catch (_) {
      return "";
    }
  })();

  fetch("/api/tasks/transcribe-segment/", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: JSON.stringify({ audio_url: audioUrl, start, end }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || !data.text) return;
      pushTranscriptionIntoTextArea(item, region, data.text);
    })
    .catch(() => {});
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
        const matchesRegion = !tag.perregion || (region?.selected || region?.isRegion);
        if (sameTarget && matchesRegion) textareaTag = tag;
      }
    });
    if (!textareaTag) return;
    if (typeof textareaTag.addText === "function") {
      textareaTag.addText(text);
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
  ({ item, children, settings = {}, changeSetting = () => {} }: AudioUltraProps) => {
    const rootRef = useRef<HTMLElement | null>();
    const hostRef = useRef<HTMLDivElement | null>(null);
    const audioTagRef = useRef<HTMLDivElement | null>(null);
    const isDarkMode = getCurrentTheme() === "Dark";
    const [hasRegions, setHasRegions] = useState(false);
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

    const { waveform, ...controls } = useWaveform(rootRef, {
      src: item._value,
      autoLoad: false,
      waveColor: isDarkMode ? "rgba(150,150,150,0.8)" : "rgba(150,150,150,0.8)",
      gridColor: isDarkMode ? "rgba(150,150,150,0.8)" : "rgba(150,150,150,0.9)",
      gridWidth: 1,
      backgroundColor: isDarkMode ? "rgba(150,150,150,0.8)" : "rgba(255,255,255,0.8)",
      autoCenter: true,
      zoomToCursor: true,
      height: item.height && !isNaN(Number(item.height)) ? Number(item.height) : 96,
      waveHeight: item.waveheight && !isNaN(Number(item.waveheight)) ? Number(item.waveheight) : 32,
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
      },
      onPlaying: item.onPlaying,
      onSeek: item.onSeek,
      onRateChange: item.onRateChange,
      onError: item.onError,
      regions: {
        createable: !item.readonly,
      },
      timeline: {
        backgroundColor: isDarkMode ? "rgb(38, 37, 34)" : "rgba(255,255,255,0.8)",
      },
      experimental: {
        backgroundCompute: true,
        denoize: true,
      },
      onFrameChanged: (frameState) => {
        item.setWFFrame(frameState);
      },
    });

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
        }
        // Fixensy Whisper bot: auto-transcribe new segment if backend is configured
        try {
          autoTranscribeSegment(item, r ?? region);
        } catch (_) {}
      };

      const selectRegion = (region: Region | Segment, event: MouseEvent) => {
        // Fixensy: Whole Audio Invalid segment click block
        if (item._fixensy_wholeAudioSegId && region.id === item._fixensy_wholeAudioSegId) {
          return;
        }
        const annotation = item.annotation;
        const growSelection = event.metaKey || event.ctrlKey;

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
          if (!growSelection) {
            try { annotation.regionStore.clearSelection?.(); } catch (_) {}
            try { annotation.unselectAreas?.(); } catch (_) {}
          }
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
      };

      const checkRegionCount = () => {
        try {
          const count = item.regs ? item.regs.length : 0;
          setHasRegions(count > 0);
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
      };
    }, []);

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

    return (
      <div
        className={cn("audio-tag-host").mod({ pinned: stickyMeta.pinned }).toClassName()}
        ref={hostRef}
        style={stickyMeta.pinned ? { minHeight: `${Math.ceil(stickyMeta.height)}px` } : undefined}
      >
        <div
          ref={audioTagRef}
          className={cn("audio-tag").mod({ pinned: stickyMeta.pinned }).toClassName()}
          data-has-regions={hasRegions ? "true" : "false"}
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
          />
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
