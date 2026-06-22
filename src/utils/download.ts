import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function downloadFile(content: string, defaultName: string, mimeType: string) {
  if (isTauri()) {
    const filterExt = defaultName.endsWith('.csv') ? 'csv' : 'json';
    const filePath = await save({
      defaultPath: defaultName,
      filters: [{
        name: filterExt === 'csv' ? 'CSV Files' : 'JSON Files',
        extensions: [filterExt],
      }],
    });
    if (!filePath) return;
    await writeTextFile(filePath, content);
  } else {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
