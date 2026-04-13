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

          // Fixensy: Instant color polling (100ms) - memory leak fixed
          self._fixensy_intervalId = setInterval(() => {
            try {
              if (!self._ws) return;
              let changed = false;
              for (const r of self.regs || []) {
                // সঠিক path: result.value.choices অথবা result.mainValue
                const newKey = (r.results || [])
                  .map(res => {
                    // perRegion choices: value.choices array তে থাকে
                    const choices = res?.value?.choices;
                    if (Array.isArray(choices)) return choices.join(",");
                    // fallback: mainValue
                    const v = res?.mainValue;
                    return Array.isArray(v) ? v.join(",") : (v || "");
                  })
                  .join("|");
                const cachedKey = self._fixensy_colorCache.get(r.id);
                if (cachedKey !== newKey) {
                  self._fixensy_colorCache.set(r.id, newKey);
                  self.updateRegionColorByChoices(r);
                  changed = true;
                }
              }
              // Whole Audio Invalid observe
              self._fixensy_checkWholeAudio();
              if (changed) self.requestWSUpdate();
            } catch(_) {}
          }, 100);

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
        },

        // Fixensy: Whole Audio Invalid - auto segment + block
        _fixensy_checkWholeAudio() {
          try {
            if (!self._ws || !self.annotation) return;

            // whole_audio_quality tag খুঁজি
            const wholeTag = self.annotation.names && self.annotation.names.get("whole_audio_quality");
            if (!wholeTag) return;

            const selectedValues = wholeTag.selectedValues ? wholeTag.selectedValues() : [];
            const isWholeInvalid = Array.isArray(selectedValues) && selectedValues.includes("Whole Audio Invalid");

            if (isWholeInvalid) {
              // segment already আছে কিনা
              if (self._fixensy_wholeAudioSegId) return;

              // duration পাই
              const duration = self._ws.duration;
              if (!duration || duration <= 0) return;

              // পুরো audio জুড়ে segment তৈরি
              const wsReg = self._ws.addRegion({
                start: 0,
                end: duration,
                color: "rgba(153,27,27,0.7)",
                labels: [],
              }, false);

              if (wsReg) {
                self._fixensy_wholeAudioSegId = wsReg.id;
              }

              // নতুন segment বানানো block
              if (self._ws.regions && typeof self._ws.regions.setCreateable === "function") {
                self._ws.regions.setCreateable(false);
              }

            } else {
              // uncheck - segment delete করি
              if (self._fixensy_wholeAudioSegId) {
                try {
                  const wsReg = self._ws.regions.findRegion(self._fixensy_wholeAudioSegId);
                  if (wsReg) wsReg.remove();
                } catch(_) {}
                self._fixensy_wholeAudioSegId = null;
              }
              // block তুলে দিই
              if (self._ws.regions && typeof self._ws.regions.setCreateable === "function") {
                self._ws.regions.setCreateable(true);
              }
            }
          } catch(e) {}
        },

        // Fixensy: perRegion choice change হলে segment color update করো
        updateRegionColorByChoices(region) {
          if (!region || !region._ws_region) return;
          try {
            const results = region.results || [];
            let finalColor = "rgba(74,144,217,0.5)"; // default blue

            // Fixensy Color Map - single, clean
            const colorMap = {
              // Quality
              "Valid":                "rgba(16,185,129,0.6)",
              "Invalid":              "rgba(239,68,68,0.6)",
              // Speaker
              "Speaker A":            "rgba(59,130,246,0.6)",
              "Speaker B":            "rgba(139,92,246,0.6)",
              "Speaker C":            "rgba(20,184,166,0.6)",
              // Invalid Reason
              "Noise":                "rgba(255,152,0,0.6)",
              "Overlap":              "rgba(253,216,53,0.7)",
              "Silence":              "rgba(66,165,245,0.6)",
              "Inaudible":            "rgba(171,71,188,0.6)",
              "Other":                "rgba(245,158,11,0.6)",
              // Whole Audio
              "Whole Audio Invalid":  "rgba(153,27,27,0.7)",
            };

            // Priority: reason > speaker > quality > default
            // Valid + Speaker A  → Speaker A color (নীল)
            // Invalid + Noise    → Noise color (কমলা)
            // Invalid alone      → লাল
            // Valid alone        → সবুজ
            let qualityColor = null;
            let speakerColor = null;
            let reasonColor = null;

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
              }
            }

            if (reasonColor) finalColor = reasonColor;
            else if (speakerColor) finalColor = speakerColor;
            else if (qualityColor) finalColor = qualityColor;

            region._ws_region.update({ color: finalColor });
            self.requestWSUpdate();

          } catch (e) {
            console.warn("Fixensy color update error:", e);
          }
        },

        needsUpdate() {
          self.handleNewRegions();
          self.requestWSUpdate();
          // Fixensy: update all region colors on any annotation change
          setTimeout(() => {
            try {
              for (const r of self.regs) {
                self.updateRegionColorByChoices(r);
              }
            } catch(_) {}
          }, 50);
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
          const control = self.activeState;

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
          // area id is assigned to WS region during deserealization
          const find_r = self.annotation.areas.get(wsRegion.id);

          if (find_r) {
            find_r.setWSRegion(wsRegion);
            find_r.updateColor();
            return find_r;
          }

          const states = self.getAvailableStates();
          let activeStates = self.activeStates();

          if (activeStates.length === 0 && states.length > 0) {
            const firstState = states[0];
            const firstLabel = firstState?.children?.[0];
            if (firstLabel && !firstLabel.selected) firstLabel.toggleSelected();
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
