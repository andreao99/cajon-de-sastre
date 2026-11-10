import { describe, expect, it } from 'vitest';
import { addApp, addFolder, dropOnto, removeFolder, reorder, reorderInFolder, topLevel, updateApp, type Library } from '../src/lib/store';

const d = { icon: 'drop', color: 'rose' as const };
const base = (): Library => ['A', 'B', 'C'].reduce((l, n) => addApp(l, { name: n, ...d }, null), { apps: [], folders: [] } as Library);
const names = (l: Library) => topLevel(l).map((e) => l.apps.find((a) => a.id === e.id)?.name ?? l.folders.find((f) => f.id === e.id)!.name);

describe('biblioteca', () => {
  it('añade en orden', () => expect(names(base())).toEqual(['A', 'B', 'C']));
  it('reordena', () => {
    const l = base(); const a = l.apps[0].id;
    expect(names(reorder(l, a, 3))).toEqual(['B', 'C', 'A']);
    expect(names(reorder(l, l.apps[2].id, 0))).toEqual(['C', 'A', 'B']);
  });
  it('soltar sobre otra app crea carpeta', () => {
    const l = dropOnto(base(), base().apps[0].id, 'x');
    expect(l.folders).toHaveLength(0);
    const b = base(); const r = dropOnto(b, b.apps[0].id, b.apps[1].id);
    expect(r.folders).toHaveLength(1);
    expect(r.apps.filter((a) => a.folderId === r.folders[0].id)).toHaveLength(2);
    expect(names(r)).toEqual(['Carpeta', 'C']);
  });
  it('la carpeta vacía desaparece y deshacerla devuelve las apps', () => {
    let l = base(); const { lib, id } = addFolder(l, 'F'); l = updateApp(lib, l.apps[0].id, { folderId: id });
    expect(l.folders).toHaveLength(1);
    expect(names(removeFolder(l, id)).sort()).toEqual(['A', 'B', 'C']);
    expect(updateApp(l, l.apps[0].id, { folderId: null }).folders).toHaveLength(0);
  });
});

describe('carpetas', () => {
  const withFolder = () => {
    let l = base(); const { lib, id } = addFolder(l, 'F'); l = lib;
    for (const a of l.apps) l = updateApp(l, a.id, { folderId: id });
    return { l, id };
  };
  const inside = (l: Library, id: string) => l.apps.filter((a) => a.folderId === id).sort((x, y) => x.order - y.order).map((a) => a.name);
  it('mantiene el orden de entrada dentro de la carpeta', () => { const { l, id } = withFolder(); expect(inside(l, id)).toEqual(['A', 'B', 'C']); });
  it('reordena dentro de la carpeta', () => {
    const { l, id } = withFolder();
    expect(inside(reorderInFolder(l, l.apps.find((a) => a.name === 'A')!.id, 3), id)).toEqual(['B', 'C', 'A']);
  });
  it('sacar una app la deja en el inicio y la carpeta sigue con el resto', () => {
    const { l, id } = withFolder();
    const out = updateApp(l, l.apps.find((a) => a.name === 'B')!.id, { folderId: null });
    expect(inside(out, id)).toEqual(['A', 'C']);
    expect(names(out)).toEqual(['F', 'B']);
  });
});
