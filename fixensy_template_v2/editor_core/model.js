import { observe } from "mobx";
import { getEnv, getRoot, getType, isAlive, types } from "mobx-state-tree";
import { createRef } from "react";
import { customTypes } from "../../../core/CustomTypes";
import { AnnotationMixin } from "../../../mixins/AnnotationMixin";
import IsReadyMixin from "../../../mixins/IsReadyMixin";
import ProcessAttrsMixin from "../../../mixins/ProcessAttrs";
import { SyncableMixin } from "../../../mixins/Syncable";
import { AudioRegionModel } from "../../../regions/AudioRegion";
import { FF_LSDV_E_278, isFF } from "../../../utils/feature-flags";
import { isDefined } from "../../../utils/utilities";
import ObjectBase from "../Base";
import { WS_SPEED, WS_VOLUME, WS_ZOOM_X } from "./constants";
import { ff } from "@humansignal/core";

const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);

/**
 * The Audio tag plays audio and shows its waveform. Use for audio annotation tasks where you want to label regions of audio, see the waveform, and manipulate audio during annotation.
 *
 * Use with the following data types: audio
 * @example
 * <!-- Play audio on the labeling interface -->
 * <View>
 *   <Audio name="audio" value="$audio" />
 * </View>
 * @example
 * <!-- Play audio with multichannel support -->
 * <View>
 *   <Audio name="audio" value="$audio" splitchannels="true" />
 * </View>
 * @example
 * <!-- Audio classification -->
 * <View>
 *   <Audio name="audio" value="$audio" />
 *   <Choices name="ch" toName="audio">
 *     <Choice value="Positive" />
 *     <Choice value="Negative" />
 *   </Choices>
 * </View>
 * @example
 * <!-- Audio transcription -->
 * <View>
 *   <Audio name="audio" value="$audio" />
 *   <TextArea name="ta" toName="audio" />
 * </View>
 * @example
 * <!-- Labeling configuration to label regions of audio and rate the audio sample-->
 * <View>
 *   <Labels name="lbl-1" toName="audio-1">
 *     <Label value="Guitar" />
 *     <Label value="Drums" />
 *   </Labels>
 *   <Rating name="rate-1" toName="audio-1" />
 *   <Audio name="audio-1" value="$audio" />
 * </View>
 * @example
 * <!-- Sync with video -->
 * <View>
 *   <Video name="video-1" value="$video" sync="audio-1" />
 *   <Labels name="lbl-1" toName="audio-1">
 *     <Label value="Guitar" />
 *     <Label value="Drums" />
 *   </Labels>
 *   <Audio name="audio-1" value="$video" sync="video-1" />
 * </View>
 * @example
 * <!-- Sync with paragraphs -->
 * <View>
 *   <Labels name="lbl-1" toName="audio-1">
 *     <Label value="Guitar" />
 *     <Label value="Drums" />
 *   </Labels>
 *   <Audio name="audio-1" value="$audio" sync="txt-1" />
 *   <Paragraphs audioUrl="$audio" sync="audio-1" name="txt-1" value="$text" layout="dialogue" showplayer="true" />
 * </View>
 * @regions AudioRegion
 * @meta_title Audio Tag for Audio Labeling
 * @meta_description Customize Label Studio with the Audio tag for advanced audio annotation tasks for machine learning and data science projects.
 * @name Audio
 * @param {string} name - Name of the element
 * @param {string} value - Data field containing path or a URL to the audio.
 * @param {string} [defaultspeed=1] - Default speed level (from 0.5 to 2).
 * @param {string} [defaultscale=1] - Audio pane default y-scale for waveform.
 * @param {string} [defaultzoom=1] - Default zoom level for waveform. (from 1 to 1500).
 * @param {string} [defaultvolume=1] - Default volume level (from 0 to 1).
 * @param {string} [hotkey] - Hotkey used to play or pause audio.
 * @param {string} [sync] Object name to sync with.
 * @param {string} [height=96] - Total height of the audio player.
 * @param {string} [waveheight=32] - Minimum height of a waveform when in `splitchannels` mode with multiple channels to display.
 * @param {boolean} [spectrogram=false] - Determines whether an audio spectrogram is automatically displayed upon loading.
 * @param {boolean} [splitchannels=false] - Display multiple audio channels separately, if the audio file has more than one channel. (**NOTE: Requires more memory to operate.**)
 * @param {string} [decoder=webaudio] - Decoder type to use to decode audio data. (`"webaudio"`, `"ffmpeg"`, or `"none"` for no decoding - provides fast loading for large files but disables waveform visualization)
 * @param {string} [player=html5] - Player type to use to play audio data. (`"html5"` or `"webaudio"`)
 */
const TagAttrs = types.model({
  name: types.identifier,
  value: types.maybeNull(types.string),
  muted: types.optional(types.boolean, false),
  zoom: types.optional(types.boolean, true),
  defaultzoom: types.optional(types.string, WS_ZOOM_X.default.toString()),
  volume: types.optional(types.boolean, true),
  defaultvolume: types.optional(types.string, WS_VOLUME.default.toString()),
  speed: types.optional(types.boolean, true),
  defaultspeed: types.optional(types.string, WS_SPEED.default.toString()),
  hotkey: types.maybeNull(types.string),
  showlabels: types.optional(types.boolean, false),
  showscores: types.optional(types.boolean, false),
  height: types.optional(types.string, "96"),
  waveheight: types.optional(types.string, "32"),
  cursorwidth: types.optional(types.string, "2"),
  cursorcolor: types.optional(customTypes.color, "#333"),
  defaultscale: types.optional(types.string, "1"),
  autocenter: types.optional(types.boolean, true),
  scrollparent: types.optional(types.boolean, true),
  splitchannels: types.optional(types.boolean, false),
  decoder: types.optional(types.enumeration(["ffmpeg", "webaudio", "none"]), "webaudio"),
  player: types.optional(types.enumeration(["html5", "webaudio"]), "html5"),
  spectrogram: types.optional(types.boolean, false),
});

export const AudioModel = types.compose(
  "AudioModel",
  TagAttrs,
  SyncableMixin,
  ProcessAttrsMixin,
  ObjectBase,
  AnnotationMixin,
  IsReadyMixin,
  types
    .model("AudioModel", {
      type: "audio",
      _value: types.optional(types.string, ""),
      regions: types.array(types.late(() => AudioRegionModel)),
    })
    .volatile(() => ({
      errors: [],
      stageRef: createRef(),
      _ws: null,
      _wfFrame: null,
      _skip_seek_event: false,
      _fixensy_intervalId: null,
      _fixensy_wholeAudioSegId: null,
      _fixensy_colorCache: null,
      _fixensy_wholeAudioInvalid: false,
      _fixensy_lastChoiceByRegion: new Map(),
    }))
    .views((self) => ({
      get hasStates() {
        const states = self.states();

        return states && states.length > 0;
      },

      get store() {
        return getRoot(self);
      },

      states() {
        return self.annotation?.toNames.get(self.name) || [];
      },

      activeStates() {
        const states = self.states();

        return states?.filter((s) => getType(s).name === "LabelsModel" && s.isSelected);
      },

      get activeState() {
        const states = self.states();

        return states?.filter((s) => getType(s).name === "LabelsModel" && s.isSelected)[0];
      },

      get activeLabel() {
        const state = self.activeState;

        return state?.selectedValues()?.[0];
      },
      get activeLabelKey() {
        const labels = self.activeState?.selectedValues();

        // use label to generate a unique key to ensure that adding/deleting can trigger changes
        return labels ? labels.join(",") : "";
      },
      get readonly() {
        return self.annotation.isReadOnly();
      },
    }))
    ////// Sync actions
    .actions((self) => ({
      ////// Outgoing

      triggerSync(event, data) {
        if (!self._ws) return;

        self.syncSend(
          {
            playing: self._ws.playing,
            time: self._ws.currentTime,
            speed: self._ws.rate,
            ...data,
          },
          event,
        );
      },

      triggerSyncSpeed(speed) {
        self.triggerSync("speed", { speed });
      },

      triggerSyncPlay(isManual = false) {
        if (isSyncedBuffering && self.isBuffering && !isManual) return;
        self.wasPlayingBeforeBuffering = true;
        // @todo should not be handled like this
        self.handleSyncPlay();
        // trigger play only after it actually started to play
        self.triggerSync("play", { playing: true });
      },

      triggerSyncPause(isManual = false) {
        if (isSyncedBuffering && self.isBuffering && !isManual) return;
        self.wasPlayingBeforeBuffering = false;
        // @todo should not be handled like this
        self.handleSyncPause();
        self.triggerSync("pause", { playing: false });
      },

      triggerSyncSeek(time) {
        self.triggerSync("seek", { time, ...(isSyncedBuffering ? { playing: self.wasPlayingBeforeBuffering } : {}) });
      },

      triggerSyncBuffering(isBuffering) {
        if (!self._ws) return;

        const playing = self.wasPlayingBeforeBuffering;

        self.triggerSync("buffering", {
          buffering: isBuffering,
          playing,
        });
      },

      ////// Incoming

      registerSyncHandlers() {
        for (const event of ["play", "pause", "seek"]) {
          self.syncHandlers.set(event, self.handleSync);
        }
        self.syncHandlers.set("speed", self.handleSyncSpeed);
        if (isSyncedBuffering) {
          self.syncHandlers.set("buffering", self.handleSyncBuffering);
        }
      },

      handleSyncBuffering({ playing, ...data }) {
        self.isBuffering = self.syncManager?.isBuffering;
        if (data.buffering) {
          self.wasPlayingBeforeBuffering = playing;
          self._skip_seek_event = true;
          self.isPlaying = false;
          self._ws?.pause();
          self._skip_seek_event = false;
        }
        if (!self.isBuffering && !data.buffering) {
          if (playing) {
            self._skip_seek_event = true;
            self.isPlaying = true;
            self._ws?.play();
            self._skip_seek_event = false;
          }
        }
        // process other data
        self.handleSyncSeek(data);
      },

      handleSync(data, event) {
        if (!self._ws?.loaded) return;

        if (!isSyncedBuffering) {
          self.handleSyncSeek(data);
        }

        const isBuffering = self.syncManager?.isBuffering;

        // Normal logic when no buffering
        if (!isSyncedBuffering || (!isBuffering && isDefined(data.playing))) {
          if (data.playing) {
            if (!self._ws.playing) {
              self.isPlaying = true;
              self._ws?.play();
            }
          } else {
            if (self._ws.playing) {
              self.isPlaying = false;
              self._ws?.pause();
            }
          }
        }
        // during the buffering only these events have real `playing` values (in other cases it's paused all the time)
        if (["play", "pause"].indexOf(event) > -1) {
          self.wasPlayingBeforeBuffering = data.playing;
        }

        if (isSyncedBuffering) {
          self.handleSyncSeek(data);
        }
      },

      // @todo remove both of these methods
      handleSyncPlay() {
        if (self._ws?.playing) return;

        self.isPlaying = true;
        self._ws?.play();
      },

      handleSyncPause() {
        if (self.isPlaying) return;

        self.isPlaying = false;
        self._ws?.pause();
      },

      handleSyncSeek({ time }) {
        if (!self._ws?.loaded || !isDefined(time)) return;

        try {
          // setCurrentTime some times can take up to 76ms and it is syncronous
          self._ws.setCurrentTime(time, true);
          // syncCursor provides sync drawing which can cost up to 10ms which is too much for syncing playback
          setTimeout(() => {
            if (isAlive(self)) self._ws?.syncCursor();
          });
        } catch (err) {
          console.log(err);
        }
      },

      handleSyncSpeed({ speed }) {
        if (!self._ws) return;
        self._ws.rate = speed;
      },

      syncMuted(muted) {
        if (!self._ws) return;
        self._ws.muted = muted;
      },
    }))
    .actions((self) => {
      let dispose;
      let updateTimeout = null;

      return {
        afterCreate() {
          // Fixensy: color cache (MST safe - Map use করছি)
          self._fixensy_colorCache = new Map();

          // Keep polling lightweight to avoid zoom/click jank on large tasks.
          self._fixensy_intervalId = setInterval(() => {
            try {
              if (!self._ws) return;
              let changed = false;

              // Whole Audio Invalid observe (Early return potential)
              self._fixensy_checkWholeAudio();

              // Only track selected regions continuously; this is where users expect instant updates.
              const selectedRegs = (self.regs || []).filter((r) => r.selected);
              for (const r of selectedRegs) {
                const newKey = (r.results || [])
                  .map((res) => {
                    const choices = res?.value?.choices;
                    if (Array.isArray(choices)) return choices.join(",");
                    const v = res?.mainValue;
                    return Array.isArray(v) ? v.join(",") : v || "";
                  })
                  .join("|");
                const cachedKey = self._fixensy_colorCache.get(r.id);
                if (cachedKey === newKey) continue;
                self._fixensy_colorCache.set(r.id, newKey);
                self.updateRegionColorByChoices(r);
                changed = true;
              }

              if (changed) self.requestWSUpdate();
            } catch(_) {}
          }, 250);

          dispose = observe(
            self,
            "activeLabelKey",
            () => {
              const selectedRegions = self._ws?.regions?.selected;

              if (!selectedRegions || selectedRegions.length === 0) return;

              const activeState = self.activeState;
              const selectedColor = activeState?.selectedColor;
              const labels = activeState?.selectedValues();

              for (const r of selectedRegions) {
                r.update({ color: selectedColor, labels: labels ?? [] });

                const region = r.isRegion ? self.updateRegion(r) : self.addRegion(r);

                self.annotation.selectArea(region);
              }

              if (selectedRegions.length) {
                self.requestWSUpdate();
                // Fixensy: label change এ color update
                setTimeout(() => {
                  try {
                    const selRegs = self.regs?.filter((r) => r.selected);
                    for (const reg of selRegs || []) {
                      self.updateRegionColorByChoices(reg);
                    }
                  } catch(_) {}
                }, 100);
              }
            },
            false,
          );

          // Fixensy: Force "Create Segment" to always be selected using MST (MobX State Tree)
          const forceLabelSelection = () => self._fixensy_ensureCreateSegmentLabel();
          setTimeout(forceLabelSelection, 100);
          setTimeout(forceLabelSelection, 500);
          setTimeout(forceLabelSelection, 1000);
          
          self._fixensy_mouseup_handler = () => {
             setTimeout(forceLabelSelection, 50);
             setTimeout(forceLabelSelection, 200);
          };
          window.addEventListener('mouseup', self._fixensy_mouseup_handler, true);
          
          // Fixensy: Click-to-play is handled natively by Visualizer.handleSeek.
          // Do NOT add a separate click handler here — it conflicts with pause
          // and causes double-seek issues. See Visualizer.ts handleSeek().

          // Fixensy: Smooth Keyboard Zoom (+, -) and Enter Play/Pause
          self._fixensy_zoom_handler = (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (!self._ws) return;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (self._ws.player) {
                    if (self._ws.player.playing) self._ws.player.pause();
                    else self._ws.player.play();
                }
                return;
            }
            
            const zoomAmount = 1.25; // Smooth incremental zoom
            if (e.key === '+' || e.key === '=') {
              e.preventDefault();
              let currentZoom = 1;
              if (typeof self._ws.getZoom === 'function') currentZoom = self._ws.getZoom();
              else if (self._ws.zoom) currentZoom = self._ws.zoom;
              if (typeof self._ws.setZoom === 'function') {
                self._ws.setZoom(currentZoom * zoomAmount);
              }
            } else if (e.key === '-') {
              e.preventDefault();
              let currentZoom = 1;
              if (typeof self._ws.getZoom === 'function') currentZoom = self._ws.getZoom();
              else if (self._ws.zoom) currentZoom = self._ws.zoom;
              if (typeof self._ws.setZoom === 'function') {
                self._ws.setZoom(Math.max(1, currentZoom / zoomAmount));
              }
            }
          };
          window.addEventListener("keydown", self._fixensy_zoom_handler, true);

          // Fixensy: Dark Mode Observer — watches html[data-color-scheme] and toggles fx-dark class
          const applyTheme = () => {
            const scheme = document.documentElement.getAttribute('data-color-scheme');
            const isDark = scheme === 'dark';
            document.querySelectorAll('.fx-audio-box, .fx-card').forEach(el => {
              if (isDark) {
                el.classList.add('fx-dark');
                el.style.background = '#1E293B';
                el.style.borderColor = '#334155';
                el.style.color = '#F1F5F9';
              } else {
                el.classList.remove('fx-dark');
                el.style.background = '#ffffff';
                el.style.borderColor = '#E9EDF3';
                el.style.color = '';
              }
            });
            // Also style choice buttons
            document.querySelectorAll('.lsf-choices .lsf-choice').forEach(el => {
              if (isDark) {
                el.style.background = '#334155';
                el.style.color = '#F1F5F9';
              } else {
                el.style.background = '';
                el.style.color = '';
              }
            });
          };
          applyTheme(); // Initial apply
          self._fixensy_theme_observer = new MutationObserver(applyTheme);
          self._fixensy_theme_observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-scheme'] });
        },

        // Whole Audio Invalid only toggles segmentation mode; do not create full-length region.
        _fixensy_isWholeAudioInvalid() {
          try {
            const wholeTag = self.annotation?.names?.get("whole_audio_quality");
            if (!wholeTag?.selectedValues) return false;
            const selectedValues = wholeTag.selectedValues();

            return Array.isArray(selectedValues) && selectedValues.includes("Whole Audio Invalid");
          } catch (_) {
            return false;
          }
        },

        _fixensy_clearWholeAudioInvalid() {
          try {
            const wholeTag = self.annotation?.names?.get("whole_audio_quality");
            if (!wholeTag?.selectedLabels?.length) return;
            wholeTag.selectedLabels.forEach((choice) => choice?.setSelected?.(false));
            wholeTag.updateResult?.();
          } catch (_) {}
        },

        _fixensy_ensureCreateSegmentLabel() {
          try {
            const labelControl = self.states?.()?.find((s) => s.type === "labels" || s.name === "fx_labels");
            const label = labelControl?.children?.[0];

            if (!labelControl || !label) return null;
            if (!label.selected) {
              if (typeof label.setSelected === "function") label.setSelected(true);
              else if (typeof label.toggleSelected === "function") label.toggleSelected();
            }
            return labelControl;
          } catch (_) {
            return null;
          }
        },

        _fixensy_noteLastChoice(controlName, choiceValue) {
          try {
            if (!["quality", "speaker", "invalid_reason", "whole_audio_quality"].includes(controlName)) return;
            const region = self.annotation?.highlightedNode;
            if (!region || region.object !== self) return;

            self._fixensy_lastChoiceByRegion.set(region.id, { controlName, choiceValue, ts: Date.now() });
            requestAnimationFrame(() => {
              try {
                self.updateRegionColorByChoices(region);
              } catch (_) {}
            });
          } catch (_) {}
        },

        _fixensy_checkWholeAudio() {
          try {
            if (!self._ws || !self.annotation) return;

            // whole_audio_quality tag খুঁজি
            const wholeTag = self.annotation.names && self.annotation.names.get("whole_audio_quality");
            if (!wholeTag) return;

            const hasAnyRegion = (self.regs ?? []).length > 0;
            const isWholeInvalid = self._fixensy_isWholeAudioInvalid();

            // FIX: If regions exist, we MUST clear whole audio invalid.
            if (hasAnyRegion && isWholeInvalid) {
              self._fixensy_clearWholeAudioInvalid();
            }

            const finalWholeInvalid = self._fixensy_isWholeAudioInvalid();
            self._fixensy_wholeAudioInvalid = finalWholeInvalid;

            // Whole audio invalid: prevent creating new segments.
            if (self._ws && self._ws.regions) {
              if (typeof self._ws.regions.setCreateable === "function") {
                self._ws.regions.setCreateable(!finalWholeInvalid);
              }
              // Also prevent drawing if whole audio is invalid
              if (finalWholeInvalid) {
                self._ws.regions.setDrawing(false);
              }
            }
          } catch(e) {}
        },

        // Fixensy: perRegion choice change হলে segment color update করো
        _fixensy_cleanupRegionResults(region) {
          if (!region?.results?.length) return;
          try {
            const latestByName = new Map();

            [...region.results].forEach((result) => {
              const name = result?.from_name?.name;
              if (!name) return;
              if (latestByName.has(name)) region.removeResult?.(latestByName.get(name));
              latestByName.set(name, result);
            });

            const quality = latestByName.get("quality");
            const qualityValues = quality?.mainValue ? (Array.isArray(quality.mainValue) ? quality.mainValue : [quality.mainValue]) : [];
            const currentQuality = qualityValues[qualityValues.length - 1];

            if (quality && qualityValues.length > 1 && currentQuality) {
              quality.setValue?.([currentQuality]);
            }

            const removeByName = (name) => {
              const result = latestByName.get(name);
              if (result) {
                region.removeResult?.(result);
                latestByName.delete(name);
              }
            };

            if (currentQuality === "Invalid") {
              removeByName("speaker");
              removeByName("transcription");
            } else if (currentQuality === "Valid") {
              removeByName("invalid_reason");
              removeByName("other_reason");
            }

            const invalidReason = latestByName.get("invalid_reason");
            const reasonValues = invalidReason?.mainValue
              ? Array.isArray(invalidReason.mainValue)
                ? invalidReason.mainValue
                : [invalidReason.mainValue]
              : [];
            const currentReason = reasonValues[reasonValues.length - 1];

            if (invalidReason && reasonValues.length > 1 && currentReason) {
              invalidReason.setValue?.([currentReason]);
            }
            if (currentReason !== "Other") removeByName("other_reason");
          } catch (e) {
            console.warn("Fixensy result cleanup error:", e);
          }
        },

        updateRegionColorByChoices(region) {
          if (!region || !region._ws_region) return;
          try {
            self._fixensy_cleanupRegionResults(region);
            const results = region.results || [];
            let finalColor = "rgba(79, 70, 229, 1)"; // deep indigo for fresh drawn segments

            // Fixensy segment colors: same hue family as the buttons, darker for visibility.
            const colorMap = {
              // Quality
              "Valid":                "rgba(4, 120, 87, 1)",     // button green, deeper
              "Invalid":              "rgba(185, 28, 28, 1)",    // button red, deeper
              // Speaker
              "Speaker A":            "rgba(29, 78, 216, 1)",    // button blue, deeper
              "Speaker B":            "rgba(124, 58, 237, 1)",   // button purple, deeper
              "Speaker C":            "rgba(8, 145, 178, 1)",    // button cyan, deeper
              // Invalid Reason
              "Noise":                "rgba(217, 119, 6, 1)",    // button amber, deeper
              "Overlap":              "rgba(234, 88, 12, 1)",    // button orange, deeper
              "Silence":              "rgba(71, 85, 105, 1)",    // button slate, deeper
              "Inaudible":            "rgba(124, 58, 237, 1)",   // button purple, deeper
              "Non-target Language":  "rgba(219, 39, 119, 1)",   // button pink, deeper
              "Other":                "rgba(51, 65, 85, 1)",     // button dark slate
              // Whole Audio
              "Whole Audio Invalid":  "rgba(185, 28, 28, 1)",    // button red, deeper
            };

            // Last clicked Fixensy button wins; fallback uses the most specific saved result.
            let qualityColor = null;
            let speakerColor = null;
            let reasonColor = null;
            let lastClickedColor = null;
            const lastClicked = self._fixensy_lastChoiceByRegion?.get?.(region.id);

            for (const result of results) {
              const value = result.mainValue;
              if (!value) continue;
              const choices = Array.isArray(value) ? value : [value];
              for (const choice of choices) {
                if (["Valid", "Invalid"].includes(choice)) {
                  qualityColor = colorMap[choice] || null;
                }
                if (["Speaker A", "Speaker B", "Speaker C"].includes(choice)) {
                  speakerColor = colorMap[choice] || null;
                }
                if (["Noise", "Overlap", "Silence", "Inaudible", "Other", "Whole Audio Invalid"].includes(choice)) {
                  reasonColor = colorMap[choice] || null;
                }
                if (lastClicked?.choiceValue === choice) {
                  lastClickedColor = colorMap[choice] || null;
                }
              }
            }

            if (lastClickedColor) finalColor = lastClickedColor;
            else if (reasonColor) finalColor = reasonColor;
            else if (speakerColor) finalColor = speakerColor;
            else if (qualityColor) finalColor = qualityColor;

            region._ws_region.update({ color: finalColor });
            // Fixensy: force solid alpha + immediate sync repaint, no debounce delay
            try {
              const wsColor = region._ws_region.color;
              if (wsColor && typeof wsColor === "object") {
                wsColor.rgba = [wsColor.r, wsColor.g, wsColor.b, 1];
              }
            } catch(_) {}
            try { self._ws?.regions?.redraw?.(); } catch(_) {}
            self.requestWSUpdate();

          } catch (e) {
            console.warn("Fixensy color update error:", e);
          }
        },

        needsUpdate() {
          self.handleNewRegions();
          self.requestWSUpdate();
          // Update selected region color immediately; avoid full-list repaint on every change.
          setTimeout(() => {
            try {
              const selectedRegs = self.regs?.filter((r) => r.selected) || [];
              for (const r of selectedRegs) {
                self.updateRegionColorByChoices(r);
              }
            } catch(_) {}
          }, 30);
        },

        requestWSUpdate() {
          if (!self._ws) return;
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }

          updateTimeout = setTimeout(() => {
            self._ws.regions.redraw();
          }, 33);
        },

        onReady() {
          self.setReady(true);
        },

        onRateChange(rate) {
          self.triggerSyncSpeed(rate);
        },

        /**
         * Load any synced paragraph text segments which contain start and end values
         * as Audio segments for visualization of the excerpts within the audio track
         **/
        loadSyncedParagraphs() {
          if (!self.syncManager) return;

          // find synced paragraphs if any
          // and add their regions to the audio
          const syncedParagraphs = Array.from(self.syncManager.syncTargets, ([, value]) => value).filter(
            (target) => target.type === "paragraphs" && target.contextscroll,
          );

          for (const paragraph of syncedParagraphs) {
            const segments = Object.values(paragraph.regionsStartEnd).map(({ start, end }) => ({
              start,
              end,
              showInTimeline: true,
              external: true,
              locked: true,
            }));

            self._ws.addRegions(segments);
          }
        },

        handleNewRegions() {
          if (!self._ws) return;

          self.regs.map((reg) => {
            if (reg._ws_region) {
              self.updateWsRegion(reg);
            } else {
              self.createWsRegion(reg);
            }
          });
        },

        findRegionByWsRegion(wsRegion) {
          return self.regs.find((r) => r._ws_region?.id === wsRegion?.id);
        },

        getRegionColor() {
          const control = self.activeState || self._fixensy_ensureCreateSegmentLabel();

          if (control?.name === "fx_labels") {
            return "rgba(79, 70, 229, 1)";
          }

          if (control) {
            return control.selectedColor;
          }

          return null;
        },

        onHotKey(e) {
          e?.preventDefault();
          self._ws.togglePlay();
          return false;
        },

        setRangeValue(val) {
          self.rangeValue = val;
        },

        setPlaybackRate(val) {
          self.playBackRate = val;
        },

        addRegion(wsRegion) {
          // Hard guard: when whole-audio is invalid no new segments can be created.
          if (self._fixensy_isWholeAudioInvalid()) {
            try {
              wsRegion?.remove?.();
            } catch (_) {}
            return null;
          }

          // area id is assigned to WS region during deserealization
          const find_r = self.annotation.areas.get(wsRegion.id);

          if (find_r) {
            find_r.setWSRegion(wsRegion);
            find_r.updateColor();
            if (find_r.color && typeof find_r.color === 'string') {
              // Force vivid opacity
              if (find_r.color.startsWith('rgba')) {
                 find_r.color = find_r.color.replace(/[\d.]+\)$/g, '0.88)');
              } else if (find_r.color.length === 9) {
                 find_r.color = find_r.color.substring(0, 7) + 'E0';
              }
            }
            return find_r;
          }

          self._fixensy_ensureCreateSegmentLabel();
          let activeStates = self.activeStates();

          if (activeStates.length === 0) {
            const firstState = self.states?.()?.find((s) => s.type === "labels" || s.name === "fx_labels");
            const firstLabel = firstState?.children?.[0];
            if (firstLabel && !firstLabel.selected) {
              if (typeof firstLabel.setSelected === "function") firstLabel.setSelected(true);
              else firstLabel.toggleSelected?.();
            }
            activeStates = self.activeStates();
          }

          const [control, ...rest] = activeStates;

          if (!control) {
            if (wsRegion.isRegion) wsRegion.convertToSegment().handleSelected();
            else wsRegion.handleSelected();
            return;
          }
          const labels = { [control.valueType]: control.selectedValues() };
          const r = ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)
            ? self.annotation.createResult(wsRegion, labels, control, self, false, rest)
            : self.annotation.createResult(wsRegion, labels, control, self, false);
          const updatedRegion = wsRegion.convertToRegion(labels.labels);

          r.setWSRegion(updatedRegion);
          r.updateColor();
          // Fixensy: initial color
          setTimeout(() => {
            try { self.updateRegionColorByChoices(r); } catch(_) {}
          }, 100);
          return r;
        },

        updateRegion(wsRegion) {
          const r = self.findRegionByWsRegion(wsRegion);

          if (!r) return;

          r.onUpdateEnd();
          // Fixensy: color update
          setTimeout(() => {
            try { self.updateRegionColorByChoices(r); } catch(_) {}
          }, 50);
          return r;
        },

        createWsRegion(region) {
          if (!self._ws) return;

          const options = region.wsRegionOptions();

          options.labels = region.labels?.length ? region.labels : undefined;

          const r = self._ws.addRegion(options, false);

          region.setWSRegion(r);
        },

        updateWsRegion(region) {
          if (!self._ws) return;

          const options = region.wsRegionOptions();

          options.labels = region.labels?.length ? region.labels : undefined;

          self._ws.updateRegion(options, false);
        },

        clearRegionMappings() {
          for (const r of self.regs) {
            r.setWSRegion(null);
          }
        },

        onLoad(ws) {
          self.clearRegionMappings();
          self._ws = ws;

          self.checkReady();
          self.needsUpdate();
          if (isFF(FF_LSDV_E_278)) {
            self.loadSyncedParagraphs();
          }
        },

        checkReady() {
          if (!self._ws || self._ws.destroyed) return;
          if (self._ws.isDrawing) {
            requestAnimationFrame(() => self.checkReady());
            return;
          }
          self.onReady();
        },

        onSeek(time) {
          if (isSyncedBuffering && self._skip_seek_event) return;
          self.triggerSyncSeek(time);
        },

        onPlaying(playing) {
          if (isSyncedBuffering && self.isPlaying === playing) return;
          if (playing) {
            // @todo self.play();
            self.triggerSyncPlay();
          } else {
            // @todo self.pause();
            self.triggerSyncPause();
          }
          self.isPlaying = playing;
        },

        handleBuffering(isBuffering) {
          if (!isSyncedBuffering) return;
          if (self.syncManager?.isBufferingOrigin(self.name) === isBuffering) return;
          const isAlreadyBuffering = self.syncManager?.isBuffering;
          const isLastCauseOfBuffering =
            self.syncManager?.bufferingOrigins.size === 1 && self.syncManager?.isBufferingOrigin(self.name);
          const willStartBuffering = !isAlreadyBuffering && isBuffering;
          const willStopBuffering = isLastCauseOfBuffering && !isBuffering;

          if (willStopBuffering) {
            if (self.wasPlayingBeforeBuffering) {
              self.isPlaying = true;
              self._ws?.play();
            }
          }

          self.triggerSyncBuffering(isBuffering);

          // The real value, relevant for all medias synced together we have only after triggering the buffering event
          self.isBuffering = self.syncManager?.isBuffering;

          if (willStartBuffering) {
            if (self._ws?.playing) {
              self.isPlaying = false;
              self._ws?.pause();
            }
          }
        },

        onError(error) {
          let messageHandler;

          if (error.name === "HTTPError") {
            messageHandler = "ERR_LOADING_HTTP";
          } else {
            messageHandler = "ERR_LOADING_AUDIO";
          }

          const message = getEnv(self.store).messages[messageHandler]({
            attr: self.value,
            url: self._value,
            error: error.message,
          });

          self.errors = [message];
        },

        beforeDestroy() {
          try {
            if (self._fixensy_intervalId) {
              clearInterval(self._fixensy_intervalId);
              self._fixensy_intervalId = null;
            }
            if (self._fixensy_colorCache) {
              self._fixensy_colorCache.clear();
              self._fixensy_colorCache = null;
            }
            if (self._fixensy_zoom_handler) {
              window.removeEventListener("keydown", self._fixensy_zoom_handler, true);
              self._fixensy_zoom_handler = null;
            }
            if (self._fixensy_mouseup_handler) {
              window.removeEventListener("mouseup", self._fixensy_mouseup_handler, true);
              self._fixensy_mouseup_handler = null;
            }
            if (self._fixensy_theme_observer) {
              self._fixensy_theme_observer.disconnect();
              self._fixensy_theme_observer = null;
            }
            if (updateTimeout) clearTimeout(updateTimeout);
            if (dispose) dispose();
            if (isDefined(self._ws)) {
              self._ws.destroy();
              self._ws = null;
            }
          } catch (_err) {
            self._ws = null;
            console.warn("Already destroyed");
          }
        },
        setWFFrame(frame) {
          self._wfFrame = frame;
        },
      };
    }),
);
