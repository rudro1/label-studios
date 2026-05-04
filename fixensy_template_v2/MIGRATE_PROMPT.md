# Fixensy Audio Template Migration Guide (v2)

This folder contains the complete "Fixensy Audio Labeling" template system. Use the prompt below to replace any existing template logic in another Label Studio folder.

## MIGRATION PROMPT (Copy-Paste this to AI)

"I want to completely replace the existing audio labeling logic in this project with the **Fixensy Audio Template**. I have a `fixensy_template_v2` folder with all the core files. Please perform a clean replacement by following these steps:

1.  **Remove Old Template**: If there is an existing `label_studio/annotation_templates/audio/` or similar, ignore it and create a new directory: `label_studio/annotation_templates/fixensy/audio-labeling/`. Place `config/config.yml` inside it.
2.  **Core Editor Overwrite**:
    - Overwrite `web/libs/editor/src/tags/object/Audio/model.js` with `editor_core/model.js`.
    - Overwrite `web/libs/editor/src/tags/object/Audio/view.tsx` with `editor_core/view.tsx`.
    *(This adds auto-segmentation, Enter/+/ - keys, and vivid region colors).*
3.  **Player Engine Overwrite**:
    - Overwrite `web/libs/editor/src/lib/AudioUltra/Controls/Player.ts` with `player_engine/Player.ts`.
    - Overwrite `web/libs/editor/src/lib/AudioUltra/Regions/Regions.ts` with `player_engine/Regions.ts`.
    - Overwrite `web/libs/editor/src/lib/AudioUltra/Visual/Visualizer.ts` with `player_engine/Visualizer.ts`.
    *(This fixes playback race bugs and click-to-seek issues).*
4.  **Import/Export & Cloudinary**:
    - Replace `label_studio/data_import/uploader.py` with `import_export_logic/uploader.py`.
    - Replace `label_studio/data_import/api.py` with `import_export_logic/api.py`.
    - Replace `label_studio/data_export/api.py` with `import_export_logic/api.py`.
    - Replace all files in `web/apps/labelstudio/src/pages/CreateProject/Import/` with the corresponding `.jsx`, `.js`, and `.ts` files from `import_export_logic/`.
    *(This enables Cloudinary and forces URL-only imports).*
5.  **Environment Sync**:
    Set `LINK_ONLY_IMPORT=True` and `USE_USERNAME_FOR_LOGIN=True` in the new project's `.env`.

Please ensure all imports within the files are adjusted if the directory structure differs slightly, but keep the logic intact. Verify the 'Fixensy' category appears in the template selector."

---

## What's inside this bundle?
- `config/`: The XML/YAML configuration for the labeling interface.
- `editor_core/`: The "Brain" of the audio tag (MobX model and React view).
- `player_engine/`: The low-level waveform and playback engine fixes.
- `import_export_logic/`: Backend and Frontend changes for Cloudinary/URL-only workflow.
