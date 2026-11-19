export interface EditorSettings {
  focusModeEnabled: boolean;
  typewriterModeEnabled: boolean;
}

const KEY = 'cng_writer_editor_settings';

const defaults: EditorSettings = {
  focusModeEnabled: false,
  typewriterModeEnabled: false,
};

export function loadEditorSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return {
      focusModeEnabled: Boolean(parsed.focusModeEnabled),
      typewriterModeEnabled: Boolean(parsed.typewriterModeEnabled),
    };
  } catch {
    return { ...defaults };
  }
}

export function saveEditorSettings(settings: EditorSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
}

export function getEditorSettings(): EditorSettings {
  return loadEditorSettings();
}

export function setEditorSettings(patch: Partial<EditorSettings>): EditorSettings {
  const current = loadEditorSettings();
  const next = { ...current, ...patch };
  saveEditorSettings(next);
  return next;
}
