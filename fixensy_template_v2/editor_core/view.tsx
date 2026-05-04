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

interface AudioProps {
  item: any;
  settings?: TimelineSettings;
  changeSetting?: (key: string, value: any) => void;
  children: ReactNode;
}

const AudioView: FC<AudioProps> = observer(
  ({ item, children, settings = {}, changeSetting = () => {} }: AudioProps) => {
    const rootRef = useRef<HTMLElement | null>();
    const isDarkMode = getCurrentTheme() === "Dark";
    const [hasRegions, setHasRegions] = useState(false);
    const [wholeAudioInvalid, setWholeAudioInvalid] = useState(false);

    // body তে sync করো যাতে Template CSS কাজ করে
    useEffect(() => {
      if (hasRegions) {
        document.body.setAttribute("data-has-audio-regions", "true");
      } else {
        document.body.removeAttribute("data-has-audio-regions");
      }

      return () => {
        // Prevent stale global state when switching tasks/pages.
        document.body.removeAttribute("data-has-audio-regions");
      };
    }, [hasRegions]);

    const { waveform, ...controls } = useWaveform(rootRef, {
      src: item._value,
      autoLoad: false,
      // Fixensy: keep the waveform readable in light mode while segments stay translucent.
      // Dark mode: brighter + higher alpha so waveform peaks visible over deep segment fill.
      waveColor: isDarkMode ? "rgba(255,255,255,0.85)" : "rgba(35,35,35,0.62)",
      gridColor: isDarkMode ? "rgba(120,120,120,0.4)" : "rgba(70,70,70,0.34)",
      gridWidth: 1,
      backgroundColor: isDarkMode ? "rgba(15,23,42,1)" : "rgba(255,255,255,1)",
      autoCenter: true,
      zoomToCursor: true,
      height: item.height && !isNaN(Number(item.height)) ? Number(item.height) : 260, // Match config.yml height
      waveHeight: item.waveheight && !isNaN(Number(item.waveheight)) ? Number(item.waveheight) : 64,
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
        createable: !item.readonly && !wholeAudioInvalid,
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

    const zoomAnimRef = useRef<number | null>(null);
    const smoothZoom = useCallback((targetZoom: number) => {
      // Fixensy: cancel any in-flight zoom animation so rapid wheel events don't pile up
      if (zoomAnimRef.current !== null) {
        cancelAnimationFrame(zoomAnimRef.current);
        zoomAnimRef.current = null;
      }
      const startZoom = controls.zoom;
      const diff = targetZoom - startZoom;
      const duration = 180;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        controls.setZoom(startZoom + diff * easeOut);
        if (progress < 1) {
          zoomAnimRef.current = requestAnimationFrame(animate);
        } else {
          zoomAnimRef.current = null;
        }
      };
      zoomAnimRef.current = requestAnimationFrame(animate);
    }, [controls.zoom]);

    useEffect(() => {
      const hotkeys = Hotkey("Audio", "Audio Segmentation");

      waveform.current?.load();

      const updateBeforeRegionDraw = (regions: Regions) => {
        item._fixensy_ensureCreateSegmentLabel?.();
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

      const checkRegionCount = () => {
        try {
          const count = (item.regs ?? []).length;
          setHasRegions(count > 0);
          const wholeTag = item.annotation?.names?.get?.("fx_whole_audio_status");
          const selectedValues = wholeTag?.selectedValues?.() ?? [];
          setWholeAudioInvalid(Array.isArray(selectedValues) && selectedValues.includes("Whole Audio Invalid"));
        } catch (_) {}
      };

      const createRegion = (region: Region | Segment) => {
        item.addRegion(region);
        checkRegionCount();
      };

      const selectRegion = (region: Region | Segment, event: MouseEvent) => {
        const annotation = item.annotation;

        const growSelection = event.metaKey || event.ctrlKey;

        // FIX: unselectAll এর আগে active label save করো
        const activeState = item.activeState;
        const selectedValues = activeState?.selectedValues?.() ?? [];

        if (!growSelection || (!region.selected && !region.isRegion)) {
          item.annotation.regionStore.unselectAll();
          // FIX: label reselect করো যাতে পরের drag কাজ করে
          if (activeState && selectedValues.length > 0) {
            try {
              activeState.tiedChildren?.forEach((child: any) => {
                if (selectedValues.includes(child.value)) {
                  child.setSelected(true);
                }
              });
            } catch (_) {}
          }
        }

        // to select or unselect region
        const itemRegion = item.regs.find((obj: any) => obj.id === region.id);
        // to select or unselect unlabeled segments
        const targetInWave = item._ws.regions.findRegion(region.id);

        if (annotation.isLinkingMode && itemRegion) {
          annotation.addLinkedRegion(itemRegion);
          annotation.stopLinkingMode();
          annotation.regionStore.unselectAll();
          region.handleSelected(false);
          return;
        }

        itemRegion && item.annotation.regionStore.toggleSelection(itemRegion, region.selected);

        if (targetInWave) {
          targetInWave.handleSelected(region.selected);
        }

        // deselect all other segments if not changing multi-selection
        if (!growSelection) {
          item._ws.regions.regions.forEach((obj: any) => {
            if (obj.id !== region.id) {
              obj.handleSelected(false);
            }
          });
        }
      };

      const updateRegion = (region: Region | Segment) => {
        item.updateRegion(region);
      };

      const clearRegionSelection = () => {
        try {
          item.annotation.regionStore.unselectAll();
          item._ws?.regions?.regions?.forEach((region: any) => region.handleSelected?.(false));
        } catch (_) {}
      };

      waveform.current?.on("beforeRegionsDraw", updateBeforeRegionDraw);
      waveform.current?.on("afterRegionsDraw", updateAfterRegionDraw);
      waveform.current?.on("regionSelected", selectRegion);
      waveform.current?.on("regionCreated", createRegion);
      waveform.current?.on("regionUpdatedEnd", updateRegion);
      waveform.current?.on("regionSelectionCleared", clearRegionSelection);

      waveform.current?.on("regionRemoved", checkRegionCount);

      // Mouse wheel / trackpad zoom — vertical scroll = zoom (no modifier needed)
      const handleWheel = (e: WheelEvent) => {
        if (!waveform.current) return;
        // Horizontal scroll = panning (let AudioUltra handle), vertical = zoom
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? 0.82 : 1.22;
        const newZoom = Math.min(1500, Math.max(1, controls.zoom * delta));
        smoothZoom(newZoom);
      };

      const rootElement = rootRef.current;
      rootElement?.addEventListener("wheel", handleWheel, { passive: false });

      let seekFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;
      waveform.current?.on("seek", () => {
        if (waveform.current) {
          waveform.current.syncCursor();
          // Auto-play removed: handled by model.js click handler to avoid pause conflicts
          const el = rootRef.current;
          if (el) {
            el.classList.add("lsf-audio-seek-active");
            if (seekFeedbackTimeout) clearTimeout(seekFeedbackTimeout);
            seekFeedbackTimeout = setTimeout(() => {
              el.classList.remove("lsf-audio-seek-active");
              seekFeedbackTimeout = null;
            }, 400);
          }
        }
      });

      // Keep "Whole Audio Invalid" visibility accurate on first load too.
      setTimeout(checkRegionCount, 0);

      return () => {
        hotkeys.unbindAll();
      };
    }, []);

    const duration = controls.duration ?? 0;
    const timelineLength = Math.max(1, Math.round(duration * 1000) + 1);
    const timelinePosition = Math.min(timelineLength, Math.max(1, Math.round(controls.currentTime * 1000) + 1));

    return (
      <div
        className={cn("audio-tag").toClassName()}
        data-has-regions={hasRegions ? "true" : "false"}
        data-whole-audio-invalid={wholeAudioInvalid ? "true" : "false"}
      >
        {children}
        <div
          ref={(el) => {
            rootRef.current = el;
            item.stageRef.current = el;
          }}
          style={{ position: "relative" }}
        />
        <Controls
          length={timelineLength}
          position={timelinePosition}
          frameRate={1000}
          playing={isSyncedBuffering && item.isBuffering ? item.wasPlayingBeforeBuffering : controls.playing}
          collapsed={false}
          fullscreen={false}
          buffering={item.isBuffering}
          volume={controls.volume}
          speed={controls.rate}
          zoom={controls.zoom}
          duration={duration}
          disableFrames
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
              const wfObj = waveform.current as any;
              const player = wfObj?.player;
              if (player) {
                player.loop = null;
                if (wfObj) wfObj.loop = null;
                // Force canPause()=true to survive async hasPlayed race
                player.hasPlayed = true;
                const audioEl = player.audio?.el;
                if (audioEl && !audioEl.paused) {
                  if (player.playing) {
                    player.pause();
                  } else {
                    // player.playing=false but audio.el still running (async race)
                    audioEl.pause();
                    player.playing = false;
                  }
                } else if (player.playing) {
                  player.pause();
                }
              }
              controls.setPlaying(false);
            }
          }}
          allowFullscreen={false}
          allowViewCollapse={false}
          onRewind={() => {
            waveform.current?.seekBackward(1);
            waveform.current?.syncCursor();
          }}
          onForward={() => {
            waveform.current?.seekForward(1);
            waveform.current?.syncCursor();
          }}
          onToggleCollapsed={() => {}}
          onFullScreenToggle={() => {}}
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
    loopRegion: true,
    // Fixensy: disable auto-play after segment draw — was snapping playhead back to drawn segment start
    autoPlayNewSegments: false,
  });
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
